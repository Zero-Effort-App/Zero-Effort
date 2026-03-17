import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getMyApplications, getCompanies, formatDate } from '../../lib/db';
import { FileText, Clock, Eye, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

export default function ApplicantApplications() {
  const { profile } = useOutletContext();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState({});
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
            coLogo: co.logo_url || null,
            date: new Date(a.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: a.status,
            lastStatus: a.status, // Track status changes
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

  // Mark all status updates as viewed when page loads
  useEffect(() => {
    if (apps && apps.length > 0 && profile?.id) {
      const viewedStatuses = {};
      apps.forEach(app => {
        if (['accepted', 'rejected'].includes(app.status)) {
          viewedStatuses[app.id] = true;
        }
      });
      localStorage.setItem(`viewedStatuses_${profile.id}`, JSON.stringify(viewedStatuses));
    }
  }, [apps, profile?.id]);

  // Real-time status updates
  useEffect(() => {
    if (!profile?.id) return;

    // Subscribe to application status changes
    const channel = supabase
      .channel(`application-status-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'applications',
        filter: `applicant_id=eq.${profile.id}`
      }, payload => {
        
        const updatedApp = payload.new;
        const oldStatus = payload.old.status;
        const newStatus = updatedApp.status;
        
        // Only notify if status actually changed
        if (oldStatus !== newStatus) {
          // Update the application in the list
          setApps(prev => prev.map(app => 
            app.id === updatedApp.id 
              ? { ...app, status: newStatus, lastStatus: oldStatus }
              : app
          ));
          
          // Show notification for status change
          const appData = apps.find(a => a.id === updatedApp.id);
          if (appData) {
            handleStatusNotification(appData, oldStatus, newStatus);
          }
          
          // Update status updates tracker
          setStatusUpdates(prev => ({
            ...prev,
            [updatedApp.id]: {
              previous: oldStatus,
              current: newStatus,
              timestamp: new Date()
            }
          }));
          
          // Show browser notification if tab is not focused
          if (!document.hasFocus()) {
            showStatusBrowserNotification(appData, oldStatus, newStatus);
          }
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id, apps]);

  function handleStatusNotification(appData, oldStatus, newStatus) {
    const statusMessages = {
      'pending': 'Your application is under review',
      'reviewed': 'Your application has been reviewed',
      'accepted': '🎉 Congratulations! Your application has been accepted!',
      'declined': 'Your application was not selected for this position',
    };

    const message = statusMessages[newStatus] || `Application status updated to ${newStatus}`;
    
    // Show toast notification
    if (newStatus === 'accepted') {
      showToast(message, 'success');
    } else if (newStatus === 'declined') {
      showToast(message, 'error');
    } else {
      showToast(message, 'info');
    }
  }

  function showStatusBrowserNotification(appData, oldStatus, newStatus) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const titles = {
        'accepted': '🎉 Application Accepted!',
        'declined': 'Application Update',
        'reviewed': 'Application Update',
        'pending': 'Application Update'
      };

      new Notification(titles[newStatus] || 'Application Update', {
        body: `${appData.title} at ${appData.co} - Status changed to ${newStatus}`,
        icon: '/favicon.ico',
        tag: `application-${appData.id}`,
        requireInteraction: newStatus === 'accepted' || newStatus === 'declined'
      });
    }
  }

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const statusMap = {
    pending: ['s-pending', 'Under Review'],
    reviewed: ['s-reviewed', 'Reviewed'],
    accepted: ['s-accepted', 'Accepted'],
    declined: ['s-declined', 'Declined'],
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
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {[1,2,3].map(i => (
          <div key={i} className="card" style={{
            padding: '20px', borderRadius: '12px',
            background: 'var(--surface)', marginBottom: '12px'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '8px',
              background: 'var(--bg2)', marginBottom: '12px'
            }} />
            <div style={{
              width: '60%', height: '16px', borderRadius: '4px',
              background: 'var(--bg2)', marginBottom: '8px'
            }} />
            <div style={{
              width: '40%', height: '12px', borderRadius: '4px',
              background: 'var(--bg2)'
            }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pw">
      <div className="ph"><h2>My Applications</h2><p>Track the status of every application you've submitted.</p></div>

      <div className="apl-list stagger">
        {apps.length > 0 ? apps.map(a => {
          const [cls, lbl] = statusMap[a.status] || ['s-pending', 'Under Review'];
          const statusUpdate = statusUpdates[a.id];
          const hasStatusChange = statusUpdate && statusUpdate.previous !== statusUpdate.current;
          
          return (
            <div key={a.id} className={`apl-row ${hasStatusChange ? 'status-updated' : ''}`}>
              <div className="apl-logo" style={{ 
  background: a.coLogo ? 'transparent' : (a.coColor + '20'), 
  color: a.coColor,
  overflow: 'hidden',
  padding: a.coLogo ? '0' : undefined
}}>
  {a.coLogo ? (
    <img src={a.coLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9px', display: 'block' }} />
  ) : (
    a.coInitials
  )}
</div>
              <div className="apl-info">
                <div className="apl-title">{a.title}</div>
                <div className="apl-co">{a.co}</div>
                <div className="apl-date">{a.date}</div>
                {hasStatusChange && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--success)', 
                    marginTop: '4px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '10px' }}>✨</span>
                    Status updated!
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <span className={`status ${cls}`}>{lbl}</span>
                  {hasStatusChange && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'var(--text2)',
                      fontStyle: 'italic'
                    }}>
                      Was: {statusMap[statusUpdate.previous]?.[1] || statusUpdate.previous}
                    </span>
                  )}
                </div>
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
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '300px', 
            textAlign: 'center',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '3rem' }}><FileText size={48} /></div>
            <h3 style={{ color: 'var(--text2)', margin: 0 }}>No applications yet</h3>
            <p style={{ color: 'var(--text3)', margin: 0 }}>
              You haven't applied to any jobs yet. Start browsing open positions!
            </p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/applicant/jobs')}
              style={{ marginTop: '1rem' }}
            >
              Browse Jobs →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
