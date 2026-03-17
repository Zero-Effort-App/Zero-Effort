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
      alert('Push not supported on this device');
      return false;
    }

    const permission = await Notification.requestPermission();
    alert('Permission result: ' + permission);
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    alert('Service worker ready');
    
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    alert('Subscribed! Saving to server...');

    const response = await fetch('https://zero-effort-server.onrender.com/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, user_type: userType, subscription: subscription.toJSON() })
    });
    alert('Server response: ' + response.status);
    return response.ok;
  } catch (err) {
    alert('Push error: ' + err.message);
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
