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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Register SW if not already registered
    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    // Wait up to 10 seconds for SW to be active
    await new Promise((resolve, reject) => {
      if (registration.active) return resolve();
      const timeout = setTimeout(() => reject(new Error('SW timeout')), 10000);
      const sw = registration.installing || registration.waiting;
      if (sw) {
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') {
            clearTimeout(timeout);
            resolve();
          }
        });
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });

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
      body: JSON.stringify({ user_id: userId, user_type: userType, subscription: subscription.toJSON() })
    });

    return response.ok;
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
