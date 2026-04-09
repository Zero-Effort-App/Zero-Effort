import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle } from 'lucide-react';

export default function CompanyLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const { companyLogin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { theme } = useTheme();

  async function handleLogin() {
    try {
      setIsLoading(true);
      setError('');
      await companyLogin(email, password);
      navigate('/company/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotLoading(true);
    setError('');
    try {
      // Check if email exists in company_users
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id, email')
        .eq('email', forgotEmail)
        .maybeSingle();

      if (!companyUser) {
        setError('No company account found with this email');
        return;
      }

      // Insert reset request
      const { error } = await supabase
        .from('password_reset_requests')
        .insert([{
          company_id: companyUser.company_id,
          email: forgotEmail,
          status: 'pending'
        }]);

      if (error) throw error;

      setForgotSuccess(true);
      showToast('Reset request sent! The admin will contact you shortly.', 'success');

    } catch (err) {
      setError(err.message || 'Failed to send reset request');
    } finally {
      setForgotLoading(false);
    }
  }

  if (showForgotPassword) {
    return (
      <div className="auth-wrap">
        <div className="auth-blob a" />
        <div className="auth-blob b" />
        <div className="auth-card">
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
              <div className="brand-badge">COMPANY</div>
            </div>
          </div>

          <h2>Request Password Reset</h2>
          <p>Enter your email to request a password reset from the admin</p>

          {error && <p className="auth-error">{error}</p>}

          {forgotSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}><CheckCircle size={48} /></div>
              <h3>Reset Request Sent!</h3>
              <p>The admin will contact you shortly to help reset your password.</p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="fgroup">
                <label>Email address</label>
                <input
                  className="finput"
                  type="email"
                  placeholder="hr@yourcompany.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <button className="btn-primary" type="submit" disabled={forgotLoading}>
                {forgotLoading ? 'Sending...' : 'Request Password Reset →'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="link-btn" onClick={() => setShowForgotPassword(false)}>
              ← Back to sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-blob a" />
      <div className="auth-blob b" />
      <div className="auth-card">
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
            <div className="brand-badge">COMPANY</div>
          </div>
        </div>

        <h2>Company Sign In</h2>
        <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>
          Sign in to access your company dashboard
        </p>

        <div className="fgroup" style={{ marginBottom: '16px' }}>
          <label>Email address</label>
          <input
            className="finput"
            type="email"
            placeholder="hr@yourcompany.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="fgroup" style={{ marginBottom: '24px' }}>
          <label>Password</label>
          <input
            className="finput"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-primary" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            className="link-btn" 
            onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--accent)', 
              fontSize: '.75rem', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Forgot Password?
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            onClick={() => navigate('/company')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text2)', 
              cursor: 'pointer',
              fontSize: '13px',
              marginTop: '8px'
            }}
          >
            ← Back to home
          </button>
        </p>
      </div>
    </div>
  );
}
