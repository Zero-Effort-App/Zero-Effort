import { useState, useEffect } from 'react';

export default function OnScreenDebugPanel() {
  const [logs, setLogs] = useState([]);
  const [visible, setVisible] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Always render debug panel - no localStorage check needed

    // Load persisted logs from localStorage
    const persistedLogs = localStorage.getItem('debug_logs');
    if (persistedLogs) {
      try {
        const parsedLogs = JSON.parse(persistedLogs);
        window.debugLogs = [...parsedLogs];
        setLogs([...parsedLogs]);
      } catch (e) {
        console.log('Failed to load persisted logs:', e);
        window.debugLogs = [];
        setLogs([]);
      }
    }

    // Update logs function
    window.updateDebugPanel = () => {
      setLogs([...window.debugLogs]);
      // Persist logs to localStorage
      try {
        localStorage.setItem('debug_logs', JSON.stringify(window.debugLogs));
      } catch (e) {
        console.log('Failed to persist logs:', e);
      }
    };

    // Initial logs
    setLogs([...window.debugLogs]);
    
    // Auto-expand panel when debug mode is enabled
    setVisible(true);

    // Auto-scroll to bottom when new logs are added
    if (autoScroll && logs.length > 0) {
      const logContainer = document.getElementById('debug-log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return '#ff6b6b';
      case 'warn': return '#ffa726';
      case 'log': return '#4fc3f7';
      default: return '#ffffff';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const clearLogs = () => {
    window.debugLogs = [];
    setLogs([]);
    localStorage.removeItem('debug_logs');
  };

  const hidePanel = () => {
    setVisible(false);
    // Shrink to minimal size
    setTimeout(() => {
      setVisible(false);
    }, 100);
  };

  const showPanel = () => {
    setVisible(true);
  };

  // Always render debug panel - no conditions
  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: visible ? '200px' : '30px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 1000, // Lower z-index to not interfere with app buttons
        borderTop: visible ? '1px solid #333' : 'none',
        transition: 'height 0.3s ease',
        pointerEvents: 'auto' // Ensure panel is interactive
      }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderBottom: visible ? '1px solid #333' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#4fc3f7', fontWeight: 'bold' }}>
            🔍 DEBUG CONSOLE ({logs.length})
          </span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            style={{
              background: autoScroll ? '#4fc3f7' : '#666',
              border: 'none',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            {autoScroll ? 'AUTO' : 'MANUAL'}
          </button>
          <button
            onClick={clearLogs}
            style={{
              background: '#ff6b6b',
              border: 'none',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            CLEAR
          </button>
          <button
            onClick={hidePanel}
            style={{
              background: '#ffa726',
              border: 'none',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            HIDE
          </button>
        </div>
        <button
          onClick={() => setVisible(!visible)}
          style={{
            background: 'none',
            border: '1px solid #666',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {visible ? 'HIDE ▲' : 'SHOW ▼'}
        </button>
      </div>

      {/* Log Content */}
      {visible && (
        <div
          id="debug-log-container"
          style={{
            height: 'calc(100% - 30px)',
            overflowY: 'auto',
            padding: '5px 10px',
            fontSize: '10px',
            lineHeight: '1.3'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No logs yet...
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '2px',
                  color: getLogColor(log.type),
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
              >
                <span style={{ color: '#888', marginRight: '5px' }}>
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span style={{ color: getLogColor(log.type) }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
      
      {/* Floating button to show debug panel when hidden */}
      {!visible && (
        <button
          onClick={showPanel}
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '40px',
            height: '40px',
            backgroundColor: 'rgba(79, 195, 247, 0.9)',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
          }}
        >
          🔍
        </button>
      )}
    </>
  );
}
