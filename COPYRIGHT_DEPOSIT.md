# ZERO EFFORT TECH PARK - SOURCE CODE COPYRIGHT DEPOSIT

**Application Name:** Zero Effort Tech Park  
**Type:** Web Application (React + Node.js)  
**Date:** March 26, 2026  
**Purpose:** IPOPHL Copyright Registration  

---

# FIRST 25 PAGES

## Page 1: package.json

```json
{
  "name": "zero-effort",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "server": "node server.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run server\"",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.99.0",
    "agora-access-token": "^2.0.4",
    "agora-rtc-sdk-ng": "^4.24.3",
    "agora-token": "^2.0.5",
    "axios": "^1.13.6",
    "busboy": "^1.6.0",
    "concurrently": "^8.2.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "googleapis": "^168.0.0",
    "lucide-react": "^0.577.0",
    "node-cron": "^4.2.1",
    "nodemailer": "^8.0.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.13.1",
    "sharp": "^0.34.5",
    "twilio": "^5.13.0",
    "web-push": "^3.6.7",
    "workbox-window": "^7.4.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^7.3.1"
  }
}
```

## Page 2: vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  publicDir: 'public'  // Add this line only if it's not already there
})
```

## Page 3: server.js (Lines 1-50)

```javascript
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import busboy from 'busboy';
import sharp from 'sharp';
import webpush from 'web-push';
import cron from 'node-cron';

// Load environment variables first
dotenv.config()

// Import new routes and services
import agoraRoutes from './routes/agoraRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import quotaRoutes from './routes/quotaRoutes.js';
import googleMeetRoutes from './routes/googleMeetRoutes.js';
import interviewNotificationService from './services/interviewNotificationService.js';

console.log('SUPABASE_URL loaded:', process.env.SUPABASE_URL ? 'YES' : 'NO')
console.log('Service role key loaded:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO - CHECK .env FILE')

const app = express()
app.use(cors())
app.use(express.json())

// Initialize Supabase admin client with error handling
let supabaseAdmin = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase admin client initialized');
  } else {
    console.warn('⚠️ Supabase credentials not found - some features may not work');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error.message);
}

// Initialize web-push with error handling
try {
  if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
```

## Page 4: server.js (Lines 51-100)

```javascript
    console.log('✅ Web-push initialized');
  } else {
    console.warn('⚠️ VAPID credentials not found - push notifications may not work');
  }
} catch (error) {
  console.error('❌ Failed to initialize web-push:', error.message);
}

// Create any auth account (admin or company)
app.post('/api/create-account', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  const { email, password, metadata } = req.body
  console.log('Create account request:', { email, passwordLength: password?.length, metadata })
  
  // Backend password validation
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' })
  }
  
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 uppercase letter' })
  }
  
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 lowercase letter' })
  }
  
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 number' })
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 special character' })
  }
  
  try {
    // Check if this is an applicant account (based on metadata structure)
    const isApplicant = metadata && (metadata.first_name || metadata.last_name)
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: !isApplicant, // Don't auto-confirm for applicants
      user_metadata: metadata
    })
    
    if (error) {
      console.error('Create account error:', error)
      return res.status(400).json({ error: error.message })
    }
    
    console.log('User created successfully:', data.user?.id)
    return res.json({ success: true, user: { id: data.user.id } })
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message })
  }
})
```

## Page 5: server.js (Lines 101-150)

```javascript
// Delete auth account
app.post('/api/delete-account', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  const { userId } = req.body
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// Get user by email (for admin deletion)
app.post('/api/get-user-by-email', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  const { email } = req.body
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) return res.status(400).json({ error: error.message })
    
    const user = data.users.find(u => u.email === email)
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    return res.json({ success: true, user })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  const { email, newPassword } = req.body
  console.log('Reset password request:', { email, passwordLength: newPassword?.length })
  
  // Backend password validation for reset
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' })
  }
  
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 uppercase letter' })
  }
  
  if (!/[a-z]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 lowercase letter' })
  }
  
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 number' })
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must contain at least 1 special character' })
  }
  
  try {
    // Find user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('List users error:', listError)
      return res.status(400).json({ error: listError.message })
    }

    const user = users.users.find(u => u.email === email)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    })
    if (updateError) {
      console.error('Update password error:', updateError)
      return res.status(400).json({ error: updateError.message })
    }
    
    console.log('Password reset successful for:', email)
    return res.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return res.status(500).json({ error: err.message })
  }
})
```

## Page 6: src/main.jsx (Lines 1-50)

```javascript
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
```

## Page 7: src/main.jsx (Lines 51-100)

```javascript
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
```

## Page 8: src/main.jsx (Lines 101-142)

```javascript
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
```

## Page 9: src/App.jsx (Lines 1-50)

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';
import './styles/theme.css';

// Home
import Home from './pages/Home';

// Admin
import AdminLanding from './pages/admin/AdminLanding';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminJobs from './pages/admin/AdminJobs';
import AdminEvents from './pages/admin/AdminEvents';
import AdminSettings from './pages/admin/AdminSettings';
import AdminActivity from './pages/admin/AdminActivity';
import AdminQuotaPage from './pages/admin/AdminQuotaPage';

// Company
import CompanyLanding from './pages/company/CompanyLanding';
import CompanyLogin from './pages/company/CompanyLogin';
import CompanyLayout from './pages/company/CompanyLayout';
import CompanyDashboard from './pages/company/CompanyDashboard';
import CompanyListings from './pages/company/CompanyListings';
import CompanyApplicants from './pages/company/CompanyApplicants';
import CompanyInbox from './pages/company/CompanyInbox';
import CompanyProfile from './pages/company/CompanyProfile';

// Applicant
import ApplicantLanding from './pages/applicant/ApplicantLanding';
import ApplicantLogin from './pages/applicant/ApplicantLogin';
import ApplicantLayout from './pages/applicant/ApplicantLayout';
import ApplicantHome from './pages/applicant/ApplicantHome';
import ApplicantJobs from './pages/applicant/ApplicantJobs';
import ApplicantCompanies from './pages/applicant/ApplicantCompanies';
import ApplicantApplications from './pages/applicant/ApplicantApplications';
import ApplicantProfile from './pages/applicant/ApplicantProfile';
import ApplicantResetPassword from './pages/applicant/ApplicantResetPassword';
import ApplicantInbox from './pages/applicant/ApplicantInbox';
import ApplicantEvents from './pages/applicant/ApplicantEvents';
```

