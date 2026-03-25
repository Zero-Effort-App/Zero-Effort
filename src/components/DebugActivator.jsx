import { useState, useEffect } from 'react';

export default function DebugActivator({ children }) {
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleLogoTap = () => {
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTime;
    
    // Reset tap count if more than 2 seconds between taps
    if (timeSinceLastTap > 2000) {
      setTapCount(1);
    } else {
      setTapCount(prev => prev + 1);
    }
    
    setLastTapTime(currentTime);
    
    // Check for 5 rapid taps
    if (timeSinceLastTap < 2000 && tapCount >= 4) {
      toggleDebugMode();
      setTapCount(0); // Reset tap count
    }
  };

  const toggleDebugMode = () => {
    const currentDebugMode = localStorage.getItem('debug_mode') === 'true';
    const newDebugMode = !currentDebugMode;
    localStorage.setItem('debug_mode', newDebugMode.toString());
    
    // Show message
    const message = document.createElement('div');
    message.textContent = newDebugMode ? 
      '🔍 Debug mode ON — restart app to see full logs' : 
      '🔍 Debug mode OFF';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 14px;
      z-index: 10000;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (document.body.contains(message)) {
        document.body.removeChild(message);
      }
    }, 3000);
    
    console.log(`Debug mode ${newDebugMode ? 'ENABLED' : 'DISABLED'}`);
  };

  return (
    <div onClick={handleLogoTap} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  );
}
