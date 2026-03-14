import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanyJobs, getCompanyApplications, getCompanyActivityLog, formatTime, formatDate, updateApplicationStatus } from '../../lib/db';
import { CheckCircle, Clock, Calendar, FileText, FolderOpen, Mail, X, User, Briefcase, Phone } from 'lucide-react';
import CompanyLogo from '../../components/CompanyLogo';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';

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

export default function CompanyApplicants() {
  const { company } = useOutletContext();
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [modal, setModal] = useState({ type: null, data: null });
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  async function loadData() {
    if (!company) return;
    setIsLoading(true);
    try {
      const [apps, jbs] = await Promise.all([
        getCompanyApplications(company.id),
        getCompanyJobs(company.id),
      ]);
      setJobs(jbs);
      setApplicants(apps.map(a => ({
        ...a,
        name: `${a.applicants?.first_name || ''} ${a.applicants?.last_name || ''}`.trim(),
        ini: `${(a.applicants?.first_name || '?')[0]}${(a.applicants?.last_name || '?')[0]}`.toUpperCase(),
        email: a.applicants?.email || '',
        phone: a.applicants?.phone || '',
        gender: a.applicants?.gender || '',
        photo_url: a.applicants?.photo_url || '',
        date: formatDate(a.applied_at),
        jobTitle: a.jobs?.title || '—',
        jobType: a.jobs?.type || '',
        jobDept: a.jobs?.department || '',
        cover: a.cover_letter || '',
        hasResume: !!a.resume_url,
        hasPortfolio: !!a.portfolio_url,
        resumeUrl: a.resume_url || '',
        portfolioUrl: a.portfolio_url || '',
      })));
    } catch (err) {
      console.error('Error loading applicants:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [company]);

  const roles = [...new Set(applicants.map(a => a.jobTitle).filter(Boolean))];

  const filtered = applicants.filter(a => {
    const q = search.toLowerCase();
    const matchQ = a.name.toLowerCase().includes(q) || a.jobTitle.toLowerCase().includes(q);
    const matchSt = !filterStatus || a.status === filterStatus.toLowerCase();
    const matchRole = !filterRole || a.jobTitle === filterRole;
    return matchQ && matchSt && matchRole;
  });

  async function handleSetStatus(appId, newStatus) {
    try {
      await updateApplicationStatus(appId, newStatus);
      showToast(`Applicant ${newStatus}.`);
      loadData();
    } catch (err) {
      showToast('Error updating status.');
    }
  }

  function openContact(applicant) {
    setModal({ type: 'contact', data: applicant });
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!')).catch(() => {});
  }

  const selectedApp = selected ? applicants.find(a => a.id === selected) : null;

  if (isLoading) return (
    <div className="pw">
      <div className="ph"><h2>Applicants</h2><p>Review, accept, decline, or contact applicants for your listings.</p></div>
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="pw">
      <div className="ph"><h2>Applicants</h2><p>Review, accept, decline, or contact applicants for your listings.</p></div>

      <div className="fbar" style={{ marginBottom: '1rem' }}>
        <input className="fi fi-grow" placeholder="Search applicant name or role…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fi" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>Pending</option><option>Reviewed</option><option>Accepted</option><option>Declined</option>
        </select>
        <select className="fi" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All roles</option>
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="split">
        <div className="apl-list-panel">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`acard ${selected === a.id ? 'sel' : ''}`}
              onClick={() => setSelected(a.id)}
            >
              <div className="acard-top">
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: '14px',
                  color: 'white', overflow: 'hidden', flexShrink: 0,
                  border: '2px solid var(--border)'
                }}>
                  {a.photo_url ? (
                    <img src={a.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{a.applicants?.first_name?.[0] || '?'}{a.applicants?.last_name?.[0] || '?'}</span>
                  )}
                </div>
                <div>
                  <div className="acard-name">{a.name}</div>
                  <div className="acard-role">{a.jobTitle}</div>
                </div>
                <span className={`status-badge sb-${a.status}`} style={{ marginLeft: 'auto', fontSize: '.62rem', padding: '2px 7px' }}>
                  {a.status?.charAt(0).toUpperCase() + a.status?.slice(1)}
                </span>
              </div>
              <div className="acard-meta">
                <div className="acard-date">{a.date}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="empty-state">
              <div style={{ fontSize: '48px' }}>�</div>
              <h3>No applicants yet</h3>
              <p>Applicants will appear here once they apply to your job listings</p>
              <button className="btn-primary" onClick={() => navigate('/company/listings')}>
                View Job Listings →
              </button>
            </div>
          )}
        </div>

        <div className="dpanel">
          {selectedApp ? (
            <>
              <div className="dp-head">
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: '16px',
                  color: 'white', overflow: 'hidden', flexShrink: 0,
                  border: '2px solid var(--border)'
                }}>
                  {selectedApp.photo_url ? (
                    <img src={selectedApp.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{selectedApp.ini}</span>
                  )}
                </div>
                <div>
                  <div className="dp-name">{selectedApp.name}</div>
                  <div className="dp-sub">{selectedApp.jobTitle} · {selectedApp.jobType}</div>
                </div>
              </div>
              <span className={`status-badge sb-${selectedApp.status}`}>
                {selectedApp.status?.charAt(0).toUpperCase() + selectedApp.status?.slice(1)}
              </span>
              <div className="dp-chips">
                <span className="dp-chip"><Calendar size={12} style={{ marginRight: '4px' }} /> Applied {selectedApp.date}</span>
                {selectedApp.jobDept && <span className="dp-chip"><Briefcase size={12} style={{ marginRight: '4px' }} /> {selectedApp.jobDept}</span>}
              </div>
              <hr className="dp-div" />

              {/* Contact Information */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.08em', marginBottom: '10px' }}>CONTACT INFORMATION</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Mail size={14} style={{ color: 'var(--text2)' }} />
                    <span>{selectedApp.email}</span>
                  </div>
                  {selectedApp.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <Phone size={14} style={{ color: 'var(--text2)' }} />
                      <span>{selectedApp.phone}</span>
                    </div>
                  )}
                  {selectedApp.gender && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <User size={14} style={{ color: 'var(--text2)' }} />
                      <span>{selectedApp.gender}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Letter */}
              {selectedApp.cover && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.08em', marginBottom: '10px' }}>COVER LETTER</p>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)', background: 'var(--bg2)', padding: '12px', borderRadius: '8px' }}>
                    {selectedApp.cover}
                  </p>
                </div>
              )}

              <div className="dp-sec">
                <div className="dp-sec-h">Documents</div>
                {selectedApp.hasResume && selectedApp.resumeUrl && (
                  <a 
                    href={selectedApp.resumeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '.6rem .9rem', fontSize: '.78rem', fontWeight: 600, color: 'var(--text2)', marginBottom: '.5rem', textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <FileText size={14} style={{ marginRight: '4px' }} /><span>Resume / CV</span>
                    <span style={{ marginLeft: 'auto', fontSize: '.68rem', color: 'var(--accent)' }}>View →</span>
                  </a>
                )}
                {selectedApp.hasPortfolio && selectedApp.portfolioUrl && (
                  <a 
                    href={selectedApp.portfolioUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '.6rem .9rem', fontSize: '.78rem', fontWeight: 600, color: 'var(--text2)', textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <FolderOpen size={14} style={{ marginRight: '4px' }} /><span>Portfolio</span>
                    <span style={{ marginLeft: 'auto', fontSize: '.68rem', color: 'var(--accent)' }}>View Portfolio →</span>
                  </a>
                )}
              </div>

              <hr className="dp-div" />

              <div className="action-row">
                <button
                  className="btn-accept"
                  onClick={() => handleSetStatus(selectedApp.id, 'accepted')}
                  disabled={selectedApp.status === 'accepted'}
                  style={selectedApp.status === 'accepted' ? { opacity: .5, cursor: 'default' } : {}}
                ><CheckCircle size={14} style={{ marginRight: '4px' }} /> Accept</button>
                <button
                  className="btn-decline"
                  onClick={() => handleSetStatus(selectedApp.id, 'declined')}
                  disabled={selectedApp.status === 'declined'}
                  style={selectedApp.status === 'declined' ? { opacity: .5, cursor: 'default' } : {}}
                ><X size={14} style={{ marginRight: '4px' }} /> Decline</button>
              </div>
              <button className="btn-contact" onClick={() => openContact(selectedApp)}><Mail size={14} style={{ marginRight: '4px' }} /> Contact Applicant</button>
            </>
          ) : (
            <div className="empty-dp">
              <div className="eico"><User size={24} /></div>
              <p>Select an applicant to view their profile</p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      <Modal isOpen={modal.type === 'contact'} onClose={() => setModal({ type: null, data: null })}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">Contact {modal.data.name}</div><div className="m-sub">Send a message or reach out directly</div></div>
              <button className="m-close" onClick={() => setModal({ type: null, data: null })}><X size={18} /></button>
            </div>
            <div className="msep">Contact Info</div>
            <div className="contact-info-row">
              <span className="contact-info-icon"><Mail size={16} /></span>
              <div><div className="contact-info-label">Email</div><div className="contact-info-val">{modal.data.email}</div></div>
              <button className="contact-copy" onClick={() => copyText(modal.data.email)}>Copy</button>
            </div>
            <div className="contact-info-row">
              <span className="contact-info-icon"><Phone size={16} /></span>
              <div><div className="contact-info-label">Phone</div><div className="contact-info-val">{modal.data.phone}</div></div>
              <button className="contact-copy" onClick={() => copyText(modal.data.phone)}>Copy</button>
            </div>
            {modal.data.gender && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text2)' }}>
                <User size={14} />
                <span>{modal.data.gender}</span>
              </div>
            )}
            <div className="msep">Send a Message</div>
            <div className="fgroup"><label className="flabel">Subject</label><input className="finput" defaultValue={`Re: Your application for ${modal.data.jobTitle}`} /></div>
            <div className="fgroup"><label className="flabel">Message</label>
              <textarea className="ftextarea" style={{ minHeight: 110 }} defaultValue={`Dear ${modal.data.name.split(' ')[0]},\n\nThank you for your interest in the position. We would like to follow up regarding your application.\n\nBest regards,\n${company?.name || ''} HR Team`} />
            </div>
            <button className="btn-primary" onClick={() => {
              setModal({ type: 'sent', data: null });
            }}>Send message →</button>
          </div>
        )}
      </Modal>

      {/* Message Sent */}
      <Modal isOpen={modal.type === 'sent'} onClose={() => setModal({ type: null, data: null })}>
        <div className="success-wrap">
          <div className="sw-icon">✉️</div>
          <h3>Message sent!</h3>
          <p>Your message has been sent to the applicant. They will receive it via email.</p>
          <button className="btn-primary" style={{ maxWidth: 140, margin: '1.25rem auto 0', display: 'block' }} onClick={() => setModal({ type: null, data: null })}>Done</button>
        </div>
      </Modal>
    </div>
  );
}
