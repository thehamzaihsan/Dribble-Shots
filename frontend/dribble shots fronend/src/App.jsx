import { useState, useRef, useEffect } from 'react';
import { Upload, Link2, Download, Palette, Type, CheckCircle2, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import './App.css';

function App() {
  // Workflow steps
  const [currentStep, setCurrentStep] = useState(1); // 1: Input, 2: Template, 3: Customize, 4: Done
  
  // Step 1: Input
  const [inputMethod, setInputMethod] = useState('url'); // 'url' or 'upload'
  const [url, setUrl] = useState('');
  const [uploadedDesktop, setUploadedDesktop] = useState(null);
  const [uploadedMobile, setUploadedMobile] = useState(null);
  const [scrollToBottom, setScrollToBottom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  
  // Screenshots from backend
  const [desktopSrc, setDesktopSrc] = useState(null);
  const [mobileSrc, setMobileSrc] = useState(null);
  
  // Step 2: Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  
  // Step 3: Customization
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Aeonik');
  const [enableShadow, setEnableShadow] = useState(true);
  const [enableMockups, setEnableMockups] = useState(true);
  const [textContents, setTextContents] = useState({});
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  
  const canvasRef = useRef(null);
  
  const availableFonts = [
    'Aeonik',
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Source Sans 3',
    'Nunito',
    'Playfair Display',
    'Merriweather',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Verdana',
    'Palatino',
    'Garamond',
    'Courier New',
    'Monaco'
  ];
  
  const presetColors = [
    { color: '#ffffff', name: 'White' },
    { color: '#fafafa', name: 'Light Gray' },
    { color: '#0f0f17', name: 'Dark' },
    { color: '#1a1a28', name: 'Charcoal' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#8b5cf6', name: 'Violet' },
    { color: '#ec4899', name: 'Pink' },
    { color: '#10b981', name: 'Green' },
  ];

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Detect when images are loaded
  useEffect(() => {
    if (imagesLoading && (desktopSrc || mobileSrc)) {
      // Images have loaded
      setImagesLoading(false);
    }
  }, [desktopSrc, mobileSrc, imagesLoading]);

  // Draw canvas when template or customization changes
  useEffect(() => {
    if (templateData && (desktopSrc || mobileSrc) && currentStep >= 3) {
      drawCanvas();
    }
  }, [templateData, desktopSrc, mobileSrc, bgColor, textColor, fontFamily, enableShadow, enableMockups, textContents, currentStep]);

  const loadTemplates = async () => {
    try {
      const indexRes = await fetch(`/templates/index.json?t=${Date.now()}`);
      const templateFiles = await indexRes.json();
      
      const loadedTemplates = await Promise.all(
        templateFiles.map(async (file) => {
          const res = await fetch(`/templates/${file}?t=${Date.now()}`);
          return await res.json();
        })
      );
      
      setTemplates(loadedTemplates);
      return loadedTemplates;
    } catch (err) {
      console.error('Failed to load templates:', err);
      return [];
    }
  };

  const refreshTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      // Reload template from file
      const res = await fetch(`/templates/${selectedTemplate}.json?t=${Date.now()}`);
      const freshTemplate = await res.json();
      
      setTemplateData(freshTemplate);
      
      // Reinitialize text contents
      const initialTexts = {};
      freshTemplate.elements.forEach(el => {
        if (el.type === 'text') {
          initialTexts[el.id] = textContents[el.id] || el.content;
        }
      });
      setTextContents(initialTexts);
      
      console.log('Template refreshed:', freshTemplate);
    } catch (err) {
      console.error('Failed to refresh template:', err);
    }
  };

  const handleFetchScreenshots = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Initializing browser...');
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      setLoadingMessage('Navigating to website...');
      setLoadingProgress(20);

      const response = await fetch('http://localhost:8000/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: url.trim(),
          scroll_to_bottom: scrollToBottom 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch screenshots');
      }

      setLoadingMessage('Processing screenshots...');
      setLoadingProgress(70);

      const data = await response.json();
      
      setLoadingMessage('Almost done...');
      setLoadingProgress(90);

      setDesktopSrc(`data:image/png;base64,${data.desktop}`);
      setMobileSrc(`data:image/png;base64,${data.mobile}`);
      
      setLoadingProgress(100);
      setLoadingMessage('Complete!');
      
      clearInterval(progressInterval);
      
      // Small delay to show completion
      setTimeout(() => {
        setCurrentStep(2); // Move to template selection
        setLoading(false);
      }, 300);
      
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'desktop') {
        setUploadedDesktop(event.target.result);
        setDesktopSrc(event.target.result);
      } else {
        setUploadedMobile(event.target.result);
        setMobileSrc(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadComplete = () => {
    if (!desktopSrc && !mobileSrc) {
      setError('Please upload at least one screenshot');
      return;
    }
    setCurrentStep(2);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id);
    setTemplateData(template);
    setEnableShadow(template.devices.desktop.shadow || template.devices.mobile?.shadow || false);
    
    // Initialize text contents from template
    const initialTexts = {};
    template.elements.forEach(el => {
      if (el.type === 'text') {
        initialTexts[el.id] = el.content;
      }
    });
    setTextContents(initialTexts);
    
    // Set images loading state if screenshots aren't ready yet
    if (!desktopSrc && !mobileSrc) {
      setImagesLoading(true);
    }
    
    setCurrentStep(3);
  };

  const loadFont = async (fontFamily) => {
    try {
      if ('fonts' in document) {
        // Try to load different weights
        await Promise.all([
          document.fonts.load(`400 16px "${fontFamily}"`),
          document.fonts.load(`700 16px "${fontFamily}"`)
        ]);
        // Give a small delay for fonts to be ready
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (e) {
      console.log(`Font ${fontFamily} loading:`, e);
    }
  };

  const drawCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !templateData) return;
    
    // Load font before drawing
    await loadFont(fontFamily);
    
    const ctx = canvas.getContext('2d');
    canvas.width = templateData.canvas.width;
    canvas.height = templateData.canvas.height;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const desktopImg = new Image();
    const mobileImg = new Image();
    
    let imagesLoaded = 0;
    const totalImages = (templateData.devices?.desktop?.enabled && desktopSrc ? 1 : 0) + 
                       (templateData.devices?.mobile?.enabled && mobileSrc ? 1 : 0) +
                       (templateData.extraDevices?.filter(d => mobileSrc).length || 0);

    const checkAndDraw = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        renderAll();
      }
    };

    const renderAll = () => {
      // Clear and redraw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw desktop device
      if (templateData.devices?.desktop?.enabled && desktopSrc) {
        const device = templateData.devices.desktop;
        drawDevice(ctx, desktopImg, device);
      }

      // Draw mobile device
      if (templateData.devices?.mobile?.enabled && mobileSrc) {
        const device = templateData.devices.mobile;
        drawDevice(ctx, mobileImg, device);
      }

      // Draw extra devices
      if (templateData.extraDevices) {
        templateData.extraDevices.forEach(device => {
          if (mobileSrc) {
            drawDevice(ctx, mobileImg, device);
          }
        });
      }

      // Draw text elements
      if (templateData.elements) {
        templateData.elements.forEach(element => {
          if (element.type === 'text') {
            drawText(ctx, element);
          }
        });
      }
    };

    // Load images
    if (templateData.devices?.desktop?.enabled && desktopSrc) {
      desktopImg.onload = checkAndDraw;
      desktopImg.src = desktopSrc;
    }

    if ((templateData.devices?.mobile?.enabled || templateData.extraDevices?.length > 0) && mobileSrc) {
      mobileImg.onload = checkAndDraw;
      mobileImg.src = mobileSrc;
    }

    if (totalImages === 0) {
      renderAll();
    }
  };

  const drawDevice = (ctx, img, device) => {
    ctx.save();

    const mockupEnabled = enableMockups && device.mockup !== false;

    if (mockupEnabled && device.mockupImage) {
      // Use mockup image overlay
      drawDeviceWithMockupImage(ctx, img, device);
    } else {
      // Draw simple version with just screenshot and border
      drawSimpleDevice(ctx, img, device);
    }

    ctx.restore();
  };

  const drawDeviceWithMockupImage = (ctx, screenshotImg, device) => {
    // Load and draw mockup image
    const mockupImg = new Image();
    mockupImg.crossOrigin = 'anonymous';
    
    mockupImg.onload = () => {
      ctx.save();

      // Draw shadow
      if (enableShadow && device.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
      }

      // Use mockupConfig from template if available
      const mockupConfig = device.mockupConfig || {};
      const mockupX = mockupConfig.x !== undefined ? mockupConfig.x : device.x;
      const mockupY = mockupConfig.y !== undefined ? mockupConfig.y : device.y;
      const mockupWidth = mockupConfig.width !== undefined ? mockupConfig.width : device.width;
      const mockupHeight = mockupConfig.height !== undefined ? mockupConfig.height : device.height;

      // Draw mockup frame image
      ctx.drawImage(mockupImg, mockupX, mockupY, mockupWidth, mockupHeight);

      ctx.restore();

      // Use device position directly for screenshot (simplified)
      // The device x, y, width, height define where the screenshot appears
      const screenX = device.x;
      const screenY = device.y;
      const screenWidth = device.width;
      const screenHeight = device.height;

      // Check if cropping is enabled (default true)
      const cropEnabled = device.crop !== false;

      let sx = 0, sy = 0, sw = screenshotImg.width, sh = screenshotImg.height;
      let dx = screenX, dy = screenY, dw = screenWidth, dh = screenHeight;

      if (cropEnabled) {
        // Calculate aspect ratios
        const imgAspect = screenshotImg.width / screenshotImg.height;
        const targetAspect = screenWidth / screenHeight;

        // Crop to fit (cover behavior) - crop from top
        if (imgAspect > targetAspect) {
          // Image is wider - crop sides (center)
          sw = screenshotImg.height * targetAspect;
          sx = (screenshotImg.width - sw) / 2;
        } else {
          // Image is taller - crop from top (no vertical centering)
          sh = screenshotImg.width / targetAspect;
          sy = 0; // Crop from top
        }
      } else {
        // Stretch to fit (old behavior)
        sx = 0;
        sy = 0;
        sw = screenshotImg.width;
        sh = screenshotImg.height;
      }

      // Clip and draw screenshot
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, screenX, screenY, screenWidth, screenHeight, device.borderRadius * 0.7);
      ctx.clip();
      ctx.drawImage(screenshotImg, sx, sy, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    };

    mockupImg.src = device.mockupImage;
  };

  const drawSimpleDevice = (ctx, img, device) => {
    // Shadow
    if (enableShadow && device.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 20;
    }

    // Rounded rectangle clip
    ctx.beginPath();
    roundRect(ctx, device.x, device.y, device.width, device.height, device.borderRadius);
    ctx.clip();

    // Check if cropping is enabled (default true)
    const cropEnabled = device.crop !== false;

    let sx = 0, sy = 0, sw = img.width, sh = img.height;

    if (cropEnabled) {
      // Calculate aspect ratios for proper cropping
      const imgAspect = img.width / img.height;
      const targetAspect = device.width / device.height;

      // Crop to fit (cover behavior) - crop from top
      if (imgAspect > targetAspect) {
        // Image is wider - crop sides (center)
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
      } else {
        // Image is taller - crop from top (no vertical centering)
        sh = img.width / targetAspect;
        sy = 0; // Crop from top
      }
    }

    // Draw screenshot with cropping
    ctx.drawImage(img, sx, sy, sw, sh, device.x, device.y, device.width, device.height);

    ctx.restore();

    // Border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, device.x, device.y, device.width, device.height, device.borderRadius);
    ctx.stroke();
  };

  const drawText = (ctx, element) => {
    const content = textContents[element.id] !== undefined ? textContents[element.id] : element.content;
    
    // Don't draw if content is empty
    if (!content || content.trim() === '') {
      return;
    }
    
    ctx.save();
    ctx.fillStyle = textColor;
    
    // Properly format font with quotes for canvas
    const fontWeight = element.fontWeight === 'bold' ? '700' : '400';
    ctx.font = `${fontWeight} ${element.fontSize}px "${fontFamily}", sans-serif`;
    ctx.textAlign = element.textAlign;
    ctx.textBaseline = 'top';

    // Handle text wrapping
    const words = content.split(' ');
    let line = '';
    let y = element.y;
    const lineHeight = element.fontSize * 1.2;
    const maxWidth = element.maxWidth || templateData.canvas.width;

    words.forEach((word, index) => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && index > 0) {
        ctx.fillText(line, element.x, y);
        line = word + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, element.x, y);

    ctx.restore();
  };

  const roundRect = (ctx, x, y, width, height, radius) => {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dribble-shot-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleTextChange = (elementId, value) => {
    setTextContents(prev => ({
      ...prev,
      [elementId]: value
    }));
  };

  const resetAll = () => {
    setCurrentStep(1);
    setUrl('');
    setUploadedDesktop(null);
    setUploadedMobile(null);
    setDesktopSrc(null);
    setMobileSrc(null);
    setSelectedTemplate(null);
    setTemplateData(null);
    setScrollToBottom(false);
    setError(null);
    setLoadingProgress(0);
    setLoadingMessage('');
    setImagesLoading(false);
    setBgColor('#ffffff');
    setTextColor('#000000');
    setFontFamily('Aeonik');
    setEnableShadow(true);
    setEnableMockups(true);
    setTextContents({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => setCurrentStep(1)}
              title="Back to start"
            >
            <div className='-mr-4'>
              <svg width="75" height="75" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <clipPath id="clip_path_1">
                    <rect width="100" height="100" rx="16" />
                  </clipPath>
                </defs>
                <g clip-path="url(#clip_path_1)">
                  <rect width="100" height="100" fill="#FFFFFF" fill-rule="evenodd" />
                  <g transform="translate(20 -5)">
                    <g transform="translate(1.655 0)">
                      <path d="M27.5 0L55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0Z" />
                      <path d="M27.5 10.6241L9 22.2286L9 46.7714L27.5 58.3759L46 46.7714L46 22.2286L27.5 10.6241ZM55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0L55 17.25Z" fill="#5151E3" fill-rule="evenodd" />
                    </g>
                    <g transform="translate(1.655 42)">
                      <path d="M27.5 0L55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0Z" />
                      <path d="M27.5 10.6241L9 22.2286L9 46.7714L27.5 58.3759L46 46.7714L46 22.2286L27.5 10.6241ZM55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0L55 17.25Z" fill="#5151E3" fill-rule="evenodd" />
                    </g>
                    <rect width="59" height="28" fill="#FFFFFF" fill-rule="evenodd" />
                    <rect width="59" height="28" fill="#FFFFFF" fill-rule="evenodd" transform="translate(0 83)" />
                    <path d="M0 0L9.1781 5.7424" fill="none" stroke-width="1" stroke="#FFFFFF" stroke-linecap="square" transform="translate(6.799 55.58)" />
                    <path d="M8.86774 0L0 5.59073" fill="none" stroke-width="1" stroke="#FFFFFF" stroke-linecap="square" transform="translate(42.573 55.6)" />
                    <path d="M0 0L9.41765 5.91177" fill="none" stroke-width="1" stroke="#FFFFFF" stroke-linecap="square" transform="translate(16.129 49.629)" />
                    <path d="M9.49545 0L0 5.96036" fill="none" stroke-width="1" stroke="#FFFFFF" stroke-linecap="square" transform="translate(33.156 49.322)" />
                  </g>
                </g>
              </svg>
            </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dribble Shots
                </h1>
                <p className="text-xs text-gray-500">Create beautiful mockups in seconds by Hexa Devs</p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center gap-4">
              {[
                { num: 1, label: 'Input' },
                { num: 2, label: 'Template' },
                { num: 3, label: 'Customize' }
              ].map(({ num, label }) => (
                <div key={num} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    currentStep >= num 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {currentStep > num ? <CheckCircle2 size={16} /> : num}
                  </div>
                  <span className={`text-sm font-medium ${
                    currentStep >= num ? 'text-gray-900' : 'text-gray-400'
                  }`}>{label}</span>
                  {num < 3 && <ArrowRight size={16} className="text-gray-300" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Step 1: Input */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Let's Get Started</h2>
              <p className="text-gray-600">Provide your website URL or upload screenshots</p>
            </div>

            {/* Input Method Selector */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setInputMethod('url')}
                className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all ${
                  inputMethod === 'url'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Link2 className={`mx-auto mb-2 ${inputMethod === 'url' ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                <div className="font-semibold text-gray-900">Website URL</div>
                <div className="text-sm text-gray-500">Auto-capture screenshots</div>
              </button>
              
              <button
                onClick={() => setInputMethod('upload')}
                className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all ${
                  inputMethod === 'upload'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className={`mx-auto mb-2 ${inputMethod === 'upload' ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                <div className="font-semibold text-gray-900">Upload Files</div>
                <div className="text-sm text-gray-500">Use your own screenshots</div>
              </button>
            </div>

            {/* URL Input */}
            {inputMethod === 'url' && (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <div className="mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scrollToBottom}
                      onChange={(e) => setScrollToBottom(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Scroll to bottom before capturing</span>
                  </label>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Progress Bar */}
                {loading && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">{loadingMessage}</span>
                      <span className="font-semibold text-blue-600">{Math.round(loadingProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFetchScreenshots}
                  disabled={loading}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Capturing Screenshots...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* File Upload */}
            {inputMethod === 'upload' && (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Desktop Screenshot
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'desktop')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    {desktopSrc && (
                      <div className="mt-3">
                        <img src={desktopSrc} alt="Desktop preview" className="max-w-full h-32 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Mobile Screenshot (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'mobile')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    {mobileSrc && (
                      <div className="mt-3">
                        <img src={mobileSrc} alt="Mobile preview" className="max-w-full h-32 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleUploadComplete}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Template Selection */}
        {currentStep === 2 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose a Template</h2>
              <p className="text-gray-600">Select a layout that best fits your needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 hover:border-blue-600 transition-all text-left group"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {template.devices.desktop.enabled && (
                        <div className="w-16 h-10 bg-white rounded shadow-lg mr-2" />
                      )}
                      {template.devices.mobile?.enabled && (
                        <div className="w-6 h-12 bg-white rounded-lg shadow-lg" />
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                  <div className="mt-4 text-blue-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                    Select Template
                    <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Customize */}
        {currentStep === 3 && templateData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Show skeleton if images are still loading */}
            {(!desktopSrc && !mobileSrc) || imagesLoading ? (
              <>
                {/* Skeleton Customization Panel */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
                    
                    {/* Background Color Skeleton */}
                    <div className="mb-6">
                      <div className="h-4 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
                      <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    </div>

                    {/* Text Color Skeleton */}
                    <div className="mb-6">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
                      <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse" />
                    </div>

                    {/* Font Skeleton */}
                    <div className="mb-6">
                      <div className="h-4 bg-gray-200 rounded w-28 mb-2 animate-pulse" />
                      <div className="w-full h-11 bg-gray-200 rounded-lg animate-pulse" />
                    </div>

                    {/* Toggles Skeleton */}
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded w-36 animate-pulse" />
                      </div>
                    </div>

                    {/* Text Inputs Skeleton */}
                    <div>
                      <div className="h-5 bg-gray-200 rounded w-20 mb-3 animate-pulse" />
                      <div className="space-y-3">
                        <div>
                          <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
                          <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                        </div>
                        <div>
                          <div className="h-3 bg-gray-200 rounded w-20 mb-1 animate-pulse" />
                          <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons Skeleton */}
                  <div className="space-y-3">
                    <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>

                {/* Skeleton Preview */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 sticky top-24">
                    <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="animate-spin mx-auto mb-3 text-blue-600" size={48} />
                        <p className="text-gray-600 font-medium">Loading your screenshots...</p>
                        <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Actual Customization Panel - Scrollable */}
                <div className="lg:col-span-1">
                  <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
                    <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <h3 className="font-bold text-lg mb-4">Customize</h3>

                {/* Background Color */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                  <div className="relative">
                    <div 
                      className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition-all"
                      style={{ backgroundColor: bgColor }}
                      onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                    />
                    {showBgColorPicker && (
                      <div className="absolute z-20 mt-2">
                        <div 
                          className="fixed inset-0" 
                          onClick={() => setShowBgColorPicker(false)}
                        />
                        <div className="relative bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                          <HexColorPicker color={bgColor} onChange={setBgColor} />
                          <input
                            type="text"
                            className="w-full mt-2 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono text-center"
                            value={bgColor.toUpperCase()}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                                setBgColor(value);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {presetColors.map(({ color, name }) => (
                      <button
                        key={color}
                        onClick={() => setBgColor(color)}
                        className="w-full aspect-square rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-all"
                        style={{ backgroundColor: color }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>

                {/* Text Color */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                  <div className="relative">
                    <div 
                      className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition-all"
                      style={{ backgroundColor: textColor }}
                      onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                    />
                    {showTextColorPicker && (
                      <div className="absolute z-20 mt-2">
                        <div 
                          className="fixed inset-0" 
                          onClick={() => setShowTextColorPicker(false)}
                        />
                        <div className="relative bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                          <HexColorPicker color={textColor} onChange={setTextColor} />
                          <input
                            type="text"
                            className="w-full mt-2 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono text-center"
                            value={textColor.toUpperCase()}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                                setTextColor(value);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Font Family */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: fontFamily }}
                  >
                    {availableFonts.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">Preview: <span style={{ fontFamily: fontFamily, fontSize: '16px' }}>The quick brown fox jumps</span></p>
                </div>

                {/* Shadow Toggle */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableShadow}
                      onChange={(e) => setEnableShadow(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Shadow</span>
                  </label>
                </div>

                {/* Mockup Toggle */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMockups}
                      onChange={(e) => setEnableMockups(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Show Device Frames</span>
                  </label>
                </div>

                {/* Text Content Editing */}
                {templateData.elements && templateData.elements.filter(el => el.type === 'text').length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Edit Text</h4>
                    {templateData.elements.filter(el => el.type === 'text').map(element => (
                      <div key={element.id} className="mb-4">
                        <label className="block text-xs text-gray-600 mb-1 capitalize">
                          {element.id.replace('-', ' ')}
                        </label>
                        <input
                          type="text"
                          value={textContents[element.id] !== undefined ? textContents[element.id] : element.content}
                          onChange={(e) => handleTextChange(element.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder={element.content}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Download Image
                </button>
                
                {/* Debug: Refresh Template Button */}
                <button
                  onClick={refreshTemplate}
                  className="w-full bg-blue-100 text-blue-700 py-3 px-6 rounded-lg font-semibold hover:bg-blue-200 transition-all flex items-center justify-center gap-2 border border-blue-300"
                  title="Reload template from JSON file (for debugging)"
                >
                  <RefreshCw size={20} />
                  Refresh Template
                </button>
                
                <button
                  onClick={resetAll}
                  className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Start Over
                </button>
                  </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 sticky top-24">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Preview</h3>
                      
                      {/* Debug Info */}
                      {templateData && (
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {templateData.name}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded font-mono">
                            {templateData.canvas.width} × {templateData.canvas.height}
                          </span>
                          {templateData.devices.desktop?.mockupImage && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded font-mono text-[10px]">
                              D: {templateData.devices.desktop.mockupImage}
                            </span>
                          )}
                          {templateData.devices.mobile?.mockupImage && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded font-mono text-[10px]">
                              M: {templateData.devices.mobile.mockupImage}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="overflow-auto max-h-[calc(100vh-200px)]">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-auto border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
