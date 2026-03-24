import { useState, useEffect, useCallback } from 'react';
import { getCompanies, addCompany, updateCompany, removeCompany as removeCompanyDb, addActivityLog, checkCompanyAccountExists, uploadCompanyLogo, formatDate } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';
import CompanyLogo from '../../components/CompanyLogo';
import VerifiedBadge from '../../components/VerifiedBadge';

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

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [filterInd, setFilterInd] = useState('');
  const [modal, setModal] = useState({ type: null, data: null });
  const [companiesWithAccounts, setCompaniesWithAccounts] = useState([]);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState(null);
  const { showToast } = useToast();
  
  // Verification system states
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCompaniesWithAccounts = useCallback(async () => {
    try {
      const { data } = await supabase.from('company_users').select('company_id');
      setCompaniesWithAccounts(data ? data.map(d => d.company_id) : []);
    } catch (err) {
      console.error('Error loading companies with accounts:', err);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    loadCompaniesWithAccounts();
    fetchPendingVerifications();
  }, [loadCompanies, loadCompaniesWithAccounts]);

  // Fetch pending verifications
  const fetchPendingVerifications = async () => {
    const { data } = await supabase
      .from('verification_requests')
      .select(`
        *,
        companies (
          id, name, logo_url, logo_initials, 
          color, verification_status
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });
    
    setPendingVerifications(data || []);
  };

  // Handle approve
  const handleApprove = async (companyId, requestId) => {
    try {
      // Update verification request
      await supabase
        .from('verification_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      // Update company
      await supabase
        .from('companies')
        .update({ 
          is_verified: true,
          verification_status: 'verified',
          verification_reviewed_at: new Date().toISOString()
        })
        .eq('id', companyId);
      
      showToast('✅ Company verified successfully!');
      fetchPendingVerifications();
      loadCompanies();
      
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  };

  // Handle reject
  const handleReject = async (companyId, requestId, reason) => {
    try {
      await supabase
        .from('verification_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      await supabase
        .from('companies')
        .update({ 
          is_verified: false,
          verification_status: 'rejected',
          verification_notes: reason,
          verification_reviewed_at: new Date().toISOString()
        })
        .eq('id', companyId);
      
      showToast('Company verification rejected.');
      fetchPendingVerifications();
      loadCompanies();
      setModal({ type: null, data: null });
      setRejectionReason('');
      
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  };

  const filtered = companies.filter(c => {
    const matchQ = c.name.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase());
    const matchInd = !filterInd || c.industry === filterInd;
    return matchQ && matchInd;
  });

  const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];

  function openDetail(company) { setModal({ type: 'detail', data: company }); }
  function openAdd() { setModal({ type: 'add', data: null }); }
  function openConfirmDisable(company) { setModal({ type: 'disable', data: company }); }
  function openConfirmRemove(company) { setModal({ type: 'remove', data: company }); }
  function openCreatePortalAccount(company) { setModal({ type: 'createPortal', data: company }); }
  function closeModal() { setModal({ type: null, data: null }); }

  async function handleAddCompany(formData) {
    try {
      let logoUrl = null;
      if (logoFile) {
        // Upload logo first, then use the returned URL
        const newCo = await addCompany(formData);
        logoUrl = await uploadCompanyLogo(logoFile, newCo.id);
        // Update company with logo URL
        await updateCompany(newCo.id, { logo_url: logoUrl });
      } else {
        await addCompany(formData);
      }
      await addActivityLog('company', '🏢', `New company '${formData.name}' added to the park`, 'Admin · System');
      closeModal();
      setLogoFile(null);
      showToast('Company added successfully!');
      loadCompanies();
    } catch (err) {
      showToast('Error adding company: ' + err.message);
    }
  }

  async function handleToggleActive(company) {
    try {
      await updateCompany(company.id, { is_active: !company.is_active });
      const action = company.is_active ? 'disabled' : 'enabled';
      await addActivityLog('company', company.is_active ? '🚫' : '✅', `Company '${company.name}' access ${action}`, 'Admin · System');
      closeModal();
      showToast(`Company ${action} successfully.`);
      loadCompanies();
    } catch (err) {
      showToast('Error updating company.');
    }
  }

  async function handleRemove(company) {
    try {
      await removeCompanyDb(company.id);
      await addActivityLog('company', '🗑️', `Company '${company.name}' removed from park`, 'Admin · System');
      closeModal();
      showToast('Company removed.');
      loadCompanies();
    } catch (err) {
      showToast('Error removing company.');
    }
  }

  async function handleCreatePortalAccount(formData) {
    setCreatingAccount(true);
    try {
      const { email, password, confirmPassword } = formData;
      const company = modal.data;

      // Step 1: Validate passwords match
      if (password !== confirmPassword) {
        showToast('Passwords do not match');
        setCreatingAccount(false);
        return;
      }

      // Step 2: Create account via local API (bypasses rate limits)
      const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          metadata: { company_id: company.id, full_name: company.name }
        })
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.error?.includes('User already registered') || result.error?.includes('duplicate')) {
          showToast('An account with this email already exists');
        } else {
          throw new Error(result.error);
        }
        setCreatingAccount(false);
        return;
      }

      // Step 3: Insert into company_users table
      const { error: dbError } = await supabase
        .from('company_users')
        .insert([{
          company_id: company.id,
          email: email,
          password_hash: 'hash_stored_in_auth',
          full_name: company.name
        }]);

      if (dbError) throw dbError;

      // Step 4: Log activity
      await supabase.from('activity_log').insert([{
        type: 'company',
        icon: '👤',
        message: `Portal account created for ${company.name}`,
        sub_text: 'Admin · System'
      }]);

      // Step 5: Update UI
      showToast('Portal account created successfully!');
      setCompaniesWithAccounts(prev => [...prev, company.id]);
      closeModal();

    } catch (err) {
      console.error('Create portal account error:', err);
      showToast('Failed to create account. Please try again.');
    } finally {
      setCreatingAccount(false);
    }
  }

  if (isLoading) return (
    <div className="pw">
      <div className="ph"><h2>Companies</h2><p>All tenant companies inside Zero Effort.</p></div>
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="pw">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="ph" style={{ margin: 0 }}>
          <h2>Companies</h2>
          <p>All tenant companies inside Zero Effort.</p>
        </div>
        <button className="btn-acc" onClick={openAdd}>+ Add Company</button>
      </div>

      {/* Pending Verifications Section */}
      {pendingVerifications.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            background: 'rgba(245,158,11,0.1)', 
            border: '1px solid rgba(245,158,11,0.2)', 
            padding: '16px', 
            borderRadius: '12px',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#f59e0b', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⏳ Pending Verifications ({pendingVerifications.length})
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text2)' }}>
              Review and approve company verification requests
            </div>
          </div>

          <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
            <table className="listings-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Document Type</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingVerifications.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CompanyLogo company={req.companies} size={32} />
                        <div>
                          <div style={{ fontSize: '.875rem', fontWeight: 700 }}>{req.companies.name}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text2)' }}>{req.companies.industry}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '.75rem',
                        textTransform: 'capitalize',
                        background: 'var(--surface)',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {req.document_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '.75rem', color: 'var(--text2)' }}>
                        {formatDate(req.submitted_at)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => window.open(req.document_url, '_blank')}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'var(--surface2)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'var(--surface)';
                          }}
                        >
                          View Document
                        </button>
                        <button
                          onClick={() => handleApprove(req.companies.id, req.id)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(16,185,129,0.15)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: '6px',
                            fontSize: '.75rem',
                            color: '#10b981',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(16,185,129,0.25)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'rgba(16,185,129,0.15)';
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setModal({ type: 'reject', data: req });
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(244,63,94,0.15)',
                            border: '1px solid rgba(244,63,94,0.3)',
                            borderRadius: '6px',
                            fontSize: '.75rem',
                            color: '#f43f5e',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(244,63,94,0.25)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'rgba(244,63,94,0.15)';
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="fbar">
        <input className="fi fi-grow" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fi" value={filterInd} onChange={e => setFilterInd(e.target.value)}>
          <option value="">All industries</option>
          {industries.map(ind => <option key={ind}>{ind}</option>)}
        </select>
      </div>

      <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
        <table className="listings-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Portal Account</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CompanyLogo company={c} size={32} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '.875rem', fontWeight: 700 }}>{c.name}</div>
                        {c.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text2)' }}>{c.industry}</div>
                    </div>
                  </div>
                </td>
                <td>{c.industry}</td>
                <td>
                  <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: c.is_active ? 'rgba(16,185,129,.08)' : 'rgba(244,63,94,.08)', border: `1px solid ${c.is_active ? 'rgba(16,185,129,.2)' : 'rgba(244,63,94,.2)'}`, color: c.is_active ? 'var(--success)' : 'var(--danger)' }}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {companiesWithAccounts.includes(c.id) ? (
                    <span style={{ fontSize: '.7rem', color: 'var(--success)' }}>✓ Active</span>
                  ) : (
                    <button 
                      className="tbl-btn" 
                      onClick={() => openCreatePortalAccount(c)}
                      style={{ fontSize: '.7rem' }}
                    >
                      Create Account
                    </button>
                  )}
                </td>
                <td>
                  <div className="tbl-actions">
                    <button className="tbl-btn" onClick={() => openEdit(c)}>Edit</button>
                    <button className="tbl-btn danger" onClick={() => openRemove(c)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.82rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🗂️</div>
          <p>No companies added yet</p>
          <p style={{ fontSize: '.7rem', marginTop: '0.5rem' }}>Companies will appear here once added</p>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={modal.type === 'detail'} onClose={closeModal}>
        {modal.data && <CompanyDetail company={modal.data} onDisable={() => openConfirmDisable(modal.data)} onRemove={() => openConfirmRemove(modal.data)} onEnable={() => handleToggleActive(modal.data)} onClose={closeModal} />}
      </Modal>

      {/* Add Modal */}
      <Modal isOpen={modal.type === 'add'} onClose={closeModal}>
        <AddCompanyForm onSubmit={handleAddCompany} onClose={closeModal} companies={companies} logoFile={logoFile} setLogoFile={setLogoFile} />
      </Modal>

      {/* Disable Confirm */}
      <Modal isOpen={modal.type === 'disable'} onClose={closeModal}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">{modal.data.is_active ? 'Disable' : 'Enable'} Company Access</div><div className="m-sub">This will affect company portal login</div></div>
              <button className="m-close" onClick={closeModal}>✕</button>
            </div>
            <div className="warn-box">
              <div className="warn-box-icon">⚠️</div>
              <div className="warn-box-text">{modal.data.is_active ? 'Disable' : 'Enable'} access for <strong>{modal.data.name}</strong>?</div>
            </div>
            <div className="btn-row">
              <button className="btn-confirm-danger" onClick={() => handleToggleActive(modal.data)}>{modal.data.is_active ? 'Disable' : 'Enable'} access</button>
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove Confirm */}
      <Modal isOpen={modal.type === 'remove'} onClose={closeModal}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">Remove Company</div><div className="m-sub">This action cannot be undone</div></div>
              <button className="m-close" onClick={closeModal}>✕</button>
            </div>
            <div className="warn-box">
              <div className="warn-box-icon">⚠️</div>
              <div className="warn-box-text">This company will be removed from the system. You can add them again at any time.</div>
            </div>
            <div className="btn-row">
              <button className="btn-confirm-danger" onClick={() => handleRemove(modal.data)}>Remove Company</button>
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Portal Account Modal */}
      <Modal isOpen={modal.type === 'createPortal'} onClose={closeModal}>
        {modal.data && <CreatePortalAccountForm company={modal.data} onSubmit={handleCreatePortalAccount} onClose={closeModal} loading={creatingAccount} />}
      </Modal>

      {/* Rejection Modal */}
      <Modal isOpen={modal.type === 'reject'} onClose={() => setModal({ type: null, data: null })}>
        <div>
          <div className="m-head">
            <div>
              <div className="m-title">Reject Verification</div>
              <div className="m-sub">{modal.data?.companies?.name}</div>
            </div>
            <button className="m-close" onClick={() => setModal({ type: null, data: null })}>✕</button>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label className="flabel">Rejection Reason</label>
            <textarea 
              className="ftextarea"
              placeholder="Please provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="btn-row">
            <button 
              className="btn-confirm-danger"
              onClick={() => {
                if (rejectionReason.trim() && selectedRequest) {
                  handleReject(selectedRequest.companies.id, selectedRequest.id, rejectionReason);
                }
              }}
              disabled={!rejectionReason.trim()}
            >
              Reject Verification
            </button>
            <button 
              className="btn-cancel"
              onClick={() => {
                setModal({ type: null, data: null });
                setRejectionReason('');
                setSelectedRequest(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CompanyDetail({ company, onDisable, onRemove, onEnable, onClose }) {
  return (
    <div>
      <div className="m-head">
        <div>
          <div className="m-title">{company.name}</div>
          <div className="m-sub">{company.industry} · Zero Effort</div>
        </div>
        <button className="m-close" onClick={onClose}>✕</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <CompanyLogo company={company} size={52} />
        <div>
          <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)' }}>{company.email}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{company.location}</div>
        </div>
      </div>
      {company.description && (
        <div style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1rem' }}>{company.description}</div>
      )}
      {company.tags && company.tags.length > 0 && (
        <div className="dp-chips" style={{ marginBottom: '1rem' }}>
          {company.tags.map((t, i) => <span key={i} className="dp-chip">{t}</span>)}
        </div>
      )}
      <div className="btn-row">
        {company.is_active ? (
          <button className="btn-confirm-danger" onClick={onDisable}>Disable Access</button>
        ) : (
          <button className="btn-accept" style={{ flex: 1 }} onClick={onEnable}>Enable Access</button>
        )}
        <button className="btn-confirm-danger" onClick={onRemove}>Remove</button>
        <button className="btn-cancel" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function AddCompanyForm({ onSubmit, onClose, companies, logoFile, setLogoFile }) {
  const DEFAULT_INDUSTRIES = [
    'Electronics & High-Precision Assembly',
    'Automotive & Transport Equipment',
    'Food & Beverage / FMCG',
    'Logistics & Warehousing',
    'Business Process Outsourcing (BPO)',
    'Information Technology (IT)',
    'Retail & Leisure',
    'Hospitality',
    'Construction & Real Estate',
    'Utilities & Energy',
    'Light Manufacturing',
    'Industrial Packaging',
    'Supply Chain & Freight Forwarding',
    'Shared Services',
  ];
  
  const [form, setForm] = useState({ name: '', industry: '', description: '', email: '', phone: '', location: '', website: '', logo_initials: '', color: '#6366f1' });
  const [industryInput, setIndustryInput] = useState('');
  const [customIndustries, setCustomIndustries] = useState(
    () => JSON.parse(localStorage.getItem('custom_industries') || '[]')
  );
  
  // Get existing industries from companies in database
  const existingIndustries = [...new Set(companies.map(c => c.industry).filter(Boolean))];
  const allIndustries = [...new Set([...DEFAULT_INDUSTRIES, ...existingIndustries, ...customIndustries])];

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    // Auto-save custom industry on submit
    if (industryInput && !allIndustries.includes(industryInput)) {
      const updated = [...customIndustries, industryInput];
      setCustomIndustries(updated);
      localStorage.setItem('custom_industries', JSON.stringify(updated));
    }
    
    onSubmit({
      ...form,
      industry: industryInput,
      logo_initials: form.logo_initials || form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      is_active: true,
      tags: [],
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="m-head">
        <div><div className="m-title">Add Company</div><div className="m-sub">Register a new tenant company</div></div>
        <button className="m-close" type="button" onClick={onClose}>✕</button>
      </div>
      <div className="msep">Company Details</div>
      <div className="fgroup"><label className="flabel">Company Name *</label><input className="finput" required value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. NovaTech Solutions" /></div>
      <div className="frow">
        <div className="fgroup"><label className="flabel">Industry</label>
          <input
            className="finput"
            id="nc-ind"
            list="industry-options"
            placeholder="Select or type industry…"
            autoComplete="off"
            value={industryInput}
            onChange={e => setIndustryInput(e.target.value)}
          />
          <datalist id="industry-options">
            {allIndustries.map(ind => (
              <option key={ind} value={ind} />
            ))}
          </datalist>
        </div>
        <div className="fgroup"><label className="flabel">Logo Initials</label><input className="finput" value={form.logo_initials} onChange={e => handleChange('logo_initials', e.target.value)} placeholder="NT" maxLength={3} /></div>
      </div>
      <div className="fgroup">
        <label className="flabel">Company Logo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setLogoFile(e.target.files[0])}
        />
        {logoFile && <span style={{ fontSize: '12px', color: 'var(--text2)' }}>✅ {logoFile.name}</span>}
      </div>
      <div className="fgroup"><label className="flabel">Description</label><textarea className="ftextarea" value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Brief company description..." /></div>
      <div className="msep">Contact Info</div>
      <div className="frow">
        <div className="fgroup"><label className="flabel">Email</label><input className="finput" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="hr@company.com" /></div>
        <div className="fgroup"><label className="flabel">Phone</label><input className="finput" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+63 32 XXX XXXX" /></div>
      </div>
      <div className="fgroup"><label className="flabel">Location</label><input className="finput" value={form.location} onChange={e => handleChange('location', e.target.value)} placeholder="Tower X, Floor Y, Zero Effort" /></div>
      <div className="fgroup"><label className="flabel">Website</label><input className="finput" value={form.website} onChange={e => handleChange('website', e.target.value)} placeholder="e.g. https://company.com" /></div>
      <button className="btn-primary" type="submit">Add Company →</button>
    </form>
  );
}

function CreatePortalAccountForm({ company, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({ 
    email: company.email || '', 
    password: '', 
    confirmPassword: '' 
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.confirmPassword) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="m-head">
        <div>
          <div className="m-title">Create Portal Account for {company.name}</div>
          <div className="m-sub">Set up login credentials for company portal access</div>
        </div>
        <button className="m-close" type="button" onClick={onClose}>✕</button>
      </div>
      
      <div className="fgroup">
        <label className="flabel">Login Email</label>
        <input 
          className="finput" 
          type="email" 
          required 
          value={form.email} 
          onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} 
          placeholder="company@example.com" 
        />
      </div>
      
      <div className="fgroup">
        <label className="flabel">Password</label>
        <input 
          className="finput" 
          type="password" 
          required 
          value={form.password} 
          onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} 
          placeholder="Enter password" 
        />
      </div>
      
      <div className="fgroup">
        <label className="flabel">Confirm Password</label>
        <input 
          className="finput" 
          type="password" 
          required 
          value={form.confirmPassword} 
          onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))} 
          placeholder="Confirm password" 
        />
      </div>
      
      <div className="btn-row">
        <button 
          className="btn-primary" 
          type="submit" 
          style={{ flex: 1 }}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        <button 
          className="btn-cancel" 
          type="button" 
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
