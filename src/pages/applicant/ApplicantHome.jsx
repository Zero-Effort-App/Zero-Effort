import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanies, getJobs, getEvents, getMyApplications, getRecentHires, formatDate } from '../../lib/db';
import CompanyLogo from '../../components/CompanyLogo';

function displaySalary(salary) {
  if (!salary) return 'Not specified'
  const clean = salary.toString().replace(/[^0-9]/g, '')
  if (!clean) return salary
  return `₱${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` 
}

export default function ApplicantHome() {
  const { profile } = useOutletContext();
  const [stats, setStats] = useState({ openPositions: 0, companiesHiring: 0, myApps: 0, upcomingEvents: 0 });
  const [events, setEvents] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [recentHires, setRecentHires] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [cos, jobs, evts, apps, hires] = await Promise.all([
          getCompanies(true),
          getJobs(true),
          getEvents(true),
          profile?.id ? getMyApplications(profile.id) : Promise.resolve([]),
          getRecentHires(10),
        ]);
        setCompanies(cos);
        setEvents(evts.slice(0, 6));
        setRecentHires(hires);
        setStats({
          openPositions: jobs.length,
          companiesHiring: cos.length,
          myApps: apps.length,
          upcomingEvents: evts.length,
        });

        const now = new Date();
        const featured = jobs.map(j => {
          const daysAgo = Math.floor((now - new Date(j.posted_at)) / (1000 * 60 * 60 * 24));
          const co = cos.find(c => c.id === j.company_id);
          return { ...j, co, daysAgo, isNew: daysAgo <= 3, ago: daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago` };
        });
        setFeaturedJobs(featured.filter(j => j.isNew || j.id <= 4).slice(0, 4));
      } catch (err) {
        console.error('Error loading home data:', err);
      }
    }
    load();
  }, [profile?.id]);

  function ini(name) { return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : '??'; }

  function getTimeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago` 
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago` 
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago` 
    return date.toLocaleDateString()
  }

  return (
    <div className="pw">
      <div className="hero">
        <div className="hero-badge" style={{ background: 'var(--accent-d)', borderColor: 'rgba(99,102,241,.22)', color: 'var(--accent2)' }}>
          Zero Effort — Official Job Portal
        </div>
        <div className="hero-h1">
          {profile ? (
            <>Welcome, <span className="ac">{profile.first_name}.</span><br />Find your next role here.</>
          ) : (
            <>Your next role is<br />inside the <span className="ac">Park.</span></>
          )}
        </div>
        <div className="hero-p">Browse all open positions across Zero Effort — curated, focused, and updated in real time.</div>
        <div className="hero-btns">
          <button className="btn-acc" onClick={() => navigate('/applicant/jobs')}>Browse open roles</button>
          <button className="btn-ghost" onClick={() => navigate('/applicant/companies')}>Explore companies</button>
        </div>
      </div>

      <div className="stat-row stagger">
        <div className="scard"><div className="scard-label">Open Positions</div><div className="scard-val">{stats.openPositions}</div></div>
        <div className="scard"><div className="scard-label">Companies Hiring</div><div className="scard-val">{stats.companiesHiring}</div></div>
        <div className="scard"><div className="scard-label">My Applications</div><div className="scard-val">{stats.myApps}</div></div>
        <div className="scard"><div className="scard-label">Upcoming Events</div><div className="scard-val">{stats.upcomingEvents}</div></div>
      </div>

      {recentHires.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>🎉 Recent Hires</span>
            <span style={{ 
              fontSize: '11px', 
              background: 'rgba(34,197,94,0.15)', 
              color: '#22c55e',
              padding: '2px 8px',
              borderRadius: '20px',
              fontWeight: 700
            }}>LIVE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentHires.map(hire => {
              const firstName = hire.applicants?.first_name || ''
              const lastInitial = hire.applicants?.last_name?.charAt(0) || ''
              const jobTitle = hire.jobs?.title || 'a position'
              const companyName = hire.jobs?.companies?.name || 'a company'
              const timeAgo = getTimeAgo(hire.applied_at)

              return (
                <div key={hire.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(34,197,94,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0
                  }}>
                    🎉
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      <span style={{ color: '#22c55e' }}>{firstName} {lastInitial}.</span>
                      {' '}was hired as{' '}
                      <span style={{ fontWeight: 700 }}>{jobTitle}</span>
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                      at {companyName} · {timeAgo}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <>
          <div className="sh"><span className="sh-title"><span className="sh-dot" />Upcoming Hiring Events</span></div>
          <div className="ev-row">
            {events.map(e => (
              <div key={e.id} className="ev-card">
                <div className="ev-top"><span className="ev-date">{formatDate(e.date)}</span><span className="ev-type">{e.type}</span></div>
                <div className="ev-title">{e.title}</div>
                <div className="ev-co">{e.organizer || '—'}</div>
                {e.details && e.details.length > 0 && (
                  <div className="ev-chips">{e.details.map((d, i) => <span key={i} className="ev-chip">{d}</span>)}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {featuredJobs.length > 0 && (
        <>
          <div className="sh">
            <span className="sh-title"><span className="sh-dot" />Featured Openings</span>
            <button className="sh-more" onClick={() => navigate('/applicant/jobs')}>View all →</button>
          </div>
          <div className="jgrid stagger">
            {featuredJobs.map(j => {
              const co = j.co;
              return (
                <div key={j.id} className="jcard" onClick={() => navigate('/applicant/jobs', { state: { selectedJobId: j.id } })}>
                  <div className="jcard-stripe" style={{ background: co?.color ? `linear-gradient(90deg,${co.color},${co.color}55)` : 'linear-gradient(90deg,#6366f1,#6366f155)' }} />
                  <div className="jcard-top">
                    <CompanyLogo company={co} size={40} />
                    {j.isNew && <span className="new-b">New</span>}
                  </div>
                  <div className="jcard-title">{j.title}</div>
                  <div className="jcard-co">{co?.name || '—'}</div>
                  <div className="jcard-pills">
                    <span className="pill">📍 Zero Effort</span>
                    <span className="pill">⏱ {j.type}</span>
                    <span className="pill">{j.department}</span>
                  </div>
                  <div className="jcard-foot">
                    <span className="jcard-sal">{displaySalary(j.salary)}</span>
                    <span className="jcard-ago">{j.ago}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
