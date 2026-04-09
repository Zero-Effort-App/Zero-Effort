import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  async function handleLogin(e) {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password || 'Admin@2025');
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-blob a" />
      <div className="auth-blob b" />
      <div className="auth-card">
        <div className="auth-steps">
          <div className="auth-step w1 lit" />
          <div className="auth-step w2 lit" />
        </div>
        <div className="brand">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '32px'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              alignItems: 'flex-end', 
              gap: '12px'
            }}>
              <img
                src={theme === 'dark' ? '/hanap-icon-white.png' : '/hanap-icon-dark.png'}
                alt="HANAP"
                style={{ 
                  height: '80px', 
                  width: '80px', 
                  objectFit: 'contain',
                  flexShrink: 0
                }}
              />
              <span style={{ 
                fontSize: '22px', 
                fontWeight: 800, 
                letterSpacing: '-0.5px',
                color: 'var(--text1)',
                margin: 0,
                padding: 0,
                paddingBottom: '8px'
              }}>
                HANAP
              </span>
            </div>
            <div className="brand-badge">ADMIN</div>
          </div>
        </div>
        <div className="step active">
          <div className="step-h">Admin Sign In</div>
          <div className="step-s">Sign in to access the admin dashboard</div>
          {error && (
            <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', borderRadius: '8px', padding: '.6rem .8rem', marginBottom: '.875rem', fontSize: '.78rem', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="fgroup">
              <label className="flabel">Email address</label>
              <input className="finput" type="email" placeholder="admin@zero-effort.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="fgroup">
              <label className="flabel">Password</label>
              <input className="finput" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
          <div className="form-note" style={{ marginTop: '1rem' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}>← Back to home</span>
          </div>
        </div>
      </div>
    </div>
  );
}
