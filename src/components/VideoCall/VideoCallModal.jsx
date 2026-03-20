import React, { useState, useEffect } from 'react';
import { X, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone } from 'lucide-react';
import useAgoraRTC from '../../hooks/useAgoraRTC';
import './VideoCallModal.css';

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
    <div className="video-call-modal">
      <div className="video-call-container">
        {/* Header */}
        <div className="video-call-header">
          <div className="call-info">
            <h3>Interview Call</h3>
            <span className="call-duration">{formatDuration(callDuration)}</span>
            <span className={`connection-status ${connectionState.toLowerCase()}`}>
              {connectionState}
            </span>
          </div>
          <button onClick={handleEndCall} className="btn-end-call">
            <Phone size={20} />
            End Call
          </button>
        </div>

        {/* 30-minute Call Timer Display */}
        {isJoined && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: showWarning ? '#ff9800' : '#4CAF50',
            color: 'white',
            borderRadius: '5px',
            margin: '10px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            transition: 'background-color 0.3s'
          }}>
            {showWarning ? '⚠️ ' : '⏱️ '}
            {formatTime(remainingTime)} remaining
            {showWarning && ' - Call will end in 5 minutes'}
          </div>
        )}

        {/* Video Grid */}
        <div className="video-grid">
          {/* Local Video */}
          <div className="video-item local-video">
            <div className="video-wrapper">
              {localVideoTrack ? (
                <div ref={localVideoTrack.getVideoElement()} className="video-element" />
              ) : (
                <div className="video-placeholder">
                  <div className="avatar">
                    {userRole === 'applicant' ? 'A' : 'R'}
                  </div>
                  <p>You</p>
                </div>
              )}
              {!isVideoEnabled && (
                <div className="video-disabled-overlay">
                  <VideoOff size={24} />
                </div>
              )}
            </div>
            <div className="video-label">
              You {!isAudioEnabled && <MicOff size={16} />}
            </div>
          </div>

          {/* Remote Videos */}
          {Object.values(remoteUsers).map(({ user, videoTrack, audioTrack }) => (
            <div key={user.uid} className="video-item remote-video">
              <div className="video-wrapper">
                {videoTrack ? (
                  <div ref={videoTrack.getVideoElement()} className="video-element" />
                ) : (
                  <div className="video-placeholder">
                    <div className="avatar">
                      {user.uid === 1 ? 'A' : 'R'}
                    </div>
                    <p>{user.uid === 1 ? 'Applicant' : 'Recruiter'}</p>
                  </div>
                )}
                {!audioTrack && (
                  <div className="audio-disabled-indicator">
                    <MicOff size={16} />
                  </div>
                )}
              </div>
              <div className="video-label">
                {user.uid === 1 ? 'Applicant' : 'Recruiter'}
              </div>
            </div>
          ))}

          {/* Screen Share */}
          {isScreenSharing && screenTrack && (
            <div className="video-item screen-share">
              <div className="video-wrapper">
                <div ref={screenTrack.getVideoElement()} className="video-element" />
              </div>
              <div className="video-label">Screen Share</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="video-controls">
          <button
            onClick={toggleAudio}
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
            disabled={!isJoined}
          >
            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
            disabled={!isJoined}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            disabled={!isJoined}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`control-btn ${showChat ? 'active' : ''}`}
          >
            💬
          </button>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="chat-panel">
            <div className="chat-header">
              <h4>Chat</h4>
              <button onClick={() => setShowChat(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  <span className="sender">{msg.sender}:</span>
                  <span className="message">{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="chat-input">
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
