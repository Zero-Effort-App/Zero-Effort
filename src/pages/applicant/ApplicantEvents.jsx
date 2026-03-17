import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getEvents } from '../../lib/db';
import { CalendarDays, MapPin, Clock, Building2 } from 'lucide-react';

export default function ApplicantEvents() {
  const { profile } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = events.filter(e =>
    !filter || e.type?.toLowerCase() === filter.toLowerCase()
  );

  const eventTypes = [...new Set(events.map(e => e.type).filter(Boolean))];

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  const typeColors = {
    'Career Fair': { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'rgba(99,102,241,0.2)' },
    'Promotion': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
    'Workshop': { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
    'Seminar': { bg: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: 'rgba(45,212,191,0.2)' },
  };

  function getTypeStyle(type) {
    return typeColors[type] || { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'rgba(99,102,241,0.2)' };
  }

  if (loading) return (
    <div className="pw">
      <div className="ph"><h2>Events</h2><p>Loading events...</p></div>
    </div>
  );

  return (
    <div className="pw">
      <div className="ph">
        <h2>Upcoming Events</h2>
        <p>Hiring events, job fairs, and career opportunities near you.</p>
      </div>

      {/* Filter */}
      <div className="fbar" style={{ marginBottom: '1.5rem' }}>
        <select
          className="fi"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All event types</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3>No events found</h3>
          <p>Check back later for upcoming hiring events and job fairs.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filtered.map(event => {
            const typeStyle = getTypeStyle(event.type);
            return (
              <div key={event.id} className="scard" style={{ padding: '1.25rem', cursor: 'default' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                    borderRadius: '6px', background: typeStyle.bg,
                    color: typeStyle.color, border: `1px solid ${typeStyle.border}` 
                  }}>
                    {event.type}
                  </span>
                  {event.is_upcoming && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 8px',
                      borderRadius: '6px', background: 'rgba(16,185,129,0.1)',
                      color: '#10b981', border: '1px solid rgba(16,185,129,0.2)'
                    }}>
                      Upcoming
                    </span>
                  )}
                </div>

                {/* Title & Organizer */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', lineHeight: 1.3 }}>
                  {event.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>
                  {event.organizer}
                </p>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text2)' }}>
                    <CalendarDays size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  {event.time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text2)' }}>
                      <Clock size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span>{event.time}</span>
                    </div>
                  )}
                  {event.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text2)' }}>
                      <MapPin size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>

                {/* Details chips */}
                {event.details && event.details.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {event.details.map((detail, i) => (
                      <span key={i} style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '5px',
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        color: 'var(--text2)'
                      }}>
                        {detail}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
