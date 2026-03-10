import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateCompany, getCompanyJobs, getCompanyApplications, getCompanies } from '../../lib/db';
import { useToast } from '../../contexts/ToastContext';

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
  const [customIndustries, setCustomIndustries] = useState(
    () => JSON.parse(localStorage.getItem('company_custom_industries') || '[]')
  );
  const [companies, setCompanies] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({ listings: 0, totalApps: 0, accepted: 0 });

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

  function handleChange(field, value) { 
    if (field === 'industry') {
      setIndustryInput(value);
    }
    setForm(prev => ({ ...prev, [field]: value })); 
  }

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
      
      const updated = await updateCompany(company.id, { ...form, industry: industryInput, tags });
      setCompany(prev => ({ ...prev, ...updated }));
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
  }

  if (!company) return null;
  const initials = company.logo_initials || company.name?.slice(0, 2).toUpperCase() || 'CO';

  return (
    <div className="pw">
      <div className="ph"><h2>Company Profile</h2><p>This is what applicants and the park admin see about your company.</p></div>
      <div className="profile-grid">
        <div>
          <div className="profile-card">
            <div className="profile-logo" style={{ background: company.color ? company.color + '20' : 'rgba(99,102,241,.12)', color: company.color || '#6366f1' }}>
              {initials}
            </div>
            <div className="profile-name">{form.name}</div>
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
    </div>
  );
}
