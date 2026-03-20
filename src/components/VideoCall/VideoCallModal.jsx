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

  // Handle end call
  const handleEndCall = async () => {
    try {
      // Log call end to backend
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

      leaveChannel();
      onClose();
    } catch (err) {
      console.error('Error ending call:', err);
      leaveChannel();
      onClose();
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
