import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X, Home, Briefcase, Building2, FileText, User, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PortalNav({ portalTag, links, userInitials, userName, companyLogo, userPhoto }) {
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch unread count for applicant
  useEffect(() => {
    if (!user || !location.pathname.includes('/applicant/')) return
    async function fetchUnread() {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('applicant_id', user.id)
        .eq('is_read', false)
        .eq('sender_type', 'company')
      setUnreadCount(count || 0)
    }
    fetchUnread()
  }, [user, location.pathname]);

  async function handleLogout() {
    await logout();
    const base = location.pathname.split('/')[1];
    navigate(`/${base}`);
  }

  const basePath = '/' + location.pathname.split('/')[1];

  // Icon mapping for navigation links
  const getNavIcon = (label) => {
    switch(label) {
      case 'Home': return <Home size={14} />;
      case 'Browse Jobs': return <Briefcase size={14} />;
      case 'Companies': return <Building2 size={14} />;
      case 'My Applications': return <FileText size={14} />;
      case 'My Profile': return <User size={14} />;
      case 'Inbox': return <MessageCircle size={14} />;
      default: return null;
    }
  };

  return (
    <nav style={{
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <img
          src={theme === 'dark' ? '/zero-effort-logo-white.png' : '/zero-effort-logo-dark.png'}
          alt="Zero Effort"
          style={{ 
            height: '36px', 
            width: 'auto', 
            maxWidth: '120px',
            objectFit: 'contain'
          }}
        />
        {portalTag && <span className="nav-portal-tag">{portalTag}</span>}
      </div>
      
      {/* Mobile hamburger menu */}
      {isMobile && (
        <button 
          className="nav-hamburger" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '4px',
            marginLeft: 'auto'
          }}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}
      
      {/* Navigation links - desktop vs mobile */}
      {!isMobile && (
        <div className="nav-links">
          {links.map(link => (
            <button
              key={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {getNavIcon(link.label)}
              {link.label}
              {link.label === 'Inbox' && unreadCount > 0 && (
                <span style={{
                  background: 'var(--accent)', color: 'white',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, marginLeft: '6px'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      
      <div className="nav-right" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <button
          onClick={toggleTheme}
          style={{
            width: '36px', height: '36px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text2)'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {!isMobile && (
          <>
            <div className="user-chip">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid var(--border)'
                  }}
                />
              ) : (
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: '13px',
                  color: 'white', overflow: 'hidden', flexShrink: 0,
                  border: '2px solid var(--border)'
                }}>
                  {userPhoto ? (
                    <img src={userPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>
              )}
              <span className="user-name">{userName || 'User'}</span>
            </div>
            <button className="nav-logout" onClick={handleLogout}>Log out</button>
          </>
        )}
      </div>
      
      {/* Mobile dropdown menu */}
      {isMobile && isMobileMenuOpen && (
        <div className="nav-mobile-dropdown">
          {links.map(link => (
            <button
              key={link.path}
              className={`nav-link-mobile ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => {
                navigate(link.path);
                setIsMobileMenuOpen(false);
              }}
            >
              {getNavIcon(link.label)}
              {link.label}
              {link.label === 'Inbox' && unreadCount > 0 && (
                <span style={{
                  background: 'var(--accent)', color: 'white',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, marginLeft: '6px'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div className="user-chip" style={{ marginBottom: '12px' }}>
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid var(--border)'
                  }}
                />
              ) : (
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: '13px',
                  color: 'white', overflow: 'hidden', flexShrink: 0,
                  border: '2px solid var(--border)'
                }}>
                  {userPhoto ? (
                    <img src={userPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>
              )}
              <span className="user-name">{userName || 'User'}</span>
            </div>
            <button className="nav-logout" onClick={handleLogout} style={{ width: '100%' }}>Log out</button>
          </div>
        </div>
      )}
    </nav>
  );
}
