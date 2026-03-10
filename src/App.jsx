import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
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

// Company
import CompanyLanding from './pages/company/CompanyLanding';
import CompanyLogin from './pages/company/CompanyLogin';
import CompanyLayout from './pages/company/CompanyLayout';
import CompanyDashboard from './pages/company/CompanyDashboard';
import CompanyListings from './pages/company/CompanyListings';
import CompanyApplicants from './pages/company/CompanyApplicants';
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

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Portal Selector */}
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
                  <Route path="profile" element={<CompanyProfile />} />
                </Route>
              </Route>

              {/* Applicant Portal */}
              <Route path="/applicant">
                <Route index element={<ApplicantLanding />} />
                <Route path="login" element={<ApplicantLogin />} />
                <Route path="reset-password" element={<ApplicantResetPassword />} />
                <Route element={<ApplicantLayout />}>
                  <Route path="home" element={<ApplicantHome />} />
                  <Route path="jobs" element={<ApplicantJobs />} />
                  <Route path="companies" element={<ApplicantCompanies />} />
                  <Route path="applications" element={<ApplicantApplications />} />
                  <Route path="profile" element={<ApplicantProfile />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
