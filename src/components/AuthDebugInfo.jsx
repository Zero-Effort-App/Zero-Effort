import { useState, useEffect } from 'react';

export default function AuthDebugInfo() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Load debug info from localStorage
    const info = localStorage.getItem('auth_debug_info');
    if (info) {
      try {
        setDebugInfo(JSON.parse(info));
      } catch (e) {
        console.error('Failed to parse debug info:', e);
      }
    }

    // Update debug info every 2 seconds
    const interval = setInterval(() => {
      const info = localStorage.getItem('auth_debug_info');
      if (info) {
        try {
          setDebugInfo(JSON.parse(info));
        } catch (e) {
          console.error('Failed to parse debug info:', e);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!debugInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      fontFamily: 'monospace'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong>🔍 Auth Debug</strong>
        <button
          onClick={() => setVisible(!visible)}
          style={{
            background: 'none',
            border: '1px solid white',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {visible && (
        <div>
          <div><strong>Platform:</strong></div>
          <div>iOS Safari: {debugInfo.platform?.iosSafari ? '✅' : '❌'}</div>
          <div>PWA: {debugInfo.platform?.pwa ? '✅' : '❌'}</div>
          
          <div style={{ marginTop: '8px' }}><strong>Storage:</strong></div>
          <div>Cookie: {debugInfo.cookie ? '✅' : '❌'}</div>
          <div>IndexedDB: {debugInfo.indexedDB ? '✅' : '❌'}</div>
          <div>LocalStorage: {debugInfo.localStorage ? '✅' : '❌'}</div>
          <div>SessionStorage: {debugInfo.sessionStorage ? '✅' : '❌'}</div>
          
          <div style={{ marginTop: '8px' }}><strong>Result:</strong></div>
          <div style={{ wordBreak: 'break-word' }}>{debugInfo.finalResult}</div>
        </div>
      )}
    </div>
  );
}
