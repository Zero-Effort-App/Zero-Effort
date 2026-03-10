import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function ApplicantResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    // Check if there's a valid session from the reset link
    const checkResetSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          setError('Invalid or expired reset link. Please request a new password reset.');
          setIsValidSession(false);
        } else {
          setIsValidSession(true);
        }
      } catch (err) {
        setError('Invalid or expired reset link. Please request a new password reset.');
        setIsValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkResetSession();
  }, []);

  async function handleResetPassword(e) {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        setError('Failed to update password. Please try again.');
      } else {
        showToast('Password updated successfully!', 'success');
        // Sign out and redirect to login
        await supabase.auth.signOut();
        navigate('/applicant/login');
      }
    } catch (err) {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="auth-wrap">
        <div className="auth-blob a" />
        <div className="auth-blob b" />
        <div className="auth-card">
          <div className="step active" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ color: 'var(--text2)' }}>Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="auth-wrap">
        <div className="auth-blob a" />
        <div className="auth-blob b" />
        <div className="auth-card">
          <div className="step active">
            <div className="step-h">Invalid Reset Link</div>
            <div className="step-s">This password reset link is invalid or has expired.</div>
            {error && (
              <div style={{ 
                background: 'rgba(244,63,94,.1)', 
                border: '1px solid rgba(244,63,94,.2)', 
                borderRadius: '8px', 
                padding: '.6rem .8rem', 
                marginBottom: '.875rem', 
                fontSize: '.78rem', 
                color: 'var(--danger)' 
              }}>
                {error}
              </div>
            )}
            <button 
              className="btn-primary" 
              onClick={() => navigate('/applicant/login')}
              style={{ width: '100%' }}
            >
              Back to Login
            </button>
          </div>
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
          <div style={{ marginBottom: '0.5rem' }}>
            <img 
              src={theme === 'dark' ? '/zero-effort-logo-white.png' : '/zero-effort-logo-dark.png'} 
              alt="Zero Effort" 
              style={{ height: '60px', width: 'auto', objectFit: 'contain' }} 
            />
          </div>
          <div className="brand-badge">APPLICANT</div>
        </div>
        
        <div className="step active">
          <div className="step-h">Set New Password</div>
          <div className="step-s">Choose a new password for your account</div>
          {error && (
            <div style={{ 
              background: 'rgba(244,63,94,.1)', 
              border: '1px solid rgba(244,63,94,.2)', 
              borderRadius: '8px', 
              padding: '.6rem .8rem', 
              marginBottom: '.875rem', 
              fontSize: '.78rem', 
              color: 'var(--danger)' 
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleResetPassword}>
            <div className="fgroup">
              <label className="flabel">New Password</label>
              <input 
                className="finput" 
                type="password" 
                placeholder="Enter your new password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
              />
            </div>
            <div className="fgroup">
              <label className="flabel">Confirm Password</label>
              <input 
                className="finput" 
                type="password" 
                placeholder="Confirm your new password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
