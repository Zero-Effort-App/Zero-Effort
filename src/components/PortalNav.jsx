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

  // Portal type detection
  const getPortalType = () => {
    if (portalTag === 'COMPANY') return 'company';
    if (portalTag === 'ADMIN') return 'admin';
    return 'applicant'; // default or null portalTag
  };

  const portalType = getPortalType();

  // Icon mapping for navigation links
  const getNavIcon = (label, size = 14) => {
    switch(label) {
      case 'Home': return <Home size={size} />;
      case 'Browse Jobs': return <Briefcase size={size} />;
      case 'Companies': return <Building2 size={size} />;
      case 'My Applications': return <FileText size={size} />;
      case 'My Profile': return <User size={size} />;
      case 'Inbox': return <MessageCircle size={size} />;
      default: return null;
    }
  };

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '52px',
        }}>
          {/* Left - Text logo */}
          <span style={{
            fontSize: '18px',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.5px'
          }}>
            Zero Effort
          </span>

          {/* Right - Theme toggle only on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Desktop nav - hidden on mobile */}
            <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {links.map(link => (
                <button
                  key={link.path}
                  className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                  onClick={() => navigate(link.path)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: location.pathname === link.path ? 'var(--accent-d)' : 'transparent',
                    color: location.pathname === link.path ? 'var(--accent2)' : 'var(--text)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {getNavIcon(link.label)}
                  {link.label}
                  {link.badge > 0 && (
                    <span style={{
                      background: 'var(--accent)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700
                    }}>{link.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: '32px', height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text2)'
              }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Desktop only - user avatar and logout */}
            <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--accent)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '12px'
              }}>
                {userPhoto ? (
                  <img src={userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : userInitials}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{userName}</span>
              <button onClick={handleLogout} style={{
                padding: '6px 12px', borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer',
                fontSize: '13px', color: 'var(--text2)'
              }}>Log out</button>
            </div>
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
              backdropFilter: 'blur(3px)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          />

          {/* Side Drawer - slides from RIGHT */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '75%',
            maxWidth: '300px',
            zIndex: 9999,
            backgroundColor: 'var(--card)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
            overflowY: 'auto',
            animation: 'slideInRight 0.25s ease-out'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '20px 16px 16px',
              borderBottom: '1px solid var(--border)',
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
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontSize: '15px', fontWeight: location.pathname === link.path ? 700 : 500,
                    borderLeft: location.pathname === link.path ? '3px solid var(--accent)' : '3px solid transparent',
                    backgroundColor: location.pathname === link.path ? 'var(--accent-d)' : 'transparent'
                  }}
                >
                  <span style={{ color: location.pathname === link.path ? 'var(--accent)' : 'var(--text2)' }}>
                    {getNavIcon(link.label)}
                  </span>
                  {link.label}
                  {link.label === 'Inbox' && unreadCount > 0 && (
                    <span style={{
                      marginLeft: 'auto', background: 'var(--accent)',
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
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'var(--accent)', overflow: 'hidden', flexShrink: 0,
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
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: 'var(--text)' }}>
                  {userName || 'User'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 12px', borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent', cursor: 'pointer',
                  fontSize: '13px', color: 'var(--text2)',
                  fontWeight: 600
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <div className="bottom-nav" style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '64px',
        backgroundColor: 'var(--card)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        {links.map(link => (
          <a
            key={link.path}
            href={link.path}
            onClick={(e) => {
              e.preventDefault();
              navigate(link.path);
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '4px', textDecoration: 'none', position: 'relative',
              flex: 1, padding: '6px 0',
              color: location.pathname === link.path ? 'var(--accent)' : 'var(--text2)'
            }}
          >
            <div style={{ position: 'relative' }}>
              {getNavIcon(link.label, 20)}
              {link.label === 'Inbox' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: 'var(--accent)', color: 'white',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700
                }}>{unreadCount}</span>
              )}
            </div>
            <span style={{
              fontSize: '9px',
              fontWeight: location.pathname === link.path ? 700 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '60px',
              textAlign: 'center'
            }}>
              {link.label === 'Browse Jobs' ? 'Jobs' :
               link.label === 'My Applications' ? 'Applications' :
               link.label === 'My Profile' ? 'Profile' :
               link.label}
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
