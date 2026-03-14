import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanyJobs, addJob, updateJob, removeJob as removeJobDb, addActivityLog, formatDate } from '../../lib/db';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';
import SalaryInput from '../../components/SalaryInput';

function displaySalary(salary) {
  if (!salary) return 'Not specified'
  const clean = salary.toString().replace(/[^0-9]/g, '')
  if (!clean) return salary
  return `₱${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` 
}

export default function CompanyListings() {
  const { company } = useOutletContext();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [modal, setModal] = useState({ type: null, data: null });
  const [resumeFile, setResumeFile] = useState(null);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function loadListings() {
    if (!company) return;
    setIsLoading(true);
    try {
      const data = await getCompanyJobs(company.id);
      setJobs(data);
    } catch (err) {
      console.error('Error loading listings:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadListings(); }, [company]);

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = j.title?.toLowerCase().includes(q) || j.department?.toLowerCase().includes(q);
    const matchSt = !filterStatus || j.status === filterStatus.toLowerCase();
    const matchDepartment = !filterDepartment || j.department === filterDepartment;
    return matchQ && matchSt && matchDepartment;
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

  function closeModal() { setModal({ type: null, data: null }); }

  async function handlePostJob(formData) {
    try {
      // Check if company data is loaded
      if (!company?.id) {
        showToast('Company data not loaded yet, please refresh', 'error');
        return;
      }

      // Prepare job data with proper field mapping
      const jobData = {
        company_id: company.id,
        title: formData.title,
        department: formData.department,
        type: formData.type,
        salary: formData.salary || '—',
        description: formData.description,
        requirements: typeof formData.requirements === 'string' 
          ? formData.requirements.split(',').map(r => r.trim()).filter(Boolean)
          : formData.requirements || [],
        status: 'active',
        posted_at: new Date().toISOString()
      };

      const result = await addJob(jobData);
      
      await addActivityLog('job', '📝', `New job '${formData.title}' posted by ${company.name}`, `${company.name} · Company`, company.id);
      setModal({ type: 'success', data: { title: formData.title } });
      loadListings();
    } catch (error) {
      console.error('Add job error:', error);
      showToast(error.message || 'Failed to create job listing', 'error');
    }
  }

  async function handleEditJob(jobId, formData) {
    try {
      // Ensure department field is properly mapped
      const updateData = {
        ...formData,
        department: formData.department
      };
      
      
      await updateJob(jobId, updateData);
      closeModal();
      showToast('Listing updated!');
      loadListings();
    } catch (err) {
      showToast('Error updating listing.');
    }
  }

  async function handleToggleStatus(job) {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    try {
      await updateJob(job.id, { status: newStatus });
      showToast(`Listing ${newStatus === 'active' ? 'activated' : 'paused'}.`);
      loadListings();
    } catch (err) {
      showToast('Error updating status.');
    }
  }

  async function handleRemove(job) {
    try {
      await removeJobDb(job.id);
      await addActivityLog('job', '🗑️', `Job '${job.title}' removed by ${company.name}`, `${company.name} · Company`, company.id);
      closeModal();
      showToast('Listing removed.');
      loadListings();
    } catch (err) {
      showToast('Error removing listing.');
    }
  }

  if (isLoading) return (
    <div className="pw">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="ph" style={{ margin: 0 }}><h2>My Job Listings</h2><p>Manage all your active, paused, and closed postings.</p></div>
        <button className="btn-acc" onClick={() => setModal({ type: 'post', data: null })}>+ New listing</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}><Clock size={32} /></div>
        <p style={{ color: 'var(--text2)' }}>Loading job listings...</p>
      </div>
    </div>
  );

  return (
    <div className="pw">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="ph" style={{ margin: 0 }}><h2>My Job Listings</h2><p>Manage all your active, paused, and closed postings.</p></div>
        <button className="btn-acc" onClick={() => setModal({ type: 'post', data: null })}>+ New listing</button>
      </div>

      <div className="fbar">
        <input className="fi fi-grow" placeholder="Search listings…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fi" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>Active</option><option>Paused</option><option>Closed</option>
        </select>
        <select className="fi" value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}>
          <option value="">All departments</option>
          <option>Engineering</option><option>Design</option>
          <option>Operations</option><option>Marketing</option>
        </select>
      </div>

      <table className="listings-table">
        <thead>
          <tr><th>Job Title</th><th>Type</th><th>Status</th><th>Posted</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filtered.map(j => (
            <tr key={j.id}>
              <td><div className="job-title-cell">{j.title}</div><div className="job-dept-pill">{j.department}</div></td>
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
                  <button className="tbl-btn success" onClick={() => handleToggleStatus(j)}>
                    {j.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button className="tbl-btn danger" onClick={() => setModal({ type: 'remove', data: j })}>Remove</button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && !isLoading && (
            <tr>
              <td colSpan={5}>
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div style={{ fontSize: '48px' }}>�</div>
                  <h3>No job listings yet</h3>
                  <p>Post your first job to start receiving applications</p>
                  <button className="btn-primary" onClick={() => setModal({ type: 'post', data: null })}>
                    Post a Job →
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Post / Edit Modal */}
      <Modal isOpen={modal.type === 'post' || modal.type === 'edit'} onClose={closeModal}>
        <JobForm
          isEdit={modal.type === 'edit'}
          initialData={modal.data}
          companyName={company?.name}
          onSubmit={modal.type === 'edit' ? (data) => handleEditJob(modal.data.id, data) : handlePostJob}
          onClose={closeModal}
        />
      </Modal>

      {/* Success */}
      <Modal isOpen={modal.type === 'success'} onClose={closeModal}>
        <div className="success-wrap">
          <div className="sw-icon"><CheckCircle size={32} /></div>
          <h3>Job listing posted!</h3>
          <p><strong>{modal.data?.title}</strong> is now live on Zero Effort.<br /><br />Applicants can start applying right away.</p>
          <button className="btn-primary" style={{ maxWidth: 160, margin: '1.25rem auto 0', display: 'block' }} onClick={closeModal}>View listings</button>
        </div>
      </Modal>

      {/* Remove Confirm */}
      <Modal isOpen={modal.type === 'remove'} onClose={closeModal}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">Remove Listing</div><div className="m-sub">This action cannot be undone.</div></div>
              <button className="m-close" onClick={closeModal}>✕</button>
            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--text2)', margin: '1rem 0' }}>
              Are you sure you want to remove <strong>{modal.data.title}</strong>? Applicants who have applied will no longer be able to view it.
            </p>
            <div style={{ display: 'flex', gap: '.65rem', marginTop: '1rem' }}>
              <button className="btn-decline" style={{ flex: 1, borderRadius: 10, padding: '.75rem', fontSize: '.82rem' }} onClick={() => handleRemove(modal.data)}>Yes, remove</button>
              <button className="btn-contact" style={{ flex: 1, margin: 0 }} onClick={closeModal}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function JobForm({ isEdit, initialData, companyName, onSubmit, onClose }) {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    department: initialData?.department || 'Engineering',
    type: initialData?.type || 'Full-time',
    salary: initialData?.salary || '',
    description: initialData?.description || initialData?.desc || '',
    requirements: initialData?.requirements ? initialData.requirements.join('\n') : (initialData?.reqs ? initialData.reqs.join('\n') : ''),
  });

  function handleChange(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    
    // Prepare form data with correct field mapping
    const jobData = {
      title: form.title,
      department: form.department,
      type: form.type,
      salary: form.salary || '—',
      description: form.description,
      requirements: form.requirements.split('\n').filter(Boolean),
    };
    
    onSubmit(jobData);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="m-head">
        <div>
          <div className="m-title">{isEdit ? 'Edit Listing' : 'Post a New Job'}</div>
          <div className="m-sub">{companyName} · Zero Effort</div>
        </div>
        <button className="m-close" type="button" onClick={onClose}>✕</button>
      </div>
      <div className="msep">Job Details</div>
      <div className="fgroup"><label className="flabel">Job Title</label><input className="finput" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="e.g. Senior Frontend Developer" /></div>
      <div className="frow">
        <div className="fgroup"><label className="flabel">Department</label>
          <select className="fselect" value={form.department} onChange={e => handleChange('department', e.target.value)}>
            <option>Engineering</option><option>Design</option><option>Operations</option><option>Marketing</option>
          </select>
        </div>
        <div className="fgroup"><label className="flabel">Employment Type</label>
          <select className="fselect" value={form.type} onChange={e => handleChange('type', e.target.value)}>
            <option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option>
          </select>
        </div>
      </div>
      <div className="fgroup">
        <label className="flabel">Salary Range</label>
        <SalaryInput
          value={form.salary}
          onChange={val => handleChange('salary', val)}
        />
      </div>
      <div className="msep">Role Description</div>
      <div className="fgroup"><label className="flabel">Role Overview</label><textarea className="ftextarea" style={{ minHeight: 90 }} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Describe the role..." /></div>
      <div className="fgroup"><label className="flabel">Requirements <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: '.68rem', textTransform: 'none', letterSpacing: 0 }}>(one per line)</span></label>
        <textarea className="ftextarea" style={{ minHeight: 100 }} value={form.requirements} onChange={e => handleChange('requirements', e.target.value)} placeholder={"3+ years experience with React\nStrong communication skills\n…"} />
      </div>
      <button className="btn-primary" type="submit">{isEdit ? 'Save changes →' : 'Post job listing →'}</button>
    </form>
  );
}
