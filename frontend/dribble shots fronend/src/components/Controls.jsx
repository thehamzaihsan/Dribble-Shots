import { useState, useEffect, useRef } from 'react';
import { Lock, LogOut, Edit2, Save, X, Plus, Trash2, Upload, RefreshCw } from 'lucide-react';
import './Controls.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function Controls() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateJSON, setTemplateJSON] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [cacheImage, setCacheImage] = useState(null);
  const [cacheImagePreview, setCacheImagePreview] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLoginAttempt, setShowLoginAttempt] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [rawScreenshot, setRawScreenshot] = useState(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  
  // Canvas preview
  const previewCanvasRef = useRef(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Check if already authenticated (from sessionStorage)
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_authenticated');
    if (stored === 'true') {
      setAuthenticated(true);
      loadTemplates();
      fetchRawScreenshot();
    }
  }, []);

  // Fetch raw screenshot from backend
  const fetchRawScreenshot = async () => {
    setLoadingScreenshot(true);
    try {
      // Load web photo from public folder
      const response = await fetch('/photos/web.png');
      if (!response.ok) {
        throw new Error('Failed to load web photo');
      }
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawScreenshot(reader.result);
        console.log('✅ Admin: Web photo loaded from /public/photos');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('❌ Admin: Failed to load web photo:', err);
    } finally {
      setLoadingScreenshot(false);
    }
  };

  // The entered password doubles as the backend's X-Admin-Key. The backend
  // only enforces it if ADMIN_API_KEY is set server-side (see require_admin
  // in main.py) — locally that's usually unset, so any non-empty value gets
  // this panel in; in a deployed environment, only the real key does.
  const adminHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Key': sessionStorage.getItem('admin_key') || '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setShowLoginAttempt(true);
    try {
      const res = await fetch(`${API_BASE}/api/templates/generate-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': password },
        body: JSON.stringify({ url: 'https://example.com', width: 64, height: 64 }),
      });
      if (!res.ok) {
        setPasswordError(res.status === 401 ? 'Invalid admin key' : 'Login check failed');
        setPassword('');
        return;
      }
      setAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem('admin_key', password);
      setPasswordError('');
      loadTemplates();
      fetchRawScreenshot();
      setPassword('');
    } catch (err) {
      setPasswordError('Could not reach the server: ' + err.message);
      setPassword('');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_key');
    setSelectedTemplate(null);
    setEditingTemplate(null);
    setTemplateJSON('');
    setCacheImage(null);
    setCacheImagePreview(null);
    setShowLoginAttempt(false);
  };

  const loadTemplates = async () => {
    try {
      const indexRes = await fetch(`/templates/index.json?t=${Date.now()}`);
      const templateFiles = await indexRes.json();
      
      const loadedTemplates = await Promise.all(
        templateFiles.map(async (file) => {
          const res = await fetch(`/templates/${file}?t=${Date.now()}`);
          const template = await res.json();
          return { filename: file, ...template };
        })
      );
      
      setTemplates(loadedTemplates);
      console.log('✅ Admin: Loaded templates:', loadedTemplates.length);
    } catch (err) {
      console.error('❌ Admin: Failed to load templates:', err);
    }
  };

  const generateCacheImageFromURL = async () => {
    setGeneratingImage(true);
    try {
      // Use screenshot API to capture hamzaihsan.me
      const response = await fetch(`${API_BASE}/api/templates/generate-preview`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          url: 'https://hamzaihsan.me',
          width: 640,
          height: 360,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setCacheImage(data.imageBase64);
      setCacheImagePreview(data.imageBase64);
      console.log('✅ Admin: Cache image generated from hamzaihsan.me');
    } catch (err) {
      console.error('❌ Admin: Failed to generate cache image:', err);
      // Fallback: generate a simple placeholder
      generatePlaceholderImage();
    } finally {
      setGeneratingImage(false);
    }
  };

  const generatePlaceholderImage = () => {
    // Create a canvas with template preview
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, '#f1f5fe');
    gradient.addColorStop(1, '#e0e7ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);

    // Add template name
    if (editingTemplate?.name) {
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(editingTemplate.name, 320, 180);

      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.fillText(editingTemplate.description || 'Template Preview', 320, 220);
    }

    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCacheImage(reader.result);
        setCacheImagePreview(reader.result);
        console.log('✅ Admin: Placeholder image generated');
      };
      reader.readAsDataURL(blob);
    });
  };

  // Helper function to draw rounded rectangle
  const roundRect = (ctx, x, y, w, h, r) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Load image as promise
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Draw a device with proper cropping (web or mobile)
  const drawPreviewDevice = async (ctx, screenshotImg, device, mockupImg = null) => {
    try {
      ctx.save();

      // Draw shadow
      if (device.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
      }

      // If mockup is provided, draw it first
      if (mockupImg) {
        const mockupConfig = device.mockupConfig || {};
        const mockupX = mockupConfig.x !== undefined ? mockupConfig.x : device.x;
        const mockupY = mockupConfig.y !== undefined ? mockupConfig.y : device.y;
        const mockupWidth = mockupConfig.width !== undefined ? mockupConfig.width : device.width;
        const mockupHeight = mockupConfig.height !== undefined ? mockupConfig.height : device.height;
        
        ctx.drawImage(mockupImg, mockupX, mockupY, mockupWidth, mockupHeight);
      }

      // Clip to device area with rounded corners
      ctx.beginPath();
      roundRect(ctx, device.x, device.y, device.width, device.height, device.borderRadius || 20);
      ctx.clip();

      // Crop the screenshot to fit device aspect ratio
      let sx = 0, sy = 0, sw = screenshotImg.width, sh = screenshotImg.height;

      const imgAspect = screenshotImg.width / screenshotImg.height;
      const targetAspect = device.width / device.height;

      if (imgAspect > targetAspect) {
        // Image is wider - crop sides (center)
        sw = screenshotImg.height * targetAspect;
        sx = (screenshotImg.width - sw) / 2;
      } else {
        // Image is taller - crop from top
        sh = screenshotImg.width / targetAspect;
        sy = 0;
      }

      // Draw the screenshot
      ctx.drawImage(screenshotImg, sx, sy, sw, sh, device.x, device.y, device.width, device.height);
      ctx.restore();
    } catch (err) {
      console.error('Error drawing device:', err);
    }
  };

  // Draw text element in preview
  const drawPreviewText = (ctx, element) => {
    try {
      ctx.save();
      ctx.font = `${element.fontWeight || 'normal'} ${element.fontSize || 24}px ${element.fontFamily || 'Arial'}`;
      ctx.fillStyle = element.color || '#000000';
      ctx.textAlign = element.textAlign || 'left';

      const maxWidth = element.maxWidth || 1000;
      const lineHeight = (element.fontSize || 24) * 1.5;
      let y = element.y || 0;

      if (element.content) {
        const words = element.content.split(' ');
        let line = '';

        words.forEach((word) => {
          const testLine = line + (line ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && line) {
            ctx.fillText(line, element.x || 0, y);
            line = word;
            y += lineHeight;
          } else {
            line = testLine;
          }
        });

        if (line) {
          ctx.fillText(line, element.x || 0, y);
        }
      }

      ctx.restore();
    } catch (err) {
      console.error('Error drawing text:', err);
    }
  };

  // Main preview render function
  const renderPreviewCanvas = async () => {
    if (!previewCanvasRef.current || !editingTemplate || !rawScreenshot) {
      console.log('Skipping preview render:', {
        canvas: !!previewCanvasRef.current,
        template: !!editingTemplate,
        screenshot: !!rawScreenshot
      });
      return;
    }

    setPreviewLoading(true);
    try {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');

      const template = editingTemplate;
      canvas.width = template.canvas?.width || 1920;
      canvas.height = template.canvas?.height || 1080;

      // Draw background (white or from template)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load web photo
      const webImg = await loadImage(rawScreenshot);
      
      // Load mobile photo
      let mobileImg = null;
      try {
        mobileImg = await loadImage('/photos/mobile.png');
      } catch (err) {
        console.warn('Mobile photo not available:', err);
      }

      // Load mockup images if needed
      let desktopMockupImg = null;
      let mobileMockupImg = null;

      if (template.devices?.desktop?.enabled && template.devices.desktop.mockupImage) {
        try {
          desktopMockupImg = await loadImage(template.devices.desktop.mockupImage);
        } catch (err) {
          console.warn('Desktop mockup not available:', err);
        }
      }

      if (template.devices?.mobile?.enabled && template.devices.mobile.mockupImage) {
        try {
          mobileMockupImg = await loadImage(template.devices.mobile.mockupImage);
        } catch (err) {
          console.warn('Mobile mockup not available:', err);
        }
      }

      // Draw desktop device with web photo
      if (template.devices?.desktop?.enabled) {
        await drawPreviewDevice(ctx, webImg, template.devices.desktop, desktopMockupImg);
      }

      // Draw mobile device with mobile photo
      if (template.devices?.mobile?.enabled && mobileImg) {
        await drawPreviewDevice(ctx, mobileImg, template.devices.mobile, mobileMockupImg);
      }

      // Draw text elements
      if (template.elements) {
        template.elements.forEach(element => {
          if (element.type === 'text') {
            drawPreviewText(ctx, element);
          }
        });
      }

      console.log('✅ Admin: Preview canvas rendered');
    } catch (err) {
      console.error('❌ Admin: Failed to render preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Re-render preview when template or screenshot changes
  useEffect(() => {
    renderPreviewCanvas();
  }, [editingTemplate, rawScreenshot]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setEditingTemplate(JSON.parse(JSON.stringify(template))); // Deep copy
    setTemplateJSON(JSON.stringify(template, null, 2));
    setJsonError('');
    setCacheImage(null);
    setCacheImagePreview(null);
  };

  const handleTemplateJSONChange = (newJSON) => {
    setTemplateJSON(newJSON);
    try {
      const parsed = JSON.parse(newJSON);
      setEditingTemplate(parsed);
      setJsonError('');
    } catch (err) {
      setJsonError(err.message);
      setEditingTemplate(null);
    }
  };

  const handleCacheImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCacheImage(event.target.result);
      setCacheImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !selectedTemplate) {
      setJsonError('No template to save');
      return;
    }

    if (jsonError) {
      setJsonError('Fix JSON errors before saving');
      return;
    }

    try {
      // Validate the template structure
      if (!editingTemplate.id || !editingTemplate.name) {
        setJsonError('Template must have id and name');
        return;
      }

      // Use canvas preview as thumbnail
      let imageToSave = cacheImage;
      if (!imageToSave && previewCanvasRef.current) {
        imageToSave = previewCanvasRef.current.toDataURL('image/png');
      }

      if (!imageToSave) {
        setJsonError('Could not generate thumbnail');
        return;
      }

      // Create template copy and update previewImage path
      const templateToSave = { ...editingTemplate };
      const previewImageFilename = selectedTemplate.filename.replace('.json', '.png');
      templateToSave.previewImage = `/templates/previews/${previewImageFilename}`;

      // Persist through the backend (writes the JSON + preview image and
      // registers the filename in templates/index.json), instead of just
      // downloading files the admin would have to manually copy in.
      const response = await fetch(`${API_BASE}/api/templates/save`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          filename: selectedTemplate.filename,
          template: templateToSave,
          cacheImage: imageToSave,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to save template');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      await loadTemplates();
      console.log('✅ Admin: Template saved to backend:', selectedTemplate.filename);
    } catch (err) {
      setJsonError('Error saving template: ' + err.message);
      console.error('❌ Admin: Save error:', err);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate || !confirm(`Delete ${selectedTemplate.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/templates/delete`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          filename: selectedTemplate.filename,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setSelectedTemplate(null);
      setEditingTemplate(null);
      setTemplateJSON('');
      loadTemplates();
      console.log('✅ Admin: Template deleted');
    } catch (err) {
      setJsonError('Error deleting template: ' + err.message);
      console.error('❌ Admin: Delete error:', err);
    }
  };

  const handleCreateNewTemplate = () => {
    const newTemplate = {
      id: 'new-template-' + Date.now(),
      name: 'New Template',
      description: 'New template description',
      previewImage: '/templates/previews/template.png',
      type: 'showcase',
      tags: [],
      canvas: {
        width: 1920,
        height: 1080,
      },
      devices: {
        desktop: {
          enabled: true,
          x: 300,
          y: 200,
          width: 1200,
          height: 800,
          borderRadius: 20,
          shadow: true,
          crop: true,
          mockup: true,
          mockupImage: '/Desktop.png',
          mockupConfig: {
            x: 191,
            y: 211,
            width: 1445,
            height: 876,
          },
        },
        mobile: {
          enabled: false,
        },
      },
      elements: [
        {
          id: 'title',
          type: 'text',
          content: 'Hamza Ihsan',
          x: 300,
          y: 100,
          fontSize: 48,
          fontFamily: 'Aeonik',
          fontWeight: 'bold',
          color: '#000000',
          textAlign: 'left',
          maxWidth: 1200,
        },
        {
          id: 'url',
          type: 'text',
          content: 'hamzaihsan.me',
          x: 300,
          y: 170,
          fontSize: 24,
          fontFamily: 'Aeonik',
          fontWeight: 'normal',
          color: '#666666',
          textAlign: 'left',
          maxWidth: 1200,
        },
      ],
    };

    // Derive the filename from the generated unique id so two new templates
    // in a row don't collide on the same 'new-template.json' file.
    setSelectedTemplate({ filename: `${newTemplate.id}.json`, ...newTemplate });
    setEditingTemplate(newTemplate);
    setTemplateJSON(JSON.stringify(newTemplate, null, 2));
    setJsonError('');
    setCacheImage(null);
    setCacheImagePreview(null);
  };

  // Login Page (Admin Only)
  if (!authenticated) {
    return (
      <div className="controls-login">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <Lock size={40} className="lock-icon" />
              <h1>Admin Controls</h1>
              <p>Template Editor - Admin Only</p>
            </div>

            {showLoginAttempt && passwordError && (
              <div className="login-alert">
                <span>🔒</span> {passwordError}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="password">Admin Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter admin password"
                  autoFocus
                  className={passwordError ? 'input-error' : ''}
                />
                {passwordError && <span className="error-text">{passwordError}</span>}
              </div>

              <button type="submit" className="login-button">
                Access Admin Panel
              </button>
            </form>

            <div className="login-footer">
              <p className="security-note">🔒 Admin-only access • Hidden from search engines</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard (Protected)
  return (
    <div className="controls-dashboard">
      <header className="controls-header">
        <div className="header-content">
          <div className="header-left">
            <div className="admin-badge">ADMIN</div>
            <h1>🎨 Template Editor</h1>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="controls-container">
        {/* Sidebar - Template List */}
        <aside className="templates-sidebar">
          <div className="sidebar-header">
            <h2>Templates</h2>
            <button onClick={handleCreateNewTemplate} className="new-template-btn" title="Create new template">
              <Plus size={20} />
            </button>
          </div>

          <div className="templates-list">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`template-item ${selectedTemplate?.id === template.id ? 'active' : ''}`}
              >
                <span className="template-name">{template.name}</span>
                <span className="template-id">{template.id}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Editor */}
        <main className="editor-main">
          {selectedTemplate ? (
            <div className="editor-content">
              {/* JSON Editor */}
              <div className="editor-section">
                <div className="section-header">
                  <h3>Template JSON</h3>
                  <span className="file-name">{selectedTemplate.filename}</span>
                </div>

                <div className="json-editor-container">
                  <textarea
                    value={templateJSON}
                    onChange={(e) => handleTemplateJSONChange(e.target.value)}
                    className={`json-editor ${jsonError ? 'error' : ''}`}
                    spellCheck="false"
                  />
                  {jsonError && <div className="json-error">{jsonError}</div>}
                </div>
              </div>

              {/* Preview Section */}
              <div className="preview-section">
                <div className="section-header">
                  <h3>Preview</h3>
                </div>

                {editingTemplate ? (
                  <div className="preview-content">
                    <div className="preview-info">
                      <div className="info-item">
                        <label>Name:</label>
                        <span>{editingTemplate.name}</span>
                      </div>
                      <div className="info-item">
                        <label>Type:</label>
                        <span>{editingTemplate.type}</span>
                      </div>
                      <div className="info-item">
                        <label>Canvas:</label>
                        <span>{editingTemplate.canvas?.width}x{editingTemplate.canvas?.height}</span>
                      </div>

                      <div className="devices-info">
                        <label>Devices:</label>
                        <div className="device-tags">
                          {editingTemplate.devices?.desktop?.enabled && (
                            <span className="device-tag desktop">Desktop</span>
                          )}
                          {editingTemplate.devices?.mobile?.enabled && (
                            <span className="device-tag mobile">Mobile</span>
                          )}
                        </div>
                      </div>
                     </div>

                     {/* Canvas Preview - Full Template Rendering */}
                     {rawScreenshot && editingTemplate && (
                       <div className="canvas-preview-section">
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                           <label>Full Template Preview</label>
                           <button
                             onClick={() => {
                               if (previewCanvasRef.current) {
                                 const canvasImage = previewCanvasRef.current.toDataURL('image/png');
                                 setCacheImage(canvasImage);
                                 setCacheImagePreview(canvasImage);
                                 console.log('✅ Admin: Canvas preview set as thumbnail');
                               }
                             }}
                             className="btn-small btn-save-cache"
                             title="Use canvas as thumbnail"
                           >
                             <Save size={14} />
                             Use as Thumbnail
                           </button>
                         </div>
                         {previewLoading && <div className="preview-loading">Rendering...</div>}
                         <canvas
                           ref={previewCanvasRef}
                           className="template-preview-canvas"
                           style={{ maxWidth: '100%', border: '1px solid #e0e0e0', borderRadius: '4px' }}
                         />
                         {cacheImagePreview && (
                           <div style={{ marginTop: '8px', padding: '8px', background: '#f0f9ff', borderRadius: '4px', fontSize: '12px', color: '#0369a1' }}>
                             ✅ Thumbnail set - will be saved with template
                           </div>
                         )}
                       </div>
                     )}

                     {/* Current Preview */}
                    {editingTemplate.previewImage && !cacheImagePreview && (
                      <div className="current-preview">
                        <label>Current Preview:</label>
                        <div className="preview-image-container">
                          <img src={editingTemplate.previewImage} alt="Template preview" onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22180%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22320%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2216%22 fill=%22%23999%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3EImage not found%3C/text%3E%3C/svg%3E';
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="preview-empty">
                    <p>Invalid JSON - preview unavailable</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {saveSuccess && <div className="save-success">✅ Changes saved successfully!</div>}

              <div className="editor-actions">
                <button onClick={handleSaveTemplate} className="save-button" disabled={!!jsonError}>
                  <Save size={18} />
                  Save Template
                </button>
                <button onClick={handleDeleteTemplate} className="delete-button">
                  <Trash2 size={18} />
                  Delete Template
                </button>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <Edit2 size={48} />
              <h2>Select a template to edit</h2>
              <p>Choose from the list on the left or create a new one</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Controls;
