import { useState, useEffect } from 'react';
import { getJobs, removeJob as removeJobDb, addJob as addJobDb, updateJob as updateJobDb, addActivityLog, formatDate } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';
import SalaryInput from '../../components/SalaryInput';

function displaySalary(salary) {
  if (!salary) return 'Not specified'
  const clean = salary.toString().replace(/[^0-9]/g, '')
  if (!clean) return salary
  return `₱${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` 
}

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
    const matchQ = j.title?.toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q) || j.department?.toLowerCase().includes(q);
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

  async function handleAddJob(formData) {
    try {
      await addJobDb(formData);
      await addActivityLog('job', '➕', `New job '${formData.title}' added`, 'Admin · System');
      setModal({ type: null, data: null });
      showToast('Job added successfully!');
      loadJobs();
    } catch (err) {
      showToast('Error adding job.');
    }
  }

  async function handleEditJob(jobId, formData) {
    try {
      await updateJobDb(jobId, formData);
      await addActivityLog('job', '✏️', `Job '${formData.title}' updated`, 'Admin · System');
      setModal({ type: null, data: null });
      showToast('Job updated successfully!');
      loadJobs();
    } catch (err) {
      showToast('Error updating job.');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="ph" style={{ margin: 0 }}><h2>Job Postings</h2><p>All job listings across Zero Effort companies.</p></div>
        <button className="btn-acc" onClick={() => setModal({ type: 'add', data: null })}>+ Add Job</button>
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
                <div className="job-dept-pill">{j.department}</div>
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
                  <button className="tbl-btn" onClick={() => setModal({ type: 'edit', data: j })}>Edit</button>
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

      <Modal isOpen={modal.type === 'add' || modal.type === 'edit'} onClose={() => setModal({ type: null, data: null })}>
        <JobForm 
          onSubmit={modal.type === 'add' ? handleAddJob : (formData) => handleEditJob(modal.data.id, formData)}
          onClose={() => setModal({ type: null, data: null })}
          initialData={modal.type === 'edit' ? modal.data : null}
          companies={companies}
        />
      </Modal>
    </div>
  );
}

function JobForm({ onSubmit, onClose, initialData, companies }) {
  const [form, setForm] = useState({
    title: '',
    company_id: '',
    department: '',
    type: 'Full-time',
    salary: '',
    description: '',
    requirements: '',
    status: 'active'
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        company_id: initialData.company_id || '',
        department: initialData.department || '',
        type: initialData.type || 'Full-time',
        salary: initialData.salary || '',
        description: initialData.description || '',
        requirements: initialData.requirements ? initialData.requirements.join('\n') : '',
        status: initialData.status || 'active'
      });
    }
  }, [initialData]);

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const formData = {
      ...form,
      requirements: form.requirements ? form.requirements.split('\n').filter(r => r.trim()) : [],
      posted_at: initialData ? initialData.posted_at : new Date().toISOString()
    };
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="m-head">
        <div><div className="m-title">{initialData ? 'Edit Job' : 'Add New Job'}</div><div className="m-sub">Zero Effort · Jobs</div></div>
        <button className="m-close" type="button" onClick={onClose}>✕</button>
      </div>
      <div className="msep">Job Details</div>
      <div className="fgroup"><label className="flabel">Job Title *</label><input className="finput" required value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="e.g. Senior Frontend Developer" /></div>
      <div className="frow">
        <div className="fgroup"><label className="flabel">Company *</label>
          <select className="fselect" required value={form.company_id} onChange={e => handleChange('company_id', e.target.value)}>
            <option value="">Select company</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="fgroup"><label className="flabel">Department</label><input className="finput" value={form.department} onChange={e => handleChange('department', e.target.value)} placeholder="e.g. Engineering" /></div>
      </div>
      <div className="frow">
        <div className="fgroup"><label className="flabel">Type</label>
          <select className="fselect" value={form.type} onChange={e => handleChange('type', e.target.value)}>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Internship</option>
            <option>Contract</option>
          </select>
        </div>
        <div className="fgroup"><label className="flabel">Status</label>
          <select className="fselect" value={form.status} onChange={e => handleChange('status', e.target.value)}>
            <option>Active</option>
            <option>Paused</option>
            <option>Closed</option>
          </select>
        </div>
      </div>
      <div className="fgroup">
        <label className="flabel">Salary</label>
        <SalaryInput
          value={form.salary}
          onChange={val => handleChange('salary', val)}
        />
      </div>
      <div className="fgroup"><label className="flabel">Description</label><textarea className="ftextarea" style={{ minHeight: 100 }} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Job description..." /></div>
      <div className="fgroup"><label className="flabel">Requirements (one per line)</label><textarea className="ftextarea" style={{ minHeight: 100 }} value={form.requirements} onChange={e => handleChange('requirements', e.target.value)} placeholder="• 3+ years experience&#10;• React.js knowledge&#10;• Team player" /></div>
      <div className="btn-row">
        <button className="btn-primary" type="submit">{initialData ? 'Update Job' : 'Add Job'}</button>
        <button className="btn-cancel" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
