import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

export default function ApplicantProfile() {
  const { profile } = useOutletContext();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    photo_url: ''
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        photo_url: profile.photo_url || ''
      });
    }
  }, [profile]);

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('applicants')
        .update({ 
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          photo_url: formData.photo_url
        })
        .eq('id', profile.id);

      if (error) throw error;

      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="pw">
      <div className="ph">
        <h2>My Profile</h2>
        <p>Update your personal information and contact details.</p>
      </div>

      <div className="profile-form-card">
        <div className="section-title">Personal Information</div>
        
        <div className="frow">
          <div className="fgroup">
            <label className="flabel">First Name</label>
            <input 
              className="finput" 
              value={formData.first_name}
              onChange={e => handleChange('first_name', e.target.value)}
            />
          </div>
          <div className="fgroup">
            <label className="flabel">Last Name</label>
            <input 
              className="finput" 
              value={formData.last_name}
              onChange={e => handleChange('last_name', e.target.value)}
            />
          </div>
        </div>

        <div className="fgroup">
          <label className="flabel">Phone Number</label>
          <input 
            className="finput" 
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            value={formData.phone}
            onChange={e => handleChange('phone', e.target.value)}
          />
        </div>

        <div className="fgroup">
          <label className="flabel">Profile Photo URL (optional)</label>
          <input 
            className="finput" 
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={formData.photo_url}
            onChange={e => handleChange('photo_url', e.target.value)}
          />
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
