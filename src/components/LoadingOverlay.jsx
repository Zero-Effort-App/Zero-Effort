export default function LoadingOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <div style={{ color: 'var(--text2)', fontSize: '14px' }}>Loading...</div>
    </div>
  );
}
