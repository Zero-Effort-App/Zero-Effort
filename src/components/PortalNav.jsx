import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function PortalNav({ portalTag, links, userInitials, userName, companyLogo }) {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function handleLogout() {
    await logout();
    const base = location.pathname.split('/')[1];
    navigate(`/${base}`);
  }

  const basePath = '/' + location.pathname.split('/')[1];

  return (
    <nav style={{
      height: '72px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src={theme === 'dark' ? '/zero-effort-logo-white.png' : '/zero-effort-logo-dark.png'}
          alt="Zero Effort"
          style={{ 
            height: '52px', 
            width: 'auto', 
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
            borderRadius: '4px'
          }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      )}
      
      {/* Navigation links - desktop vs mobile */}
      {isMobile ? (
        isMobileMenuOpen && (
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
                {link.label}
                {link.badge > 0 && <span className="nbadge" />}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="nav-links">
          {links.map(link => (
            <button
              key={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
              {link.badge > 0 && <span className="nbadge" />}
            </button>
          ))}
        </div>
      )}
      
      <div className="nav-right">
        <button className="nav-theme-btn" onClick={toggleTheme}>
          {theme === 'dark' ? '🌙' : '☀️'}
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
                <div className="user-av">{userInitials || '??'}</div>
              )}
              <span className="user-name">{userName || 'User'}</span>
            </div>
            <button className="nav-logout" onClick={handleLogout}>Log out</button>
          </>
        )}
      </div>
    </nav>
  );
}
