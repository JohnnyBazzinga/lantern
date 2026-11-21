import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installNetwatch } from './ai/netwatch';
import App from './App';
import './index.css';

// Firebase is only imported by lazily loaded screens, so installing the network watcher here
// guarantees it is in place before any request to a Google endpoint can be made.
installNetwatch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
