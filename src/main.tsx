import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installNetwatch } from './ai/netwatch';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Firebase is only imported by lazily loaded screens, so installing the network watcher here
// guarantees it is in place before any request to a Google endpoint can be made.
installNetwatch();

// The service worker serves the copy saved on the last visit (so Lantern opens with no network).
// When a newer version has been installed, reload once so nobody keeps running an old build.
// A review in progress is kept in IndexedDB, so the reload loses nothing.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
