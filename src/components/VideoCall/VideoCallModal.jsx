import React, { useState, useEffect } from 'react';
import { X, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone } from 'lucide-react';
import useAgoraRTC from '../../hooks/useAgoraRTC';
import './VideoCallModal.css';
import styles from '../../styles/VideoCallModal.module.css';

const VideoCallModal = ({ interviewId, channelName, userRole, onClose }) => {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [tokenError, setTokenError] = useState(null);
  
  // 30-minute call limit states
  const [callTimer, setCallTimer] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const MAX_CALL_DURATION = 30 * 60; // 30 minutes in seconds
  const WARNING_TIME = 25 * 60; // 25 minutes in seconds

  const agoraConfig = {
    appId: import.meta.env.VITE_AGORA_APP_ID,
    userId: userRole === 'applicant' ? 'applicant' : 'recruiter',
  };

  const {
    localVideoTrack,
    localAudioTrack,
    remoteUsers,
    isJoined,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    screenTrack,
    error,
    connectionState,
    joinChannel,
    leaveChannel,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useAgoraRTC(channelName, token, agoraConfig.appId, agoraConfig.userId);

  // Fetch token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${apiUrl}/agora/generate-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-user'}`,
          },
          body: JSON.stringify({
            channelName,
            uid: agoraConfig.userId === 'applicant' ? 1 : 2,
          }),
        });

        // Check if response is ok
        if (!response.ok) {
          throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
        }

        // Check if response has content
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from token endpoint');
        }

        const data = JSON.parse(text);
        if (!data.token) {
          throw new Error('No token in response');
        }

        console.log('🟢 RESPONSE RECEIVED FROM BACKEND');
        console.log('Response status:', response.status);
        console.log('Token received from backend:', data);
        console.log('Token value:', data.token);
        console.log('Token length:', data.token ? data.token.length : 'N/A');
        console.log('Token type:', typeof data.token);

        setToken(data.token);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching token:', err);
        setTokenError(err.message);
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [channelName, agoraConfig.userId]);

  // Join channel when token is available
  useEffect(() => {
    if (token && !isJoined) {
      joinChannel();
      setCallStartTime(Date.now());
    }
  }, [token, isJoined, joinChannel]);

  // Update call duration
  useEffect(() => {
    let interval;
    if (isJoined && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isJoined, callStartTime]);

  // 30-minute call limit timer
  useEffect(() => {
    let interval;
    
    if (isJoined) {
      interval = setInterval(() => {
        setCallTimer(prev => {
          const newTime = prev + 1;
          
          // Warning at 25 mins
          if (newTime === WARNING_TIME) {
            setShowWarning(true);
            console.log('⚠️ 5 minutes remaining in call');
          }
          
          // Auto-end at 30 mins
          if (newTime >= MAX_CALL_DURATION) {
            console.log('🕐 Call ended due to 30-minute limit');
            handleEndCall('30min_limit');
            return newTime;
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isJoined]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate remaining time
  const remainingTime = MAX_CALL_DURATION - callTimer;

  // Handle end call
  const handleEndCall = async (reason = 'user_ended') => {
    try {
      // Track call usage
      if (callStartTime) {
        const durationMinutes = Math.ceil(callTimer / 60);
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        
        // Get company ID from user metadata (for now, use a default)
        const companyId = localStorage.getItem('companyId') || 'default-company';
        
        console.log('📊 Tracking call usage:', { 
          callSessionId: interviewId, 
          durationMinutes, 
          reason,
          companyId 
        });
        
        // Track call end with usage
        await fetch(`${apiUrl}/quota/track-end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-user'}`,
          },
          body: JSON.stringify({
            callSessionId: interviewId,
            durationMinutes: durationMinutes,
            reason: reason
          })
        });
      }

      // Log call end to backend (existing functionality)
      if (callStartTime) {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        await fetch(`${apiUrl}/agora/call-end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || 'demo-user'}`,
          },
          body: JSON.stringify({
            callSessionId: interviewId,
            duration: callDuration,
          }),
        });
      }

      // End call
      leaveChannel();
      onClose();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="video-call-modal">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Setting up video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-call-modal">
        <div className="error-screen">
          <p>Error: {error}</p>
          <button onClick={onClose} className="btn-close">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.videoCallModal} video-call-modal`}>
      <div className={styles.videoCallContainer}>
        {/* Header */}
        <div className="video-call-header" style={{
          background: '#1a1a1a',
          color: 'white',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <div className="call-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Interview Call</h3>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                {userRole === 'applicant' ? 'Applicant' : 'HR'} • {selectedConvo?.company_name || 'Company'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connectionState === 'CONNECTED' ? '#10b981' : 
                               connectionState === 'CONNECTING' ? '#f59e0b' : '#ef4444'
              }}></div>
              <span style={{ fontSize: '12px' }}>{connectionState}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: showWarning ? '#f59e0b' : '#10b981'
            }}>
              {formatTime(remainingTime)}
            </div>
            <button 
              onClick={handleEndCall} 
              className="btn-end-call"
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#ef4444';
                e.target.style.transform = 'translateY(0)';
              }}
              aria-label="End call"
              title="End video call"
            >
              <Phone size={16} />
              End Call
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`${styles.videoGrid} video-grid`}>
          {/* Local Video */}
          <div className={`${styles.videoItem} ${styles.localVideo} video-item local-video`}>
            <div className={styles.videoWrapper}>
              {localVideoTrack ? (
                <div ref={localVideoTrack.getVideoElement()} className={styles.videoElement} />
              ) : (
                <div className={styles.videoPlaceholder}>
                  <div className={styles.avatar}>
                    {userRole === 'applicant' ? 'A' : 'R'}
                  </div>
                  <p>You</p>
                </div>
              )}
              {!isVideoEnabled && (
                <div className={styles.videoDisabledOverlay}>
                  <VideoOff size={24} />
                </div>
              )}
            </div>
            <div className={styles.videoLabel}>
              You {!isAudioEnabled && <MicOff size={16} />}
            </div>
          </div>

          {/* Remote Videos */}
          {Object.values(remoteUsers).map(({ user, videoTrack, audioTrack }) => (
            <div key={user.uid} className={`${styles.videoItem} ${styles.remoteVideo} video-item remote-video`}>
              <div className={styles.videoWrapper}>
                {videoTrack ? (
                  <div ref={videoTrack.getVideoElement()} className={styles.videoElement} />
                ) : (
                  <div className={styles.videoPlaceholder}>
                    <div className={styles.avatar}>
                      {user.uid === 1 ? 'A' : 'R'}
                    </div>
                    <p>{user.uid === 1 ? 'Applicant' : 'HR'}</p>
                  </div>
                )}
                {!audioTrack && (
                  <div className={styles.videoDisabledOverlay}>
                    <MicOff size={24} />
                  </div>
                )}
              </div>
              <div className={styles.videoLabel}>
                {user.uid === 1 ? 'Applicant' : 'HR'} {!audioTrack && <MicOff size={16} />}
              </div>
            </div>
          ))}

          {/* Screen Share */}
          {isScreenSharing && screenTrack && (
            <div className={`${styles.videoItem} ${styles.screenShare} video-item screen-share`}>
              <div className={styles.videoWrapper}>
                <div ref={screenTrack.getVideoElement()} className={styles.videoElement} />
              </div>
              <div className={styles.videoLabel}>Screen Share</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={`${styles.videoControls} video-controls`} style={{
          background: '#1a1a1a',
          padding: '20px',
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          borderTop: '1px solid #333'
        }}>
          <button
            onClick={toggleAudio}
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
            disabled={!isJoined}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: 'none',
              background: !isAudioEnabled ? '#ef4444' : '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            onMouseOver={(e) => {
              if (isJoined) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }}
            aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
            disabled={!isJoined}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: 'none',
              background: !isVideoEnabled ? '#ef4444' : '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            onMouseOver={(e) => {
              if (isJoined) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }}
            aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            disabled={!isJoined}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: 'none',
              background: isScreenSharing ? '#10b981' : '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            onMouseOver={(e) => {
              if (isJoined) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }}
            aria-label={isScreenSharing ? 'Stop screen share' : 'Start screen share'}
            title={isScreenSharing ? 'Stop screen share' : 'Start screen share'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`control-btn ${showChat ? 'active' : ''}`}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: 'none',
              background: showChat ? '#10b981' : '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }}
            aria-label={showChat ? 'Hide chat' : 'Show chat'}
            title={showChat ? 'Hide chat' : 'Show chat'}
          >
            💬
          </button>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <h4>Chat</h4>
              <button onClick={() => setShowChat(false)}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.chatMessages}>
              {chatMessages.map((msg, index) => (
                <div key={index} className={styles.chatMessage}>
                  <div>{msg.text}</div>
                  <div className={styles.chatMessageTime}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.chatInput}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const handleSendMessage = () => {
  // Implement chat message sending
  console.log('Send message');
};

export default VideoCallModal;
