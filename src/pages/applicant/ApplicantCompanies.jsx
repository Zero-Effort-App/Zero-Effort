import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, getJobs } from '../../lib/db';

export default function ApplicantCompanies() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [filterInd, setFilterInd] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [cos, jobs] = await Promise.all([getCompanies(true), getJobs(true)]);
        setCompanies(cos.map(c => ({
          ...c,
          jobs: jobs.filter(j => j.company_id === c.id).length,
          clr: c.color || '#6366f1',
          bg: c.color ? c.color + '20' : 'rgba(99,102,241,.12)',
        })));
      } catch (err) {
        console.error('Error loading companies:', err);
      }
    }
    load();
  }, []);

  function ini(name) { return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : '??'; }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    const matchQ = c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q);
    const matchInd = !filterInd || c.industry === filterInd;
    return matchQ && matchInd;
  });

  const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];

  function viewJobs(companyId) {
    navigate('/applicant/jobs', { state: { filterCompanyId: companyId } });
  }

  return (
    <div className="pw">
      <div className="ph"><h2>Companies Inside the Park</h2><p>All companies are physically located within Zero Effort.</p></div>

      <div className="fbar" style={{ marginBottom: '1.25rem' }}>
        <input className="fi fi-grow" placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fi" value={filterInd} onChange={e => setFilterInd(e.target.value)}>
          <option value="">All industries</option>
          {industries.map(ind => <option key={ind}>{ind}</option>)}
        </select>
      </div>

      <div className="co-grid stagger">
        {filtered.map(c => (
          <div key={c.id} className="co-card" onClick={() => viewJobs(c.id)}>
            <div className="co-logo" style={{ background: c.bg, color: c.clr }}>
              {c.logo_initials || ini(c.name)}
            </div>
            <div className="co-name">{c.name}</div>
            <div className="co-ind">{c.industry}</div>
            <div className="co-desc">{c.description?.slice(0, 120)}{c.description?.length > 120 ? '…' : ''}</div>
            {c.tags && c.tags.length > 0 && (
              <div className="co-tags">
                {c.tags.map((t, i) => <span key={i} className="co-tag">{t}</span>)}
              </div>
            )}
            <div className="co-foot">
              <span className="co-jnum"><strong>{c.jobs}</strong> open roles</span>
              <button className="co-btn" onClick={(e) => { e.stopPropagation(); viewJobs(c.id); }}>View jobs →</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.82rem' }}>No companies found.</div>
        )}
      </div>
    </div>
  );
}
