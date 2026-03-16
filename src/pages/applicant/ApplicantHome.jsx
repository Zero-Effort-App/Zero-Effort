import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanies, getJobs, getEvents, getMyApplications, getRecentHires, formatDate } from '../../lib/db';
import { Briefcase, Building2, FileText, CalendarDays, CheckCircle, Clock, MapPin } from 'lucide-react';
import CompanyLogo from '../../components/CompanyLogo';
import { supabase } from '../../lib/supabase';

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
        // Fetch companies, events, applications, and recent hires
        const [cos, evts, apps, hires] = await Promise.all([
          getCompanies(true),
          getEvents(true),
          profile?.id ? getMyApplications(profile.id) : Promise.resolve([]),
          getRecentHires(10),
        ]);
        
        // Fetch featured jobs properly
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*, companies(name, logo_url, logo_initials, color)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4);
        
        console.log('Featured jobs:', jobsData);
        
        setCompanies(cos);
        setEvents(evts.slice(0, 6));
        setRecentHires(hires);
        setFeaturedJobs(jobsData || []);
        setStats({
          openPositions: jobsData?.length || 0,
          companiesHiring: cos.length,
          myApps: apps.length,
          upcomingEvents: evts.length,
        });
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
        <div className="scard"><Briefcase size={18} style={{ color: 'var(--accent2)', marginBottom: '6px' }} /><div className="scard-label">Open Positions</div><div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.openPositions}</div></div>
        <div className="scard"><Building2 size={18} style={{ color: 'var(--teal)', marginBottom: '6px' }} /><div className="scard-label">Companies Hiring</div><div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.companiesHiring}</div></div>
        <div className="scard"><FileText size={18} style={{ color: 'var(--success)', marginBottom: '6px' }} /><div className="scard-label">My Applications</div><div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.myApps}</div></div>
        <div className="scard"><CalendarDays size={18} style={{ color: 'var(--amber)', marginBottom: '6px' }} /><div className="scard-label">Upcoming Events</div><div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.upcomingEvents}</div></div>
      </div>

      {recentHires.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}><CheckCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Recent Hires</span>
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
                    <CheckCircle size={20} style={{ color: '#22c55e' }} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              Upcoming Hiring Events
            </h2>
            <a href="/applicant/events" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              View all →
            </a>
          </div>

          <div style={{
            display: 'flex', gap: '14px',
            overflowX: 'auto', paddingBottom: '8px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {events.map(e => (
              <div key={e.id} style={{
                minWidth: '240px', maxWidth: '240px',
                background: 'var(--surface)', borderRadius: '16px',
                border: '1px solid var(--border)', padding: '18px',
                scrollSnapAlign: 'start', flexShrink: 0,
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                {/* Date and Type badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 600 }}>
                    {formatDate(e.date)}
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                    borderRadius: '20px', background: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)'
                  }}>
                    {e.type}
                  </span>
                </div>

                {/* Title and Organizer */}
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{e.title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text2)' }}>{e.organizer || '—'}</p>
                </div>

                {/* Details */}
                {e.details && e.details.length > 0 && (
                  <div style={{
                    background: 'var(--bg2)', borderRadius: '8px',
                    padding: '8px 10px', fontSize: '12px', color: 'var(--text2)',
                    lineHeight: '1.5'
                  }}>
                    {Array.isArray(e.details) ? e.details[0] : e.details}
                  </div>
                )}

                {/* Location */}
                {e.location && (
                  <p style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📍 {e.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Featured Openings Section */}
{featuredJobs.length > 0 && (
  <div style={{ marginTop: '32px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2 style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
        Featured Openings
      </h2>
      <a href="/jobs/browse" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
        View all →
      </a>
    </div>

    {/* Horizontal swipeable cards */}
    <div style={{
      display: 'flex', gap: '14px',
      overflowX: 'auto', paddingBottom: '8px',
      scrollSnapType: 'x mandatory',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {featuredJobs.map(job => (
        <div
          key={job.id}
          onClick={() => navigate('/jobs/browse')}
          style={{
            minWidth: '240px', maxWidth: '240px',
            background: 'var(--card)', borderRadius: '16px',
            border: '1px solid var(--border)', padding: '18px',
            scrollSnapAlign: 'start', flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: '12px',
            cursor: 'pointer'
          }}
        >
          {/* Company Logo + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: job.companies?.color || '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0
            }}>
              {job.companies?.logo_url ? (
                <img src={job.companies.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>
                  {job.companies?.logo_initials || job.companies?.name?.[0]}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '11px', color: 'var(--text2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.companies?.name}
              </p>
            </div>
          </div>

          {/* Job Title */}
          <div>
            <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', lineHeight: '1.3' }}>{job.title}</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                background: 'var(--bg2)', color: 'var(--text2)'
              }}>{job.type}</span>
              <span style={{
                fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                background: 'var(--bg2)', color: 'var(--text2)'
              }}>{job.department}</span>
            </div>
          </div>

          {/* Salary */}
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e', margin: 0 }}>
            ₱{Number(job.salary).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
    </div>
  );
}
