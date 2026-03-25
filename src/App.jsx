import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';
import './styles/theme.css';

// Debug components
import AuthDebugInfo from './components/AuthDebugInfo';
import OnScreenDebugPanel from './components/OnScreenDebugPanel';
import DebugButton from './components/DebugButton';

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

// Applicant root route component with auth logic
function ApplicantRootRoute() {
  const { user, loading } = useAuth();
  
  console.log('ROOT ROUTE - user:', !!user, 'loading:', loading);
  
  if (loading) {
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
        <div>Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/applicant/home" replace />;
  }
  
  return <ApplicantLanding />;
}

function AppWithServices() {
  const { user } = useAuth();

  // Log app load on every render
  React.useEffect(() => {
    console.log('APP LOADED - debug_mode:', localStorage.getItem('debug_mode'));
  }, []);

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
        <Route path="/admin">
          <Route index element={<AdminLanding />} />
          <Route path="login" element={<AdminLogin />} />
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminOverview />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="quota" element={<AdminQuotaPage />} />
          </Route>
        </Route>

        {/* Company Portal */}
        <Route path="/company">
          <Route index element={<CompanyLanding />} />
          <Route path="login" element={<CompanyLogin />} />
          <Route element={<CompanyLayout />}>
            <Route path="dashboard" element={<CompanyDashboard />} />
            <Route path="listings" element={<CompanyListings />} />
            <Route path="applicants" element={<CompanyApplicants />} />
            <Route path="inbox" element={<CompanyInbox />} />
            <Route path="profile" element={<CompanyProfile />} />
          </Route>
        </Route>

        {/* Applicant Portal */}
        <Route path="/applicant">
          <Route index element={<ApplicantRootRoute />} />
          <Route path="login" element={<ApplicantLogin />} />
          <Route path="reset-password" element={<ApplicantResetPassword />} />
          <Route element={<ApplicantLayout />}>
            <Route path="home" element={<ApplicantHome />} />
            <Route path="jobs" element={<ApplicantJobs />} />
            <Route path="companies" element={<ApplicantCompanies />} />
            <Route path="applications" element={<ApplicantApplications />} />
            <Route path="profile" element={<ApplicantProfile />} />
            <Route path="inbox" element={<ApplicantInbox />} />
            <Route path="events" element={<ApplicantEvents />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/applicant" replace />} />
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
            <AuthDebugInfo />
            <OnScreenDebugPanel />
            <DebugButton />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
