import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

// Show password icon (eye open)
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

// Hide password icon (eye with slash)
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function ApplicantLogin() {
  const [step, setStep] = useState('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const captchaRef = useRef(null);
  const { applicantLogin, sendRegistrationOTP, verifyRegistrationOTP } = useAuth();
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

  function validatePasswords() {
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return false
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return false
    }
    setPasswordError('')
    return true
  }

  // Load reCAPTCHA script dynamically and render widget
  useEffect(() => {
    if (step === 'register') {
      // Load script if not already loaded
      if (!window.grecaptcha) {
        const script = document.createElement('script')
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
        script.async = true
        script.defer = true
        script.onload = () => renderCaptcha()
        document.head.appendChild(script)
      } else {
        renderCaptcha()
      }
    }
  }, [step])

  function renderCaptcha() {
    if (captchaRef.current && window.grecaptcha) {
      // Clear existing widget
      captchaRef.current.innerHTML = ''
      window.grecaptcha.ready(() => {
        window.grecaptcha.render(captchaRef.current, {
          sitekey: '6LfVkYYsAAAAAHZRTOBbm4mJ1BV8Kn4Dg4s18CZX',
          callback: (token) => {
            setCaptchaToken(token)
            setCaptchaError('')
          },
          'expired-callback': () => setCaptchaToken(null)
        })
      })
    }
  }

  async function handleRegister(e) {
  e.preventDefault()
  console.log('Step 1: Form submitted')
  if (!validatePasswords()) {
    console.log('Step 1a: Password validation failed')
    return
  }
  if (!captchaToken) {
    console.log('Step 1b: No captcha token')
    setCaptchaError('Please complete the CAPTCHA verification')
    return
  }
  console.log('Step 2: Starting registration...')
  try {
    setIsLoading(true)
    setError('')
    console.log('Step 3: Verifying captcha...')
    const captchaRes = await fetch('https://zero-effort-server.onrender.com/api/verify-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken })
    })
    console.log('Step 4: Captcha response status:', captchaRes.status)
    if (!captchaRes.ok) throw new Error('CAPTCHA verification failed')
    console.log('Step 5: Sending OTP...')
    await sendRegistrationOTP({ email, password, firstName, lastName, phone })
    console.log('Step 6: OTP sent! Showing OTP screen...')
    setPendingRegistration({ email, password, firstName, lastName, phone })
    setRegisteredEmail(email)
    setShowOTP(true)
    console.log('Step 7: showOTP set to true')
  } catch (err) {
    console.error('Registration error:', err)
    setError(err.message || 'Registration failed')
  } finally {
    setIsLoading(false)
  }
}

  async function handleVerifyOTP() {
  try {
    setOtpLoading(true)
    setOtpError('')

    await verifyRegistrationOTP({
      email: pendingRegistration.email,
      token: otp,
      firstName: pendingRegistration.firstName,
      lastName: pendingRegistration.lastName,
      phone: pendingRegistration.phone
    })

    showToast('Email verified! Welcome to Zero Effort! 🎉', 'success')
    navigate('/jobs/home')

  } catch (err) {
    setOtpError(err.message || 'Invalid or expired code. Please try again.')
  } finally {
    setOtpLoading(false)
  }
}

  async function handleResendOTP() {
  try {
    await sendRegistrationOTP({ 
      email: registeredEmail,
      password: pendingRegistration.password,
      firstName: pendingRegistration.firstName,
      lastName: pendingRegistration.lastName,
      phone: pendingRegistration.phone
    })
    showToast('New code sent! Check your email.', 'success')
    setOtp('')
  } catch (err) {
    setOtpError(err.message || 'Failed to resend code.')
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

        {showOTP ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h2 style={{ fontWeight: 800, marginBottom: '8px' }}>Verify your email</h2>
            <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>
              We sent an 8-digit code to <strong>{registeredEmail}</strong>. Enter it below to activate your account.
            </p>

            <div className="fgroup" style={{ textAlign: 'left' }}>
              <label>8-digit verification code</label>
              <input
                className="finput"
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="00000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
              />
            </div>

            {otpError && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                ⚠️ {otpError}
              </p>
            )}

            <button
              className="btn-primary"
              onClick={handleVerifyOTP}
              disabled={otpLoading || otp.length !== 8}
              style={{ width: '100%', marginTop: '16px' }}
            >
              {otpLoading ? 'Verifying...' : 'Verify Email →'}
            </button>

            <button
              onClick={handleResendOTP}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '13px',
                marginTop: '12px'
              }}
            >
              Didn't receive it? Resend code
            </button>
          </div>
        ) : (
          <>
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
                    <div style={{ position: 'relative' }}>
                      <input
                        className="finput"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text2)',
                          fontSize: '16px',
                          padding: 0
                        }}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in →'}
                  </button>
                </form>
                <div style={{ marginTop: '.75rem', textAlign: 'center' }}>
                  <button
                    onClick={() => setStep('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      fontSize: '.78rem'
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
                    {error.includes('already registered') && (
                      <button
                        onClick={() => setStep('login')}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, marginLeft: '4px' }}
                      >
                        Sign in here →
                      </button>
                    )}
                  </div>
                )}
                <form onSubmit={handleRegister}>
                  <div className="frow">
                    <div className="fgroup"><label className="flabel">First name</label><input className="finput" placeholder="Juan" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                    <div className="fgroup"><label className="flabel">Last name</label><input className="finput" placeholder="Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                  </div>
                  <div className="fgroup"><label className="flabel">Email address</label><input className="finput" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
                  <div className="fgroup"><label className="flabel">Phone number</label><input className="finput" type="tel" placeholder="+63 9XX XXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                  {/* Password field */}
                  <div className="fgroup">
                    <label className="flabel">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="finput"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text2)',
                          fontSize: '16px',
                          padding: 0
                        }}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  {/* Confirm Password field */}
                  <div className="fgroup">
                    <label className="flabel">Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="finput"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text2)',
                          fontSize: '16px',
                          padding: 0
                        }}
                      >
                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  {/* Password error message */}
                  {passwordError && (
                    <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '-8px' }}>
                      ⚠️ {passwordError}
                    </p>
                  )}
                  <div ref={captchaRef} style={{ margin: '8px 0' }}></div>
                  {captchaError && (
                    <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>
                      ⚠️ {captchaError}
                    </p>
                  )}
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
          </>
        )}
      </div>
    </div>
  );
}
