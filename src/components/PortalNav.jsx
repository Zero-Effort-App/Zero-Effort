import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Home, Briefcase, Building2, FileText, User, MessageCircle, ChevronDown, Settings, LogOut, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PortalNav({ portalTag, links, userInitials, userName, companyLogo, userPhoto, profile }) {
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count for applicant and company
  useEffect(() => {
    if (!user) return;

    const isApplicant = location.pathname.includes('/applicant/');
    const isCompany = location.pathname.includes('/company/');

    if (!isApplicant && !isCompany) return;

    async function fetchUnread() {
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (isApplicant) {
        query = query.eq('applicant_id', user.id).eq('sender_type', 'company');
      } else if (isCompany && profile?.company_id) {
        query = query.eq('company_id', profile.company_id).eq('sender_type', 'applicant');
      } else {
        return;
      }

      const { count } = await query;
      setUnreadCount(count || 0);
    }

    fetchUnread();
  }, [location.pathname, user, profile]);

  // Separate useEffect for real-time subscription - only runs once
  useEffect(() => {
    if (!user) return;

    const channelName = `unread-nav-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        // Only update badge if message is for this user
        const isApplicant = window.location.pathname.includes('/applicant/');
        const isCompany = window.location.pathname.includes('/company/');
        
        if (isApplicant && payload.new.applicant_id === user.id && payload.new.sender_type === 'company') {
          setUnreadCount(prev => prev + 1);
        } else if (isCompany && payload.new.sender_type === 'applicant') {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe((status) => {
        // Subscription established
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
  const getNavIcon = (label, size = 16) => {
    const iconProps = { size, strokeWidth: 2 };
    switch(label) {
      case 'Home': return <Home {...iconProps} />;
      case 'Browse Jobs': return <Briefcase {...iconProps} />;
      case 'Companies': return <Building2 {...iconProps} />;
      case 'My Applications': return <FileText {...iconProps} />;
      case 'My Profile': return <User {...iconProps} />;
      case 'Inbox': return <MessageCircle {...iconProps} />;
      case 'Events': return <CalendarDays {...iconProps} />;
      default: return null;
    }
  };

  const brandColors = {
    primary: '#4f46e5', // indigo-600
    primaryDark: '#4338ca', // indigo-700
    primaryLight: '#818cf8', // indigo-400
    accent: '#7c3aed', // violet-600
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        /* Add margin to body to ensure content doesn't hide behind fixed nav */
        body {
          margin-top: 56px;
        }
        
        /* Add padding to all main content areas to account for fixed nav */
        .pw, .dash-wrap, .admin-wrap {
          padding-top: 72px !important; /* 56px nav height + 16px extra space */
        }
        
        /* Also handle any direct content without wrapper classes */
        main, .main-content, .page-content {
          padding-top: 72px !important;
        }
        
        .nav-header {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          border-bottom: 1px solid #e5e7eb;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: 56px; /* Reduced from 52px to 56px for better proportions */
        }

        .nav-header.dark {
          background: #1f2937;
          border-bottom-color: #374151;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 800;
          color: ${brandColors.primary};
          letter-spacing: -0.5px;
          text-decoration: none;
          transition: opacity 150ms ease;
        }

        .nav-brand:hover {
          opacity: 0.8;
        }

        .nav-brand.dark {
          color: ${brandColors.primaryLight};
        }

        .nav-brand-icon {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent});
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 12px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          color: #6b7280;
          font-size: 14px; /* Reduced to text-sm (14px) */
          font-weight: 500; /* Keep consistent weight */
          cursor: pointer;
          transition: 'color 150ms ease'; /* Only color transition */
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }

        .nav-link:hover {
          color: ${brandColors.primary}; /* Purple text color only */
          font-weight: 500; /* Keep same weight to prevent jiggling */
          /* NO background fill */
        }

        .nav-link.active {
          background: transparent; /* Remove background fill */
          color: ${brandColors.primary}; /* Purple text color */
          font-weight: 700; /* Bold font weight only for active */
          /* No border, no padding changes, no shadow */
        }

        .nav-link.dark {
          color: #9ca3af;
        }

        .nav-link.dark:hover {
          color: ${brandColors.primaryLight}; /* Purple text color for dark mode */
          font-weight: 500; /* Keep same weight to prevent jiggling */
          /* NO background fill */
        }

        .nav-link.dark.active {
          background: transparent; /* Remove background fill */
          color: ${brandColors.primaryLight}; /* Purple text color for dark mode */
          font-weight: 700; /* Bold font weight only for active */
          /* No border, no padding changes, no shadow */
        }

        .nav-link-icon {
          flex-shrink: 0;
          display: none; /* Force hide on desktop since mobile nav is separate */
        }

        .nav-badge {
          background: #ef4444;
          color: white;
          border-radius: 9999px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          padding: 0 4px;
          margin-left: 4px;
        }

        .theme-toggle {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 150ms ease;
        }

        .theme-toggle:hover {
          background: #f9fafb;
          color: ${brandColors.primary};
          border-color: ${brandColors.primary};
        }

        .theme-toggle.dark {
          background: #374151;
          border-color: #4b5563;
          color: #9ca3af;
        }

        .theme-toggle.dark:hover {
          background: #4b5563;
          color: ${brandColors.primaryLight};
          border-color: ${brandColors.primaryLight};
        }

        .profile-button {
          display: flex;
          align-items: center; /* Key fix for vertical alignment */
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          transition: all 150ms ease;
          text-decoration: none;
          position: relative;
          overflow: hidden;
          height: 40px; /* Fixed height for consistency */
          margin: 0; /* Remove any extra margin */
        }

        .profile-button:hover {
          background: #f9fafb;
          border-color: ${brandColors.primary};
        }

        .profile-button.dark {
          background: var(--surface2); /* Use CSS variable instead of hardcoded gray */
          border-color: var(--border);
          color: var(--text);
        }

        .profile-button.dark:hover {
          background: var(--surface); /* Use CSS variable for hover */
          border-color: ${brandColors.primary};
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent});
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
          margin: 0; /* Remove any extra margin */
        }

        .profile-avatar img {
          background: transparent;
        }

        .profile-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          line-height: 1; /* Leading-none to remove extra line-height */
          margin: 0; /* Remove any extra margin */
          display: flex;
          align-items: center; /* Ensure vertical centering */
        }

        .profile-name.dark {
          color: var(--text) !important; /* Use CSS variable for dark mode */
        }

        .profile-chevron {
          color: var(--text2);
          transition: transform 150ms ease;
          display: inline-flex; /* Inline-flex for proper alignment */
          align-items: center; /* Ensure vertical centering */
          margin: 0; /* Remove any extra margin */
        }

        .profile-chevron.dark {
          color: var(--text2); /* Use CSS variable for dark mode */
        }

        .profile-button.open .profile-chevron {
          transform: rotate(180deg);
        }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          overflow: hidden;
          z-index: 1000;
        }

        .profile-dropdown.dark {
          background: #374151;
          border-color: #4b5563;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: none;
          background: transparent;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 150ms ease;
          width: 100%;
          text-align: left;
        }

        .dropdown-item:hover {
          background: #f9fafb;
        }

        .dropdown-item.dark {
          color: #f3f4f6;
        }

        .dropdown-item.dark:hover {
          background: #4b5563;
        }

        .dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 4px 0;
        }

        .dropdown-divider.dark {
          background: #4b5563;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
        }
      `}</style>

      <nav className={`nav-header ${theme === 'dark' ? 'dark' : ''}`}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          height: '100%',
          width: '100%', // Ensure full width
        }}>
          {/* Left Group - Brand Only */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}>
            <div className="nav-brand" style={{ flexShrink: 0 }}>
              <span style={{
                fontSize: '1rem',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Zero Effort</span>
            </div>
          </div>

          {/* Spacer */}
          <div style={{
            flexGrow: 1, // This will push the right group to the right
          }} />

          {/* Right Group - Nav Links + Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0, // Prevent shrinking
          }}>
            {/* Navigation Links */}
            <div className="desktop-nav" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {links.map((link, index) => (
                <button
                  key={link.path}
                  className={`nav-link ${theme === 'dark' ? 'dark' : ''} ${location.pathname === link.path ? 'active' : ''}`}
                  onClick={() => navigate(link.path)}
                  aria-label={`Navigate to ${link.label}`}
                  aria-current={location.pathname === link.path ? 'page' : undefined}
                >
                  <span className="nav-link-icon">{getNavIcon(link.label)}</span>
                  <span>{link.label}</span>
                  {link.label === 'Inbox' && unreadCount > 0 && (
                    <span style={{
                      background: '#ef4444', color: 'white',
                      borderRadius: '50%', width: '16px', height: '16px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: 700, marginLeft: '4px'
                    }}>{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Divider between nav links and controls */}
            <div style={{
              width: '1px',
              height: '24px',
              background: theme === 'dark' ? '#4b5563' : '#e5e7eb',
              margin: '0 4px',
            }} />

            {/* Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>

              {/* Profile Dropdown - shown on both mobile and desktop */}
              <div style={{ display: 'flex', position: 'relative' }} ref={profileDropdownRef}>
                <button
                  className={`profile-button ${theme === 'dark' ? 'dark' : ''} ${isProfileDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-label="Profile menu"
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="profile-avatar">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt="Company"
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : userPhoto ? (
                      <img
                        src={userPhoto}
                        alt="Profile"
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '12px', fontWeight: 700
                      }}>
                        {userInitials}
                      </div>
                    )}
                  </div>
                  <span className="profile-name">{userName}</span>
                  <span className={`profile-chevron ${theme === 'dark' ? 'dark' : ''}`}>
                    <ChevronDown size={14} />
                  </span>
                </button>

                {isProfileDropdownOpen && (
                  <div className={`profile-dropdown ${theme === 'dark' ? 'dark' : ''}`} style={{
                    minWidth: '160px'
                  }}>
                    {/* My Profile */}
                    <button
                      onClick={() => {
                        const profilePath = location.pathname.includes('/applicant') ? '/applicant/profile' : '/company/profile';
                        navigate(profilePath);
                        setIsProfileDropdownOpen(false);
                      }}
                      style={{
                        color: theme === 'dark' ? '#f3f4f6' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'background-color 150ms ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                      }}
                    >
                      <User size={16} />
                      My Profile
                    </button>

                    {/* Theme Toggle */}
                    <button
                      onClick={() => {
                        toggleTheme();
                        setIsProfileDropdownOpen(false);
                      }}
                      style={{
                        color: theme === 'dark' ? '#f3f4f6' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'background-color 150ms ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                      }}
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      style={{
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        transition: 'background-color 150ms ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                      }}
                    >
                      <LogOut size={16} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation - Mobile Only */}
      <div className="bottom-nav" style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '64px',
        backgroundColor: theme === 'dark' ? '#1f2937' : 'white',
        borderTop: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
        display: 'flex', /* Restore bottom nav */
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        {links.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '4px', border: 'none', background: 'transparent',
              position: 'relative', flex: 1, padding: '6px 0',
              cursor: 'pointer',
              color: location.pathname === link.path 
                ? (theme === 'dark' ? brandColors.primaryLight : brandColors.primary)
                : (theme === 'dark' ? '#9ca3af' : '#6b7280')
            }}
          >
            <div style={{ position: 'relative' }}>
              {getNavIcon(link.label, 20)}
              {link.label === 'Inbox' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#ef4444', color: 'white',
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
          </button>
        ))}
      </div>
    </>
  );
}
