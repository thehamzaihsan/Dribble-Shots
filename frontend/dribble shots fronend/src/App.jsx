import { useState, useRef, useEffect } from 'react';
import { Camera, Download, Monitor, Smartphone, Palette, Info, Sparkles, Link2, Eye, Layers } from 'lucide-react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [desktopSrc, setDesktopSrc] = useState(null);
  const [mobileSrc, setMobileSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [displayMode, setDisplayMode] = useState('both');
  const canvasRef = useRef(null);

  const presetColors = [
    { color: '#ffffff', name: 'White' },
    { color: '#fafafa', name: 'Light Gray' },
    { color: '#0f0f17', name: 'Dark' },
    { color: '#1a1a28', name: 'Charcoal' },
    { color: '#0c1222', name: 'Navy' },
    { color: '#0d1117', name: 'GitHub' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#8b5cf6', name: 'Violet' },
  ];

  useEffect(() => {
    if (desktopSrc && mobileSrc && canvasRef.current) {
      drawCanvas();
    }
  }, [desktopSrc, mobileSrc, bgColor, displayMode]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 1920, 1080);

    const desktopImg = new Image();
    const mobileImg = new Image();

    let desktopLoaded = false;
    let mobileLoaded = false;

    const checkAndDraw = () => {
      if (displayMode === 'desktop' && desktopLoaded) {
        drawDesktopOnly(ctx, desktopImg);
      } else if (displayMode === 'mobile' && mobileLoaded) {
        drawMobileOnly(ctx, mobileImg);
      } else if (displayMode === 'both' && desktopLoaded && mobileLoaded) {
        drawBoth(ctx, desktopImg, mobileImg);
      }
    };

    const drawDesktopOnly = (ctx, img) => {
      const topGap = 1080 * 0.15;
      const leftPadding = 120;
      const rightPadding = 120;
      const availableWidth = 1920 - leftPadding - rightPadding;
      const availableHeight = 1080 - topGap;

      const sourceHeight = Math.min(img.height, img.width * (availableHeight / availableWidth));
      ctx.drawImage(img, 0, 0, img.width, sourceHeight, leftPadding, topGap, availableWidth, availableHeight);
    };

    const drawMobileOnly = (ctx, img) => {
      const topGap = 1080 * 0.1;
      const displayWidth = 500;
      const displayHeight = 1080 - topGap;
      const x = (1920 - displayWidth) / 2;

      const sourceHeight = Math.min(img.height, img.width * (displayHeight / displayWidth));
      ctx.drawImage(img, 0, 0, img.width, sourceHeight, x, topGap, displayWidth, displayHeight);
    };

    const drawBoth = (ctx, desktopImg, mobileImg) => {
      const leftPadding = 60;
      const rightPadding = 60;
      const gap = 40;

      const desktopTopGap = 1080 * 0.2;
      const desktopAvailableWidth = (1920 - leftPadding - rightPadding - gap) * 0.75;
      const desktopAvailableHeight = 1080 - desktopTopGap;

      const desktopSourceHeight = Math.min(
        desktopImg.height,
        desktopImg.width * (desktopAvailableHeight / desktopAvailableWidth)
      );

      ctx.drawImage(
        desktopImg,
        0, 0, desktopImg.width, desktopSourceHeight,
        leftPadding, desktopTopGap, desktopAvailableWidth, desktopAvailableHeight
      );

      const mobileTopGap = 1080 * 0.3;
      const mobileAvailableWidth = (1920 - leftPadding - rightPadding - gap) * 0.25;
      const mobileAvailableHeight = 1080 - mobileTopGap;
      const mobileX = leftPadding + desktopAvailableWidth + gap;

      const mobileSourceHeight = Math.min(
        mobileImg.height,
        mobileImg.width * (mobileAvailableHeight / mobileAvailableWidth)
      );

      ctx.drawImage(
        mobileImg,
        0, 0, mobileImg.width, mobileSourceHeight,
        mobileX, mobileTopGap, mobileAvailableWidth, mobileAvailableHeight
      );
    };

    desktopImg.onload = () => {
      desktopLoaded = true;
      checkAndDraw();
    };

    mobileImg.onload = () => {
      mobileLoaded = true;
      checkAndDraw();
    };

    if (desktopSrc) desktopImg.src = desktopSrc;
    if (mobileSrc) mobileImg.src = mobileSrc;
  };

  const handleScreenshot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDesktopSrc(null);
    setMobileSrc(null);

    try {
      const response = await fetch(`http://localhost:8000/screenshot-both?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        throw new Error('Failed to capture screenshots');
      }

      const data = await response.json();
      setDesktopSrc(`data:image/png;base64,${data.desktop}`);
      setMobileSrc(`data:image/png;base64,${data.mobile}`);
    } catch (err) {
      setError("Could not screenshot that site. Make sure your backend server is running on localhost:8000.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `portfolio-shot-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <Camera size={22} className="text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PortfolioShot</h1>
                <p className="text-xs text-gray-400">Beautiful mockups in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                <Layers size={12} />
                <span className="text-xs">1920×1080</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-white/5 backdrop-blur-xl p-6 flex flex-col gap-6 overflow-y-auto flex-shrink-0">
          {/* URL Input Section */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={16} className="text-blue-400" />
              <h2 className="font-semibold text-sm text-white">Website URL</h2>
            </div>
            <form onSubmit={handleScreenshot} className="space-y-3">
              <input
                type="text"
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button
                type="submit"
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/50'
                }`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Capturing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Display Mode Section */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} className="text-blue-400" />
              <h2 className="font-semibold text-sm text-white">Display Mode</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'both', label: 'Both', icons: [Monitor, Smartphone] },
                { value: 'desktop', label: 'Desktop', icons: [Monitor] },
                { value: 'mobile', label: 'Mobile', icons: [Smartphone] },
              ].map((mode) => (
                <button
                  key={mode.value}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${
                    displayMode === mode.value
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                  onClick={() => setDisplayMode(mode.value)}
                >
                  <div className="flex items-center gap-0.5">
                    {mode.icons.map((Icon, i) => <Icon key={i} size={mode.icons.length > 1 ? 14 : 16} />)}
                  </div>
                  <span className="text-xs font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Color Section */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={16} className="text-blue-400" />
              <h2 className="font-semibold text-sm text-white">Background</h2>
            </div>

            {/* Color picker */}
            <div className="mb-4">
              <div className="relative group">
                <input
                  type="color"
                  className="w-full h-14 rounded-xl cursor-pointer opacity-0 absolute inset-0 z-10"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                />
                <div
                  className="w-full h-14 rounded-xl border-2 border-white/10 transition-all duration-200 group-hover:border-white/30"
                  style={{ backgroundColor: bgColor }}
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 rounded text-xs font-mono text-white">
                  {bgColor.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Preset colors */}
            <div>
              <p className="text-xs text-gray-400 mb-3">Presets</p>
              <div className="grid grid-cols-4 gap-2">
                {presetColors.map(({ color, name }) => (
                  <button
                    key={color}
                    className={`w-full h-10 rounded-lg transition-all duration-200 border-2 ${
                      bgColor === color
                        ? 'border-blue-400 scale-110'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBgColor(color)}
                    title={name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Download Section */}
          <div className="space-y-3">
            <button
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                desktopSrc && mobileSrc
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              onClick={handleDownload}
              disabled={!desktopSrc || !mobileSrc}
            >
              <Download size={18} />
              Download PNG
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Info size={14} className="text-blue-400 shrink-0" />
              <span className="text-xs text-blue-300">Full HD output • 1920×1080px</span>
            </div>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 p-8 overflow-auto flex items-center justify-center">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {!desktopSrc && !mobileSrc && !loading && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-16 text-center max-w-lg">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center animate-bounce">
                  <Camera size={48} className="text-blue-400" />
                </div>
                <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl -z-10" />
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Create Beautiful Shots</h2>
              <p className="text-gray-400 leading-relaxed">
                Enter any website URL to generate professional portfolio mockups showcasing desktop and mobile views.
              </p>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Monitor size={16} />
                  <span>Desktop</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <Smartphone size={14} />
                  <span>Mobile</span>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <span className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></span>
                <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl -z-10 animate-pulse" />
              </div>
              <p className="text-lg font-medium bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Capturing screenshots...</p>
              <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
            </div>
          )}

          {desktopSrc && mobileSrc && (
            <div className="flex flex-col items-center w-full">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 shadow-2xl">
                <canvas
                  ref={canvasRef}
                  className="rounded-lg"
                  style={{ width: '100%', maxWidth: '1200px', height: 'auto' }}
                />
              </div>
              <p className="mt-4 text-sm text-gray-400">
                Click "Download PNG" to save your mockup
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
