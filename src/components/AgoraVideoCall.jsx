import { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Clock, Wifi } from 'lucide-react';

const AgoraVideoCall = ({ channelName, userRole, user, onClose }) => {
  // Sanitize channel name at the TOP of component - FIRST LINE
  const sanitizedChannel = (channelName || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 64);

  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const clientRef = useRef(null);
  const remoteTracksRef = useRef({});
  const appId = import.meta.env.VITE_AGORA_APP_ID;

  // Timer for call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    initAgora();
    return () => {
      // Stop Agora tracks
      localTracks.forEach(track => {
        track.stop();
        track.close();
      });
      
      // Force stop all video elements
      document.querySelectorAll('video').forEach(video => {
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(t => t.stop());
          video.srcObject = null;
        }
      });

      if (clientRef.current) {
        clientRef.current.leave();
        clientRef.current = null;
      }
    };
  }, []);

  const initAgora = async () => {
    try {
      console.log('Original channel:', channelName);
      console.log('Sanitized channel:', sanitizedChannel);

      // Create Agora client
      const client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });
      clientRef.current = client;

      // Get token from backend
      const backendUrl = import.meta.env.VITE_BACKEND_URL 
        || 'https://zero-effort-server.onrender.com';

      const response = await fetch(`${backendUrl}/api/agora/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName: sanitizedChannel, uid: 0, role: userRole })
      });
      
      // Add error handling for response
      const text = await response.text();
      console.log('Token response:', text);
      if (!text) throw new Error('Empty response from backend');
      const { token, appId: fetchedAppId } = JSON.parse(text);

      // Handle remote users
      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        
        if (mediaType === 'video') {
          remoteTracksRef.current[remoteUser.uid] = remoteUser.videoTrack;
          setRemoteUsers(prev => {
            const exists = prev.find(u => u.uid === remoteUser.uid);
            if (!exists) return [...prev, remoteUser];
            return prev;
          });
          
          setTimeout(() => {
            const element = document.getElementById(`remote-video-${remoteUser.uid}`);
            if (element) {
              remoteUser.videoTrack?.play(`remote-video-${remoteUser.uid}`);
            } else {
              setTimeout(() => {
                remoteUser.videoTrack?.play(`remote-video-${remoteUser.uid}`);
              }, 500);
            }
          }, 100);
        }
        
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'video') {
          delete remoteTracksRef.current[remoteUser.uid];
          setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        }
      });

      client.on('user-left', (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      });

      // Join channel
      const uid = await client.join(
        fetchedAppId || appId, 
        sanitizedChannel, 
        token, 
        null
      );

      // Create local tracks with mobile-friendly constraints
      let audioTrack, videoTrack;
      try {
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          {
            encoderConfig: 'music_standard'
          },
          {
            encoderConfig: {
              width: { min: 320, ideal: 640, max: 1280 },
              height: { min: 240, ideal: 480, max: 720 },
              frameRate: { min: 15, ideal: 24, max: 30 }
            },
            facingMode: 'user' // Use front camera on mobile
          }
        );
      } catch (camErr) {
        console.warn('Camera with constraints failed, trying basic:', camErr);
        // Fallback: try without constraints
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      }

      setLocalTracks([audioTrack, videoTrack]);
      await client.publish([audioTrack, videoTrack]);

      // Play local video with delay for mobile
      setTimeout(() => {
        const localEl = document.getElementById('local-video');
        if (localEl) {
          videoTrack.play('local-video');
          console.log('✅ Local video playing');
        } else {
          console.warn('❌ local-video element not found');
        }
      }, 300);

      setIsConnected(true);
      console.log('✅ Agora connected, uid:', uid);

    } catch (err) {
      console.error('❌ Agora error:', err);
      setError(err.message);
    }
  };

  const leaveCall = async () => {
    try {
      // Stop Agora tracks
      for (const track of localTracks) {
        track.stop();
        track.close();
      }
      setLocalTracks([]);

      // Force stop ALL media streams on mobile
      // This is the key fix for mobile camera staying on
      if (navigator.mediaDevices) {
        const streams = await navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .catch(() => null);
        if (streams) {
          streams.getTracks().forEach(track => {
            track.stop();
          });
        }
      }

      // Also stop any video elements on the page
      document.querySelectorAll('video').forEach(video => {
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });

      // Leave Agora channel
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }

    } catch (err) {
      console.error('Leave error:', err);
    } finally {
      onClose();
    }
  };

  const toggleAudio = async () => {
    const audioTrack = localTracks[0];
    if (audioTrack) {
      await audioTrack.setMuted(!isAudioMuted);
      setIsAudioMuted(prev => !prev);
    }
  };

  const toggleVideo = async () => {
    const videoTrack = localTracks[1];
    if (videoTrack) {
      await videoTrack.setMuted(!isVideoMuted);
      setIsVideoMuted(prev => !prev);
    }
  };

  if (error) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0f0f0f',
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
    position: 'fixed', inset: 0,
    background: '#0e0f14',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
  }}>
    {/* Remote video containers - always in DOM */}
{remoteUsers.map(u => (
  <div
    key={u.uid}
    id={`remote-video-${u.uid}`}
    style={{ 
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      display: remoteUsers.length > 0 ? 'block' : 'none'
    }}
  />
))}

{/* Waiting screen - shows when no remote users */}
{remoteUsers.length === 0 && (
  <div style={{
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '20px'
  }}>
    {/* Animated avatar */}
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: '-16px',
        borderRadius: '50%',
        background: 'rgba(99,102,241,0.15)',
        animation: 'pulse 2s infinite'
      }} />
      <div style={{
        position: 'absolute', inset: '-8px',
        borderRadius: '50%',
        background: 'rgba(99,102,241,0.1)',
      }} />
      <div style={{
        width: '88px', height: '88px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative',
        boxShadow: '0 0 30px rgba(99,102,241,0.4)'
      }}>
        <span style={{ fontSize: '36px' }}>👤</span>
      </div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <p style={{
        color: '#f0f0f5', fontSize: '18px',
        fontWeight: '600', margin: '0 0 8px'
      }}>
        Waiting for participant...
      </p>
      <p style={{ color: '#9394a5', fontSize: '14px', margin: 0 }}>
        The other person will appear here shortly
      </p>
    </div>
  </div>
)}

    {/* Local video - picture in picture */}
    <div style={{
      position: 'absolute',
      bottom: '100px', right: '16px',
      width: '120px', height: '160px',
      borderRadius: '12px', overflow: 'hidden',
      border: '2px solid rgba(99,102,241,0.5)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
      zIndex: 10,
      background: '#1a1b27'
    }}>
      <div id="local-video" style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', bottom: '6px', left: '6px',
        background: 'rgba(14,15,20,0.8)',
        backdropFilter: 'blur(8px)',
        color: '#9394a5', fontSize: '10px',
        fontWeight: '600',
        padding: '2px 8px', borderRadius: '6px',
        border: '1px solid rgba(42,43,61,0.8)'
      }}>
        You
      </div>
    </div>

    {/* Top header */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      padding: '16px 20px',
      background: 'linear-gradient(to bottom, rgba(14,15,20,0.95), transparent)',
      backdropFilter: 'blur(16px)',
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', zIndex: 10,
      borderBottom: '1px solid rgba(42,43,61,0.3)'
    }}>
      {/* Left - Call info */}
      <div>
        <div style={{
          color: '#f0f0f5', fontWeight: '700',
          fontSize: '15px', letterSpacing: '-0.3px'
        }}>
          Interview Call
        </div>
        <div style={{
          color: '#9394a5', fontSize: '12px',
          marginTop: '2px'
        }}>
          {user?.full_name || user?.email}
        </div>
      </div>

      {/* Right - Status pills */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Connection status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: isConnected
            ? 'rgba(16,185,129,0.15)'
            : 'rgba(245,158,11,0.15)',
          border: `1px solid ${isConnected ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
          padding: '5px 12px', borderRadius: '20px'
        }}>
          <Wifi size={12} color={isConnected ? '#10b981' : '#f59e0b'} />
          <span style={{
            color: isConnected ? '#10b981' : '#f59e0b',
            fontSize: '12px', fontWeight: '600'
          }}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {/* Timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(26,27,39,0.8)',
          border: '1px solid rgba(42,43,61,0.8)',
          padding: '5px 12px', borderRadius: '20px',
          backdropFilter: 'blur(8px)'
        }}>
          <Clock size={12} color='#9394a5' />
          <span style={{
            color: '#f0f0f5', fontSize: '12px',
            fontWeight: '600', fontFamily: "'JetBrains Mono', monospace"
          }}>
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>
    </div>

    {/* Bottom controls */}
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '12px', alignItems: 'center',
      background: 'rgba(26,27,39,0.85)',
      backdropFilter: 'blur(24px)',
      padding: '14px 24px', borderRadius: '50px',
      border: '1px solid rgba(42,43,61,0.8)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 10
    }}>
      {/* Mute button */}
      <button
        onClick={toggleAudio}
        title={isAudioMuted ? 'Unmute' : 'Mute'}
        style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: isAudioMuted
            ? 'rgba(244,63,94,0.2)'
            : 'rgba(42,43,61,0.8)',
          border: `1px solid ${isAudioMuted ? 'rgba(244,63,94,0.5)' : 'rgba(58,59,82,0.8)'}`,
          color: isAudioMuted ? '#f43f5e' : '#f0f0f5',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: isAudioMuted ? '0 0 16px rgba(244,63,94,0.3)' : 'none'
        }}
      >
        {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      {/* Video button */}
      <button
        onClick={toggleVideo}
        title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
        style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: isVideoMuted
            ? 'rgba(244,63,94,0.2)'
            : 'rgba(42,43,61,0.8)',
          border: `1px solid ${isVideoMuted ? 'rgba(244,63,94,0.5)' : 'rgba(58,59,82,0.8)'}`,
          color: isVideoMuted ? '#f43f5e' : '#f0f0f5',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: isVideoMuted ? '0 0 16px rgba(244,63,94,0.3)' : 'none'
        }}
      >
        {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
      </button>

      {/* End call button */}
      <button
        onClick={leaveCall}
        title="End call"
        style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 20px rgba(244,63,94,0.5)',
          transform: 'scale(1.05)'
        }}
      >
        <PhoneOff size={22} />
      </button>
    </div>

    {/* Pulse animation style */}
    <style>{`
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.7; }
      }
    `}</style>
  </div>
);
};

export default AgoraVideoCall;