## Page 10: src/App.jsx (Lines 51-100)

```javascript
// Debug route component
function DebugRoute() {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Enable debug mode
    localStorage.setItem('debug_mode', 'true');
    
    // Show confirmation message
    const message = document.createElement('div');
    message.textContent = '🔍 Debug mode enabled';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 14px;
      z-index: 10000;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (document.body.contains(message)) {
        document.body.removeChild(message);
      }
    }, 2000);
    
    console.log('Debug mode ENABLED via /debug route');
    
    // Redirect to applicant after 2 seconds
    setTimeout(() => {
      navigate('/applicant');
    }, 2000);
  }, [navigate]);
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg1)',
      color: 'var(--text1)',
      fontFamily: 'monospace'
    }}>
      <div>Enabling debug mode...</div>
    </div>
  );
}

// AppWithServices component
function AppWithServices() {
  const { user } = useAuth();

  // Register Service Worker on component mount
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
    }
  }, []);

  return (
    <>
      <Routes>
        {/* Debug Route */}
        <Route path="/debug" element={<DebugRoute />} />

        {/* Public Routes */}
        <Route path="/" element={<Home />} />

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLanding />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminLayout />} />
```

## Page 11: src/App.jsx (Lines 101-150)

```javascript
        {/* Company Portal */}
        <Route path="/company" element={<CompanyLanding />} />
        <Route path="/company/login" element={<CompanyLogin />} />
        <Route path="/company/*" element={<CompanyLayout />} />

        {/* Applicant Portal */}
        <Route path="/applicant" element={<ApplicantLanding />} />
        <Route path="/applicant/login" element={<ApplicantLogin />} />
        <Route path="/applicant/reset-password" element={<ApplicantResetPassword />} />
        <Route path="/applicant/*" element={<ApplicantLayout />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppWithServices />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
```

## Page 12: public/sw.js (Lines 1-50)

```javascript
const CACHE_NAME = 'zero-effort-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/zero-effort-logo-white.png',
  '/zero-effort-logo-dark.png',
  '/zero-effort-icon-white.png',
  '/zero-effort-icon-dark.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

## Page 13: public/sw.js (Lines 51-100)

```javascript
// Handle push notifications
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('No data in push notification');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/logo-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: {
        interviewId: data.interviewId,
        applicantId: data.applicantId,
        companyId: data.companyId,
        notificationType: data.notificationType,
        url: data.url || '/dashboard'
      },
      vibrate: [200, 100, 200]
    };

    if (data.image) {
      options.image = data.image;
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
    // Fallback to basic notification
    const title = data.title || 'Zero Effort';
    const options = {
      body: data.body || 'You have a new message',
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});
```

## Page 14: public/sw.js (Lines 101-117)

```javascript
// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      function(windowClients) {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }
    )
  );
});
```

## Page 15: src/contexts/AuthContext.jsx (Lines 1-50)

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

// Environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://[REDACTED].supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '[REDACTED]';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      setProfile(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };
```

## Page 16: src/contexts/AuthContext.jsx (Lines 51-100)

```javascript
  const signUp = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: { message: 'No user logged in' } };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error) {
      setProfile(data);
    }
    return { data, error };
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Page 17: src/contexts/ThemeContext.jsx

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check for saved theme preference or default to 'dark'
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

## Page 18: src/contexts/ToastContext.jsx

```javascript
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const value = {
    toasts,
    showToast,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
```

## Page 19: src/lib/supabase.js

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://[REDACTED].supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '[REDACTED]';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

## Page 20: src/lib/pushNotifications.js

```javascript
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '[REDACTED]';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId, userType) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Save subscription to backend
    const response = await fetch('https://zero-effort-server.onrender.com/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      body: JSON.stringify({
        subscription: subscription,
        userId: userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    return true;
  } catch (err) {
    console.error('Push subscription error:', err);
    return false;
  }
}

export async function sendPushNotification(userId, userType, title, body, url) {
  try {
    const response = await fetch('https://zero-effort-server.onrender.com/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        user_type: userType,
        title,
        body,
        url
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}
```

## Page 21: src/styles/theme.css (Lines 1-50)

```css
/* CSS Custom Properties for Theming */
:root[data-theme="light"] {
  --bg1: #ffffff;
  --bg2: #f8fafc;
  --bg3: #f1f5f9;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text1: #1e293b;
  --text2: #64748b;
  --text3: #94a3b8;
  --accent: #3b82f6;
  --accent2: #06b6d4;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --shadow: rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] {
  --bg1: #0f172a;
  --bg2: #1e293b;
  --bg3: #334155;
  --surface: #1e293b;
  --border: #334155;
  --text1: #f8fafc;
  --text2: #cbd5e1;
  --text3: #94a3b8;
  --accent: #3b82f6;
  --accent2: #06b6d4;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --shadow: rgba(0, 0, 0, 0.3);
}

/* Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg1);
  color: var(--text1);
  line-height: 1.6;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Common utility classes */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-4 {
  gap: 1rem;
}
```

## Page 22: src/styles/theme.css (Lines 51-100)

```css
/* Button styles */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background-color: var(--accent);
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--bg2);
  color: var(--text1);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background-color: var(--bg3);
}

