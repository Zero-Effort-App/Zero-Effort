import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getMyApplications, getCompanies } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

export default function ApplicantApplications() {
  const { profile } = useOutletContext();
  const [apps, setApps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      setIsLoading(true);
      try {
        const [applications, cos] = await Promise.all([
          getMyApplications(profile.id),
          getCompanies(true),
        ]);
        setCompanies(cos);
        setApps(applications.map(a => {
          const co = a.jobs?.companies || cos.find(c => c.id === a.jobs?.company_id) || {};
          return {
            id: a.id,
            jobId: a.job_id,
            title: a.jobs?.title || 'Unknown',
            co: co.name || a.jobs?.companies?.name || 'Unknown',
            cid: a.jobs?.company_id,
            coColor: co.color || '#6366f1',
            coInitials: co.logo_initials || (co.name ? co.name.split(' ').map(w => w[0]).join('').slice(0, 2) : '??'),
            date: new Date(a.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: a.status,
          };
        }));
      } catch (err) {
        console.error('Error loading applications:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [profile]);

  const statusMap = {
    pending: ['s-pending', '⏳ Under Review'],
    reviewed: ['s-reviewed', '👁 Reviewed'],
    accepted: ['s-accepted', '✓ Accepted'],
    declined: ['s-declined', '✗ Declined'],
  };

  async function handleWithdraw(applicationId) {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)
        .eq('applicant_id', profile.id); // security check
      if (error) throw error;
      showToast('Application withdrawn successfully', 'success');
      setApps(prev => prev.filter(a => a.id !== applicationId));
    } catch (error) {
      console.error('Withdraw error:', error);
      showToast('Failed to withdraw application', 'error');
    }
  }

  if (isLoading) return (
    <div className="pw">
      <div className="ph"><h2>My Applications</h2><p>Track the status of every application you've submitted.</p></div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <p style={{ color: 'var(--text2)' }}>Loading applications...</p>
      </div>
    </div>
  );

  return (
    <div className="pw">
      <div className="ph"><h2>My Applications</h2><p>Track the status of every application you've submitted.</p></div>

      <div className="apl-list stagger">
        {apps.length > 0 ? apps.map(a => {
          const [cls, lbl] = statusMap[a.status] || ['s-pending', '⏳ Under Review'];
          return (
            <div key={a.id} className="apl-row">
              <div className="apl-logo" style={{ background: a.coColor + '20', color: a.coColor }}>
                {a.coInitials}
              </div>
              <div className="apl-info">
                <div className="apl-title">{a.title}</div>
                <div className="apl-co">{a.co}</div>
                <div className="apl-date">{a.date}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span className={`status ${cls}`}>{lbl}</span>
                {a.status === 'pending' && (
                  <button 
                    onClick={() => handleWithdraw(a.id)}
                    style={{ 
                      fontSize: '.7rem', 
                      padding: '0.25rem 0.5rem', 
                      backgroundColor: 'var(--danger)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="empty-state">
            <div style={{ fontSize: '48px' }}>�</div>
            <h3>No applications yet</h3>
            <p>Start applying to jobs and track your progress here</p>
            <button className="btn-primary" onClick={() => navigate('/applicant/jobs')}>
              Browse Jobs →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
