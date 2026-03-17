import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Camera } from 'lucide-react';

export default function ApplicantProfile() {
  const { profile } = useOutletContext();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
    photo_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const { data, error } = await supabase
        .from('applicants')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          gender: data.gender || '',
          photo_url: data.photo_url || ''
        });
        setPhotoUrl(data.photo_url || '')
      }
    }
    if (user) loadProfile()
  }, [user]);

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    // Enhanced file validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 2 * 1024 * 1024 // 2MB

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a valid image file (JPG, PNG, GIF, or WebP)', 'error')
      e.target.value = '' // Clear input
      return
    }

    // Check file size
    if (file.size > maxSize) {
      showToast('Photo must be less than 2MB', 'error')
      e.target.value = '' // Clear input
      return
    }

    // Check file dimensions (optional but helpful)
    const img = new Image()
    img.onload = function() {
      URL.revokeObjectURL(this.src) // Clean up
      if (this.width < 100 || this.height < 100) {
        showToast('Image is too small. Please upload at least 100x100 pixels.', 'error')
        e.target.value = '' // Clear input
        return
      }
      // Continue with upload if dimensions are OK
      performUpload(file)
    }
    
    img.onerror = function() {
      URL.revokeObjectURL(this.src) // Clean up
      showToast('Invalid image file. Please upload a valid image.', 'error')
      e.target.value = '' // Clear input
    }
    
    img.src = URL.createObjectURL(file)
  }

  async function performUpload(file) {
    try {
      setUploadingPhoto(true)
      showToast('Uploading photo...', 'info')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-profile-${Date.now()}.${fileExt}`

      // Upload with better error handling
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '3600', // 1 hour cache
          contentType: file.type
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with retry logic
      let retries = 3
      let updateError = null
      
      while (retries > 0) {
        const { data: updateData, error: err } = await supabase
          .from('applicants')
          .update({ 
            photo_url: publicUrl
          })
          .eq('id', user.id)
          .select()

        if (!err) {
          updateError = null
          break
        }
        
        updateError = err
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        }
      }

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      // Update local state
      setPhotoUrl(publicUrl)
      setFormData(prev => ({ ...prev, photo_url: publicUrl }))
      
      showToast('Profile photo updated successfully!', 'success')
      
      // Clear input for potential re-upload
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
      
    } catch (err) {
      console.error('Photo upload error:', err)
      
      // Provide specific error messages
      let errorMessage = 'Failed to upload photo. Please try again.'
      
      if (err.message.includes('Storage')) {
        errorMessage = 'Storage error. Please check your internet connection and try again.'
      } else if (err.message.includes('duplicate')) {
        errorMessage = 'File already exists. Please rename your photo and try again.'
      } else if (err.message.includes('size')) {
        errorMessage = 'File is too large. Please compress your photo and try again.'
      }
      
      showToast(errorMessage, 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user?.id) return;

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
          gender: formData.gender,
          photo_url: formData.photo_url
        })
        .eq('id', user.id);

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
          <button 
            className="change-photo-btn"
            onClick={() => document.getElementById('fileInput').click()}
            disabled={uploadingPhoto}
            style={{
              cursor: 'pointer', fontSize: '13px', color: 'var(--text2)',
              background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
            <Camera size={14} />
            {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
          </button>
          <input
            type="file"
            accept="image/*"
            id="fileInput"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
          />
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={e => handleChange('gender', e.target.value)}
            className="finput"
            style={{ width: '100%' }}
          >
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>


        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
