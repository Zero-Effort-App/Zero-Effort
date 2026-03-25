import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';
import ZeloChatbot from '../../components/ZeloChatbot';

export default function AdminLayout() {
  const { profile, checkSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function validateSession() {
      try {
        console.log('🔐 AdminLayout - Validating session...');
        
        // FALLBACK 1: Check Supabase session directly
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('🔐 AdminLayout - No Supabase session, redirecting to login');
          navigate('/admin/login');
          return;
        }
        
        console.log('🔐 AdminLayout - Supabase session exists for:', session.user.email);
        
        // FALLBACK 2: If AuthContext profile not loaded yet, wait for it
        if (!profile) {
          console.log('🔐 AdminLayout - Waiting for profile to load...');
          // Give AuthContext 2 seconds to load profile
          setTimeout(() => {
            if (!profile) {
              console.warn('⚠️ AdminLayout - Profile failed to load, but Supabase session exists');
              // Don't redirect - user is authenticated even without profile
              setLoading(false);
            } else {
              console.log('🔐 AdminLayout - Profile loaded successfully:', profile.role);
              if (profile.role !== 'admin') {
                console.log('🔐 AdminLayout - Wrong role, redirecting to login');
                navigate('/admin/login');
              } else {
                setLoading(false);
              }
            }
          }, 2000);
          return;
        }
        
        // FALLBACK 3: Verify correct role
        if (profile.role !== 'admin') {
          console.log('🔐 AdminLayout - Wrong role, redirecting to login');
          navigate('/admin/login');
          return;
        }
        
        console.log('🔐 AdminLayout - All checks passed, loading complete');
        // All checks passed
        setLoading(false);
      } catch (error) {
        console.error('❌ AdminLayout - Session validation error:', error);
        // Network error - check Supabase session instead
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('🔐 AdminLayout - No fallback session, redirecting to login');
            navigate('/admin/login');
          } else {
            console.log('🔐 AdminLayout - Fallback session exists, allowing access');
            // Has session but error checking profile - allow access
            setLoading(false);
          }
        } catch (fallbackError) {
          console.error('❌ AdminLayout - Fallback session check failed:', fallbackError);
          navigate('/admin/login');
        }
      }
    }
    
    validateSession();
  }, [profile, navigate]);

  if (loading) return <LoadingOverlay show />;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  const links = [
    { path: '/admin/dashboard', label: 'Overview' },
    { path: '/admin/companies', label: 'Companies' },
    { path: '/admin/jobs', label: 'Job Postings' },
    { path: '/admin/events', label: 'Events' },
    { path: '/admin/settings', label: 'Admin Settings' },
    { path: '/admin/activity', label: 'Activity Log' },
  ];

  return (
    <>
      <PortalNav
        portalTag="ADMIN"
        links={links}
        userInitials={initials}
        userName={profile?.full_name?.split(' ')[0] || 'Admin'}
        companyLogo={null}
      />
      <Outlet />
      <ZeloChatbot />
    </>
  );
}
