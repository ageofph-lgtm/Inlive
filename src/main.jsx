import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Remove any stale PWA service worker/caches that may still be controlling
// this origin from an earlier build — they can serve outdated JS chunks and
// cause duplicate React copies (e.g. "Cannot read properties of null (reading 'useState')").
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
  if (window.caches) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)