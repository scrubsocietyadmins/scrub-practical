import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { pwaManager } from './services/pwaService.ts';
import './index.css';

// Initialize PWA Service Worker
pwaManager.registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
