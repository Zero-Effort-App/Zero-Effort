import { useState, useEffect, useCallback } from 'react';
import { getCompanies, addCompany, updateCompany, removeCompany as removeCompanyDb, addActivityLog, checkCompanyAccountExists } from '../../lib/db';
import { supabase } from '../../lib/supabase';
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

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [filterInd, setFilterInd] = useState('');
  const [modal, setModal] = useState({ type: null, data: null });
  const [companiesWithAccounts, setCompaniesWithAccounts] = useState([]);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

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
  }, [loadCompanies, loadCompaniesWithAccounts]);

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
      const newCo = await addCompany(formData);
      await addActivityLog('company', '🏢', `New company '${formData.name}' added to the park`, 'Admin · System');
      closeModal();
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
        return;
      }

      // Step 2: Create account via local API (bypasses rate limits)
      const response = await fetch('http://localhost:3002/api/create-account', {
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
      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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

      <div className="fbar">
        <input className="fi fi-grow" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fi" value={filterInd} onChange={e => setFilterInd(e.target.value)}>
          <option value="">All industries</option>
          {industries.map(ind => <option key={ind}>{ind}</option>)}
        </select>
      </div>

      <div className="co-grid-admin stagger">
        {filtered.map(c => (
          <div key={c.id} className="co-card-admin">
            <div onClick={() => openDetail(c)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '.75rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: c.color ? c.color + '20' : 'rgba(99,102,241,.12)', color: c.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.82rem', fontWeight: 800, border: '1px solid var(--border)', flexShrink: 0 }}>
                  {c.logo_initials || c.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.875rem', fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text2)' }}>{c.industry}</div>
                </div>
                <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: c.is_active ? 'rgba(16,185,129,.08)' : 'rgba(244,63,94,.08)', border: `1px solid ${c.is_active ? 'rgba(16,185,129,.2)' : 'rgba(244,63,94,.2)'}`, color: c.is_active ? 'var(--success)' : 'var(--danger)' }}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ fontSize: '.775rem', color: 'var(--text2)', lineHeight: 1.6 }}>
                {c.description?.slice(0, 100)}{c.description?.length > 100 ? '...' : ''}
              </div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              {companiesWithAccounts.includes(c.id) ? (
                <button 
                  className="btn-acc" 
                  disabled 
                  style={{ 
                    background: 'var(--bg2)', 
                    color: 'var(--text3)', 
                    cursor: 'not-allowed',
                    fontSize: '.75rem',
                    padding: '6px 12px'
                  }}
                >
                  Portal Account Active ✓
                </button>
              ) : (
                <button 
                  className="btn-acc" 
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreatePortalAccount(c);
                  }}
                  style={{ 
                    fontSize: '.75rem',
                    padding: '6px 12px'
                  }}
                >
                  Create Portal Account
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.82rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🗂️</div>
            <p>No companies added yet</p>
            <p style={{ fontSize: '.7rem', marginTop: '0.5rem' }}>Companies will appear here once added</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={modal.type === 'detail'} onClose={closeModal}>
        {modal.data && <CompanyDetail company={modal.data} onDisable={() => openConfirmDisable(modal.data)} onRemove={() => openConfirmRemove(modal.data)} onEnable={() => handleToggleActive(modal.data)} onClose={closeModal} />}
      </Modal>

      {/* Add Modal */}
      <Modal isOpen={modal.type === 'add'} onClose={closeModal}>
        <AddCompanyForm onSubmit={handleAddCompany} onClose={closeModal} companies={companies} />
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
              <div className="warn-box-text">Permanently remove <strong>{modal.data.name}</strong> from Zero Effort?</div>
            </div>
            <div className="btn-row">
              <button className="btn-confirm-danger" onClick={() => handleRemove(modal.data)}>Remove company</button>
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Portal Account Modal */}
      <Modal isOpen={modal.type === 'createPortal'} onClose={closeModal}>
        {modal.data && <CreatePortalAccountForm company={modal.data} onSubmit={handleCreatePortalAccount} onClose={closeModal} loading={creatingAccount} />}
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
        <div style={{ width: 52, height: 52, borderRadius: 12, background: company.color ? company.color + '20' : 'rgba(99,102,241,.12)', color: company.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, border: '1px solid var(--border)' }}>
          {company.logo_initials || company.name?.slice(0, 2).toUpperCase()}
        </div>
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

function AddCompanyForm({ onSubmit, onClose, companies }) {
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
