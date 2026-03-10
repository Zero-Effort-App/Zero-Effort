import { useState, useEffect } from 'react';
import { getAdminUsers, addAdminUser, removeAdminUser, addActivityLog } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';

export default function AdminSettings() {
  const [admins, setAdmins] = useState([]);
  const [modal, setModal] = useState({ type: null, data: null });
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  async function loadAdmins() {
    try {
      const data = await getAdminUsers();
      setAdmins(data);
    } catch (err) {
      console.error('Error loading admins:', err);
    }
  }

  useEffect(() => { loadAdmins(); }, []);

  function closeModal() { setModal({ type: null, data: null }); }

  async function createAdminAccount(email, password, fullName) {
  try {
    // Log for debugging
    console.log('Creating admin account for:', email, 'with password length:', password.length);

    // Create admin account via local API (bypasses rate limits)
    const response = await fetch('http://localhost:3002/api/create-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password,
        metadata: { full_name: fullName }
      })
    });

    const result = await response.json();
    if (!response.ok) {
      if (result.error?.includes('User already registered') || result.error?.includes('duplicate')) {
        throw new Error('An account with this email already exists');
      } else {
        throw new Error(result.error);
      }
    }

    // Insert into admin_users table
    const { error: dbError } = await supabase
      .from('admin_users')
      .insert([{
        email: email,
        password_hash: 'hash_stored_in_auth',
        full_name: fullName
      }]);

    if (dbError) throw dbError;

    // Log activity
    await supabase.from('activity_log').insert([{
      type: 'admin',
      icon: '👤',
      message: `New admin account created for ${fullName}`,
      sub_text: 'Admin · System'
    }]);

    return { success: true };

  } catch (error) {
    console.error('createAdminAccount error:', error);
    throw error;
  }
}

async function handleCreateAdmin(formData) {
  try {
    await createAdminAccount(formData.email, formData.password, formData.fullName);
    closeModal();
    showToast('Admin account created successfully!');
    loadAdmins();
  } catch (err) {
    if (err.message.includes('User already registered')) {
      showToast('An account with this email already exists');
    } else {
      showToast(err.message || 'Error creating admin account');
    }
  }
}

  async function handleDeleteAdmin(admin) {
  // Check if trying to delete own account
  if (user?.email === admin.email) {
    showToast('You cannot delete your own account');
    return;
  }

  setDeleting(true);
  try {
    // Log for debugging
    console.log('Deleting admin account with ID:', admin.id, 'email:', admin.email);

    // Get user's auth ID first
    const userResponse = await fetch('http://localhost:3002/api/get-user-by-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email })
    });

    const userResult = await userResponse.json();
    if (!userResponse.ok) {
      console.warn('Could not find auth user, proceeding with database deletion only');
    } else {
      // Delete auth account via API
      const deleteResponse = await fetch('http://localhost:3002/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userResult.user.id })
      });

      if (!deleteResponse.ok) {
        console.warn('Failed to delete auth account, proceeding with database deletion only');
      }
    }

    // Delete from admin_users table
    const { error: deleteError } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', admin.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    // Log to activity_log
    await supabase.from('activity_log').insert([{
      type: 'warning',
      icon: '🗑️',
      message: `Admin account deleted: ${admin.email}`,
      sub_text: 'Admin · System'
    }]);

    // Show success toast and refresh
    showToast('Admin account deleted');
    closeModal();
    loadAdmins();

  } catch (err) {
    console.error('Failed to delete admin account:', err);
    showToast('Failed to delete admin account. Please try again.');
  } finally {
    setDeleting(false);
  }
}

  return (
    <div className="pw">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="ph" style={{ margin: 0 }}>
          <h2>Admin Settings</h2>
          <p>Manage administrator accounts for the portal.</p>
        </div>
        <button className="btn-acc" onClick={() => setModal({ type: 'add', data: null })}>+ Add Admin</button>
      </div>

      <table className="listings-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map(admin => (
            <tr key={admin.id}>
              <td style={{ fontWeight: 700 }}>{admin.full_name}</td>
              <td style={{ fontSize: '.78rem', color: 'var(--text2)' }}>{admin.email}</td>
              <td style={{ fontSize: '.72rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{new Date(admin.created_at).toLocaleDateString()}</td>
              <td>
                <div className="admin-actions">
                  <button onClick={() => setModal({ type: 'delete', data: admin })}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {admins.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>No admin accounts found.</td></tr>
          )}
        </tbody>
      </table>

      {/* Add Admin Modal */}
      <Modal isOpen={modal.type === 'add'} onClose={closeModal}>
        <CreateAdminForm onSubmit={handleCreateAdmin} onClose={closeModal} />
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={modal.type === 'delete'} onClose={closeModal}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">Delete Admin Account</div><div className="m-sub">This action cannot be undone</div></div>
              <button className="m-close" onClick={closeModal}>✕</button>
            </div>
            <div className="warn-box">
              <div className="warn-box-icon">⚠️</div>
              <div className="warn-box-text">Delete admin account <strong>{modal.data.email}</strong>?</div>
            </div>
            <div className="btn-row">
              <button 
                className="btn-confirm-danger" 
                onClick={() => handleDeleteAdmin(modal.data)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
              <button className="btn-cancel" onClick={closeModal} disabled={deleting}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreateAdminForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="m-head">
        <div><div className="m-title">Add Admin Account</div><div className="m-sub">Create a new administrator account</div></div>
        <button className="m-close" type="button" onClick={onClose}>✕</button>
      </div>
      <div className="fgroup"><label className="flabel">Full Name</label><input className="finput" required value={form.fullName} onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))} placeholder="Enter full name" /></div>
      <div className="fgroup"><label className="flabel">Email</label><input className="finput" type="email" required value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="admin@example.com" /></div>
      <div className="fgroup"><label className="flabel">Password</label><input className="finput" type="password" required value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Enter password" /></div>
      <div className="btn-row">
        <button className="btn-primary" type="submit" style={{ flex: 1 }}>Create Admin</button>
        <button className="btn-cancel" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
