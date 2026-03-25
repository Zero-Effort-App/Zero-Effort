import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Capture console logs for on-screen debugging
window.debugLogs = window.debugLogs || [];
const maxLogs = 100; // Increased for better debugging

// Load persisted logs from localStorage
const persistedLogs = localStorage.getItem('debug_logs');
if (persistedLogs) {
  try {
    const parsedLogs = JSON.parse(persistedLogs);
    window.debugLogs = parsedLogs.slice(-maxLogs); // Keep only last maxLogs
    console.log('Loaded', window.debugLogs.length, 'persisted logs');
  } catch (e) {
    console.log('Failed to load persisted logs:', e);
    window.debugLogs = [];
  }
}

// Override console.log to capture messages
const originalConsoleLog = console.log;
console.log = function(...args) {
  // Call original console.log
  originalConsoleLog.apply(console, args);
  
  // Add to debug logs
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  window.debugLogs.push({
    timestamp,
    message,
    type: 'log'
  });
  
  // Keep only last maxLogs messages
  if (window.debugLogs.length > maxLogs) {
    window.debugLogs.shift();
  }
  
  // Persist to localStorage
  try {
    localStorage.setItem('debug_logs', JSON.stringify(window.debugLogs));
  } catch (e) {
    console.log('Failed to persist logs:', e);
  }
  
  // Trigger update for debug panel
  if (window.updateDebugPanel) {
    window.updateDebugPanel();
  }
};

// Override console.error
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  window.debugLogs.push({
    timestamp,
    message,
    type: 'error'
  });
  
  if (window.debugLogs.length > maxLogs) {
    window.debugLogs.shift();
  }
  
  try {
    localStorage.setItem('debug_logs', JSON.stringify(window.debugLogs));
  } catch (e) {
    console.log('Failed to persist logs:', e);
  }
  
  if (window.updateDebugPanel) {
    window.updateDebugPanel();
  }
};

// Override console.warn
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  originalConsoleWarn.apply(console, args);
  
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  window.debugLogs.push({
    timestamp,
    message,
    type: 'warn'
  });
  
  if (window.debugLogs.length > maxLogs) {
    window.debugLogs.shift();
  }
  
  try {
    localStorage.setItem('debug_logs', JSON.stringify(window.debugLogs));
  } catch (e) {
    console.log('Failed to persist logs:', e);
  }
  
  if (window.updateDebugPanel) {
    window.updateDebugPanel();
  }
};

// Log debug mode status
const debugMode = localStorage.getItem('debug_mode') === 'true';
console.log('Debug mode:', debugMode ? 'ENABLED' : 'DISABLED');

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration.scope);
      })
      .catch(error => {
        console.error('SW registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
