import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanyJobs, getCompanyApplications } from '../../lib/db';
import CompanyLogo from '../../components/CompanyLogo';
import { Briefcase, Users, Clock, CheckCircle, Plus, ChevronRight } from 'lucide-react';

export default function CompanyDashboard() {
  const { company } = useOutletContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ listings: 0, applicants: 0, pending: 0, accepted: 0 });

  useEffect(() => {
    if (!company) return;
    async function load() {
      try {
        const [jobs, apps] = await Promise.all([
          getCompanyJobs(company.id),
          getCompanyApplications(company.id)
        ]);
        setStats({
          listings: jobs.filter(j => j.status === 'active').length,
          applicants: apps.length,
          pending: apps.filter(a => a.status === 'pending').length,
          accepted: apps.filter(a => a.status === 'accepted').length,
        });
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [company]);

  const statCards = [
    { icon: <Briefcase size={20} />, label: 'Active Listings', value: stats.listings, color: 'var(--accent)' },
    { icon: <Users size={20} />, label: 'Total Applicants', value: stats.applicants, color: 'var(--teal)' },
    { icon: <Clock size={20} />, label: 'Pending Review', value: stats.pending, color: '#f59e0b' },
    { icon: <CheckCircle size={20} />, label: 'Accepted', value: stats.accepted, color: '#22c55e' },
  ];

  return (
    <div style={{ padding: '16px', paddingBottom: '80px', maxWidth: '900px', margin: '0 auto' }}>

      {/* Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '20px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '150px', height: '150px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-40px', right: '60px',
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', opacity: 0.85, marginBottom: '6px', fontWeight: 500 }}>
              Company Portal
            </p>
            <h1 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2 }}>
              Welcome back,<br />
              <span style={{ opacity: 0.95 }}>{company?.name || 'Company'}.</span>
            </h1>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '20px' }}>
              Here's your hiring activity inside Zero Effort.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/company/listings')}
                style={{
                  padding: '10px 18px', borderRadius: '12px',
                  background: 'white', color: 'var(--accent)',
                  border: 'none', fontWeight: 700, fontSize: '13px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Plus size={15} /> Post a job
              </button>
              <button
                onClick={() => navigate('/company/applicants')}
                style={{
                  padding: '10px 18px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  fontWeight: 700, fontSize: '13px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                Review applicants <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Company Logo */}
          <div style={{
            flexShrink: 0,
            width: 'clamp(64px, 15vw, 90px)',
            height: 'clamp(64px, 15vw, 90px)',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.3)'
          }}>
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: 'white' }}>
                {company?.name?.[0] || 'C'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {statCards.map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Quick Actions</h3>
        </div>
        {[
          { label: 'Post a new job', sub: 'Create a new job listing', path: '/company/listings', icon: <Briefcase size={18} /> },
          { label: 'Review applicants', sub: 'Check new applications', path: '/company/applicants', icon: <Users size={18} /> },
          { label: 'Messages', sub: 'View your inbox', path: '/company/inbox', icon: <Clock size={18} /> },
          { label: 'Company Profile', sub: 'Update your information', path: '/company/profile', icon: <CheckCircle size={18} /> },
        ].map((item, i) => (
          <div
            key={i}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', cursor: 'pointer',
              borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'var(--bg2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{item.sub}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text2)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
