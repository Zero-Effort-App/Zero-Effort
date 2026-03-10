import { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { getJobs, getCompanies, submitApplication, uploadFile } from '../../lib/db';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';

// Skeleton card component
function SkeletonCard() {
  return (
    <div className="skeleton-card" style={{
      background: 'var(--surface)',
      borderRadius: '12px',
      padding: '20px',
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      <div style={{ height: '20px', background: 'var(--border)', borderRadius: '4px', marginBottom: '12px', width: '60%' }}/>
      <div style={{ height: '14px', background: 'var(--border)', borderRadius: '4px', marginBottom: '8px', width: '90%' }}/>
      <div style={{ height: '14px', background: 'var(--border)', borderRadius: '4px', width: '75%' }}/>
    </div>
  )
}

export default function ApplicantJobs() {
  const { profile } = useOutletContext();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [modal, setModal] = useState({ type: null, data: null });
  const [resumeFile, setResumeFile] = useState(null);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [jbs, cos] = await Promise.all([getJobs(true), getCompanies(true)]);
        const now = new Date();
        const mapped = jbs.map(j => {
          const daysAgo = Math.floor((now - new Date(j.posted_at)) / (1000 * 60 * 60 * 24));
          return {
            ...j,
            co: j.companies?.name || cos.find(c => c.id === j.company_id)?.name || 'Unknown',
            cid: j.company_id,
            ago: daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`,
            isNew: daysAgo <= 3,
          };
        });
        setJobs(mapped);
        setCompanies(cos);

        if (location.state?.selectedJobId) {
          setSelected(location.state.selectedJobId);
        } else if (mapped.length > 0) {
          setSelected(mapped[0].id);
        }
      } catch (err) {
        console.error('Error loading jobs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function co(cid) { return companies.find(c => c.id === cid) || {}; }
  function ini(name) { return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : '??'; }

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = j.title?.toLowerCase().includes(q) || j.co?.toLowerCase().includes(q);
    const matchType = !filterType || j.type === filterType;
    const matchDept = !filterDept || j.dept === filterDept;
    return matchQ && matchType && matchDept;
  });

  const selectedJob = selected ? jobs.find(j => j.id === selected) : null;
  const selectedCo = selectedJob ? co(selectedJob.cid) : {};

  async function handleApply(jobId) {
    if (!profile) { showToast('Please login to apply'); return; }
    
    // Validate file size
    if (resumeFile && resumeFile.size > 5 * 1024 * 1024) {
      showToast('Resume file must be under 5MB', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      let resumeUrl = null;
      let finalPortfolioUrl = portfolioUrl || null;

      // Upload resume if file selected
      if (resumeFile) {
        resumeUrl = await uploadFile(resumeFile, 'resumes', profile.id);
      }

      // Submit application with file URLs
      await submitApplication({
        job_id: jobId,
        applicant_id: profile.id,
        cover_letter: coverLetter,
        resume_url: resumeUrl,
        portfolio_url: finalPortfolioUrl,
        status: 'pending'
      });

      setModal({ type: 'success', data: { title: selectedJob?.title, co: selectedJob?.co } });
      
      // Reset form
      setResumeFile(null);
      setPortfolioUrl('');
      setCoverLetter('');
      
    } catch (err) {
      if (err.message?.includes('duplicate')) {
        setModal({ type: 'success', data: { title: selectedJob?.title, co: selectedJob?.co } });
      } else {
        showToast('Error submitting application: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return (
    <div className="pw">
      <div className="ph"><h2>Open Positions</h2><p>All roles are at companies physically located inside Zero Effort.</p></div>
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="pw">
      <div className="ph"><h2>Open Positions</h2><p>All roles are at companies physically located inside Zero Effort.</p></div>

      <div className="fbar">
        <input className="fi fi-grow" placeholder="Search title, skill, company…" value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} />
        <select className="fi" value={filterType} onChange={e => { setFilterType(e.target.value); setSelected(null); }}>
          <option value="">All types</option>
          <option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option>
        </select>
        <select className="fi" value={filterDept} onChange={e => { setFilterDept(e.target.value); setSelected(null); }}>
          <option value="">All departments</option>
          <option>Engineering</option><option>Design</option><option>Operations</option><option>Marketing</option>
        </select>
      </div>

      <div className="split" style={{ gridTemplateColumns: '315px 1fr' }}>
        <div className="jlist">
          {filtered.length > 0 ? filtered.map(j => (
            <div key={j.id} className={`jlcard ${selected === j.id ? 'sel' : ''}`} onClick={() => setSelected(j.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="jlcard-title">{j.title}</div>
                {j.isNew && <span className="new-b" style={{ fontSize: '.62rem' }}>New</span>}
              </div>
              <div className="jlcard-co">{j.co}</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: '.4rem' }}>
                <span className="pill" style={{ fontSize: '.62rem' }}>⏱ {j.type}</span>
                <span className="pill" style={{ fontSize: '.62rem' }}>{j.dept}</span>
              </div>
              <div className="jlcard-meta">
                <span className="jlcard-sal">{j.sal}</span>
                <span className="jlcard-date">{j.ago}</span>
              </div>
            </div>
          )) : (
            <div className="empty-state">
              <div style={{ fontSize: '48px' }}>�</div>
              <h3>No jobs available right now</h3>
              <p>Check back later or explore companies currently in the park</p>
              <button className="btn-primary" onClick={() => navigate('/applicant/companies')}>
                Explore Companies →
              </button>
            </div>
          )}
        </div>

        <div className="dpanel">
          {selectedJob ? (
            <>
              <div className="dp-head">
                <div className="dp-logo" style={{ background: selectedCo.color ? selectedCo.color + '20' : 'rgba(99,102,241,.12)', color: selectedCo.color || '#6366f1' }}>
                  {ini(selectedCo.name)}
                </div>
                <div>
                  <div className="dp-title">{selectedJob.title}</div>
                  <div className="dp-co">{selectedJob.co} · Zero Effort</div>
                </div>
              </div>
              <div className="dp-chips">
                <span className="dp-chip">⏱ {selectedJob.type}</span>
                <span className="dp-chip">{selectedJob.dept}</span>
                <span className="dp-chip">📅 {selectedJob.ago}</span>
                {selectedJob.isNew && <span className="dp-chip" style={{ color: 'var(--amber)', borderColor: 'rgba(245,158,11,.2)' }}>✦ New</span>}
              </div>
              <hr className="dp-div" />
              <div className="sal-box">
                <div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text2)', marginBottom: 2 }}>Monthly Salary</div>
                  <div className="sal-val">{selectedJob.sal}</div>
                </div>
                <span className="sal-note">per month</span>
              </div>
              {selectedJob.description && (
                <div className="dp-sec"><div className="dp-sec-h">About the Role</div><p>{selectedJob.description}</p></div>
              )}
              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div className="dp-sec">
                  <div className="dp-sec-h">Requirements</div>
                  <ul className="dp-reqs">{selectedJob.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
              {selectedCo.description && (
                <div className="dp-sec"><div className="dp-sec-h">About {selectedJob.co}</div><p>{selectedCo.description}</p></div>
              )}
              <button className="apply-main" onClick={() => setModal({ type: 'apply', data: selectedJob })}>
                Apply for this position →
              </button>
            </>
          ) : (
            <div className="empty-dp"><div className="eico">←</div><p>Select a role to see details</p></div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      <Modal isOpen={modal.type === 'apply'} onClose={() => setModal({ type: null, data: null })}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">Apply — {modal.data.title}</div><div className="m-sub">{modal.data.co} · {modal.data.type}</div></div>
              <button className="m-close" onClick={() => setModal({ type: null, data: null })}>✕</button>
            </div>
            <div className="msep">Personal information</div>
            <div className="frow">
              <div className="fgroup"><label className="flabel">First name</label><input className="finput" defaultValue={profile?.first_name || ''} /></div>
              <div className="fgroup"><label className="flabel">Last name</label><input className="finput" defaultValue={profile?.last_name || ''} /></div>
            </div>
            <div className="fgroup"><label className="flabel">Email address</label><input className="finput" type="email" defaultValue={profile?.email || ''} /></div>
            <div className="frow">
              <div className="fgroup"><label className="flabel">Phone</label><input className="finput" type="tel" defaultValue={profile?.phone || ''} /></div>
              <div className="fgroup"><label className="flabel">Experience</label>
                <select className="fselect"><option>Fresh Graduate</option><option>1–2 Years</option><option>3–5 Years</option><option>5+ Years</option></select>
              </div>
            </div>

            <div className="msep">Documents</div>
            <div className="fgroup">
              <label className="flabel">Resume / CV <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={e => setResumeFile(e.target.files[0])}
                style={{ marginBottom: '0.5rem' }}
              />
              {resumeFile && <span style={{ fontSize: '.78rem', color: 'var(--success)' }}>✅ {resumeFile.name}</span>}
            </div>
            <div className="fgroup">
              <label className="flabel">Portfolio URL <span style={{ color: 'var(--text3)', fontSize: '.68rem', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
              <input
                type="url"
                placeholder="https://your-portfolio.com"
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
            </div>

            <div className="msep">Cover letter</div>
            <div className="fgroup">
              <textarea
                className="ftextarea"
                placeholder="Tell us why you're a great fit for this role…"
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                style={{ minHeight: 95 }}
              />
            </div>

            {isSubmitting && <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '.78rem' }}>Uploading files and submitting application...</p>}
            <button className="btn-primary" onClick={() => handleApply(modal.data.id)} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit application →'}
            </button>
          </div>
        )}
      </Modal>

      {/* Success */}
      <Modal isOpen={modal.type === 'success'} onClose={() => setModal({ type: null, data: null })}>
        <div className="success-wrap">
          <div className="sw-icon">🎉</div>
          <h3>Application submitted!</h3>
          <p>Your application for <strong>{modal.data?.title}</strong> at <strong>{modal.data?.co}</strong> has been received.<br /><br />
          The hiring team will reach out within <strong>3–5 business days</strong>. Good luck!</p>
          <button className="btn-primary" style={{ maxWidth: 160, margin: '1.25rem auto 0', display: 'block' }} onClick={() => setModal({ type: null, data: null })}>Done</button>
        </div>
      </Modal>
    </div>
  );
}
