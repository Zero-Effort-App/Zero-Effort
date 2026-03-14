import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { getJobs, getCompanies, submitApplication, uploadFile } from '../../lib/db';
import { Calendar, Clock, Star, Briefcase } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import CompanyLogo from '../../components/CompanyLogo';

function displaySalary(salary) {
  if (!salary) return 'Not specified'
  const clean = salary.toString().replace(/[^0-9]/g, '')
  if (!clean) return salary
  return `₱${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` 
}

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
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [modal, setModal] = useState({ type: null, data: null });
  const [resumeFile, setResumeFile] = useState(null);
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationGender, setApplicationGender] = useState('');
  const [photoValidating, setPhotoValidating] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { showToast } = useToast();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        }
      } catch (err) {
        console.error('Error loading jobs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Pre-fill gender when apply modal opens
  useEffect(() => {
    async function loadApplicantGender() {
      if (modal.type === 'apply' && profile?.id) {
        try {
          const { data: applicantData } = await supabase
            .from('applicants')
            .select('gender')
            .eq('id', profile.id)
            .single();
          setApplicationGender(applicantData?.gender || '');
        } catch (err) {
          console.error('Error loading applicant gender:', err);
        }
      }
    }
    loadApplicantGender();
  }, [modal.type, profile?.id]);

  // Check if already applied when job is selected
  useEffect(() => {
    async function checkApplied() {
      const selectedJobData = selected ? jobs.find(j => j.id === selected) : null;
      if (!selectedJobData || !profile) return
      const { data } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', selectedJobData.id)
        .eq('applicant_id', profile.id)
        .maybeSingle()
      setHasApplied(!!data)
    }
    checkApplied()
  }, [selected, jobs, profile]);

  function co(cid) { return companies.find(c => c.id === cid) || {}; }
  function ini(name) { return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : '??'; }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoValidating(true);
    setPhotoError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('https://zero-effort-server.onrender.com/api/validate-photo', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (!result.valid) {
        setPhotoError(result.errors?.join(' ') || 'Invalid photo.');
        e.target.value = '';
        return;
      }

      setPhotoFile(file);
    } catch (err) {
      console.error('Photo validation error:', err);
      setPhotoFile(file);
    } finally {
      setPhotoValidating(false);
    }
  }

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = j.title?.toLowerCase().includes(q) || j.co?.toLowerCase().includes(q);
    const matchType = !filterType || j.type === filterType;
    const matchDepartment = !filterDept || j.department === filterDept;
    return matchQ && matchType && matchDepartment;
  });

  const selectedJob = selected ? jobs.find(j => j.id === selected) : null;
  const selectedCo = selectedJob ? co(selectedJob.cid) : {};

  async function handleApply(jobId) {
    if (!profile) { showToast('Please login to apply'); return; }
    
    const selectedJobData = selected ? jobs.find(j => j.id === selected) : null;
    if (!selectedJobData) { showToast('Please select a job first'); return; }
    
    // Check if already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', selectedJobData.id)
      .eq('applicant_id', profile.id)
      .maybeSingle()

    if (existing) {
      showToast('You have already applied for this position!', 'error')
      setModal({ type: null, data: null })
      return
    }
    
    // Validate file size
    if (resumeFile && resumeFile.size > 5 * 1024 * 1024) {
      showToast('Resume file must be under 5MB', 'error');
      return;
    }
    if (portfolioFile && portfolioFile.size > 5 * 1024 * 1024) {
      showToast('Portfolio file must be under 5MB', 'error');
      return;
    }
    
    // Validate photo is uploaded and validated
    if (!photoFile) {
      showToast('Please upload a 1x1 ID photo', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      
      let resumeUrl = null;
      let portfolioUrl = null;
      let photoUrl = null;

      // Upload resume if file selected
      if (resumeFile) {
        resumeUrl = await uploadFile(resumeFile, 'resumes', profile.id);
      }

      // Upload portfolio if file selected
      if (portfolioFile) {
        portfolioUrl = await uploadFile(portfolioFile, 'Portfolios', profile.id);
      }

      // Upload photo to Supabase storage
      if (photoFile) {
        photoUrl = await uploadFile(photoFile, 'photos', profile.id);
      }

      // Submit application with file URLs
      await submitApplication({
        job_id: jobId,
        applicant_id: profile.id,
        cover_letter: coverLetter,
        resume_url: resumeUrl,
        portfolio_url: portfolioUrl,
        photo_url: photoUrl,
        status: 'pending'
      });

      // Update gender in applicants table if provided
      if (applicationGender) {
        await supabase
          .from('applicants')
          .update({ gender: applicationGender })
          .eq('id', profile.id);
      }

      setModal({ type: 'success', data: { title: selectedJobData?.title, co: selectedJobData?.co } });
      
      // Reset form
      setResumeFile(null);
      setPortfolioFile(null);
      setPhotoFile(null);
      setPhotoError('');
      setPhotoValidating(false);
      setCoverLetter('');
      setApplicationGender('');

    } catch (err) {
      if (err.message?.includes('duplicate')) {
        setModal({ type: 'success', data: { title: selectedJobData?.title, co: selectedJobData?.co } });
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
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {[1,2,3].map(i => (
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
        ))}
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

      <div className="split" style={{
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 315px) 1fr',
        gap: '1.1rem',
        alignItems: 'start'
      }}>
        <div className="jlist">
          {filtered.length > 0 ? filtered.map(j => (
            <div key={j.id} className={`jlcard ${selected === j.id ? 'sel' : ''}`} onClick={() => setSelected(j.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="jlcard-title">{j.title}</div>
                {j.isNew && <span className="new-b" style={{ fontSize: '.62rem' }}>New</span>}
              </div>
              <div className="jlcard-co">{j.co}</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: '.4rem' }}>
                <span className="pill" style={{ fontSize: '.62rem' }}><Clock size={11} style={{ marginRight: '4px' }} />{j.type}</span>
                <span className="pill" style={{ fontSize: '.62rem' }}>{j.department}</span>
              </div>
              <div className="jlcard-meta">
                <span className="jlcard-sal">{j.salary}</span>
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
                <CompanyLogo company={selectedCo} size={52} />
                <div>
                  <div className="dp-title">{selectedJob.title}</div>
                  <div className="dp-co">{selectedJob.co} · Zero Effort</div>
                </div>
              </div>
              <div className="dp-chips">
                <span className="dp-chip"><Clock size={11} style={{ marginRight: '4px' }} /> {selectedJob.type}</span>
                <span className="dp-chip">{selectedJob.department}</span>
                <span className="dp-chip"><Calendar size={11} style={{ marginRight: '4px' }} /> {selectedJob.ago}</span>
                {selectedJob.isNew && <span className="dp-chip" style={{ color: 'var(--amber)', borderColor: 'rgba(245,158,11,.2)' }}><Star size={11} style={{ marginRight: '4px' }} /> New</span>}
              </div>
              <hr className="dp-div" />
              <div className="sal-box">
                <div>
                  <div style={{ fontSize: '.65rem', color: 'var(--text2)', marginBottom: 2 }}>Monthly Salary</div>
                  <div className="sal-val">{displaySalary(selectedJob.salary)}</div>
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
              <button
                onClick={() => !hasApplied && setModal({ type: 'apply', data: selectedJob })}
                disabled={hasApplied}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: '12px', border: 'none',
                  background: hasApplied ? 'var(--bg2)' : 'var(--accent)',
                  color: hasApplied ? 'var(--text2)' : 'white',
                  fontWeight: 700, fontSize: '15px',
                  cursor: hasApplied ? 'not-allowed' : 'pointer'
                }}
              >
                {hasApplied ? '✓ Already Applied' : 'Apply for this position →'}
              </button>
            </>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '100%', gap: '12px',
              color: 'var(--text2)', textAlign: 'center',
              padding: '40px'
            }}>
              <Briefcase size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '16px', fontWeight: 600 }}>Select a job to view details</p>
              <p style={{ fontSize: '13px', opacity: 0.6 }}>Click on any job from the list to see more information</p>
            </div>
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
              <label>Portfolio (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png"
                onChange={e => setPortfolioFile(e.target.files[0])}
              />
              {portfolioFile && (
                <span style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '4px' }}>
                  ✅ {portfolioFile.name}
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                Accepted: PDF, Word, ZIP, or image files (max 5MB)
              </span>
            </div>

            <div className="fgroup">
              <label className="flabel">1x1 Photo <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handlePhotoChange}
                style={{ marginBottom: '0.5rem' }}
              />
              {photoFile && <span style={{ fontSize: '.78rem', color: 'var(--success)' }}>✅ {photoFile.name}</span>}
              {photoValidating && (
                <p style={{ fontSize: '12px', color: 'var(--accent2)', marginTop: '6px' }}>
                  ⏳ Validating photo...
                </p>
              )}
              {photoError && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px' }}>
                  ❌ {photoError}
                </p>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                Required: JPG/PNG, square (1:1), white background, max 2MB
              </span>
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

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>
                Gender <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(optional)</span>
              </label>
              <select
                value={applicationGender}
                onChange={e => setApplicationGender(e.target.value)}
                className="finput"
                style={{ width: '100%' }}
              >
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {isSubmitting && <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '.78rem' }}>Uploading files and submitting application...</p>}
            <button className="btn-primary" onClick={() => handleApply(modal.data.id)} disabled={isSubmitting || photoValidating}>
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
