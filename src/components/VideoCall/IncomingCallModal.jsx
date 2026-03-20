import { useState, useEffect } from 'react';

export default function IncomingCallModal({ 
  callerName, 
  companyName,
  onAccept, 
  onDecline 
}) {
  const [ringing, setRinging] = useState(true);

  // Play ringing sound
  useEffect(() => {
    if (ringing) {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800; // Hz
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Loop every 1.5 seconds
      const interval = setInterval(() => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.5);
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [ringing]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      {/* Animated ringing circle */}
      <div style={{
        position: 'relative',
        width: '150px',
        height: '150px',
        marginBottom: '40px'
      }}>
        {/* Outer pulsing circles */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '3px solid #2196F3',
          animation: 'pulse 2s infinite',
          top: 0,
          left: 0
        }}></div>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '3px solid #2196F3',
          animation: 'pulse 2s infinite 0.5s',
          top: 0,
          left: 0,
          opacity: 0.5
        }}></div>

        {/* Center phone icon */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '60px'
        }}>
          📞
        </div>
      </div>

      {/* Caller info */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        color: 'white'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px'
        }}>
          {callerName}
        </div>
        <div style={{
          fontSize: '16px',
          color: '#ccc'
        }}>
          {companyName}
        </div>
        <div style={{
          fontSize: '14px',
          color: '#999',
          marginTop: '10px'
        }}>
          Incoming interview call...
        </div>
      </div>

      {/* Accept/Decline buttons */}
      <div style={{
        display: 'flex',
        gap: '30px'
      }}>
        <button
          onClick={onDecline}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: '#f44336',
            border: 'none',
            cursor: 'pointer',
            fontSize: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ❌
        </button>

        <button
          onClick={onAccept}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            border: 'none',
            cursor: 'pointer',
            fontSize: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ✅
        </button>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
