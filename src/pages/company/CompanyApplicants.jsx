import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getCompanyJobs, getCompanyApplications, getCompanyActivityLog, formatTime, formatDate, updateApplicationStatus } from '../../lib/db';
import { CheckCircle, Clock, Calendar, FileText, FolderOpen, Mail, X, User, Briefcase, Phone, MessageCircle, Send, ChevronLeft } from 'lucide-react';
import CompanyLogo from '../../components/CompanyLogo';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

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
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [modal, setModal] = useState({ type: null, data: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
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
        applicant_id: a.applicants?.id || a.applicant_id,
        name: `${a.applicants?.first_name || ''} ${a.applicants?.last_name || ''}`.trim(),
        ini: `${(a.applicants?.first_name || '?')[0]}${(a.applicants?.last_name || '?')[0]}`.toUpperCase(),
        email: a.applicants?.email || '',
        phone: a.applicants?.phone || '',
        gender: a.applicants?.gender || '',
        photo_url: a.applicants?.photo_url || '',
        application_photo: a.photo_url || '',
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  async function handleSendMessage() {
    if (!messageContent.trim() || sendingMessage) return
    setSendingMessage(true)
    try {
      // Insert message to database
      const { error } = await supabase.from('messages').insert({
        company_id: company.id,
        applicant_id: selectedApp.applicant_id,
        sender_type: 'company',
        content: messageContent.trim()
      })
      if (error) throw error

      // Send email notification via Express server
      await fetch('https://zero-effort-server.onrender.com/api/send-message-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantEmail: selectedApp?.applicants?.email,
          applicantName: `${selectedApp?.applicants?.first_name} ${selectedApp?.applicants?.last_name}`,
          companyName: company.name,
          message: messageContent.trim()
        })
      })

      setShowMessageModal(false)
      setMessageContent('')
      showToast('Message sent successfully! 🎉', 'success')
    } catch (err) {
      console.error('Send message error:', err)
      showToast('Failed to send message. Please try again.', 'error')
    } finally {
      setSendingMessage(false)
    }
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

      <div className="split" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
        gap: '1.1rem',
        alignItems: 'start'
      }}>
        {(!isMobile || !selected) && (
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
        )}

        {(!isMobile || selected) && (
        <div className="dpanel">
          <>
          {isMobile && selected && (
            <button
              onClick={() => setSelected(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', color: 'var(--text2)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                padding: '0', marginBottom: '16px', fontFamily: 'inherit'
              }}
            >
              <ChevronLeft size={18} />
              Back to applicants
            </button>
          )}
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

              {selectedApp.application_photo && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.08em', marginBottom: '10px' }}>1x1 ID PHOTO</p>
                  <div style={{ 
                    width: '140px', height: '160px', borderRadius: '8px', 
                    overflow: 'hidden', border: '2px solid var(--border)' 
                  }}>
                    <img 
                      src={selectedApp.application_photo} 
                      alt="1x1 ID Photo" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
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
              <button
  onClick={() => setShowMessageModal(true)}
  style={{
    width: '100%', padding: '12px',
    borderRadius: '10px', border: '1px solid var(--border)',
    background: 'var(--bg2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text)'
  }}
>
  <Mail size={16} />
  Contact Applicant
</button>
            </>
          ) : (
            <div className="empty-dp">
              <div className="eico"><User size={24} /></div>
              <p>Select an applicant to view their profile</p>
            </div>
          )}
        )}
        </>
        </div>
        )}
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

      {/* Message Modal */}
      {showMessageModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '20px',
            padding: '28px', width: '100%', maxWidth: '480px',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white'
              }}>
                <Mail size={20} />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '17px', margin: 0 }}>
                  Message {selected?.applicants?.first_name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
                  Sent to {selected?.applicants?.email}
                </p>
              </div>
            </div>

            {/* Info banner */}
            <div style={{
              background: 'var(--bg2)', borderRadius: '10px',
              padding: '10px 14px', marginBottom: '16px',
              fontSize: '13px', color: 'var(--text2)',
              display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid var(--border)'
            }}>
              <MessageCircle size={14} />
              Message will appear in their inbox and be sent to their email.
            </div>

            {/* Textarea */}
            <textarea
              value={messageContent}
              onChange={e => setMessageContent(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: '14px', outline: 'none',
                resize: 'none', marginBottom: '20px',
                boxSizing: 'border-box', lineHeight: '1.6',
                fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowMessageModal(false); setMessageContent('') }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: '1px solid var(--border2)', background: 'var(--surface2)',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  color: 'var(--text)'
                }}
                onMouseEnter={e => e.target.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.target.style.borderColor = 'var(--border2)'}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageContent.trim()}
                style={{
                  flex: 2, padding: '12px', borderRadius: '12px',
                  border: 'none',
                  background: sendingMessage || !messageContent.trim() ? 'var(--border)' : 'var(--accent)',
                  cursor: sendingMessage || !messageContent.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: 700, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Send size={15} />
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
