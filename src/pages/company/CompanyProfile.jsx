import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateCompany, getCompanyJobs, getCompanyApplications, getCompanies, uploadCompanyLogo } from '../../lib/db';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../../components/VerifiedBadge';

export default function CompanyProfile() {
  const { company, setCompany } = useOutletContext();
  const { showToast } = useToast();
  
  const INDUSTRIES = [
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
  
  const [form, setForm] = useState({
    name: '', industry: '', description: '', email: '', phone: '', location: '', website: '',
  });
  const [industryInput, setIndustryInput] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [customIndustries, setCustomIndustries] = useState(
    () => JSON.parse(localStorage.getItem('company_custom_industries') || '[]')
  );
  const [companies, setCompanies] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({ listings: 0, totalApps: 0, accepted: 0 });
  
  // Verification system states
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [docType, setDocType] = useState('');
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name || '',
      industry: company.industry || '',
      description: company.description || '',
      email: company.email || '',
      phone: company.phone || '',
      location: company.location || '',
      website: company.website || '',
    });
    setIndustryInput(company.industry || '');
    setTags(company.tags || []);

    async function loadStats() {
      try {
        const [jobs, apps, allCompanies] = await Promise.all([
          getCompanyJobs(company.id),
          getCompanyApplications(company.id),
          getCompanies(),
        ]);
        setCompanies(allCompanies);
        setStats({
          listings: jobs.filter(j => j.status === 'active').length,
          totalApps: apps.length,
          accepted: apps.filter(a => a.status === 'accepted').length,
        });
      } catch (err) { console.error(err); }
    }
    loadStats();
  }, [company]);

  // Fetch verification status on mount
  useEffect(() => {
    const fetchVerificationStatus = async () => {
      const { data } = await supabase
        .from('companies')
        .select('verification_status, is_verified, verification_notes')
        .eq('id', company.id)
        .single();
      
      if (data) {
        setVerificationStatus(data.verification_status || 'unverified');
        setIsVerified(data.is_verified || false);
        setVerificationNotes(data.verification_notes || '');
      }
    };
    
    if (company?.id) fetchVerificationStatus();
  }, [company?.id]);

  function handleChange(field, value) { 
    if (field === 'industry') {
      setIndustryInput(value);
    }
    setForm(prev => ({ ...prev, [field]: value })); 
  }

  // Handle verification submission
  const handleVerificationSubmit = async () => {
    try {
      setVerifyLoading(true);
      
      // Upload document to verification-docs bucket
      const fileExt = verifyFile.name.split('.').pop();
      const fileName = `${company.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, verifyFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Store only the file path, not public URL
      const documentPath = fileName;
      
      // Insert verification request
      const { error: reqError } = await supabase
        .from('verification_requests')
        .insert({
          company_id: company.id,
          document_url: documentPath,
          document_type: docType,
          document_name: verifyFile.name,
          status: 'pending'
        });
      
      if (reqError) throw reqError;
      
      // Update company verification_status
      const { error: compError } = await supabase
        .from('companies')
        .update({ 
          verification_status: 'pending',
          verification_submitted_at: new Date().toISOString()
        })
        .eq('id', company.id);
      
      if (compError) throw compError;
      
      showToast('✅ Verification documents submitted successfully!');
      setVerificationStatus('pending');
      setDocType('');
      setVerifyFile(null);
      
    } catch (err) {
      console.error('Verification error:', err);
      showToast('Failed to submit: ' + err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Get existing industries from companies in database
  const existingIndustries = [...new Set(companies.map(c => c.industry).filter(Boolean))];
  const allIndustries = [...new Set([...INDUSTRIES, ...existingIndustries, ...customIndustries])];

  function addTag(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val && !tags.includes(val)) {
        setTags(prev => [...prev, val]);
      }
      e.target.value = '';
    }
  }

  function removeTag(index) { setTags(prev => prev.filter((_, i) => i !== index)); }

  async function saveProfile() {
    try {
      // Auto-save custom industry on submit
      if (industryInput && !allIndustries.includes(industryInput)) {
        const updated = [...customIndustries, industryInput];
        setCustomIndustries(updated);
        localStorage.setItem('company_custom_industries', JSON.stringify(updated));
      }
      
      let logoUrl = company.logo_url || null;
      if (logoFile) {
        logoUrl = await uploadCompanyLogo(logoFile, company.id);
      }
      
      const updated = await updateCompany(company.id, { ...form, industry: industryInput, tags, logo_url: logoUrl });
      setCompany(prev => ({ ...prev, ...updated }));
      setLogoFile(null);
      showToast('Profile saved successfully!');
    } catch (err) {
      showToast('Error saving profile.');
    }
  }

  function cancelProfile() {
    if (!company) return;
    setForm({
      name: company.name || '',
      industry: company.industry || '',
      description: company.description || '',
      email: company.email || '',
      phone: company.phone || '',
      location: company.location || '',
      website: company.website || '',
    });
    setIndustryInput(company.industry || '');
    setTags(company.tags || []);
    setLogoFile(null);
  }

  if (!company) return null;
  const initials = company.logo_initials || company.name?.slice(0, 2).toUpperCase() || 'CO';

  return (
    <div className="pw">
      <div className="ph"><h2>Company Profile</h2><p>This is what applicants and the park admin see about your company.</p></div>
      <div className="profile-grid">
        <div>
          <div className="profile-card">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  objectFit: 'contain',
                  background: 'transparent',
                  border: '1px solid var(--border)'
                }}
              />
            ) : (
              <div className="profile-logo" style={{ background: company.color ? company.color + '20' : 'rgba(99,102,241,.12)', color: company.color || '#6366f1' }}>
                {initials}
              </div>
            )}
            <div className="profile-name" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              flexWrap: 'nowrap',
              minWidth: 0
            }}>
              <span style={{ 
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {form.name}
              </span>
              {isVerified && <VerifiedBadge size="sm" />}
            </div>
            <div className="profile-ind">{form.industry}</div>
            <div className="profile-stat"><span className="profile-stat-label">Status</span><span className="profile-stat-val" style={{ color: 'var(--success)' }}>● Active Tenant</span></div>
            <div className="profile-stat"><span className="profile-stat-label">Active Listings</span><span className="profile-stat-val">{stats.listings}</span></div>
            <div className="profile-stat"><span className="profile-stat-label">Total Applicants</span><span className="profile-stat-val">{stats.totalApps}</span></div>
            <div className="profile-stat"><span className="profile-stat-label">Accepted</span><span className="profile-stat-val" style={{ color: 'var(--success)' }}>{stats.accepted}</span></div>
          </div>
        </div>
        <div className="profile-form-card">
          <div className="section-title">Company Information</div>
          <div className="frow">
            <div className="fgroup"><label className="flabel">Company Name</label><input className="finput" value={form.name} onChange={e => handleChange('name', e.target.value)} /></div>
            <div className="fgroup"><label className="flabel">Industry</label>
              <input
                className="finput"
                list="industry-options"
                placeholder="Select or type industry…"
                autoComplete="off"
                value={industryInput}
                onChange={e => handleChange('industry', e.target.value)}
              />
              <datalist id="industry-options">
                {allIndustries.map(ind => (
                  <option key={ind} value={ind} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="fgroup"><label className="flabel">Company Description</label>
            <textarea className="ftextarea" style={{ minHeight: 90 }} value={form.description} onChange={e => handleChange('description', e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Company Logo</label>
            {company?.logo_url && !logoFile && (
              <img src={company.logo_url} alt="Current Logo"
                style={{ height: '60px', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border)', background: 'transparent' }}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => setLogoFile(e.target.files[0])}
            />
            {logoFile && <span style={{ fontSize: '12px', color: 'var(--text2)' }}><CheckCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{logoFile.name} — will upload on save</span>}
          </div>
          <div className="frow">
            <div className="fgroup"><label className="flabel">Contact Email</label><input className="finput" value={form.email} onChange={e => handleChange('email', e.target.value)} /></div>
            <div className="fgroup"><label className="flabel">Contact Phone</label><input className="finput" value={form.phone} onChange={e => handleChange('phone', e.target.value)} /></div>
          </div>
          <div className="fgroup"><label className="flabel">Office Location (inside park)</label><input className="finput" value={form.location} onChange={e => handleChange('location', e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Website</label><input className="finput" value={form.website} onChange={e => handleChange('website', e.target.value)} /></div>

          <div className="section-title" style={{ marginTop: '1.25rem' }}>Technology Tags</div>
          <div className="fgroup">
            <div className="tags-input-wrap">
              {tags.map((t, i) => (
                <span key={i} className="tag-pill">{t}<button onClick={() => removeTag(i)}>×</button></span>
              ))}
              <input className="tag-input-real" placeholder="Add tag…" onKeyDown={addTag} />
            </div>
            <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: 5 }}>Type a tag and press Enter to add</div>
          </div>

          <div style={{ display: 'flex', gap: '.65rem', marginTop: '.5rem' }}>
            <button className="btn-save" onClick={saveProfile}>Save changes</button>
            <button className="btn-outline" onClick={cancelProfile}>Cancel</button>
          </div>
        </div>
      </div>

      {/* Verification Section */}
      <div className="profile-form-card" style={{ marginTop: '1.5rem' }}>
        <div className="section-title">Business Verification</div>
        
        {/* Verification Status Badge */}
        <div style={{ marginBottom: '1.5rem' }}>
          {verificationStatus === 'unverified' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(107,114,128,0.15)',
              border: '1px solid rgba(107,114,128,0.3)',
              color: '#9ca3af',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Not Verified
            </span>
          )}
          {verificationStatus === 'pending' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              ⏳ Verification Pending
            </span>
          )}
          {verificationStatus === 'verified' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#10b981',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              ✅ Verified Business
            </span>
          )}
          {verificationStatus === 'rejected' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(244,63,94,0.15)',
              border: '1px solid rgba(244,63,94,0.3)',
              color: '#f43f5e',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              ❌ Verification Rejected
            </span>
          )}
        </div>

        {/* Verification Content Based on Status */}
        {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                Get Verified
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text2)', lineHeight: '1.5' }}>
                Upload your business documents to get a verified badge on your profile and job listings
              </p>
            </div>

            {verificationStatus === 'rejected' && verificationNotes && (
              <div style={{
                background: 'rgba(244,63,94,0.1)',
                border: '1px solid rgba(244,63,94,0.2)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '13px',
                color: '#f43f5e'
              }}>
                <strong>Rejection Reason:</strong> {verificationNotes}
              </div>
            )}

            <div className="frow">
              <div className="fgroup">
                <label className="flabel">Document Type</label>
                <select 
                  className="finput"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="">Select document type...</option>
                  <option value="dti">DTI Registration</option>
                  <option value="sec">SEC Registration</option>
                  <option value="bir">BIR Certificate</option>
                  <option value="mayor">Mayor's Permit</option>
                  <option value="other">Other Business Document</option>
                </select>
              </div>
              <div className="fgroup">
                <label className="flabel">Document File</label>
                <input 
                  type="file"
                  className="finput"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setVerifyFile(e.target.files[0])}
                />
                <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: 4 }}>
                  PDF, JPG, PNG (max 5MB)
                </div>
              </div>
            </div>

            <button 
              className="btn-acc"
              onClick={handleVerificationSubmit}
              disabled={!docType || !verifyFile || verifyLoading}
              style={{ marginTop: '1rem' }}
            >
              {verifyLoading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        )}

        {verificationStatus === 'pending' && (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#f59e0b', marginBottom: '8px' }}>
              Your documents are under review
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text2)' }}>
              We'll notify you once reviewed (1-3 business days)
            </div>
          </div>
        )}

        {verificationStatus === 'verified' && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>
              ✅ Your business is verified!
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text2)' }}>
              Your verified badge is now visible on your profile and job listings
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
