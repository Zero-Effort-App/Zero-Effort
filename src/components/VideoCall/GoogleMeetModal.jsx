import { useState, useEffect } from 'react';
import styles from '../../styles/VideoCallModal.module.css';

export default function GoogleMeetModal({ 
  interviewId, 
  channelName, 
  userRole,
  applicantEmail,
  hrEmail,
  onClose 
}) {
  const [meetingLink, setMeetingLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const MAX_CALL_DURATION = 30 * 60; // 30 minutes
  const WARNING_TIME = 25 * 60; // 25 minutes
  const apiUrl = import.meta.env.VITE_API_URL;

  // Create Google Meet on mount
  useEffect(() => {
    const createMeeting = async () => {
      try {
        console.log('Creating Google Meet...');
        const response = await fetch(`${apiUrl}/google-meet/create-meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelName: channelName,
            applicantEmail: applicantEmail,
            hrEmail: hrEmail
          })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to create meeting');
        }

        setMeetingLink(data.meetingLink);
        setLoading(false);
      } catch (err) {
        console.error('Error creating meeting:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    createMeeting();
  }, [channelName, applicantEmail, hrEmail, apiUrl]);

  // Timer for 30-minute limit
  useEffect(() => {
    if (!meetingLink) return;

    let interval = setInterval(() => {
      setCallTimer(prev => {
        const newTime = prev + 1;

        // Warning at 25 mins
        if (newTime === WARNING_TIME) {
          setShowWarning(true);
        }

        // Auto-end at 30 mins
        if (newTime >= MAX_CALL_DURATION) {
          handleEndCall('30min_limit');
          return newTime;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [meetingLink]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = MAX_CALL_DURATION - callTimer;

  const handleEndCall = async (reason = 'user_ended') => {
    try {
      // Track call usage
      const durationMinutes = Math.ceil(callTimer / 60);
      await fetch(`${apiUrl}/quota/track-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId: interviewId,
          durationMinutes: durationMinutes,
          reason: reason
        })
      });

      onClose();
    } catch (error) {
      console.error('Error ending call:', error);
      onClose();
    }
  };

  if (loading) {
    return (
      <div className={`${styles.videoCallModal} video-call-modal`}>
        <div className={styles.videoCallContainer}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            color: '#fff'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading Google Meet...</div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>Setting up your video interview</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.videoCallModal} video-call-modal`}>
        <div className={styles.videoCallContainer}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            color: '#fff'
          }}>
            <div style={{ 
              textAlign: 'center',
              padding: '30px',
              backgroundColor: '#333',
              borderRadius: '12px',
              maxWidth: '400px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px', color: '#f44336' }}>❌</div>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>Error</div>
              <div style={{ marginBottom: '20px', opacity: 0.8 }}>{error}</div>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 600
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.videoCallModal} video-call-modal`}>
      <div className={styles.videoCallContainer}>
        {/* Header */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: 'white',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          borderBottom: '1px solid #333'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '2px' }}>
              Interview: {channelName}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {userRole === 'applicant' ? 'Applicant' : 'HR'} • Google Meet
            </div>
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: showWarning ? '#ff9800' : '#4CAF50',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {showWarning ? '⚠️ ' : '⏱️ '}
            {formatTime(remainingTime)}
            {showWarning && ' - Ending soon'}
          </div>
          <button
            onClick={() => handleEndCall('user_ended')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            aria-label="End call"
            title="End video call"
          >
            ☎️ End Call
          </button>
        </div>

        {/* Google Meet Iframe */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#000'
        }}>
          <iframe
            src={meetingLink}
            allow="camera; microphone; clipboard-read; clipboard-write; fullscreen; display-capture"
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Google Meet Video Call"
          />
        </div>
      </div>
    </div>
  );
}
