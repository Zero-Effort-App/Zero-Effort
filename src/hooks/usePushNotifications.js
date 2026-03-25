import { useState, useEffect, useCallback } from 'react';

const usePushNotifications = (userId) => {
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        navigator.permissions.query({ name: 'notifications' }).then((result) => {
          setPermission(result.state);
        });
      }
    };

    checkSupport();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    try {
      setIsLoading(true);
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsLoading(false);
      
      if (result === 'granted') {
        return true;
      } else {
        setError('Notification permission denied');
        return false;
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Register service worker
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const pushSubscription = await registration.push.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      });

      // Save subscription to backend
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      console.log('📲 Push API URL for subscription:', `${apiUrl}/notifications/subscribe`);
      console.log('📲 User ID for subscription:', userId);
      
      const response = await fetch(`${apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          subscription: pushSubscription,
          userId: userId,
        }),
      });

      console.log('📲 Subscription response status:', response.status);
      console.log('📲 Subscription response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📲 Subscription error response:', errorText);
        throw new Error('Failed to save subscription');
      }

      setSubscription(pushSubscription);
      setIsLoading(false);
      
      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, permission, userId, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);

      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
      }

      // Remove subscription from backend
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${apiUrl}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({ userId }),
      });

      setIsLoading(false);
      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [subscription, userId]);

  // Get notification preferences
  const getPreferences = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/notifications/settings/${userId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const preferences = await response.json();
      return preferences;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [userId]);

  // Update notification preferences
  const updatePreferences = useCallback(async (preferences) => {
    try {
      setIsLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/notifications/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [userId]);

  // Test push notification
  const testNotification = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const testUrl = `${apiUrl}/notifications/test`;
      console.log('📲 Test notification API URL:', testUrl);
      console.log('📲 User ID for test:', userId);
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
      });

      console.log('📲 Test notification response status:', response.status);
      console.log('📲 Test notification response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📲 Test notification error response:', errorText);
        throw new Error('Failed to send test notification');
      }

      const result = await response.json();
      console.log('📲 Test notification sent successfully:', result);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [userId]);

  // Load existing subscription on mount
  useEffect(() => {
    const loadSubscription = async () => {
      if (!isSupported || !userId) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
          setSubscription(existingSubscription);
        }
      } catch (err) {
        console.error('Error loading subscription:', err);
      }
    };

    loadSubscription();
  }, [isSupported, userId]);

  return {
    // State
    subscription,
    permission,
    isSupported,
    isLoading,
    error,
    isSubscribed: !!subscription,

    // Methods
    requestPermission,
    subscribe,
    unsubscribe,
    getPreferences,
    updatePreferences,
    testNotification,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default usePushNotifications;
