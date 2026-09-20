import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Landing from './components/Landing.jsx'
import Controls from './components/Controls.jsx'
import NotFound from './components/NotFound.jsx'
import SiteFooter from './components/SiteFooter.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<App />} />
        <Route path="/controls" element={<Controls />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SiteFooter />
    </BrowserRouter>
  </StrictMode>,
)
