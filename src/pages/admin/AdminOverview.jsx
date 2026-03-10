import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, getJobs, getEvents, getActivityLog, getLiveStats, formatTime } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

export default function AdminOverview() {
  const [stats, setStats] = useState({ totalCompanies: 0, totalJobs: 0, totalApplications: 0, totalEvents: 0 });
  const [companies, setCompanies] = useState([]);
  const [activity, setActivity] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [s, cos, act, requests] = await Promise.all([
          getLiveStats(),
          getCompanies(),
          getActivityLog(10),
          loadResetRequests(),
        ]);
        setStats(s);
        setCompanies(cos.slice(0, 4));
        setActivity(act);
      } catch (err) {
        console.error('Error loading overview:', err);
      }
    }
    load();
  }, []);

  async function loadResetRequests() {
    try {
      const { data: requests } = await supabase
        .from('password_reset_requests')
        .select('*, companies(name)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      setResetRequests(requests || []);
      return requests;
    } catch (err) {
      console.error('Error loading reset requests:', err);
      return [];
    }
  }

  async function handleResetPassword() {
    if (!newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    setResetLoading(true);
    
    try {
      const response = await fetch('http://localhost:3002/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedRequest.email, newPassword })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showToast('Password reset successfully! Company has been notified.', 'success');
        setResetModalOpen(false);
        setSelectedRequest(null);
        setNewPassword('');
        setConfirmPassword('');
        await loadResetRequests(); // Reload requests
        
        // Log to activity log
        await supabase.from('activity_log').insert([{
          type: 'security',
          message: `Password reset for ${selectedRequest.companies.name}`,
          sub_text: `Request from ${selectedRequest.email}`,
          icon: '🔐'
        }]);
      } else {
        showToast(result.error || 'Failed to reset password', 'error');
      }
    } catch (err) {
      showToast('Failed to reset password', 'error');
    } finally {
      setResetLoading(false);
    }
  }

  function openResetModal(request) {
    setSelectedRequest(request);
    setResetModalOpen(true);
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="pw">
      <div className="hero">
        <div className="hero-badge">Admin Dashboard</div>
        <div className="hero-h1">
          Welcome back,<br /><span className="gc">Admin.</span>
        </div>
        <div className="hero-p">Here's what's happening across Zero Effort today.</div>
        <div className="hero-btns">
          <button className="btn-acc" onClick={() => navigate('/admin/companies')}>Manage Companies</button>
          <button className="btn-ghost" onClick={() => navigate('/admin/events')}>View Events →</button>
        </div>
      </div>

      <div className="stat-row stagger">
        <div className="scard"><div className="scard-label">Companies</div><div className="scard-val">{stats.totalCompanies}</div></div>
        <div className="scard"><div className="scard-label">Job Postings</div><div className="scard-val">{stats.totalJobs}</div></div>
        <div className="scard"><div className="scard-label">Applications</div><div className="scard-val">{stats.totalApplications}</div></div>
        <div className="scard"><div className="scard-label">Events</div><div className="scard-val">{stats.totalEvents}</div></div>
      </div>

      <div className="sh">
        <span className="sh-title"><span className="sh-dot" />Top Companies</span>
        <button className="sh-more" onClick={() => navigate('/admin/companies')}>View all →</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '.875rem', marginBottom: '2rem' }} className="stagger">
        {companies.map(c => (
          <div key={c.id} className="scard" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '.5rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: c.color ? c.color + '20' : 'rgba(99,102,241,.12)', color: c.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 800, border: '1px solid var(--border)' }}>
                {c.logo_initials || c.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '.82rem', fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: '.68rem', color: 'var(--text2)' }}>{c.industry}</div>
              </div>
            </div>
            <div style={{ fontSize: '.72rem', color: c.is_active ? 'var(--success)' : 'var(--danger)' }}>
              ● {c.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        ))}
      </div>

      {/* Password Reset Requests Section */}
      {resetRequests.length > 0 && (
        <div className="sh">
          <span className="sh-title"><span className="sh-dot" />Password Reset Requests</span>
        </div>
      )}
      <div className="reset-requests-list stagger">
        {resetRequests.map(request => (
          <div key={request.id} className="scard" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.25rem' }}>
                  {request.companies?.name || 'Unknown Company'}
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--text2)', marginBottom: '.25rem' }}>
                  {request.email}
                </div>
                <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>
                  Requested {formatTime(request.requested_at)}
                </div>
              </div>
              <button 
                className="btn-primary" 
                onClick={() => openResetModal(request)}
                style={{ fontSize: '.75rem', padding: '.4rem .8rem' }}
              >
                Reset Password
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sh">
        <span className="sh-title"><span className="sh-dot" />Recent Activity</span>
        <button className="sh-more" onClick={() => navigate('/admin/activity')}>View all →</button>
      </div>
      <div className="act-list stagger">
        {activity.slice(0, 5).map(a => (
          <div key={a.id} className="act-row">
            <div className={`act-icon ${a.type}`}>{a.icon}</div>
            <div className="act-info">
              <div className="act-main">{a.message}</div>
              <div className="act-sub">{a.sub_text}</div>
            </div>
            <div className="act-time">{formatTime(a.created_at)}</div>
          </div>
        ))}
        {activity.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.8rem' }}>No recent activity.</div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModalOpen && selectedRequest && (
        <div className="moverlay open">
          <div className="modal">
            <div className="m-head">
              <div>
                <div className="m-title">Reset Password</div>
                <div className="m-sub">For {selectedRequest.companies?.name} ({selectedRequest.email})</div>
              </div>
              <button className="m-close" onClick={() => setResetModalOpen(false)}>✕</button>
            </div>
            
            <div className="m-body">
              <div className="fgroup">
                <label className="flabel">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="finput"
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="fgroup">
                <label className="flabel">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="finput"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="btn-row">
              <button className="btn-cancel" onClick={() => setResetModalOpen(false)}>Cancel</button>
              <button 
                className="btn-confirm-danger" 
                onClick={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