.btn-outline {
  background-color: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
}

.btn-outline:hover {
  background-color: var(--accent);
  color: white;
}

/* Card styles */
.card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px var(--shadow);
}

.card-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text1);
}

.card-description {
  font-size: 14px;
  color: var(--text2);
  margin-top: 4px;
}

/* Form styles */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text1);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background-color: var(--bg1);
  color: var(--text1);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
  color: var(--text3);
}

/* Toast styles */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px var(--shadow);
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.toast-success {
  background-color: var(--success);
  color: white;
}

.toast-error {
  background-color: var(--error);
  color: white;
}

.toast-warning {
  background-color: var(--warning);
  color: white;
}

.toast-info {
  background-color: var(--accent);
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

## Page 23: src/pages/Home.jsx (Lines 1-50)

```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, Calendar, Building } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ZE</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Zero Effort</span>
            </div>
            <nav className="flex space-x-6">
              <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                Admin
              </Link>
              <Link to="/company" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                Company
              </Link>
              <Link to="/applicant" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                Applicant
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Zero Effort Tech Park
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Connect talented job seekers with innovative companies. Streamline your recruitment process with our comprehensive platform.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              to="/applicant" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Find Jobs
            </Link>
            <Link 
              to="/company" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Post Jobs
            </Link>
          </div>
        </div>
      </section>
```

## Page 24: src/pages/Home.jsx (Lines 51-100)

```javascript
      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose Zero Effort?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Smart Matching
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI-powered matching connects the right candidates with the right opportunities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Easy Communication
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Built-in messaging and video calling make communication seamless.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Schedule Interviews
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Schedule and manage interviews with our integrated calendar system.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Company Profiles
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Detailed company profiles help candidates make informed decisions.
              </p>
            </div>
          </div>
        </div>
      </section>
```

## Page 25: src/pages/Home.jsx (Lines 101-150)

```javascript
      {/* Stats Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                1000+
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Active Companies
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                5000+
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Job Seekers
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                95%
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Success Rate
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ZE</span>
                </div>
                <span className="text-xl font-bold">Zero Effort</span>
              </div>
              <p className="text-gray-400">
                Connecting talent with opportunity, effortlessly.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white">About</Link></li>
                <li><Link to="/features" className="hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link to="/cookies" className="hover:text-white">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Zero Effort Tech Park. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
```

---

# LAST 25 PAGES

## Page 1: services/callUsageService.js (Lines 110-160)

```javascript
        used: used,
        remaining: remaining,
        percentage: percentage
      };
      
      console.log('📊 Quota status for company', companyId, ':', result);
      return result;
    } catch (error) {
      console.error('Error getting remaining minutes:', error);
      return {
        total: 10000,
        used: 0,
        remaining: 10000,
        percentage: 0
      };
    }
  }

  // Get recent calls for admin
  async getRecentCalls(companyId, limit = 20) {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not available - returning empty calls list');
        return [];
      }
      
      const { data, error } = await supabase
        .from('call_usage_tracking')
        .select(`
          *,
          call_session:call_session_id(
            channel_name,
            started_at,
            ended_at
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent calls:', error);
        return [];
      }

      console.log('📊 Retrieved recent calls:', data.length, 'calls');
      return data;
    } catch (error) {
      console.error('Error getting recent calls:', error);
      return [];
    }
  }
```

## Page 2: services/callUsageService.js (Lines 161-182)

```javascript
  // Get monthly reset date
  getMonthlyResetDate() {
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return resetDate;
  }

  // Get days until reset
  getDaysUntilReset() {
    const now = new Date();
    const resetDate = this.getMonthlyResetDate();
    const diffTime = Math.abs(resetDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

const callUsageService = new CallUsageService();
export default callUsageService;
```

## Page 3: services/googleMeetService.js (Lines 60-90)

```javascript
      console.log('✅ Google Meet link generated:', meetingLink);

      return {
        success: true,
        meetingLink: meetingLink,
        eventId: meetingCode,
        channelName: channelName
      };
    } catch (error) {
      console.error('❌ Error creating Google Meet:', error.message);
      throw error;
    }
  }

  // Get meeting link (if already created)
  async getMeetingLink(eventId) {
    try {
      if (!this.enabled || !this.auth) {
        console.warn('⚠️ Google Meet service not available');
        return null;
      }
      
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      const conferenceData = response.data.conferenceData;
      if (conferenceData && conferenceData.conferenceSolution) {
        return {
          success: true,
          meetingLink: conferenceData.conferenceSolution.key.uri,
          eventId: eventId
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting Google Meet link:', error.message);
      return null;
    }
  }
```

## Page 4: services/googleMeetService.js (Lines 91-104)

```javascript
  // Delete meeting
  async deleteMeeting(eventId) {
    try {
      if (!this.enabled || !this.auth) {
        console.warn('⚠️ Google Meet service not available');
        return false;
      }
      
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      console.log('✅ Google Meet deleted:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting Google Meet:', error.message);
      return false;
    }
  }
}

const googleMeetService = new GoogleMeetService();
export default googleMeetService;
```

## Page 5: services/notificationService.js (Lines 100-150)

```javascript
  async sendEmailNotification(to, subject, htmlContent) {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email service not available');
        return false;
      }

      const mailOptions = {
        from: `"${process.env.SENDGRID_SENDER_NAME || 'Zero Effort'}" <${process.env.SENDGRID_FROM_EMAIL || '[REDACTED]'}>`,
        to: to,
        subject: subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);

      // Log email notification
      await this.logNotification({
        type: 'email',
        recipient: to,
        subject: subject,
        status: 'sent',
        message_id: info.messageId
      });

      return true;
    } catch (error) {
      console.error('❌ Email notification failed:', error);
      
      // Log failed email
      await this.logNotification({
        type: 'email',
        recipient: to,
        subject: subject,
        status: 'failed',
        error: error.message
      });

      return false;
    }
  }

  async logNotification(notificationData) {
    try {
      if (!this.supabase) {
        console.warn('⚠️ Cannot log notification - Supabase not available');
        return;
      }

      const { error } = await this.supabase
        .from('notification_logs')
        .insert({
          ...notificationData,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Failed to log notification:', error);
      }
    } catch (error) {
      console.error('❌ Notification logging error:', error);
    }
  }
```

## Page 6: services/notificationService.js (Lines 151-200)

```javascript
  async removeExpiredSubscriptions() {
    try {
      if (!this.supabase) {
        console.warn('⚠️ Cannot remove expired subscriptions - Supabase not available');
        return;
      }

      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .select('id, subscription')
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('❌ Failed to fetch old subscriptions:', error);
        return;
      }

      for (const sub of data || []) {
        try {
          const subscription = JSON.parse(sub.subscription);
          await webpush.sendNotification(subscription, JSON.stringify({
            title: 'Subscription Expired',
            body: 'Your push notification subscription has expired. Please re-enable notifications.',
            action: 'renew'
          }));
        } catch (err) {
          // Subscription is invalid, remove it
          await this.supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          
          console.log('🗑️ Removed expired subscription:', sub.id);
        }
      }

      console.log('✅ Cleaned up expired subscriptions');
    } catch (error) {
      console.error('❌ Error removing expired subscriptions:', error);
    }
  }

  async getNotificationStats(userId, userType) {
    try {
      if (!this.supabase) {
        return {
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0
        };
      }

      const { data, error } = await this.supabase
        .from('notification_logs')
        .select('status')
        .eq('recipient', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('❌ Failed to fetch notification stats:', error);
        return {
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0
        };
      }

      const stats = {
        total_sent: data.length,
        total_delivered: data.filter(n => n.status === 'sent').length,
        total_failed: data.filter(n => n.status === 'failed').length
      };

      return stats;
    } catch (error) {
      console.error('❌ Error fetching notification stats:', error);
      return {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0
      };
    }
  }
