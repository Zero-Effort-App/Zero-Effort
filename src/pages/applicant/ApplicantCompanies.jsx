import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, getJobs } from '../../lib/db';
import CompanyLogo from '../../components/CompanyLogo';

export default function ApplicantCompanies() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [filterInd, setFilterInd] = useState('');
  const [loading, setLoading] = useState(true);
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
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function ini(name) { return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : '??'; }

  const filtered = companies.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase())
    const matchIndustry = !filterInd || filterInd === 'All industries' ||
      c.industry === filterInd
    return matchSearch && matchIndustry
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
        {loading ? (
          [1,2,3].map(i => (
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
          ))
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--text2)', textAlign: 'center', marginTop: '40px' }}>
            No companies found.
          </p>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="co-card" onClick={() => viewJobs(c.id)}>
              <CompanyLogo company={c} size={48} />
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
          ))
        )}
      </div>
    </div>
  );
}
