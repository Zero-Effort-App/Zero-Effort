import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function ApplicantLayout() {
  const { profile, checkSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      if (!profile || profile.role !== 'applicant') {
        const session = await checkSession('applicant');
        if (!session) { navigate('/applicant/login'); return; }
      }
      setLoading(false);
    }
    init();
  }, []);

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
    { path: '/applicant/profile', label: 'My Profile' },
  ];

  return (
    <>
      <PortalNav
        portalTag={null}
        links={links}
        userInitials={initials}
        userName={displayName}
      />
      <Outlet context={{ profile }} />
    </>
  );
}
