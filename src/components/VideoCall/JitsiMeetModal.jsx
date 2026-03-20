import { useState, useEffect } from 'react';

export default function JitsiMeetModal({ 
  interviewId, 
  channelName, 
  userRole,
  onClose 
}) {
  const [callTimer, setCallTimer] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const MAX_CALL_DURATION = 30 * 60; // 30 minutes
  const WARNING_TIME = 25 * 60; // 25 minutes
  const apiUrl = import.meta.env.VITE_API_URL;

  // Timer for 30-minute limit
  useEffect(() => {
    let interval = setInterval(() => {
      setCallTimer(prev => {
        const newTime = prev + 1;

        if (newTime === WARNING_TIME) {
          setShowWarning(true);
        }

        if (newTime >= MAX_CALL_DURATION) {
          handleEndCall('30min_limit');
          return newTime;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = MAX_CALL_DURATION - callTimer;

  const handleEndCall = async (reason = 'user_ended') => {
    try {
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '12px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>Interview: {channelName}</div>
        <div style={{
          padding: '5px 12px',
          backgroundColor: showWarning ? '#ff9800' : '#4CAF50',
          borderRadius: '4px'
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
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ☎️ End Call
        </button>
      </div>

      {/* Jitsi Meet Embed */}
      <div style={{
        flex: 1,
        overflow: 'hidden'
      }}>
        <iframe
          src={`https://meet.jit.si/${channelName}?userInfo.displayName=${userRole}`}
          allow="camera; microphone; display-capture"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        ></iframe>
      </div>
    </div>
  );
}
