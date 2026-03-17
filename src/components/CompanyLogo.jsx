export default function CompanyLogo({ company, size = 40 }) {
  if (company?.logo_url) {
    return (
      <img
        src={company.logo_url}
        alt={company.name}
        style={{
          width: size,
          height: size,
          borderRadius: '10px',
          objectFit: 'cover',
          background: 'transparent',
          border: '1px solid var(--border)'
        }}
      />
    )
  }
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '10px',
      background: company?.color || 'var(--surface2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.35,
      fontWeight: 800,
      color: '#fff',
      border: '1px solid var(--border)',
      flexShrink: 0
    }}>
      {company?.logo_initials || company?.name?.charAt(0) || '?'}
    </div>
  )
}
