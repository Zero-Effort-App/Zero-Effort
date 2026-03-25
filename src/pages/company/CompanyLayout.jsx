import { useState, useEffect } from 'react';
import { useOutletContext, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';
import ZeloChatbot from '../../components/ZeloChatbot';
import IncomingCallModal from '../../components/VideoCall/IncomingCallModal';
import AgoraVideoCall from '../../components/AgoraVideoCall';
import { subscribeToPush } from '../../lib/pushNotifications';
import { getCompanyProfile } from '../../lib/db';

export default function CompanyLayout() {
  const { profile, checkSession, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    async function validateSession() {
      try {
        console.log('🔐 CompanyLayout - Validating session...');
        
        // FALLBACK 1: Check Supabase session directly
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('🔐 CompanyLayout - No Supabase session, redirecting to login');
          navigate('/company/login');
          return;
        }
        
        console.log('🔐 CompanyLayout - Supabase session exists for:', session.user.email);
        
        // FALLBACK 2: If AuthContext profile not loaded yet, wait for it
        if (!profile) {
          console.log('🔐 CompanyLayout - Waiting for profile to load...');
          // Give AuthContext 2 seconds to load profile
          setTimeout(() => {
            if (!profile) {
              console.warn('⚠️ CompanyLayout - Profile failed to load, but Supabase session exists');
              // Don't redirect - user is authenticated even without profile
              setLoading(false);
            } else {
              console.log('🔐 CompanyLayout - Profile loaded successfully:', profile.role);
              if (profile.role !== 'company') {
                console.log('🔐 CompanyLayout - Wrong role, redirecting to login');
                navigate('/company/login');
              } else {
                // Profile loaded correctly, continue with company data loading
                loadCompanyData(profile);
              }
            }
          }, 2000);
          return;
        }
        
        // FALLBACK 3: Verify correct role
        if (profile.role !== 'company') {
          console.log('🔐 CompanyLayout - Wrong role, redirecting to login');
          navigate('/company/login');
          return;
        }
        
        console.log('🔐 CompanyLayout - All checks passed, loading company data');
        // All checks passed, load company data
        loadCompanyData(profile);
      } catch (error) {
        console.error('❌ CompanyLayout - Session validation error:', error);
        // Network error - check Supabase session instead
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('🔐 CompanyLayout - No fallback session, redirecting to login');
            navigate('/company/login');
          } else {
            console.log('🔐 CompanyLayout - Fallback session exists, allowing access');
            // Has session but error checking profile - allow access
            setLoading(false);
          }
        } catch (fallbackError) {
          console.error('❌ CompanyLayout - Fallback session check failed:', fallbackError);
          navigate('/company/login');
        }
      }
    }
    
    async function loadCompanyData(p) {
      try {
        if (!p.company_id) { 
          console.log('🔐 CompanyLayout - No company_id, redirecting to login');
          navigate('/company/login'); 
          return; 
        }
        const co = await getCompanyProfile(p.company_id);
        setCompany(co);
        
        // Check if company is disabled - only after auth is fully initialized
        if (co && !co.is_active && !loading) {
          console.log('🚪 CompanyLayout - Company disabled, signing out...');
          await supabase.auth.signOut();
          navigate('/company');
          showToast('Your company account has been disabled. Please contact the administrator.', 'error');
          return;
        }
        
        console.log('🔐 CompanyLayout - Company data loaded successfully');
      } catch (err) {
        console.error('Error loading company profile:', err);
      }
      setLoading(false);
      
      if (user?.id) {
        subscribeToPush(user.id, 'company');
      }
    }
    
    validateSession();
  }, [profile, navigate, user, showToast]);

  if (loading) return <LoadingOverlay show />;

  const initials = company?.logo_initials || company?.name?.slice(0, 2).toUpperCase() || 'CO';
  const links = [
    { path: '/company/dashboard', label: 'Dashboard' },
    { path: '/company/listings', label: 'My Listings' },
    { path: '/company/applicants', label: 'Applicants' },
    { path: '/company/inbox', label: 'Inbox' },
    { path: '/company/profile', label: 'Profile' },
  ];

  return (
    <>
      <PortalNav
        portalTag="COMPANY"
        links={links}
        userInitials={initials}
        userName={company?.name?.split(' ')[0] || 'Company'}
        companyLogo={company?.logo_url || null}
      />
      <Outlet context={{ company, setCompany }} />
      <ZeloChatbot />
    </>
  );
}
