const VAPID_PUBLIC_KEY = 'BMh7CsfzO1Ild-3Piq2rlIWzB-TV8B5z7rwrxsA-Bue1arrlcseRe_LU3zTqcS_rWFVUcSEC5DGhITktDTiMB9I';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId, userType) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    const response = await fetch('https://zero-effort-server.onrender.com/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        user_type: userType,
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) throw new Error('Failed to save subscription');
    console.log('Push subscription saved successfully');
    return true;
  } catch (err) {
    console.error('Push subscription error:', err);
    return false;
  }
}

export async function sendPushNotification(userId, userType, title, body, url) {
  try {
    const response = await fetch('https://zero-effort-server.onrender.com/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, user_type: userType, title, body, url })
    });
    return response.ok;
  } catch (err) {
    console.error('Send push error:', err);
    return false;
  }
}
