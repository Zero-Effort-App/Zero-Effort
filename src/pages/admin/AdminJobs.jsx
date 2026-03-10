import { useState, useEffect } from 'react';
import { getJobs, removeJob as removeJobDb, addActivityLog, formatDate } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [modal, setModal] = useState({ type: null, data: null });
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  async function loadJobs() {
    setIsLoading(true);
    try {
      const data = await getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const { data } = await supabase.from('companies').select('id, name').eq('is_active', true).order('name');
      setCompanies(data || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  }

  useEffect(() => {
    loadJobs();
    loadCompanies();
  }, []);

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = j.title?.toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q) || j.dept?.toLowerCase().includes(q);
    const matchCompany = selectedCompany === 'all' || j.company_id === parseInt(selectedCompany);
    const matchType = !filterType || j.type === filterType;
    const matchStatus = !filterStatus || j.status === filterStatus.toLowerCase();
    return matchQ && matchCompany && matchType && matchStatus;
  });

  function getTypeClass(type) {
    if (type === 'Full-time') return 'jt-full';
    if (type === 'Part-time') return 'jt-part';
    if (type === 'Internship') return 'jt-intern';
    return 'jt-contract';
  }

  function getStatusClass(status) {
    if (status === 'active') return 'ls-active';
    if (status === 'paused') return 'ls-paused';
    return 'ls-closed';
  }

  async function handleRemove(job) {
    try {
      await removeJobDb(job.id);
      await addActivityLog('job', '🗑️', `Job '${job.title}' removed`, 'Admin · System');
      setModal({ type: null, data: null });
      showToast('Job removed.');
      loadJobs();
    } catch (err) {
      showToast('Error removing job.');
    }
  }

  if (isLoading) return (
    <div className="pw">
      <div className="ph"><h2>Job Postings</h2><p>All job listings across Zero Effort companies.</p></div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <p style={{ color: 'var(--text2)' }}>Loading job postings...</p>
      </div>
    </div>
  );

  return (
    <div className="pw">
      <div className="ph">
        <h2>Job Postings</h2>
        <p>All job listings across Zero Effort companies.</p>
      </div>

      <div className="fbar">
        <input className="fi fi-grow" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fi" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
          <option value="all">All Companies</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="fi" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option>
        </select>
        <select className="fi" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>Active</option><option>Paused</option><option>Closed</option>
        </select>
      </div>

      <table className="listings-table">
        <thead>
          <tr>
            <th>Job Title</th>
            <th>Company</th>
            <th>Type</th>
            <th>Status</th>
            <th>Posted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(j => (
            <tr key={j.id}>
              <td>
                <div className="job-title-cell">{j.title}</div>
                <div className="job-dept-pill">{j.dept}</div>
              </td>
              <td style={{ fontSize: '.78rem' }}>{j.companies?.name || '—'}</td>
              <td><span className={`job-type-pill ${getTypeClass(j.type)}`}>{j.type}</span></td>
              <td>
                <span className={`listing-status ${getStatusClass(j.status)}`}>
                  <span className="ls-dot" />{j.status?.charAt(0).toUpperCase() + j.status?.slice(1)}
                </span>
              </td>
              <td style={{ fontSize: '.72rem', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{formatDate(j.posted_at)}</td>
              <td>
                <div className="tbl-actions">
                  <button className="tbl-btn danger" onClick={() => setModal({ type: 'remove', data: j })}>Remove</button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && !isLoading && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🗂️</div>
                <p>No job postings yet</p>
                <p style={{ fontSize: '.7rem', marginTop: '0.5rem' }}>Job postings will appear here once added</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal isOpen={modal.type === 'remove'} onClose={() => setModal({ type: null, data: null })}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">Remove Job Posting</div><div className="m-sub">This action cannot be undone</div></div>
              <button className="m-close" onClick={() => setModal({ type: null, data: null })}>✕</button>
            </div>
            <div className="warn-box">
              <div className="warn-box-icon">⚠️</div>
              <div className="warn-box-text">Remove <strong>{modal.data.title}</strong> from {modal.data.companies?.name}?</div>
            </div>
            <div className="btn-row">
              <button className="btn-confirm-danger" onClick={() => handleRemove(modal.data)}>Remove job</button>
              <button className="btn-cancel" onClick={() => setModal({ type: null, data: null })}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
