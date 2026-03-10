import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function AdminLayout() {
  const { profile, checkSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      if (!profile || profile.role !== 'admin') {
        const session = await checkSession('admin');
        if (!session) {
          navigate('/admin/login');
          return;
        }
      }
      setLoading(false);
    }
    init();
  }, []);

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
      />
      <Outlet />
    </>
  );
}
