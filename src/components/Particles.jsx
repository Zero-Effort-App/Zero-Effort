import { useEffect, useRef } from 'react';

export default function Particles() {
  const containerRef = useRef(null);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const sz = Math.random() * 4 + 2;
      p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;bottom:-10px;
        animation-duration:${Math.random() * 18 + 10}s;animation-delay:${Math.random() * 15}s;
        background:${Math.random() > .5 ? '#6366f1' : '#2dd4bf'};`;
      c.appendChild(p);
    }
    return () => { c.innerHTML = ''; };
  }, []);

  return <div className="particles" ref={containerRef} />;
}