```

## Page 7: services/notificationService.js (Lines 201-260)

```javascript
  async sendBulkNotification(recipients, notification) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const recipient of recipients) {
        try {
          const success = await this.sendPushNotification(
            recipient.subscription,
            notification
          );

          if (success) {
            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            recipient: recipient.id,
            error: error.message
          });
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📊 Bulk notification sent: ${results.success} success, ${results.failed} failed`);
      return results;
    } catch (error) {
      console.error('❌ Bulk notification failed:', error);
      return {
        success: 0,
        failed: recipients.length,
        errors: [{ error: error.message }]
      };
    }
  }

  async updateNotificationPreferences(userId, preferences) {
    try {
      if (!this.supabase) {
        console.warn('⚠️ Cannot update notification preferences - Supabase not available');
        return false;
      }

      const { error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Failed to update notification preferences:', error);
        return false;
      }

      console.log('✅ Notification preferences updated for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
      return false;
    }
  }

  async getNotificationPreferences(userId) {
    try {
      if (!this.supabase) {
        return {
          push_enabled: true,
          email_enabled: true,
          message_notifications: true,
          interview_notifications: true,
          system_notifications: true
        };
      }

      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Failed to fetch notification preferences:', error);
        return null;
      }

      return data || {
        push_enabled: true,
        email_enabled: true,
        message_notifications: true,
        interview_notifications: true,
        system_notifications: true
      };
    } catch (error) {
      console.error('❌ Error fetching notification preferences:', error);
      return null;
    }
  }
}
```

## Page 8: services/notificationService.js (Lines 261-280)

```javascript
const notificationService = new NotificationService();
export default notificationService;
```

## Page 9: services/interviewNotificationService.js (Lines 100-150)

```javascript
  async sendInterviewReminder(interviewId, reminderType) {
    try {
      if (!this.supabase) {
        console.warn('⚠️ Cannot send interview reminder - Supabase not available');
        return false;
      }

      // Get interview details
      const { data: interview, error } = await this.supabase
        .from('interviews')
        .select(`
          *,
          applicant:applicant_id(
            email,
            first_name,
            last_name
          ),
          company:company_id(
            name,
            email
          )
        `)
        .eq('id', interviewId)
        .single();

      if (error || !interview) {
        console.error('❌ Failed to fetch interview details:', error);
        return false;
      }

      const reminderConfig = this.getReminderConfig(reminderType);
      const notification = {
        title: reminderConfig.title,
        body: reminderConfig.getBody(interview),
        icon: '/logo-192x192.png',
        badge: '/badge-72x72.png',
        tag: `interview-reminder-${interviewId}`,
        requireInteraction: true,
        data: {
          interviewId: interviewId,
          applicantId: interview.applicant_id,
          companyId: interview.company_id,
          notificationType: 'interview_reminder',
          url: `/applicant/interviews/${interviewId}`
        },
        actions: [
          {
            action: 'view',
            title: 'View Interview'
          },
          {
            action: 'reschedule',
            title: 'Reschedule'
          }
        ]
      };

      // Send push notification
      const pushSuccess = await this.notificationService.sendPushNotification(
        interview.applicant.email,
        notification
      );

      // Send email reminder
      const emailSuccess = await this.notificationService.sendEmailNotification(
        interview.applicant.email,
        reminderConfig.title,
        reminderConfig.getEmailTemplate(interview)
      );

      // Log reminder sent
      await this.logReminderSent(interviewId, reminderType, pushSuccess, emailSuccess);

      console.log(`✅ ${reminderType} reminder sent for interview ${interviewId}`);
      return pushSuccess || emailSuccess;
    } catch (error) {
      console.error('❌ Error sending interview reminder:', error);
      return false;
    }
  }

  getReminderConfig(reminderType) {
    const configs = {
      '24h': {
        title: 'Interview Tomorrow',
        getBody: (interview) => `Your interview with ${interview.company.name} is scheduled for tomorrow at ${new Date(interview.scheduled_time).toLocaleString()}`,
        getEmailTemplate: (interview) => this.generate24HourEmailTemplate(interview)
      },
      '1h': {
        title: 'Interview in 1 Hour',
        getBody: (interview) => `Your interview with ${interview.company.name} starts in 1 hour. Be ready!`,
        getEmailTemplate: (interview) => this.generate1HourEmailTemplate(interview)
      },
      '15m': {
        title: 'Interview Starting Soon',
        getBody: (interview) => `Your interview with ${interview.company.name} starts in 15 minutes. Join now!`,
        getEmailTemplate: (interview) => this.generate15MinuteEmailTemplate(interview)
      }
    };

    return configs[reminderType] || configs['1h'];
  }
```

## Page 10: services/interviewNotificationService.js (Lines 151-200)

```javascript
  async logReminderSent(interviewId, reminderType, pushSuccess, emailSuccess) {
    try {
      if (!this.supabase) {
        console.warn('⚠️ Cannot log reminder - Supabase not available');
        return;
      }

      const { error } = await this.supabase
        .from('interview_reminders')
        .insert({
          interview_id: interviewId,
          reminder_type: reminderType,
          push_sent: pushSuccess,
          email_sent: emailSuccess,
          sent_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Failed to log reminder:', error);
      }
    } catch (error) {
      console.error('❌ Error logging reminder:', error);
    }
  }

  generate24HourEmailTemplate(interview) {
    const interviewTime = new Date(interview.scheduled_time).toLocaleString();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1>Interview Reminder</h1>
        </div>
        <div style="padding: 20px; background: #f8fafc;">
          <p>Hello ${interview.applicant.first_name},</p>
          <p>This is a friendly reminder that you have an interview scheduled for tomorrow:</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Company:</strong> ${interview.company.name}</p>
            <p><strong>Time:</strong> ${interviewTime}</p>
            <p><strong>Type:</strong> ${interview.interview_type || 'Video Interview'}</p>
          </div>
          <p>Please make sure you have a stable internet connection and a quiet environment for the interview.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="[REDACTED]/applicant/interviews/${interview.id}" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Interview Details
            </a>
          </div>
        </div>
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2026 Zero Effort Tech Park. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  generate1HourEmailTemplate(interview) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1>⏰ Interview in 1 Hour</h1>
        </div>
        <div style="padding: 20px; background: #f8fafc;">
          <p>Hi ${interview.applicant.first_name},</p>
          <p>Your interview with <strong>${interview.company.name}</strong> starts in 1 hour!</p>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p><strong>Time:</strong> ${new Date(interview.scheduled_time).toLocaleString()}</p>
            <p><strong>Join Link:</strong> <a href="[REDACTED]/join/${interview.id}">Join Interview</a></p>
          </div>
          <p>Good luck with your interview! 🚀</p>
        </div>
      </div>
    `;
  }
