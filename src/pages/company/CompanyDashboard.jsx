import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanyJobs, getCompanyApplications, getCompanyActivityLog, formatTime } from '../../lib/db';

export default function CompanyDashboard() {
  const { company } = useOutletContext();
  const [stats, setStats] = useState({ active: 0, total: 0, pending: 0, accepted: 0 });
  const [activity, setActivity] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      if (!company) return;
      try {
        const [jobs, apps, act] = await Promise.all([
          getCompanyJobs(company.id),
          getCompanyApplications(company.id),
          getCompanyActivityLog(company.id),
        ]);
        setStats({
          active: jobs.filter(j => j.status === 'active').length,
          total: apps.length,
          pending: apps.filter(a => a.status === 'pending').length,
          accepted: apps.filter(a => a.status === 'accepted').length,
        });
        setActivity(act.slice(0, 5).map(a => ({
          type: a.type,
          icon: a.icon,
          text: a.message,
          time: formatTime(a.created_at),
        })));
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
    }
    load();
  }, [company]);

  if (!company) return null;

  const actMap = {
    'new-app': 'act-icon new-app',
    'accepted': 'act-icon accepted',
    'declined': 'act-icon declined',
    'posted': 'act-icon posted',
  };

  return (
    <div className="pw">
      <div className="hero">
        <div className="hero-badge">Company Dashboard</div>
        <div className="hero-h1">
          Welcome back,<br /><span className="gc">{company.name?.split(' ')[0]}.</span>
        </div>
        <div className="hero-p">Here's a snapshot of your hiring activity inside Zero Effort.</div>
        <div className="hero-btns">
          <button className="btn-acc" onClick={() => navigate('/company/listings')}>+ Post a job</button>
          <button className="btn-ghost" onClick={() => navigate('/company/applicants')}>Review applicants →</button>
        </div>
      </div>

      <div className="stat-row stagger">
        <div className="scard"><div className="scard-label">Active Listings</div><div className="scard-val">{stats.active}</div></div>
        <div className="scard"><div className="scard-label">Total Applicants</div><div className="scard-val">{stats.total}</div></div>
        <div className="scard"><div className="scard-label">Pending Review</div><div className="scard-val"><span className={stats.pending > 0 ? 'red' : ''}>{stats.pending}</span></div></div>
        <div className="scard"><div className="scard-label">Accepted</div><div className="scard-val"><span className="grn">{stats.accepted}</span></div></div>
      </div>

      <div className="sh">
        <span className="sh-title"><span className="sh-dot" />Recent Activity</span>
      </div>
      <div className="act-list stagger">
        {activity.map((a, i) => (
          <div key={i} className="act-row">
            <div className={actMap[a.type] || 'act-icon company'}>{a.icon}</div>
            <div className="act-info">
              <div className="act-main">{a.text}</div>
              <div className="act-sub">{company.name}</div>
            </div>
            <div className="act-time">{a.time}</div>
          </div>
        ))}
        {activity.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.8rem' }}>No recent activity.</div>
        )}
      </div>
    </div>
  );
}
