import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanies, getJobs, getEvents, getMyApplications, getRecentHires, formatDate } from '../../lib/db';
import { Briefcase, Building2, FileText, CalendarDays, CheckCircle, Clock, MapPin } from 'lucide-react';
import CompanyLogo from '../../components/CompanyLogo';
import LoadingOverlay from '../../components/LoadingOverlay';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

function displaySalary(salary) {
  if (!salary) return 'Not specified'
  const clean = salary.toString().replace(/[^0-9]/g, '')
  if (!clean) return salary
  return `₱${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` 
}

// New salary formatting function
const formatSalary = (min, max, currency = 'PHP') => {
  if (!min && !max) return null; // return null, not "Salary not specified"
  if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  if (min) return `${currency} ${min.toLocaleString()}+`;
  if (max) return `Up to ${currency} ${max.toLocaleString()}`;
};

export default function ApplicantHome() {
  const { profile } = useOutletContext();
  const { showToast } = useToast();
  const [stats, setStats] = useState({ openPositions: 0, companiesHiring: 0, myApps: 0, upcomingEvents: 0 });
  const [events, setEvents] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [recentHires, setRecentHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const navigate = useNavigate();

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async function fetchWithCache(key, fetchFn) {
    // Check if cached data exists and is fresh
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log(`✅ Using cached ${key}`);
        return data;
      }
    }
    
    // Fetch fresh data if not cached or expired
    console.log(`🔄 Fetching fresh ${key}...`);
    const data = await fetchFn();
    
    // Store in cache
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return data;
  }

  useEffect(() => {
    async function load() {
      const startTime = Date.now();
      setLoading(true);
      
      try {
        const [cos, evts, apps, hires] = await Promise.all([
          fetchWithCache('applicant_home_companies', () => getCompanies(true)),
          fetchWithCache('applicant_home_events', () => getEvents(true)),
          profile?.id ? fetchWithCache('applicant_home_applications', () => getMyApplications(profile.id)) : Promise.resolve([]),
          fetchWithCache('applicant_home_hires', () => getRecentHires(10)),
        ]);
        
        // Fetch featured jobs properly
        const { data: jobsData } = await fetchWithCache('applicant_home_featured_jobs', () => 
          supabase
            .from('jobs')
            .select('id, title, companies(id, name, logo_url, logo_initials)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(4)
        );
        
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
        
        // Check if load took too long
        const loadTime = Date.now() - startTime;
        if (loadTime > 3000) {
          setSlowNetwork(true);
          showToast('Slow network detected. Some features may load slower.', 'info');
        }
      } catch (err) {
        console.error('Error loading home data:', err);
        showToast('Failed to load data. Please refresh.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile?.id, showToast]);

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
    <>
      {loading && <LoadingOverlay show={true} />}
      
      {slowNetwork && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--accent)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          Slow network detected
        </div>
      )}
      
      <div className="pw" style={{ paddingBottom: '80px', paddingTop: '0px' }}>
      <div className="hero" style={{ paddingTop: '0px' }}>
        <div className="hero-h1">
          {profile ? (
            <span>Welcome, <span className="ac">{profile.first_name}.</span>. Find your next role here.</span>
          ) : (
            <span>Your next role is inside the <span className="ac">Park.</span></span>
          )}
        </div>
        <div className="hero-p">Browse open jobs, connect with companies, and apply all in one place.</div>
        <div className="hero-btns">
          <button className="btn-acc" onClick={() => navigate('/applicant/jobs')}>Browse open jobs</button>
          <button className="btn-ghost" onClick={() => navigate('/applicant/companies')}>Explore companies</button>
        </div>
      </div>

      <div className="stat-row stagger">
        <div className="scard" onClick={() => navigate('/applicant/jobs')} style={{ cursor: 'pointer' }}>
          <Briefcase size={18} style={{ color: 'var(--accent2)', marginBottom: '6px' }} />
          <div className="scard-label">Open Jobs</div>
          <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.openPositions}</div>
        </div>
        <div className="scard" onClick={() => navigate('/applicant/companies')} style={{ cursor: 'pointer' }}>
          <Building2 size={18} style={{ color: 'var(--teal)', marginBottom: '6px' }} />
          <div className="scard-label">Companies Hiring</div>
          <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.companiesHiring}</div>
        </div>
        <div className="scard" onClick={() => navigate('/applicant/applications')} style={{ cursor: 'pointer' }}>
          <FileText size={18} style={{ color: 'var(--success)', marginBottom: '6px' }} />
          <div className="scard-label">My Applications</div>
          <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.myApps}</div>
        </div>
        <div className="scard" onClick={() => navigate('/applicant/events')} style={{ cursor: 'pointer' }}>
          <CalendarDays size={18} style={{ color: 'var(--amber)', marginBottom: '6px' }} />
          <div className="scard-label">Upcoming Events</div>
          <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, marginTop: '8px' }}>{stats.upcomingEvents}</div>
        </div>
      </div>

      {(recentHires.length > 0 || true) && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}><CheckCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Recent Hires</span>
            <span style={{ 
              fontSize: '11px', 
              background: 'rgba(34,197,94,0.15)', 
              color: '#22c55e',
              borderRadius: '20px',
              fontWeight: 700
            }}>LIVE</span>
          </div>

          {recentHires.length > 0 ? (
            <>
              <div className="recent-hires-scroll" style={{
                display: 'grid',
                gridTemplateRows: 'repeat(3, auto)',
                gridAutoFlow: 'column',
                gridAutoColumns: '200px',
                overflowX: 'auto',
                gap: '12px',
                paddingBottom: '8px',
                marginBottom: '12px'
              }}>
                {recentHires.map(hire => {
                  const firstName = hire.applicants?.first_name || ''
                  const lastInitial = hire.applicants?.last_name?.charAt(0) || ''
                  const jobTitle = hire.jobs?.title || 'a position'
                  const companyName = hire.jobs?.companies?.name || 'a company'
                  const timeAgo = getTimeAgo(hire.applied_at)

                  return (
                    <div key={hire.id} style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minHeight: '120px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(34,197,94,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CheckCircle size={16} style={{ color: '#22c55e' }} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, lineHeight: '1.3' }}>
                          <span style={{ color: '#22c55e' }}>{firstName} {lastInitial}.</span>
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 700, color: 'var(--text1)' }}>
                          {jobTitle}
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text2)' }}>
                          {companyName}
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>
                          {timeAgo}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button 
                onClick={() => navigate('/applicant/applications')}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  alignSelf: 'flex-start'
                }}
              >
                View All →
              </button>
            </>
          ) : (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text2)',
              fontSize: '14px'
            }}>
              No recent hires in the past 7 days
            </div>
          )}
        </div>
      )}

      {events.length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              Upcoming Hiring Events
            </h2>
            <button onClick={() => navigate('/applicant/events')} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
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

                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{e.title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text2)' }}>{e.organizer || '—'}</p>
                </div>

                {e.details && e.details.length > 0 && (
                  <div style={{
                    background: 'var(--bg2)', borderRadius: '8px',
                    padding: '8px 10px', fontSize: '12px', color: 'var(--text2)',
                    lineHeight: '1.5'
                  }}>
                    {Array.isArray(e.details) ? e.details[0] : e.details}
                  </div>
                )}

                {e.location && (
                  <p style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📍 {e.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              Upcoming Hiring Events
            </h2>
            <button onClick={() => navigate('/applicant/events')} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text2)',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <CalendarDays size={32} style={{ color: 'var(--accent)', opacity: 0.5 }} />
            </div>
            No upcoming events at the moment
          </div>
        </div>
      )}

      {featuredJobs.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
              Featured Openings
            </h2>
            <button onClick={() => navigate('/applicant/jobs')} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
          </div>

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
                onClick={() => navigate('/applicant/jobs', { state: { selectedJobId: job.id } })}
                style={{
                  minWidth: '240px', maxWidth: '240px',
                  background: 'var(--surface)', borderRadius: '16px',
                  border: '1px solid var(--border)', padding: '18px',
                  scrollSnapAlign: 'start', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: job.companies?.logo_url ? 'transparent' : (job.companies?.color || '#6366f1'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0
                  }}>
                    {job.companies?.logo_url ? (
                      <img src={job.companies.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
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

                {(() => {
                  const salary = formatSalary(job.salary_min, job.salary_max);
                  return salary && (
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e', margin: 0 }}>
                      {salary}
                    </p>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
