import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Briefcase, Target, Moon, Sun, Download, Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Particles from '../components/Particles';

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    });
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setShowInstall(false);
  }

  const portals = [
    {
      emoji: <Shield size={24} />,
      title: 'Admin Portal',
      desc: 'Manage companies, oversee job postings, coordinate events, and monitor all activity across the park.',
      path: '/admin',
      color: '#6366f1',
      bg: 'rgba(99,102,241,.12)',
    },
    {
      emoji: <Briefcase size={24} />,
      title: 'Company Portal',
      desc: 'Post jobs, review applicants, manage your hiring pipeline, and update your company profile.',
      path: '/company',
      color: '#2dd4bf',
      bg: 'rgba(45,212,191,.12)',
    },
    {
      emoji: <Target size={24} />,
      title: 'Applicant Portal',
      desc: 'Browse open positions, explore companies in the park, apply for roles, and track your applications.',
      path: '/applicant',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.12)',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background elements — absolutely positioned so they don't affect layout */}
      <div className="land-bg" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div className="land-mesh" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <Particles />

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {/* Main content — centered */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '0'
      }}>
        {/* Badge */}
        <div className="land-badge" style={{ marginBottom: '20px' }}>
          Zero Effort · Jobs Portal System
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <img
            src={theme === 'dark' ? '/hanap-icon-white.png' : '/hanap-icon-dark.png'}
            alt="HANAP"
            style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '12px' }}
          />
          <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text1)' }}>
            HANAP
          </span>
        </div>

        {/* Description */}
        <p style={{
          textAlign: 'center',
          maxWidth: '500px',
          marginBottom: '32px',
          opacity: 0.7,
          fontSize: '15px',
          lineHeight: '1.6'
        }}>
          Choose a portal to get started. Each portal provides a dedicated experience for its user role.
        </p>

        {/* Install Button */}
        {showInstall && (
          <button
            onClick={handleInstall}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text1)',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '8px 16px',
              borderRadius: '20px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Install App
          </button>
        )}

        {/* Portal Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          width: '100%',
          maxWidth: '900px'
        }}>
          {portals.map((p, i) => (
            <div
              key={i}
              onClick={() => navigate(p.path)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all .2s',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
              className="co-card"
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                {p.emoji}
              </div>
              <div style={{ fontSize: '.95rem', fontWeight: 800, letterSpacing: '-.3px', marginBottom: '.3rem' }}>{p.title}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.65, marginBottom: '0.75rem' }}>{p.desc}</div>
              <div style={{ fontSize: '.78rem', fontWeight: 700, color: p.color, display: 'flex', alignItems: 'center', gap: 5 }}>
                Enter portal <span style={{ transition: 'transform .2s' }}>→</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ marginTop: '28px', fontSize: '12px', opacity: 0.4 }}>
          Zero Effort · Lipa City, Batangas · Official Job Portal System
        </p>
      </div>
    </div>
  );
}
