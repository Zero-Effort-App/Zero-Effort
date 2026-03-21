import { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const AgoraVideoCall = ({ channelName, userRole, user, onClose }) => {
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const clientRef = useRef(null);
  const appId = import.meta.env.VITE_AGORA_APP_ID;

  const MAX_CALL_DURATION = 30 * 60; // 30 minutes
  const WARNING_TIME = 25 * 60; // 25 minutes

  // Timer for 30-minute limit
  useEffect(() => {
    let interval = setInterval(() => {
      setCallTimer(prev => {
        const newTime = prev + 1;

        if (newTime === WARNING_TIME) {
          setShowWarning(true);
        }

        if (newTime >= MAX_CALL_DURATION) {
          leaveCall('30min_limit');
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

  useEffect(() => {
    initAgora();
    return () => {
      leaveCall();
    };
  }, []);

  const initAgora = async () => {
    try {
      // Create Agora client
      const client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });
      clientRef.current = client;

      // Get token from backend
      const response = await fetch('/api/agora/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          uid: 0,
          role: userRole
        })
      });
      
      const { token, appId: fetchedAppId } = await response.json();

      // Handle remote users
      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            const exists = prev.find(u => u.uid === remoteUser.uid);
            if (!exists) return [...prev, remoteUser];
            return prev;
          });
          remoteUser.videoTrack?.play(`remote-video-${remoteUser.uid}`);
        }
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      });

      client.on('user-left', (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      });

      // Join channel
      const uid = await client.join(
        fetchedAppId || appId, 
        channelName, 
        token, 
        null
      );

      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalTracks([audioTrack, videoTrack]);

      // Publish local tracks
      await client.publish([audioTrack, videoTrack]);
      
      // Play local video
      videoTrack.play('local-video');
      
      setIsConnected(true);
      console.log('✅ Agora connected, uid:', uid);

    } catch (err) {
      console.error('❌ Agora error:', err);
      setError(err.message);
    }
  };

  const leaveCall = async (reason = 'user_ended') => {
    try {
      // Track call duration
      const durationMinutes = Math.ceil(callTimer / 60);
      const apiUrl = import.meta.env.VITE_API_URL;
      
      if (durationMinutes > 0) {
        await fetch(`${apiUrl}/quota/track-end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSessionId: channelName, // Use channelName as session ID for now
            durationMinutes: durationMinutes,
            reason: reason
          })
        });
      }

      localTracks.forEach(track => {
        track.stop();
        track.close();
      });
      if (clientRef.current) {
        await clientRef.current.leave();
      }
    } catch (err) {
      console.error('Leave error:', err);
    }
    onClose();
  };

  const toggleAudio = () => {
    const audioTrack = localTracks[0];
    if (audioTrack) {
      audioTrack.setMuted(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localTracks[1];
    if (videoTrack) {
      videoTrack.setMuted(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
    }
  };

  if (error) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'white', zIndex: 9999
      }}>
        <h2>Failed to connect</h2>
        <p>{error}</p>
        <button onClick={onClose} style={{
          padding: '10px 20px', background: '#ef4444',
          color: 'white', border: 'none', borderRadius: '8px',
          cursor: 'pointer', marginTop: '20px'
        }}>Close</button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#1a1a2e',
      display: 'flex', flexDirection: 'column', zIndex: 9999
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', background: '#16213e',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', color: 'white',
        flexWrap: 'wrap', gap: '10px'
      }}>
        <span>Interview Call | {user?.full_name || user?.email}</span>
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center'
        }}>
          <span style={{ 
            background: showWarning ? '#f59e0b' : '#22c55e',
            padding: '4px 12px', borderRadius: '20px', fontSize: '14px'
          }}>
            {showWarning ? '⚠️ ' : '🟢 '}
            {formatTime(remainingTime)}
            {showWarning && ' - Ending soon'}
          </span>
          <span style={{ 
            background: isConnected ? '#22c55e' : '#f59e0b',
            padding: '4px 12px', borderRadius: '20px', fontSize: '14px'
          }}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        <button onClick={leaveCall} style={{
          background: '#ef4444', color: 'white',
          border: 'none', borderRadius: '8px',
          padding: '8px 16px', cursor: 'pointer',
          fontWeight: 'bold'
        }}>End Call</button>
      </div>

      {/* Video Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: '8px', 
        padding: '8px',
        background: '#0f3460'
      }}>
        {/* Remote videos */}
        {remoteUsers.map(remoteUser => (
          <div key={remoteUser.uid} style={{
            flex: 1, background: '#000', borderRadius: '12px',
            overflow: 'hidden', position: 'relative',
            minHeight: '200px'
          }}>
            <div 
              id={`remote-video-${remoteUser.uid}`} 
              style={{ width: '100%', height: '100%' }} 
            />
            <span style={{
              position: 'absolute', bottom: '8px', left: '8px',
              background: 'rgba(0,0,0,0.6)', color: 'white',
              padding: '2px 8px', borderRadius: '4px', fontSize: '12px'
            }}>
              Remote User
            </span>
          </div>
        ))}

        {/* Local video */}
        <div style={{
          width: remoteUsers.length > 0 ? '200px' : '100%',
          background: '#000', borderRadius: '12px',
          overflow: 'hidden', position: 'relative',
          flexShrink: 0,
          minHeight: '200px'
        }}>
          <div id="local-video" style={{ width: '100%', height: '100%' }} />
          <span style={{
            position: 'absolute', bottom: '8px', left: '8px',
            background: 'rgba(0,0,0,0.6)', color: 'white',
            padding: '2px 8px', borderRadius: '4px', fontSize: '12px'
          }}>
            You ({user?.full_name || userRole})
          </span>
          {isVideoMuted && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '48px', background: 'rgba(0,0,0,0.6)',
              width: '80px', height: '80px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              📵
            </div>
          )}
        </div>

        {/* No remote users placeholder */}
        {remoteUsers.length === 0 && (
          <div style={{
            flex: 1, background: '#000', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '18px'
          }}>
            Waiting for other participant to join...
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        padding: '16px', background: '#16213e',
        display: 'flex', justifyContent: 'center', gap: '16px'
      }}>
        <button 
          onClick={toggleAudio}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: isAudioMuted ? '#ef4444' : '#374151',
            color: 'white', border: 'none', cursor: 'pointer',
            fontSize: '20px', transition: 'all 0.2s'
          }}
        >
          {isAudioMuted ? '🔇' : '🎤'}
        </button>
        <button 
          onClick={toggleVideo}
          title={isVideoMuted ? 'Start Video' : 'Stop Video'}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: isVideoMuted ? '#ef4444' : '#374151',
            color: 'white', border: 'none', cursor: 'pointer',
            fontSize: '20px', transition: 'all 0.2s'
          }}
        >
          {isVideoMuted ? '📵' : '📹'}
        </button>
        <button 
          onClick={leaveCall}
          title="End Call"
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#ef4444', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: '20px',
            transition: 'all 0.2s'
          }}
        >
          📞
        </button>
      </div>
    </div>
  );
};

export default AgoraVideoCall;
