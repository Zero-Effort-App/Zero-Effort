import { BadgeCheck } from 'lucide-react';

const VerifiedBadge = ({ size = 'sm' }) => {
  const sizes = {
    sm: { icon: 14, padding: '2px 8px', fontSize: '11px' },
    md: { icon: 16, padding: '4px 10px', fontSize: '13px' },
    lg: { icon: 20, padding: '6px 14px', fontSize: '15px' }
  };
  
  const s = sizes[size];
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: 'rgba(99,102,241,0.15)',
      border: '1px solid rgba(99,102,241,0.4)',
      color: '#818cf8',
      padding: s.padding,
      borderRadius: '20px',
      fontSize: s.fontSize,
      fontWeight: '600',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <BadgeCheck size={s.icon} color="#6366f1" />
      Verified
    </span>
  );
};

export default VerifiedBadge;
