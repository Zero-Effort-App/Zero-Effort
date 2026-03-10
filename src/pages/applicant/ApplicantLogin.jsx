import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function ApplicantLogin() {
  const [step, setStep] = useState('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { applicantLogin, registerApplicant } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { theme } = useTheme();

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setError('');
    setLoading(true);
    try {
      await applicantLogin(email, password);
      navigate('/applicant/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      console.log('Register form values:', { firstName, lastName, email, phone });
      await registerApplicant(
        firstName,    // first name from form
        lastName,     // last name from form
        email,        // email from form
        phone,        // phone from form
        password      // password from form
      );
      navigate('/applicant/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/applicant/reset-password` 
      });

      if (error) {
        // Check if error is due to email not found
        if (error.message.includes('User not found') || error.message.includes('Invalid email')) {
          setError('No account found with this email');
        } else {
          setError('Failed to send reset link. Please try again.');
        }
      } else {
        showToast('Password reset link sent! Check your email at techpark.jobs.ph@gmail.com', 'success');
        setForgotEmail('');
        setStep('choose');
      }
    } catch (err) {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-blob a" />
      <div className="auth-blob b" />
      <div className="auth-card">
        <div className="auth-steps">
          <div className="auth-step w1 lit" />
          <div className={`auth-step w2 ${step !== 'choose' ? 'lit' : ''}`} />
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
                src={theme === 'dark' ? '/zero-effort-icon-white.png' : '/zero-effort-icon-dark.png'}
                alt="Zero Effort"
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
                Zero Effort
              </span>
            </div>
            <div className="brand-badge">APPLICANT</div>
          </div>
        </div>

        {/* Step 1: Choose */}
        {step === 'choose' && (
          <div className="step active">
            <div className="step-h">Do you have an account?</div>
            <div className="step-s">Choose an option to continue</div>
            <div className="choice-cards">
              <div className="cc" onClick={() => { setStep('login'); setError(''); }}>
                <div className="cc-ico a">🔑</div>
                <div className="cc-body">
                  <div className="cc-label">Yes, I have an account</div>
                  <div className="cc-hint">Sign in to continue your job search</div>
                </div>
                <span className="cc-arr">›</span>
              </div>
              <div className="cc" onClick={() => { setStep('register'); setError(''); }}>
                <div className="cc-ico b">✨</div>
                <div className="cc-body">
                  <div className="cc-label">No, I'm new here</div>
                  <div className="cc-hint">Create a free account in seconds</div>
                </div>
                <span className="cc-arr">›</span>
              </div>
            </div>
            <div className="form-note" style={{ marginTop: '1rem' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => navigate('/applicant')}>← Back to home</span>
            </div>
          </div>
        )}

        {/* Step 2a: Login */}
        {step === 'login' && (
          <div className="step active">
            <button className="back-btn" onClick={() => setStep('choose')}>← Back</button>
            <div className="step-h">Welcome back 👋</div>
            <div className="step-s">Sign in to your Zero Effort account</div>
            {error && (
              <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', borderRadius: '8px', padding: '.6rem .8rem', marginBottom: '.875rem', fontSize: '.78rem', color: 'var(--danger)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div className="fgroup">
                <label className="flabel">Email address</label>
                <input className="finput" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flabel">Password</label>
                <input className="finput" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => { setStep('forgot'); setError(''); setForgotEmail(email); }}
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
          </div>
        )}

        {/* Step 2b: Register */}
        {step === 'register' && (
          <div className="step active">
            <button className="back-btn" onClick={() => setStep('choose')}>← Back</button>
            <div className="step-h">Create your account</div>
            <div className="step-s">Join Zero Effort for free</div>
            {error && (
              <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', borderRadius: '8px', padding: '.6rem .8rem', marginBottom: '.875rem', fontSize: '.78rem', color: 'var(--danger)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleRegister}>
              <div className="frow">
                <div className="fgroup"><label className="flabel">First name</label><input className="finput" placeholder="Juan" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                <div className="fgroup"><label className="flabel">Last name</label><input className="finput" placeholder="Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              </div>
              <div className="fgroup"><label className="flabel">Email address</label><input className="finput" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="fgroup"><label className="flabel">Phone number</label><input className="finput" type="tel" placeholder="+63 9XX XXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div className="fgroup"><label className="flabel">Password</label><input className="finput" type="password" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create account →'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2c: Forgot Password */}
        {step === 'forgot' && (
          <div className="step active">
            <button className="back-btn" onClick={() => setStep('login')}>← Back</button>
            <div className="step-h">Reset Password</div>
            <div className="step-s">Enter your email to receive a password reset link</div>
            {error && (
              <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)', borderRadius: '8px', padding: '.6rem .8rem', marginBottom: '.875rem', fontSize: '.78rem', color: 'var(--danger)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleForgotPassword}>
              <div className="fgroup">
                <label className="flabel">Email address</label>
                <input 
                  className="finput" 
                  type="email" 
                  placeholder="you@email.com" 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)} 
                />
              </div>
              <button className="btn-primary" type="submit" disabled={forgotLoading}>
                {forgotLoading ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
