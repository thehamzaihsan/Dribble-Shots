import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, Zap, Layers, Monitor, Globe, Play, Download, Link2, Palette } from 'lucide-react';

function Landing() {
  return (
    <div className="landing-page min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Landing Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className='-mr-2 sm:-mr-4'>
                <svg className="w-[50px] h-[50px] sm:w-[65px] sm:h-[65px]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <clipPath id="clip_path_landing">
                      <rect width="100" height="100" rx="16" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#clip_path_landing)">
                    <rect width="100" height="100" fill="#FFFFFF" fillRule="evenodd" />
                    <g transform="translate(20 -5)">
                      <g transform="translate(1.655 0)">
                        <path d="M27.5 0L55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0Z" />
                        <path d="M27.5 10.6241L9 22.2286L9 46.7714L27.5 58.3759L46 46.7714L46 22.2286L27.5 10.6241ZM55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0L55 17.25Z" fill="#5151E3" fillRule="evenodd" />
                      </g>
                      <g transform="translate(1.655 42)">
                        <path d="M27.5 0L55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0Z" />
                        <path d="M27.5 10.6241L9 22.2286L9 46.7714L27.5 58.3759L46 46.7714L46 22.2286L27.5 10.6241ZM55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0L55 17.25Z" fill="#5151E3" fillRule="evenodd" />
                      </g>
                      <rect width="59" height="28" fill="#FFFFFF" fillRule="evenodd" />
                      <rect width="59" height="28" fill="#FFFFFF" fillRule="evenodd" transform="translate(0 83)" />
                    </g>
                  </g>
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Portfolio Shots
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500">by Hexa Devs</p>
              </div>
            </div>
            <Link
              to="/app"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 sm:px-6 rounded-lg font-semibold hover:shadow-lg transition-all text-sm sm:text-base"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
                <Sparkles size={16} />
                <span>Turn websites into stunning mockups</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Create Beautiful
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Portfolio Shots</span>
                <br />in Seconds
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
                Transform any website URL into professional portfolio mockups with device frames, custom colors, and beautiful gradients. Perfect for designers and developers.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/app"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all text-lg flex items-center justify-center gap-2"
                >
                  Start Creating Free
                  <ArrowRight size={20} />
                </Link>
                <a
                  href="#how-it-works"
                  className="bg-white text-gray-700 py-4 px-8 rounded-xl font-semibold hover:shadow-lg transition-all text-lg flex items-center justify-center gap-2 border border-gray-200"
                >
                  <Play size={20} />
                  See How It Works
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <span>100% Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <span>No Sign-up Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <span>Instant Download</span>
                </div>
              </div>
            </div>

            {/* Right: Hero Image/Demo */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 sm:p-8 shadow-2xl">
                {/* Mock browser window */}
                <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 text-center">
                      portfolioshots.app
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
                    <div className="flex items-end gap-4">
                      {/* Desktop mockup */}
                      <div className="w-40 sm:w-48 bg-gray-800 rounded-lg p-1 shadow-xl">
                        <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded h-24 sm:h-28"></div>
                      </div>
                      {/* Mobile mockup */}
                      <div className="w-12 sm:w-14 bg-gray-800 rounded-xl p-0.5 shadow-xl -mb-2">
                        <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg h-20 sm:h-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-medium">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-orange-400"></div>
                  <span>Custom Colors</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-medium">
                  <Monitor size={16} className="text-blue-600" />
                  <span>Device Frames</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features to create stunning portfolio mockups without any design skills
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Auto Screenshot</h3>
              <p className="text-gray-600">
                Just paste your URL and we'll capture beautiful desktop and mobile screenshots automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 sm:p-8 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Layers className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Pro Templates</h3>
              <p className="text-gray-600">
                Choose from professionally designed templates with various layouts and device combinations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 sm:p-8 bg-gradient-to-br from-cyan-50 to-white rounded-2xl border border-cyan-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Palette className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Colors</h3>
              <p className="text-gray-600">
                We extract colors from your website automatically and suggest matching palettes.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 sm:p-8 bg-gradient-to-br from-pink-50 to-white rounded-2xl border border-pink-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gradient Backgrounds</h3>
              <p className="text-gray-600">
                Add beautiful gradient backgrounds with 8 direction options for that perfect look.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 sm:p-8 bg-gradient-to-br from-orange-50 to-white rounded-2xl border border-orange-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Monitor className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Device Frames</h3>
              <p className="text-gray-600">
                Add realistic device mockups including desktop monitors and mobile phones.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 sm:p-8 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Export</h3>
              <p className="text-gray-600">
                Download your high-resolution mockup instantly as a PNG file. No watermarks, ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create stunning mockups in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Link2 className="text-white" size={36} />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg font-bold text-blue-600 shadow-md">
                  1
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enter URL</h3>
              <p className="text-gray-600">
                Paste your website URL or upload your own screenshots. We'll capture both desktop and mobile views.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Layers className="text-white" size={36} />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg font-bold text-purple-600 shadow-md">
                  2
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Pick Template</h3>
              <p className="text-gray-600">
                Choose from our collection of professionally designed templates with different layouts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Download className="text-white" size={36} />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg font-bold text-cyan-600 shadow-md">
                  3
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Customize & Download</h3>
              <p className="text-gray-600">
                Customize colors, add gradients, edit text, and download your high-res mockup instantly.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/app"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-10 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all text-lg inline-flex items-center gap-2"
            >
              Try It Now - It's Free
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white rounded-full opacity-10"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white rounded-full opacity-10"></div>
            </div>
            
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Ready to Create Your Portfolio Shot?
              </h2>
              <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join thousands of designers and developers creating stunning mockups. No sign-up required.
              </p>
              <Link
                to="/app"
                className="bg-white text-blue-600 py-4 px-10 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all text-lg inline-flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <clipPath id="clip_path_footer">
                    <rect width="100" height="100" rx="16" />
                  </clipPath>
                </defs>
                <g clipPath="url(#clip_path_footer)">
                  <rect width="100" height="100" fill="#1F2937" fillRule="evenodd" />
                  <g transform="translate(20 -5)">
                    <g transform="translate(1.655 0)">
                      <path d="M27.5 10.6241L9 22.2286L9 46.7714L27.5 58.3759L46 46.7714L46 22.2286L27.5 10.6241ZM55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0L55 17.25Z" fill="#5151E3" fillRule="evenodd" />
                    </g>
                    <g transform="translate(1.655 42)">
                      <path d="M27.5 10.6241L9 22.2286L9 46.7714L27.5 58.3759L46 46.7714L46 22.2286L27.5 10.6241ZM55 17.25L55 51.75L27.5 69L0 51.75L0 17.25L27.5 0L55 17.25Z" fill="#5151E3" fillRule="evenodd" />
                    </g>
                    <rect width="59" height="28" fill="#1F2937" fillRule="evenodd" />
                    <rect width="59" height="28" fill="#1F2937" fillRule="evenodd" transform="translate(0 83)" />
                  </g>
                </g>
              </svg>
              <div>
                <span className="text-white font-bold">Portfolio Shots</span>
                <p className="text-sm">by Hexa Devs</p>
              </div>
            </div>
            
            <p className="text-sm text-center md:text-right">
              Made with care for designers & developers worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