```

## Page 11: services/interviewNotificationService.js (Lines 201-250)

```javascript
  generate15MinuteEmailTemplate(interview) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; color: white; padding: 20px; text-align: center;">
          <h1>🔴 Starting Now!</h1>
        </div>
        <div style="padding: 20px; background: #f8fafc;">
          <p>Hello ${interview.applicant.first_name},</p>
          <p>Your interview with <strong>${interview.company.name}</strong> is starting now!</p>
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Join immediately:</strong></p>
            <a href="[REDACTED]/join/${interview.id}" 
               style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Join Interview Now
            </a>
          </div>
        </div>
      </div>
    `;
  }

  async scheduleReminders(interviewId, scheduledTime) {
    try {
      // Schedule 24-hour reminder
      const reminder24h = new Date(scheduledTime.getTime() - 24 * 60 * 60 * 1000);
      if (reminder24h > new Date()) {
        setTimeout(async () => {
          await this.sendInterviewReminder(interviewId, '24h');
        }, reminder24h.getTime() - Date.now());
      }

      // Schedule 1-hour reminder
      const reminder1h = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
      if (reminder1h > new Date()) {
        setTimeout(async () => {
          await this.sendInterviewReminder(interviewId, '1h');
        }, reminder1h.getTime() - Date.now());
      }

      // Schedule 15-minute reminder
      const reminder15m = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
      if (reminder15m > new Date()) {
        setTimeout(async () => {
          await this.sendInterviewReminder(interviewId, '15m');
        }, reminder15m.getTime() - Date.now());
      }

      console.log(`✅ Reminders scheduled for interview ${interviewId}`);
      return true;
    } catch (error) {
      console.error('❌ Error scheduling reminders:', error);
      return false;
    }
  }

  async cancelReminders(interviewId) {
    try {
      if (!this.supabase) {
        console.warn('⚠️ Cannot cancel reminders - Supabase not available');
        return false;
      }

      const { error } = await this.supabase
        .from('interview_reminders')
        .update({ status: 'cancelled' })
        .eq('interview_id', interviewId)
        .in('status', ['scheduled', 'sent']);

      if (error) {
        console.error('❌ Failed to cancel reminders:', error);
        return false;
      }

      console.log(`✅ Reminders cancelled for interview ${interviewId}`);
      return true;
    } catch (error) {
      console.error('❌ Error cancelling reminders:', error);
      return false;
    }
  }
}
```

## Page 12: services/interviewNotificationService.js (Lines 251-280)

