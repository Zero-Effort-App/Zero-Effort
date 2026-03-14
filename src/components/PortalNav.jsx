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
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '56px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Left - Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <img
              src={theme === 'dark' ? '/zero-effort-logo-white.png' : '/zero-effort-logo-dark.png'}
              alt="Zero Effort"
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
            {portalTag && <span className="nav-portal-tag">{portalTag}</span>}
          </div>

          {/* Center - Desktop nav links (hidden on mobile) */}
          <div className="desktop-nav" style={{
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
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

          {/* Right - Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Theme toggle - cleaner design */}
            <button
              onClick={toggleTheme}
              style={{
                width: '34px', height: '34px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text2)'
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User chip - desktop only */}
            {!isMobile && (
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
            )}

            {/* Hamburger - mobile only, cleaner */}
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                width: '34px', height: '34px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text)'
              }}
            >
              {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && isMobileMenuOpen && (
        <>
          {/* Dark overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 9998,
              backdropFilter: 'blur(3px)'
            }}
          />

          {/* Side Drawer */}
          <div style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            width: '75%',
            maxWidth: '300px',
            zIndex: 9999,
            backgroundColor: theme === 'dark' ? '#13151f' : '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
            overflowY: 'auto'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '20px 16px 16px',
              borderBottom: `1px solid ${theme === 'dark' ? '#2a2d3e' : '#e5e7eb'}`,
            }}>
              <img
                src={theme === 'dark' ? '/zero-effort-logo-white.png' : '/zero-effort-logo-dark.png'}
                alt="Zero Effort"
                style={{ height: '28px', width: 'auto' }}
              />
            </div>

            {/* Nav Links */}
            <div style={{ flex: 1, padding: '8px 0' }}>
              {links.map(link => (
                <a
                  key={link.path}
                  href={link.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.path);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 16px',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    textDecoration: 'none',
                    fontSize: '15px', fontWeight: location.pathname === link.path ? 700 : 500,
                    borderLeft: location.pathname === link.path ? '3px solid #6366f1' : '3px solid transparent',
                    backgroundColor: location.pathname === link.path ? (theme === 'dark' ? '#1e2030' : '#f3f4f6') : 'transparent'
                  }}
                >
                  <span style={{ color: location.pathname === link.path ? '#6366f1' : (theme === 'dark' ? '#8b8fa8' : '#6b7280') }}>
                    {getNavIcon(link.label)}
                  </span>
                  {link.label}
                  {link.label === 'Inbox' && unreadCount > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: '#6366f1',
                      color: 'white', borderRadius: '50%',
                      width: '20px', height: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700
                    }}>{unreadCount}</span>
                  )}
                </a>
              ))}
            </div>

            {/* User info at bottom */}
            <div style={{
              padding: '16px',
              borderTop: `1px solid ${theme === 'dark' ? '#2a2d3e' : '#e5e7eb'}`,
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: '#6366f1', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '13px'
              }}>
                {userPhoto ? (
                  <img src={userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : companyLogo ? (
                  <img src={companyLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userInitials
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  {userName || 'User'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 12px', borderRadius: '8px',
                  border: `1px solid ${theme === 'dark' ? '#2a2d3e' : '#e5e7eb'}`,
                  background: 'transparent', cursor: 'pointer',
                  fontSize: '13px', color: theme === 'dark' ? '#8b8fa8' : '#6b7280',
                  fontWeight: 600
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
