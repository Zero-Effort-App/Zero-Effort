import { useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const useAgoraRTC = (channelName, token, appId, userId) => {
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState(null);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');

  const clientRef = useRef(null);
  const screenClientRef = useRef(null);

  // Initialize Agora client
  useEffect(() => {
    if (appId) {
      clientRef.current = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8',
      });

      // Handle connection state changes
      clientRef.current.on('connection-state-change', (state, reason) => {
        console.log('Connection state changed:', state, reason);
        setConnectionState(state);
      });

      // Handle user joined
      clientRef.current.on('user-published', async (user, mediaType) => {
        await clientRef.current.subscribe(user, mediaType);
        
        if (mediaType === 'video') {
          setRemoteUsers(prev => ({
            ...prev,
            [user.uid]: { ...prev[user.uid], videoTrack: user.videoTrack, user }
          }));
        }
        
        if (mediaType === 'audio') {
          setRemoteUsers(prev => ({
            ...prev,
            [user.uid]: { ...prev[user.uid], audioTrack: user.audioTrack, user }
          }));
        }
      });

      // Handle user left
      clientRef.current.on('user-unpublished', (user) => {
        setRemoteUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[user.uid];
          return newUsers;
        });
      });

      // Handle user joined
      clientRef.current.on('user-joined', (user) => {
        console.log('User joined:', user.uid);
        setRemoteUsers(prev => ({
          ...prev,
          [user.uid]: { ...prev[user.uid], user }
        }));
      });

      // Handle user left
      clientRef.current.on('user-left', (user) => {
        console.log('User left:', user.uid);
        setRemoteUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[user.uid];
          return newUsers;
        });
      });
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
      }
    };
  }, [appId]);

  // Join channel
  const joinChannel = useCallback(async () => {
    try {
      setError(null);
      
      if (!clientRef.current || !token || !channelName) {
        throw new Error('Client not initialized or missing token/channel');
      }

      // Join channel
      await clientRef.current.join(appId, channelName, token, userId || 0);

      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks({
        audioConfig: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        videoConfig: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 },
        },
      });

      // Publish local tracks
      await clientRef.current.publish([audioTrack, videoTrack]);

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);
      setIsJoined(true);

      console.log('Successfully joined channel:', channelName);
    } catch (err) {
      console.error('Error joining channel:', err);
      setError(err.message);
    }
  }, [appId, channelName, token, userId]);

  // Leave channel
  const leaveChannel = useCallback(async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.leave();
      }

      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }

      if (localVideoTrack) {
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }

      if (screenTrack) {
        screenTrack.close();
        setScreenTrack(null);
        setIsScreenSharing(false);
      }

      setRemoteUsers({});
      setIsJoined(false);
      setConnectionState('DISCONNECTED');

      console.log('Successfully left channel');
    } catch (err) {
      console.error('Error leaving channel:', err);
      setError(err.message);
    }
  }, [localAudioTrack, localVideoTrack, screenTrack]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!localAudioTrack) return;

    try {
      if (isAudioEnabled) {
        await clientRef.current.unpublish(localAudioTrack);
        localAudioTrack.setEnabled(false);
      } else {
        await clientRef.current.publish(localAudioTrack);
        localAudioTrack.setEnabled(true);
      }
      setIsAudioEnabled(!isAudioEnabled);
    } catch (err) {
      console.error('Error toggling audio:', err);
      setError(err.message);
    }
  }, [localAudioTrack, isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!localVideoTrack) return;

    try {
      if (isVideoEnabled) {
        await clientRef.current.unpublish(localVideoTrack);
        localVideoTrack.setEnabled(false);
      } else {
        await clientRef.current.publish(localVideoTrack);
        localVideoTrack.setEnabled(true);
      }
      setIsVideoEnabled(!isVideoEnabled);
    } catch (err) {
      console.error('Error toggling video:', err);
      setError(err.message);
    }
  }, [localVideoTrack, isVideoEnabled]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      if (screenClientRef.current) {
        await stopScreenShare();
      }

      screenClientRef.current = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8',
      });

      await screenClientRef.current.join(appId, channelName, token, userId || 0);

      const screenVideoTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_1',
        optimizationMode: 'detail',
      });

      await screenClientRef.current.publish(screenVideoTrack);

      setScreenTrack(screenVideoTrack);
      setIsScreenSharing(true);

      // Handle screen sharing stopped
      screenVideoTrack.on('track-ended', () => {
        stopScreenShare();
      });

      console.log('Screen sharing started');
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError(err.message);
    }
  }, [appId, channelName, token, userId]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      if (screenTrack) {
        screenTrack.close();
        setScreenTrack(null);
      }

      if (screenClientRef.current) {
        await screenClientRef.current.leave();
        screenClientRef.current = null;
      }

      setIsScreenSharing(false);
      console.log('Screen sharing stopped');
    } catch (err) {
      console.error('Error stopping screen share:', err);
      setError(err.message);
    }
  }, [screenTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveChannel();
    };
  }, [leaveChannel]);

  return {
    // State
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    isJoined,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    screenTrack,
    error,
    connectionState,

    // Methods
    joinChannel,
    leaveChannel,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
};

export default useAgoraRTC;
