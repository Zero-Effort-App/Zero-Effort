import { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

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

      client.on('user-unpublished', (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
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
      background: '#0f0f0f', 
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Remote video - full screen */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {remoteUsers.length > 0 ? (
          remoteUsers.map(u => (
            <div key={u.uid} 
              id={`remote-video-${u.uid}`}
              style={{ width: '100%', height: '100%' }}
            />
          ))
        ) : (
          // Waiting screen
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'white'
          }}>
            <div style={{
              width: '100px', height: '100px',
              borderRadius: '50%', background: '#1e40af',
              display: 'flex', alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '40px', marginBottom: '20px',
              boxShadow: '0 0 0 20px rgba(30,64,175,0.2), 0 0 0 40px rgba(30,64,175,0.1)'
            }}>
              👤
            </div>
            <p style={{ fontSize: '18px', opacity: 0.7 }}>
              Waiting for other participant...
            </p>
          </div>
        )}
      </div>

      {/* Local video - picture in picture */}
      <div style={{
        position: 'absolute',
        bottom: '100px', right: '16px',
        width: '120px', height: '160px',
        borderRadius: '12px', overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <div id="local-video" style={{ width: '100%', height: '100%' }} />
        <div style={{
          position: 'absolute', bottom: '4px', left: '4px',
          background: 'rgba(0,0,0,0.6)',
          color: 'white', fontSize: '10px',
          padding: '2px 6px', borderRadius: '4px'
        }}>
          You
        </div>
        {isVideoMuted && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px', background: 'rgba(0,0,0,0.6)',
            width: '40px', height: '40px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            📵
          </div>
        )}
      </div>

      {/* Top header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', color: 'white', zIndex: 10
      }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
            Interview Call
          </div>
          <div style={{ fontSize: '13px', opacity: 0.7 }}>
            {user?.full_name || user?.email}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            background: isConnected ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
            border: `1px solid ${isConnected ? '#22c55e' : '#f59e0b'}`,
            color: isConnected ? '#22c55e' : '#f59e0b',
            padding: '4px 10px', borderRadius: '20px', fontSize: '12px'
          }}>
            {isConnected ? '🟢 Connected' : '⏳ Connecting...'}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '4px 10px', borderRadius: '20px', fontSize: '12px'
          }}>
            ⏱ {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: '24px', 
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '16px', alignItems: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px)',
        padding: '12px 24px', borderRadius: '50px',
        zIndex: 10
      }}>
        <button onClick={toggleAudio} style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: isAudioMuted ? '#ef4444' : 'rgba(255,255,255,0.15)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: '20px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          {isAudioMuted ? '🔇' : '🎤'}
        </button>
        <button onClick={toggleVideo} style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: isVideoMuted ? '#ef4444' : 'rgba(255,255,255,0.15)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: '20px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          {isVideoMuted ? '📵' : '📹'}
        </button>
        <button onClick={leaveCall} style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#ef4444',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: '24px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(239,68,68,0.5)',
          transition: 'all 0.2s'
        }}>
          �
        </button>
      </div>
    </div>
  );
};

export default AgoraVideoCall;
