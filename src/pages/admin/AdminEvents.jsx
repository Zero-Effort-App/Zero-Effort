import { useState, useEffect } from 'react';
import { getEvents, addEvent as addEventDb, updateEvent as updateEventDb, removeEvent as removeEventDb, addActivityLog, formatDate } from '../../lib/db';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState({ type: null, data: null });
  const { showToast } = useToast();

  async function loadEvents() {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error loading events:', err);
    }
  }

  useEffect(() => { loadEvents(); }, []);

  function closeModal() { setModal({ type: null, data: null }); }

  async function handleAddEvent(formData) {
    try {
      await addEventDb(formData);
      await addActivityLog('event', '📅', `New event '${formData.title}' added to calendar`, 'Admin · System');
      closeModal();
      showToast('Event added!');
      loadEvents();
    } catch (err) {
      showToast('Error adding event.');
    }
  }

  async function handleEditEvent(eventId, formData) {
    try {
      await updateEventDb(eventId, formData);
      await addActivityLog('event', '✏️', `Event '${formData.title}' updated`, 'Admin · System');
      closeModal();
      showToast('Event updated!');
      loadEvents();
    } catch (err) {
      showToast('Error updating event.');
    }
  }

  async function handleRemoveEvent(event) {
    try {
      await removeEventDb(event.id);
      await addActivityLog('event', '🗑️', `Event '${event.title}' removed from calendar`, 'Admin · System');
      closeModal();
      showToast('Event removed.');
      loadEvents();
    } catch (err) {
      showToast('Error removing event.');
    }
  }

  return (
    <div className="pw">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="ph" style={{ margin: 0 }}>
          <h2>Events</h2>
          <p>Hiring events, career fairs, and park-wide activities.</p>
        </div>
        <button className="btn-acc" onClick={() => setModal({ type: 'add', data: null })}>+ Add Event</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '.875rem' }} className="stagger">
        {events.map(e => (
          <div key={e.id} className="ev-card" style={{ width: '100%', flexShrink: 'unset' }}>
            <div className="ev-top">
              <span className="ev-date">{formatDate(e.date)}</span>
              <span className="ev-type">{e.type}</span>
            </div>
            <div className="ev-title">{e.title}</div>
            <div className="ev-co">{e.organizer || e.co || '—'}</div>
            {e.details && e.details.length > 0 && (
              <div className="ev-chips">
                {e.details.map((d, i) => <span key={i} className="ev-chip">{d}</span>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: '5px', marginTop: '.75rem' }}>
              <button className="tbl-btn" onClick={() => setModal({ type: 'edit', data: e })}>Edit</button>
              <button className="tbl-btn danger" onClick={() => setModal({ type: 'remove', data: e })}>Remove</button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.82rem' }}>No events found.</div>
        )}
      </div>

      {/* Add Event Modal */}
      <Modal isOpen={modal.type === 'add'} onClose={closeModal}>
        <EventForm title="Add Event" onSubmit={handleAddEvent} onClose={closeModal} />
      </Modal>

      {/* Edit Event Modal */}
      <Modal isOpen={modal.type === 'edit'} onClose={closeModal}>
        {modal.data && (
          <EventForm
            title="Edit Event"
            initialData={modal.data}
            onSubmit={(data) => handleEditEvent(modal.data.id, data)}
            onClose={closeModal}
          />
        )}
      </Modal>

      {/* Remove Confirm */}
      <Modal isOpen={modal.type === 'remove'} onClose={closeModal}>
        {modal.data && (
          <div>
            <div className="m-head">
              <div><div className="m-title">Remove Event</div><div className="m-sub">This action cannot be undone</div></div>
              <button className="m-close" onClick={closeModal}>✕</button>
            </div>
            <div className="warn-box">
              <div className="warn-box-icon">⚠️</div>
              <div className="warn-box-text">Remove <strong>{modal.data.title}</strong> from the portal calendar?</div>
            </div>
            <div className="btn-row">
              <button className="btn-confirm-danger" onClick={() => handleRemoveEvent(modal.data)}>Remove event</button>
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function EventForm({ title, initialData, onSubmit, onClose }) {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    type: initialData?.type || 'Career Fair',
    date: initialData?.date?.slice(0, 10) || '',
    organizer: initialData?.organizer || initialData?.co || '',
    location: initialData?.location || 'Zero Effort',
    description: initialData?.details?.join(', ') || '',
  });

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="m-head">
        <div><div className="m-title">{title}</div><div className="m-sub">Zero Effort · Events</div></div>
        <button className="m-close" type="button" onClick={onClose}>✕</button>
      </div>
      <div className="msep">Event Details</div>
      <div className="fgroup"><label className="flabel">Event Title *</label><input className="finput" required value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="e.g. IT Park Career Day" /></div>
      <div className="frow">
        <div className="fgroup"><label className="flabel">Type</label>
          <select className="fselect" value={form.type} onChange={e => handleChange('type', e.target.value)}>
            <option>Career Fair</option><option>Workshop</option>
            <option>Seminar</option><option>Networking</option><option>Other</option>
          </select>
        </div>
        <div className="fgroup"><label className="flabel">Date *</label><input className="finput" type="date" required value={form.date} onChange={e => handleChange('date', e.target.value)} /></div>
      </div>
      <div className="frow">
        <div className="fgroup"><label className="flabel">Organizer</label><input className="finput" value={form.organizer} onChange={e => handleChange('organizer', e.target.value)} placeholder="Zero Effort" /></div>
        <div className="fgroup"><label className="flabel">Location</label><input className="finput" value={form.location} onChange={e => handleChange('location', e.target.value)} placeholder="Zero Effort" /></div>
      </div>
      <div className="fgroup"><label className="flabel">Details</label><textarea className="ftextarea" value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Event details (comma-separated)..." /></div>
      <button className="btn-primary" type="submit">{initialData ? 'Save changes →' : 'Add event →'}</button>
    </form>
  );
}
