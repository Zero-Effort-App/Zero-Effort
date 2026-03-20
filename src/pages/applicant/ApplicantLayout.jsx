import { useState, useEffect } from 'react';
import { useOutletContext, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';
import ZeloChatbot from '../../components/ZeloChatbot';
import { subscribeToPush } from '../../lib/pushNotifications';

export default function ApplicantLayout() {
  const { profile, checkSession, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userPhoto, setUserPhoto] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    init();
  }, [user, profile]);

  async function loadApplicantData() {
    if (!user) return
    const { data } = await supabase
      .from('applicants')
      .select('first_name, last_name, photo_url')
      .eq('id', user.id)
      .maybeSingle()

    if (data) {
      setUserPhoto(data.photo_url || '')
    }
  }
  
  async function init() {
    if (!profile || profile.role !== 'applicant') {
      const session = await checkSession('applicant');
      if (!session) { navigate('/applicant/login'); return; }
    }
    if (user) {
      await loadApplicantData()
    }
    setLoading(false);
    
    if (user?.id) {
      subscribeToPush(user.id, 'applicant');
    }
  }

  if (loading) return <LoadingOverlay show />;

  const initials = profile
    ? `${(profile.first_name || '?')[0]}${(profile.last_name || '?')[0]}`.toUpperCase()
    : 'AP';
  const displayName = profile ? `${profile.first_name} ${(profile.last_name || '')[0]}.` : 'User';

  const links = [
    { path: '/applicant/home', label: 'Home' },
    { path: '/applicant/jobs', label: 'Browse Jobs' },
    { path: '/applicant/companies', label: 'Companies' },
    { path: '/applicant/applications', label: 'My Applications' },
    { path: '/applicant/inbox', label: 'Inbox' },
    { path: '/applicant/events', label: 'Events' },
  ];

  return (
    <>
      <PortalNav
        portalTag={null}
        links={links}
        userInitials={initials}
        userName={displayName}
        companyLogo={null}
        userPhoto={userPhoto}
      />
      <Outlet context={{ profile }} />
      <ZeloChatbot />
    </>
  );
}