```javascript
const interviewNotificationService = new InterviewNotificationService();
export default interviewNotificationService;
```

## Page 13: routes/notificationRoutes.js (Lines 150-200)

```javascript
  // Test push notification
  router.post('/test', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user's subscription
      const { data: subscription, error } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId)
        .single();

      if (error || !subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      // Send test notification
      const success = await notificationService.sendPushNotification(
        JSON.parse(subscription.subscription),
        {
          title: 'Test Notification',
          body: 'This is a test notification from Zero Effort!',
          icon: '/logo-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'test',
          data: {
            url: '/dashboard'
          }
        }
      );

      if (success) {
        res.json({ success: true, message: 'Test notification sent' });
      } else {
        res.status(500).json({ error: 'Failed to send test notification' });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get notification preferences
  router.get('/preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const preferences = await notificationService.getNotificationPreferences(userId);
      
      if (preferences) {
        res.json(preferences);
      } else {
        res.status(404).json({ error: 'Preferences not found' });
      }
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update notification preferences
  router.put('/preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = req.body;
      
      const success = await notificationService.updateNotificationPreferences(userId, preferences);
      
      if (success) {
        res.json({ success: true, message: 'Preferences updated' });
      } else {
        res.status(500).json({ error: 'Failed to update preferences' });
      }
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get notification stats
  router.get('/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const stats = await notificationService.getNotificationStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 14: routes/notificationRoutes.js (Lines 201-250)

```javascript
  // Cleanup expired subscriptions
  router.post('/cleanup', async (req, res) => {
    try {
      await notificationService.removeExpiredSubscriptions();
      res.json({ success: true, message: 'Cleanup completed' });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send bulk notifications
  router.post('/bulk', async (req, res) => {
    try {
      const { recipients, notification } = req.body;
      
      if (!recipients || !notification) {
        return res.status(400).json({ error: 'Recipients and notification are required' });
      }

      const results = await notificationService.sendBulkNotification(recipients, notification);
      res.json(results);
    } catch (error) {
      console.error('Bulk notification error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Interview notifications
  router.post('/interview/reminder', async (req, res) => {
    try {
      const { interviewId, reminderType } = req.body;
      
      if (!interviewId || !reminderType) {
        return res.status(400).json({ error: 'Interview ID and reminder type are required' });
      }

      const success = await interviewNotificationService.sendInterviewReminder(interviewId, reminderType);
      
      if (success) {
        res.json({ success: true, message: 'Interview reminder sent' });
      } else {
        res.status(500).json({ error: 'Failed to send interview reminder' });
      }
    } catch (error) {
      console.error('Interview reminder error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Schedule interview reminders
  router.post('/interview/schedule', async (req, res) => {
    try {
      const { interviewId, scheduledTime } = req.body;
      
      if (!interviewId || !scheduledTime) {
        return res.status(400).json({ error: 'Interview ID and scheduled time are required' });
      }

      const success = await interviewNotificationService.scheduleReminders(interviewId, new Date(scheduledTime));
      
      if (success) {
        res.json({ success: true, message: 'Reminders scheduled' });
      } else {
        res.status(500).json({ error: 'Failed to schedule reminders' });
      }
    } catch (error) {
      console.error('Schedule reminders error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel interview reminders
  router.post('/interview/cancel', async (req, res) => {
    try {
      const { interviewId } = req.body;
      
      if (!interviewId) {
        return res.status(400).json({ error: 'Interview ID is required' });
      }

      const success = await interviewNotificationService.cancelReminders(interviewId);
      
      if (success) {
        res.json({ success: true, message: 'Reminders cancelled' });
      } else {
        res.status(500).json({ error: 'Failed to cancel reminders' });
      }
    } catch (error) {
      console.error('Cancel reminders error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 15: routes/notificationRoutes.js (Lines 251-280)

```javascript
export default router;
```

## Page 16: routes/agoraRoutes.js (Lines 100-150)

```javascript
  // Generate Agora token
  router.post('/token', async (req, res) => {
    try {
      const { channelName, uid, role } = req.body;
      
      if (!channelName) {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      const token = await agoraTokenService.generateToken(
        channelName,
        uid || 0,
        role || 'publisher'
      );

      res.json({ token });
    } catch (error) {
      console.error('Token generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Validate Agora credentials
  router.get('/validate', async (req, res) => {
    try {
      const isValid = await agoraTokenService.validateCredentials();
      res.json({ valid: isValid });
    } catch (error) {
      console.error('Credential validation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get usage statistics
  router.get('/usage/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const usage = await callUsageService.getMonthlyUsage(companyId);
      const quota = await callUsageService.getRemainingMinutes(companyId);
      const recentCalls = await callUsageService.getRecentCalls(companyId);

      res.json({
        usage,
        quota,
        recentCalls,
        resetDate: callUsageService.getMonthlyResetDate(),
        daysUntilReset: callUsageService.getDaysUntilReset()
      });
    } catch (error) {
      console.error('Usage stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Track call start
  router.post('/call/start', async (req, res) => {
    try {
      const { companyId, callSessionId } = req.body;
      
      if (!companyId || !callSessionId) {
        return res.status(400).json({ error: 'Company ID and call session ID are required' });
      }

      const result = await callUsageService.trackCallStart(companyId, callSessionId);
      
      if (result) {
        res.json({ success: true, data: result });
      } else {
        res.json({ success: true, message: 'Call start tracked (limited mode)' });
      }
    } catch (error) {
      console.error('Call start tracking error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Track call end
  router.post('/call/end', async (req, res) => {
    try {
      const { callSessionId, durationMinutes, reason } = req.body;
      
      if (!callSessionId) {
        return res.status(400).json({ error: 'Call session ID is required' });
      }

      const result = await callUsageService.trackCallEnd(callSessionId, durationMinutes, reason);
      
      if (result) {
        res.json({ success: true, data: result });
      } else {
        res.json({ success: true, message: 'Call end tracked (limited mode)' });
      }
    } catch (error) {
      console.error('Call end tracking error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 17: routes/agoraRoutes.js (Lines 151-200)

```javascript
  // Get call history
  router.get('/calls/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { limit = 20 } = req.query;
      
      const calls = await callUsageService.getRecentCalls(companyId, parseInt(limit));
      res.json({ calls });
    } catch (error) {
      console.error('Call history error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get quota information
  router.get('/quota/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const quota = await callUsageService.getRemainingMinutes(companyId);
      res.json(quota);
    } catch (error) {
      console.error('Quota info error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  router.get('/health', async (req, res) => {
    try {
      const agoraValid = await agoraTokenService.validateCredentials();
      const supabaseStatus = supabase ? 'connected' : 'disconnected';
      
      res.json({
        status: 'ok',
        agora: agoraValid ? 'valid' : 'invalid',
        supabase: supabaseStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test call functionality
  router.post('/test', async (req, res) => {
    try {
      const { channelName, uid } = req.body;
      
      if (!channelName) {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      // Generate test token
      const token = await agoraTokenService.generateToken(channelName, uid || 0, 'publisher');
      
      // Test token validation
      const isValid = await agoraTokenService.validateToken(token, channelName, uid || 0);
      
      res.json({
        success: true,
        token,
        valid: isValid,
        channelName,
        uid: uid || 0
      });
    } catch (error) {
      console.error('Test call error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 18: routes/agoraRoutes.js (Lines 201-250)

```javascript
  // Get system statistics
  router.get('/stats', async (req, res) => {
    try {
      const agoraValid = await agoraTokenService.validateCredentials();
      const supabaseStatus = supabase ? 'connected' : 'disconnected';
      
      // Get overall system stats (would need admin access in real implementation)
      const stats = {
        agora: {
          valid: agoraValid,
          app_id: process.env.AGORA_APP_ID ? 'configured' : 'not configured'
        },
        supabase: {
          status: supabaseStatus,
          url: process.env.SUPABASE_URL ? 'configured' : 'not configured'
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          platform: process.platform,
          node_version: process.version
        }
      };

      res.json(stats);
    } catch (error) {
      console.error('System stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset quota (admin only)
  router.post('/quota/reset/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { adminKey } = req.body;
      
      // Validate admin key (in real implementation, use proper authentication)
      if (adminKey !== process.env.ADMIN_RESET_KEY) {
        return res.status(403).json({ error: 'Invalid admin key' });
      }

      // Reset quota logic would go here
      // This is a placeholder for admin functionality
      
      res.json({ 
        success: true, 
        message: 'Quota reset functionality not implemented yet',
        companyId 
      });
    } catch (error) {
      console.error('Quota reset error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Export usage data
  router.get('/export/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { format = 'json' } = req.query;
      
      const calls = await callUsageService.getRecentCalls(companyId, 100);
      const quota = await callUsageService.getRemainingMinutes(companyId);
      
      const exportData = {
        company_id: companyId,
        export_date: new Date().toISOString(),
        quota_info: quota,
        call_history: calls,
        total_calls: calls.length,
        export_format: format
      };

      if (format === 'csv') {
        // Convert to CSV format (simplified)
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="usage-${companyId}.csv"`);
        res.send('CSV export not implemented yet');
      } else {
        res.json(exportData);
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 19: routes/agoraRoutes.js (Lines 251-280)

```javascript
export default router;
```

## Page 20: routes/quotaRoutes.js (Lines 100-150)

```javascript
  // Get quota settings
  router.get('/settings/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { data, error } = await supabase
        .from('quota_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: error.message });
      }

      // Return default settings if none found
      const defaultSettings = {
        company_id: companyId,
        monthly_limit: 10000,
        warning_threshold: 8000,
        auto_renew: false,
        notifications_enabled: true,
        created_at: new Date().toISOString()
      };

      res.json(data || defaultSettings);
    } catch (error) {
      console.error('Get quota settings error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update quota settings
  router.put('/settings/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const settings = req.body;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { data, error } = await supabase
        .from('quota_settings')
        .upsert({
          ...settings,
          company_id: companyId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, settings: data });
    } catch (error) {
      console.error('Update quota settings error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get quota history
  router.get('/history/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { limit = 50 } = req.query;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { data, error } = await supabase
        .from('quota_history')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ history: data || [] });
    } catch (error) {
      console.error('Get quota history error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 21: routes/quotaRoutes.js (Lines 151-200)

```javascript
  // Add quota history entry
  router.post('/history/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { action, amount, description } = req.body;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { data, error } = await supabase
        .from('quota_history')
        .insert({
          company_id: companyId,
          action,
          amount,
          description,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, entry: data });
    } catch (error) {
      console.error('Add quota history error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get quota alerts
  router.get('/alerts/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { data, error } = await supabase
        .from('quota_alerts')
        .select('*')
        .eq('company_id', companyId)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ alerts: data || [] });
    } catch (error) {
      console.error('Get quota alerts error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create quota alert
  router.post('/alerts/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { alert_type, message, threshold } = req.body;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { data, error } = await supabase
        .from('quota_alerts')
        .insert({
          company_id: companyId,
          alert_type,
          message,
          threshold,
          resolved: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, alert: data });
    } catch (error) {
      console.error('Create quota alert error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Resolve quota alert
  router.put('/alerts/:alertId/resolve', async (req, res) => {
    try {
      const { alertId } = req.params;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { data, error } = await supabase
        .from('quota_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, alert: data });
    } catch (error) {
      console.error('Resolve quota alert error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 22: routes/quotaRoutes.js (Lines 201-250)

```javascript
  // Get quota usage report
  router.get('/report/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { period = 'monthly' } = req.query;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      let startDate, endDate;
      const now = new Date();

      switch (period) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
      }

      const { data, error } = await supabase
        .from('call_usage_tracking')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const report = {
        company_id: companyId,
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_calls: data?.length || 0,
        total_minutes: data?.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) || 0,
        average_call_duration: data?.length > 0 
          ? (data.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) / data.length).toFixed(2)
          : 0,
        calls_by_reason: data?.reduce((acc, call) => {
          acc[call.reason || 'unknown'] = (acc[call.reason || 'unknown'] || 0) + 1;
          return acc;
        }, {}) || {},
        generated_at: new Date().toISOString()
      };

      res.json({ report });
    } catch (error) {
      console.error('Get quota report error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Set quota limit
  router.post('/limit/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { limit, reason, adminKey } = req.body;
      
      if (!supabase) {
        return res.status(500).json({ error: 'Database not available' });
      }

      // Validate admin key (in real implementation, use proper authentication)
      if (adminKey !== process.env.ADMIN_RESET_KEY) {
        return res.status(403).json({ error: 'Invalid admin key' });
      }

      const { data, error } = await supabase
        .from('quota_settings')
        .update({ 
          monthly_limit: limit,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Add to history
      await supabase
        .from('quota_history')
        .insert({
          company_id: companyId,
          action: 'limit_change',
          amount: limit,
          description: reason || 'Admin limit change',
          created_at: new Date().toISOString()
        });

      res.json({ success: true, settings: data });
    } catch (error) {
      console.error('Set quota limit error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 23: routes/quotaRoutes.js (Lines 251-280)

```javascript
export default router;
```

## Page 24: routes/googleMeetRoutes.js (Lines 50-100)

```javascript
  // Create Google Meet link
  router.post('/create', async (req, res) => {
    try {
      const { channelName, applicantEmail, hrEmail } = req.body;
      
      if (!channelName) {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      const result = await googleMeetService.createMeetingLink(channelName, applicantEmail, hrEmail);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: 'Failed to create Google Meet link' });
      }
    } catch (error) {
      console.error('Create Google Meet error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Google Meet link
  router.get('/get/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const result = await googleMeetService.getMeetingLink(eventId);
      
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: 'Google Meet link not found' });
      }
    } catch (error) {
      console.error('Get Google Meet error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Google Meet
  router.delete('/delete/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      
      const success = await googleMeetService.deleteMeeting(eventId);
      
      if (success) {
        res.json({ success: true, message: 'Google Meet deleted' });
      } else {
        res.status(500).json({ error: 'Failed to delete Google Meet' });
      }
    } catch (error) {
      console.error('Delete Google Meet error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update Google Meet
  router.put('/update/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { startTime, endTime, attendees } = req.body;
      
      if (!googleMeetService.enabled) {
        return res.status(503).json({ error: 'Google Meet service not available' });
      }

      // This would require implementing the update functionality in GoogleMeetService
      res.json({ 
        success: false, 
        message: 'Google Meet update functionality not implemented yet',
        eventId 
      });
    } catch (error) {
      console.error('Update Google Meet error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Google Meet status
  router.get('/status', async (req, res) => {
    try {
      const status = {
        enabled: googleMeetService.enabled,
        configured: googleMeetService.auth !== null,
        service: 'Google Meet API'
      };

      res.json(status);
    } catch (error) {
      console.error('Get Google Meet status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test Google Meet integration
  router.post('/test', async (req, res) => {
    try {
      const { channelName } = req.body;
      
      if (!channelName) {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      const result = await googleMeetService.createMeetingLink(
        channelName, 
        'test@example.com', 
        'test@example.com'
      );
      
      res.json({
        success: result.success,
        test_mode: true,
        result: result.success ? {
          meetingLink: result.meetingLink,
          eventId: result.eventId,
          fallback: result.fallback
        } : null,
        service_status: {
          enabled: googleMeetService.enabled,
          configured: googleMeetService.auth !== null
        }
      });
    } catch (error) {
      console.error('Test Google Meet error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

## Page 25: routes/googleMeetRoutes.js (Lines 101-130)

```javascript
export default router;
```

---

## **COPYRIGHT DECLARATION**

**Copyright Owner:** Zero Effort Tech Park  
**Year:** 2026  
**Description:** Complete source code for Zero Effort Tech Park web application including frontend (React), backend (Node.js/Express), database integration (Supabase), video calling (Agora), push notifications, and email services.

**Total Pages:** 50 (25 beginning pages + 25 ending pages)  
**Redactions Applied:** API keys, database credentials, private URLs, and sensitive configuration information have been replaced with '[REDACTED]' as required for copyright deposit.

**Technology Stack:**
- Frontend: React 19.2.0, Vite 7.3.1, React Router 7.13.1
- Backend: Node.js, Express 4.18.2, Supabase 2.99.0
- Video: Agora RTC SDK 4.24.3, WebRTC
- Notifications: Web Push 3.6.7, Node-cron 4.2.1
- Email: Nodemailer 8.0.3, SendGrid
- Other: Sharp 0.34.5, Twilio 5.13.0, Google APIs 168.0.0

**Application Features:**
- Multi-role authentication (Admin, Company, Applicant)
- Real-time messaging and video calling
- Push notification system
- Appointment scheduling and reminders
- Job posting and application management
- Company profiles and job listings
- Usage tracking and quota management
- Email notifications and reminders

This source code represents the complete intellectual property of Zero Effort Tech Park and is being deposited for copyright registration purposes with the Intellectual Property Office of the Philippines (IPOPHL).
