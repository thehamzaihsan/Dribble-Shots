import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link2, Download, Palette, Type, CheckCircle2, ArrowRight, Loader2, RefreshCw, Sparkles, Zap, Layers, MousePointer, Monitor, Smartphone, Globe, Play } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import './App.css';

function App() {
  const navigate = useNavigate();
  // Workflow steps: 1 = Input, 2 = Template, 3 = Customize
  const [currentStep, setCurrentStep] = useState(1); // 1: Input, 2: Template, 3: Customize
  
  // Step 1: Input
  const [inputMethod, setInputMethod] = useState('url'); // 'url' or 'upload'
  const [url, setUrl] = useState('');
  const [uploadedDesktop, setUploadedDesktop] = useState(null);
  const [uploadedMobile, setUploadedMobile] = useState(null);
  const [scrollToBottom, setScrollToBottom] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState(null);
  
  // Screenshots from backend
  const [desktopSrc, setDesktopSrc] = useState(null);
  const [mobileSrc, setMobileSrc] = useState(null);
  const [websiteTitle, setWebsiteTitle] = useState('');
  
  // Step 2: Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  
  // Step 3: Customization
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgColor2, setBgColor2] = useState('#8b5cf6'); // Second color for gradient
  const [useGradient, setUseGradient] = useState(false);
  const [gradientDirection, setGradientDirection] = useState('to bottom right');
  const [textColor, setTextColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Aeonik');
  const [enableShadow, setEnableShadow] = useState(true);
  const [enableMockups, setEnableMockups] = useState(true);
  const [textContents, setTextContents] = useState({});
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showBgColor2Picker, setShowBgColor2Picker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [extractedColors, setExtractedColors] = useState([]);
  
  const canvasRef = useRef(null);
  const colorExtractorRef = useRef(null);
  
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
  
  const defaultPresetColors = [
    { color: '#ffffff', name: 'White' },
    { color: '#fafafa', name: 'Light Gray' },
    { color: '#0f0f17', name: 'Dark' },
    { color: '#1a1a28', name: 'Charcoal' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#8b5cf6', name: 'Violet' },
    { color: '#ec4899', name: 'Pink' },
    { color: '#10b981', name: 'Green' },
  ];

  const gradientDirections = [
    { value: 'to right', label: '→' },
    { value: 'to left', label: '←' },
    { value: 'to bottom', label: '↓' },
    { value: 'to top', label: '↑' },
    { value: 'to bottom right', label: '↘' },
    { value: 'to bottom left', label: '↙' },
    { value: 'to top right', label: '↗' },
    { value: 'to top left', label: '↖' },
  ];

  // Combine extracted colors with defaults (extracted colors take priority)
  const presetColors = extractedColors.length > 0 
    ? [...extractedColors, ...defaultPresetColors.slice(extractedColors.length)]
    : defaultPresetColors;

  // Extract dominant colors from image
  const extractColorsFromImage = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Sample at smaller size for performance
        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const pixels = imageData.data;
        
        // Color quantization using a simple bucketing approach
        const colorBuckets = {};
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          
          // Skip very light colors (close to white) and very dark (close to black)
          const brightness = (r + g + b) / 3;
          if (brightness > 240 || brightness < 15) continue;
          
          const key = `${r},${g},${b}`;
          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }
        
        // Sort by frequency and get top colors
        const sortedColors = Object.entries(colorBuckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12);
        
        // Convert to hex and filter for diversity
        const extractedHexColors = [];
        const minColorDistance = 50; // Minimum distance between colors
        
        for (const [colorKey] of sortedColors) {
          const [r, g, b] = colorKey.split(',').map(Number);
          const hex = rgbToHex(r, g, b);
          
          // Check if this color is different enough from already selected colors
          const isDifferent = extractedHexColors.every(existing => 
            colorDistance(hex, existing.color) > minColorDistance
          );
          
          if (isDifferent && extractedHexColors.length < 6) {
            extractedHexColors.push({ 
              color: hex, 
              name: `Extracted ${extractedHexColors.length + 1}` 
            });
          }
        }
        
        // Add white and dark as safe defaults if we have room
        if (extractedHexColors.length < 7) {
          extractedHexColors.push({ color: '#ffffff', name: 'White' });
        }
        if (extractedHexColors.length < 8) {
          extractedHexColors.push({ color: '#0f0f17', name: 'Dark' });
        }
        
        resolve(extractedHexColors);
      };
      img.onerror = () => resolve([]);
      img.src = imageSrc;
    });
  };

  // Helper: RGB to Hex
  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.min(255, Math.max(0, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Helper: Calculate color distance
  const colorDistance = (hex1, hex2) => {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  };

  // Helper: Hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Extract colors when screenshots are loaded
  useEffect(() => {
    const extractColors = async () => {
      if (desktopSrc) {
        const colors = await extractColorsFromImage(desktopSrc);
        if (colors.length > 0) {
          setExtractedColors(colors);
          // Optionally set the first extracted color as default background
          // setBgColor(colors[0].color);
        }
      } else if (mobileSrc) {
        const colors = await extractColorsFromImage(mobileSrc);
        if (colors.length > 0) {
          setExtractedColors(colors);
        }
      }
    };
    
    extractColors();
  }, [desktopSrc, mobileSrc]);

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
      // Use a small timeout to ensure the canvas element is mounted
      const timer = setTimeout(() => {
        drawCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [templateData, desktopSrc, mobileSrc, bgColor, bgColor2, useGradient, gradientDirection, textColor, fontFamily, enableShadow, enableMockups, textContents, currentStep]);

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
    setLoadingMessage('Submitting request to queue...');
    setError(null);
    setQueuePosition(0);
    setJobId(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    try {
      // Submit job to queue
      const queueResponse = await fetch(`${API_BASE}/capture/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: url.trim(),
          scroll_to_bottom: scrollToBottom,
          use_cache: useCache
        }),
      });

      if (!queueResponse.ok) {
        throw new Error('Failed to submit job to queue');
      }

      const queueData = await queueResponse.json();
      const currentJobId = queueData.job_id;
      const initialPosition = queueData.queue_position;
      
      setJobId(currentJobId);
      setQueuePosition(initialPosition);
      setLoadingMessage(`Queued at position ${initialPosition}...`);
      setLoadingProgress(10);

      // Poll for job status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${API_BASE}/capture/status/${currentJobId}`);
          
          if (!statusResponse.ok) {
            throw new Error('Failed to check job status');
          }

          const statusData = await statusResponse.json();
          
          // Update queue position
          if (statusData.queue_position > 0) {
            setQueuePosition(statusData.queue_position);
            setLoadingMessage(`Waiting in queue... Position: ${statusData.queue_position}`);
            setLoadingProgress(10 + (statusData.queue_position === 1 ? 20 : 0));
          } else if (statusData.status === 'processing') {
            setQueuePosition(0);
            setLoadingMessage('Processing your request...');
            setLoadingProgress(30);
          } else if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            
            setLoadingMessage('Processing screenshots...');
                            setLoadingProgress(70);
                            
                            setDesktopSrc(`data:image/png;base64,${statusData.result.desktop}`);
                            setMobileSrc(`data:image/png;base64,${statusData.result.mobile}`);
                            // Store website title from backend
                            if (statusData.result.title) {
                              setWebsiteTitle(statusData.result.title);
                            }
            
            setLoadingProgress(100);
            setLoadingMessage('Complete!');
            setQueuePosition(0);
            
            // Small delay to show completion
            setTimeout(() => {
              setCurrentStep(2); // Move to template selection
              setLoading(false);
              setJobId(null);
            }, 300);
            
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(statusData.error || 'Job failed');
          }
        } catch (err) {
          clearInterval(pollInterval);
          setError(err.message);
          setLoading(false);
          setLoadingProgress(0);
          setQueuePosition(0);
          setJobId(null);
        }
      }, 10000); // Poll every 10 seconds
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setLoadingProgress(0);
      setQueuePosition(0);
      setJobId(null);
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
    // Auto-populate title with website title from backend, subtitle with URL
    const initialTexts = {};
    template.elements.forEach(el => {
      if (el.type === 'text') {
        if (el.id === 'title' && websiteTitle) {
          // Set title to the extracted website title
          initialTexts[el.id] = websiteTitle;
        } else if (el.id === 'subtitle' && url.trim()) {
          // Set subtitle to the entered URL
          initialTexts[el.id] = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
        } else {
          initialTexts[el.id] = el.content;
        }
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

    // Background - solid or gradient
    const drawBackground = () => {
      if (useGradient) {
        // Parse direction to get gradient coordinates
        let x0 = 0, y0 = 0, x1 = canvas.width, y1 = canvas.height;
        
        switch (gradientDirection) {
          case 'to right':
            x0 = 0; y0 = 0; x1 = canvas.width; y1 = 0;
            break;
          case 'to left':
            x0 = canvas.width; y0 = 0; x1 = 0; y1 = 0;
            break;
          case 'to bottom':
            x0 = 0; y0 = 0; x1 = 0; y1 = canvas.height;
            break;
          case 'to top':
            x0 = 0; y0 = canvas.height; x1 = 0; y1 = 0;
            break;
          case 'to bottom right':
            x0 = 0; y0 = 0; x1 = canvas.width; y1 = canvas.height;
            break;
          case 'to bottom left':
            x0 = canvas.width; y0 = 0; x1 = 0; y1 = canvas.height;
            break;
          case 'to top right':
            x0 = 0; y0 = canvas.height; x1 = canvas.width; y1 = 0;
            break;
          case 'to top left':
            x0 = canvas.width; y0 = canvas.height; x1 = 0; y1 = 0;
            break;
          default:
            x0 = 0; y0 = 0; x1 = canvas.width; y1 = canvas.height;
        }
        
        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        gradient.addColorStop(0, bgColor);
        gradient.addColorStop(1, bgColor2);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = bgColor;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Helper to load an image as a promise
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        console.log('Loading image:', src);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log('Image loaded successfully:', src, img.width, 'x', img.height);
          resolve(img);
        };
        img.onerror = (err) => {
          console.error('Failed to load image:', src, err);
          reject(err);
        };
        img.src = src;
      });
    };

    // Load all images first
    const imagesToLoad = [];
    
    console.log('=== IMAGE LOADING DEBUG ===');
    console.log('desktopSrc:', desktopSrc ? desktopSrc.substring(0, 50) + '...' : null);
    console.log('mobileSrc:', mobileSrc ? mobileSrc.substring(0, 50) + '...' : null);
    console.log('templateData.devices:', templateData.devices);
    console.log('enableMockups:', enableMockups);
    
    if (templateData.devices?.desktop?.enabled && desktopSrc) {
      console.log('Adding desktop screenshot to load queue');
      imagesToLoad.push(loadImage(desktopSrc).then(img => ({ type: 'desktop', img })));
      if (enableMockups && templateData.devices.desktop.mockupImage) {
        console.log('Adding desktop mockup to load queue:', templateData.devices.desktop.mockupImage);
        imagesToLoad.push(loadImage(templateData.devices.desktop.mockupImage).then(img => ({ type: 'desktopMockup', img })));
      }
    } else {
      console.log('Desktop NOT added:', { enabled: templateData.devices?.desktop?.enabled, hasDesktopSrc: !!desktopSrc });
    }
    
    if (templateData.devices?.mobile?.enabled && mobileSrc) {
      console.log('Adding mobile screenshot to load queue');
      imagesToLoad.push(loadImage(mobileSrc).then(img => ({ type: 'mobile', img })));
      if (enableMockups && templateData.devices.mobile.mockupImage) {
        console.log('Adding mobile mockup to load queue:', templateData.devices.mobile.mockupImage);
        imagesToLoad.push(loadImage(templateData.devices.mobile.mockupImage).then(img => ({ type: 'mobileMockup', img })));
      }
    } else {
      console.log('Mobile NOT added:', { enabled: templateData.devices?.mobile?.enabled, hasMobileSrc: !!mobileSrc });
    }

    // Load extra device mockups
    if (templateData.extraDevices && mobileSrc) {
      templateData.extraDevices.forEach((device, index) => {
        if (enableMockups && device.mockupImage) {
          imagesToLoad.push(loadImage(device.mockupImage).then(img => ({ type: `extraMockup${index}`, img })));
        }
      });
    }

    try {
      console.log('Loading images...', imagesToLoad.length, 'images to load');
      const loadedImages = await Promise.all(imagesToLoad);
      const images = {};
      loadedImages.forEach(({ type, img }) => {
        images[type] = img;
        console.log(`Loaded ${type}: ${img.width}x${img.height}`);
      });

      // Now draw everything
      console.log('Drawing canvas...', { desktopSrc: !!desktopSrc, mobileSrc: !!mobileSrc, images: Object.keys(images) });
      drawBackground();

      // Draw desktop device
      if (templateData.devices?.desktop?.enabled && desktopSrc && images.desktop) {
        console.log('Drawing desktop device', { enableMockups, hasMockupImage: !!templateData.devices.desktop.mockupImage, hasMockupImg: !!images.desktopMockup });
        const device = templateData.devices.desktop;
        if (enableMockups && device.mockupImage && images.desktopMockup) {
          drawDeviceWithMockupImageSync(ctx, images.desktop, images.desktopMockup, device);
        } else {
          drawSimpleDevice(ctx, images.desktop, device);
        }
      } else {
        console.log('Skipping desktop device', { enabled: templateData.devices?.desktop?.enabled, hasDesktopSrc: !!desktopSrc, hasImage: !!images.desktop });
      }

      // Draw mobile device
      if (templateData.devices?.mobile?.enabled && mobileSrc && images.mobile) {
        console.log('Drawing mobile device', { enableMockups, hasMockupImage: !!templateData.devices.mobile.mockupImage, hasMockupImg: !!images.mobileMockup });
        const device = templateData.devices.mobile;
        if (enableMockups && device.mockupImage && images.mobileMockup) {
          drawDeviceWithMockupImageSync(ctx, images.mobile, images.mobileMockup, device);
        } else {
          drawSimpleDevice(ctx, images.mobile, device);
        }
      } else {
        console.log('Skipping mobile device', { enabled: templateData.devices?.mobile?.enabled, hasMobileSrc: !!mobileSrc, hasImage: !!images.mobile });
      }

      // Draw extra devices
      if (templateData.extraDevices && mobileSrc && images.mobile) {
        templateData.extraDevices.forEach((device, index) => {
          if (enableMockups && device.mockupImage && images[`extraMockup${index}`]) {
            drawDeviceWithMockupImageSync(ctx, images.mobile, images[`extraMockup${index}`], device);
          } else {
            drawSimpleDevice(ctx, images.mobile, device);
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
    } catch (err) {
      console.error('Error loading images:', err);
      // Still draw background and text even if images fail
      drawBackground();
      if (templateData.elements) {
        templateData.elements.forEach(element => {
          if (element.type === 'text') {
            drawText(ctx, element);
          }
        });
      }
    }
  };

  // Synchronous version that takes pre-loaded images
  const drawDeviceWithMockupImageSync = (ctx, screenshotImg, mockupImg, device) => {
    // Use mockupConfig from template if available
    const mockupConfig = device.mockupConfig || {};
    const mockupX = mockupConfig.x !== undefined ? mockupConfig.x : device.x;
    const mockupY = mockupConfig.y !== undefined ? mockupConfig.y : device.y;
    const mockupWidth = mockupConfig.width !== undefined ? mockupConfig.width : device.width;
    const mockupHeight = mockupConfig.height !== undefined ? mockupConfig.height : device.height;

    // Use device position for screenshot
    const screenX = device.x;
    const screenY = device.y;
    const screenWidth = device.width;
    const screenHeight = device.height;

    console.log('drawDeviceWithMockupImageSync:', { 
      mockup: { x: mockupX, y: mockupY, w: mockupWidth, h: mockupHeight },
      screen: { x: screenX, y: screenY, w: screenWidth, h: screenHeight },
      screenshotSize: { w: screenshotImg.width, h: screenshotImg.height },
      mockupSize: { w: mockupImg.width, h: mockupImg.height }
    });

    // Check if cropping is enabled (default true)
    const cropEnabled = device.crop !== false;

    let sx = 0, sy = 0, sw = screenshotImg.width, sh = screenshotImg.height;

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
    }

    console.log('Screenshot crop:', { sx, sy, sw, sh });

    // STEP 1: Draw shadow using composite operation
    if (enableShadow && device.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 20;
      // Draw a solid rounded rect that will cast shadow
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      roundRect(ctx, screenX, screenY, screenWidth, screenHeight, device.borderRadius);
      ctx.fill();
      ctx.restore();
    }

    // STEP 2: Draw mockup frame (this will cover the shadow-casting rect)
    ctx.drawImage(mockupImg, mockupX, mockupY, mockupWidth, mockupHeight);

    // STEP 3: Draw the screenshot ON TOP (clipped to screen area)
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, screenX, screenY, screenWidth, screenHeight, device.borderRadius * 0.7);
    ctx.clip();
    ctx.drawImage(screenshotImg, sx, sy, sw, sh, screenX, screenY, screenWidth, screenHeight);
    ctx.restore();
    
    console.log('Finished drawing device with mockup');
  };

  const drawSimpleDevice = (ctx, img, device) => {
    ctx.save();
    
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
      link.download = `portfolio-shot-${Date.now()}.png`;
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
    setWebsiteTitle('');
    setSelectedTemplate(null);
    setTemplateData(null);
    setScrollToBottom(false);
    setError(null);
    setLoadingProgress(0);
    setLoadingMessage('');
    setImagesLoading(false);
    setQueuePosition(0);
    setJobId(null);
    setBgColor('#ffffff');
    setBgColor2('#8b5cf6');
    setUseGradient(false);
    setGradientDirection('to bottom right');
    setTextColor('#000000');
    setFontFamily('Aeonik');
    setEnableShadow(true);
    setEnableMockups(true);
    setTextContents({});
    setExtractedColors([]);
  };

  const goHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* App Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="header-content max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
            <div 
              className="logo-section flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={goHome}
              title="Back to home"
            >
            <div className='-mr-2 sm:-mr-4'>
              <svg className="w-[50px] h-[50px] sm:w-[75px] sm:h-[75px]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Portfolio Shots
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500">Create beautiful mockups in seconds by Hexa Devs</p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="progress-steps flex items-center gap-2 sm:gap-4">
              {[
                { num: 1, label: 'Input' },
                { num: 2, label: 'Template' },
                { num: 3, label: 'Customize' }
              ].map(({ num, label }) => (
                <div key={num} className="flex items-center gap-1 sm:gap-2">
                  <div className={`step-circle w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all ${
                    currentStep >= num 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {currentStep > num ? <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> : num}
                  </div>
                  <span className={`step-label text-xs sm:text-sm font-medium hidden xs:inline ${
                    currentStep >= num ? 'text-gray-900' : 'text-gray-400'
                  }`}>{label}</span>
                  {num < 3 && <ArrowRight size={14} className="step-arrow text-gray-300 hidden sm:inline" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="main-container max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Step 1: Input */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="step-title text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Let's Get Started</h2>
              <p className="step-subtitle text-sm sm:text-base text-gray-600">Provide your website URL or upload screenshots</p>
            </div>

            {/* Input Method Selector */}
            <div className="input-method-selector flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              <button
                onClick={() => setInputMethod('url')}
                className={`input-method-btn flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl border-2 transition-all ${
                  inputMethod === 'url'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Link2 className={`mx-auto mb-2 ${inputMethod === 'url' ? 'text-blue-600' : 'text-gray-400'}`} size={20} />
                <div className="font-semibold text-gray-900 text-sm sm:text-base">Website URL</div>
                <div className="text-xs sm:text-sm text-gray-500">Auto-capture screenshots</div>
              </button>
              
              <button
                onClick={() => setInputMethod('upload')}
                className={`input-method-btn flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl border-2 transition-all ${
                  inputMethod === 'upload'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className={`mx-auto mb-2 ${inputMethod === 'upload' ? 'text-blue-600' : 'text-gray-400'}`} size={20} />
                <div className="font-semibold text-gray-900 text-sm sm:text-base">Upload Files</div>
                <div className="text-xs sm:text-sm text-gray-500">Use your own screenshots</div>
              </button>
            </div>

            {/* URL Input */}
            {inputMethod === 'url' && (
              <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />

                <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scrollToBottom}
                      onChange={(e) => setScrollToBottom(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">Scroll to bottom before capturing</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCache}
                      onChange={(e) => setUseCache(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">
                      Use cached screenshots (faster, valid for 1 hour)
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
                    {error}
                  </div>
                )}

                {/* Progress Bar */}
                {loading && (
                  <div className="loading-container mt-3 sm:mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">{loadingMessage}</span>
                      <span className="font-semibold text-blue-600">{Math.round(loadingProgress)}%</span>
                    </div>
                    {queuePosition > 0 && (
                      <div className="mb-2 text-xs sm:text-sm text-center">
                        <span className="queue-position-badge inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                          <span>Queue Position:</span>
                          <span className="text-base sm:text-lg font-bold">{queuePosition}</span>
                        </span>
                      </div>
                    )}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 sm:h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFetchScreenshots}
                  disabled={loading}
                  className="action-btn w-full mt-4 sm:mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span className="hidden xs:inline">Capturing Screenshots...</span>
                      <span className="xs:hidden">Capturing...</span>
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* File Upload */}
            {inputMethod === 'upload' && (
              <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-200">
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                      Desktop Screenshot
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'desktop')}
                      className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm"
                    />
                    {desktopSrc && (
                      <div className="mt-2 sm:mt-3">
                        <img src={desktopSrc} alt="Desktop preview" className="upload-preview max-w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                      Mobile Screenshot (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'mobile')}
                      className="form-input w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm"
                    />
                    {mobileSrc && (
                      <div className="mt-2 sm:mt-3">
                        <img src={mobileSrc} alt="Mobile preview" className="upload-preview max-w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleUploadComplete}
                    className="action-btn w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    Continue
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Template Selection */}
        {currentStep === 2 && (
          <div>
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="step-title text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Choose a Template</h2>
              <p className="step-subtitle text-sm sm:text-base text-gray-600">Select a layout that best fits your needs</p>
            </div>

            <div className="template-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-gray-200 hover:border-blue-600 transition-all text-left group"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 sm:mb-4 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {template.devices.desktop.enabled && (
                        <div className="w-12 sm:w-16 h-8 sm:h-10 bg-white rounded shadow-lg mr-2" />
                      )}
                      {template.devices.mobile?.enabled && (
                        <div className="w-4 sm:w-6 h-10 sm:h-12 bg-white rounded-lg shadow-lg" />
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">{template.description}</p>
                  <div className="mt-3 sm:mt-4 text-blue-600 font-semibold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 group-hover:gap-2 sm:group-hover:gap-3 transition-all">
                    Select Template
                    <ArrowRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Customize */}
        {currentStep === 3 && templateData && (
          <div className="customize-layout grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Show skeleton if images are still loading */}
            {(!desktopSrc && !mobileSrc) || imagesLoading ? (
              <>
                {/* Skeleton Customization Panel - Hidden on mobile */}
                <div className="skeleton-panel lg:col-span-1 space-y-6 hidden lg:block">
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
                <div className="customize-preview lg:col-span-2 order-first lg:order-none">
                  <div className="preview-container bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 lg:sticky lg:top-24">
                    <div className="h-5 sm:h-6 bg-gray-200 rounded w-24 mb-3 sm:mb-4 animate-pulse" />
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="animate-spin mx-auto mb-2 sm:mb-3 text-blue-600" size={36} />
                        <p className="text-gray-600 font-medium text-sm sm:text-base">Loading your screenshots...</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">This may take a moment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Actual Customization Panel - Scrollable */}
                <div className="customize-controls lg:col-span-1 order-last lg:order-none">
                  <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2">
                    <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200">
                    <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Customize</h3>

                {/* Background Type Toggle */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setUseGradient(false)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        !useGradient 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      onClick={() => setUseGradient(true)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        useGradient 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Gradient
                    </button>
                  </div>

                  {/* Color Preview */}
                  <div className="relative mb-3">
                    <div 
                      className="w-full h-10 sm:h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition-all"
                      style={{ 
                        background: useGradient 
                          ? `linear-gradient(${gradientDirection}, ${bgColor}, ${bgColor2})`
                          : bgColor 
                      }}
                      onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                    />
                    {showBgColorPicker && (
                      <div className="color-picker-popup absolute z-20 mt-2 left-0 sm:left-auto">
                        <div 
                          className="fixed inset-0" 
                          onClick={() => setShowBgColorPicker(false)}
                        />
                        <div className="relative bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">{useGradient ? 'Color 1 (Start)' : 'Background Color'}</p>
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

                  {/* Gradient Color 2 */}
                  {useGradient && (
                    <div className="relative mb-3">
                      <p className="text-xs text-gray-500 mb-1">Color 2 (End)</p>
                      <div 
                        className="w-full h-10 sm:h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition-all"
                        style={{ backgroundColor: bgColor2 }}
                        onClick={() => setShowBgColor2Picker(!showBgColor2Picker)}
                      />
                      {showBgColor2Picker && (
                        <div className="color-picker-popup absolute z-20 mt-2 left-0 sm:left-auto">
                          <div 
                            className="fixed inset-0" 
                            onClick={() => setShowBgColor2Picker(false)}
                          />
                          <div className="relative bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                            <HexColorPicker color={bgColor2} onChange={setBgColor2} />
                            <input
                              type="text"
                              className="w-full mt-2 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono text-center"
                              value={bgColor2.toUpperCase()}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                                  setBgColor2(value);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gradient Direction */}
                  {useGradient && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Direction</p>
                      <div className="grid grid-cols-4 gap-1">
                        {gradientDirections.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setGradientDirection(value)}
                            className={`py-2 rounded text-sm font-medium transition-all ${
                              gradientDirection === value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={value}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Palette */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {extractedColors.length > 0 ? 'Extracted & Preset Colors' : 'Preset Colors'}
                    </p>
                    <div className="preset-colors-grid grid grid-cols-4 gap-2">
                      {presetColors.map(({ color, name }, index) => (
                        <button
                          key={`${color}-${index}`}
                          onClick={() => setBgColor(color)}
                          className={`w-full aspect-square rounded-lg border-2 transition-all ${
                            index < extractedColors.length 
                              ? 'border-blue-400 ring-1 ring-blue-200' 
                              : 'border-gray-300'
                          } hover:border-blue-500`}
                          style={{ backgroundColor: color }}
                          title={name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Text Color */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                  <div className="relative">
                    <div 
                      className="w-full h-10 sm:h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition-all"
                      style={{ backgroundColor: textColor }}
                      onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                    />
                    {showTextColorPicker && (
                      <div className="color-picker-popup absolute z-20 mt-2 left-0 sm:left-auto">
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
                  {/* Text color presets from extracted colors */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {presetColors.slice(0, 4).map(({ color, name }, index) => (
                      <button
                        key={`text-${color}-${index}`}
                        onClick={() => setTextColor(color)}
                        className="w-full aspect-square rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-all"
                        style={{ backgroundColor: color }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="form-select w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    style={{ fontFamily: fontFamily }}
                  >
                    {availableFonts.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">Preview: <span style={{ fontFamily: fontFamily, fontSize: '14px' }}>The quick brown fox jumps</span></p>
                </div>

                {/* Shadow Toggle */}
                <div className="mb-4 sm:mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableShadow}
                      onChange={(e) => setEnableShadow(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Enable Shadow</span>
                  </label>
                </div>

                {/* Mockup Toggle */}
                <div className="mb-4 sm:mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMockups}
                      onChange={(e) => setEnableMockups(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Show Device Frames</span>
                  </label>
                </div>

                {/* Text Content Editing */}
                {templateData.elements && templateData.elements.filter(el => el.type === 'text').length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 sm:mb-3">Edit Text</h4>
                    {templateData.elements.filter(el => el.type === 'text').map(element => (
                      <div key={element.id} className="mb-3 sm:mb-4">
                        <label className="block text-xs text-gray-600 mb-1 capitalize">
                          {element.id.replace('-', ' ')}
                        </label>
                        <input
                          type="text"
                          value={textContents[element.id] !== undefined ? textContents[element.id] : element.content}
                          onChange={(e) => handleTextChange(element.id, e.target.value)}
                          className="form-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder={element.content}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={handleDownload}
                  className="action-btn w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Download size={18} />
                  Download Image
                </button>
                
                {/* Debug: Refresh Template Button */}
                <button
                  onClick={refreshTemplate}
                  className="action-btn w-full bg-blue-100 text-blue-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-blue-200 transition-all flex items-center justify-center gap-2 border border-blue-300 text-sm sm:text-base"
                  title="Reload template from JSON file (for debugging)"
                >
                  <RefreshCw size={18} />
                  Refresh Template
                </button>
                
                <button
                  onClick={resetAll}
                  className="action-btn w-full bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-gray-300 transition-all text-sm sm:text-base"
                >
                  Start Over
                </button>
                  </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="customize-preview lg:col-span-2 order-first lg:order-none">
                  <div className="preview-container bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 lg:sticky lg:top-24">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                      <h3 className="font-bold text-base sm:text-lg">Preview</h3>
                      
                      {/* Debug Info */}
                      {templateData && (
                        <div className="debug-info text-[10px] sm:text-xs text-gray-500 flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded">
                            {templateData.name}
                          </span>
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded font-mono">
                            {templateData.canvas.width} × {templateData.canvas.height}
                          </span>
                          {templateData.devices.desktop?.mockupImage && (
                            <span className="hidden sm:inline px-2 py-1 bg-blue-50 text-blue-600 rounded font-mono text-[10px]">
                              D: {templateData.devices.desktop.mockupImage}
                            </span>
                          )}
                          {templateData.devices.mobile?.mockupImage && (
                            <span className="hidden sm:inline px-2 py-1 bg-purple-50 text-purple-600 rounded font-mono text-[10px]">
                              M: {templateData.devices.mobile.mockupImage}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="canvas-container overflow-auto max-h-[40vh] sm:max-h-[50vh] lg:max-h-[calc(100vh-200px)]">
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
