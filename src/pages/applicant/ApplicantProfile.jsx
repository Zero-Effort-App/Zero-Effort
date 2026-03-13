import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ApplicantProfile() {
  const { profile } = useOutletContext();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    photo_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        photo_url: profile.photo_url || ''
      });
      setPhotoUrl(profile.photo_url || '');
    }
  }, [profile]);

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Photo must be less than 2MB', 'error')
      return
    }

    try {
      setUploadingPhoto(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}` 

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update photo_url in applicants table
      const { error: updateError } = await supabase
        .from('applicants')
        .update({ photo_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setPhotoUrl(publicUrl)
      showToast('Profile photo updated! 🎉', 'success')
    } catch (err) {
      console.error('Photo upload error:', err)
      showToast('Failed to upload photo. Please try again.', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!profile?.id) return;

    // Form validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      showToast('First name and last name are required', 'error');
      return;
    }

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
        {/* Profile photo section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
          {/* Avatar display */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '36px', fontWeight: 800,
            color: 'white', overflow: 'hidden', position: 'relative',
            border: '3px solid var(--border)'
          }}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{formData.first_name?.[0]?.toUpperCase()}{formData.last_name?.[0]?.toUpperCase()}</span>
            )}
          </div>

          {/* Upload button */}
          <label style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
            cursor: 'pointer', fontSize: '13px', color: 'var(--text2)',
            background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            📷 {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
          </label>
          <p style={{ fontSize: '11px', color: 'var(--text2)', margin: 0 }}>
            Optional • JPG, PNG, max 2MB
          </p>
        </div>

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


        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
