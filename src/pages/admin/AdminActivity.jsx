import { useState, useEffect } from 'react';
import { getActivityLog, formatTime } from '../../lib/db';

export default function AdminActivity() {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getActivityLog(100);
        setActivity(data);
      } catch (err) {
        console.error('Error loading activity:', err);
      }
    }
    load();
  }, []);

  return (
    <div className="pw">
      <div className="ph">
        <h2>Activity Log</h2>
        <p>A record of all actions across the admin portal.</p>
      </div>

      <div className="act-list stagger">
        {activity.map(a => (
          <div key={a.id} className="act-row">
            <div className={`act-icon ${a.type}`}>{a.icon}</div>
            <div className="act-info">
              <div className="act-main">{a.message}</div>
              <div className="act-sub">{a.sub_text}</div>
            </div>
            <div className="act-time">{formatTime(a.created_at)}</div>
          </div>
        ))}
        {activity.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.82rem' }}>No activity logged yet.</div>
        )}
      </div>
    </div>
  );
}
