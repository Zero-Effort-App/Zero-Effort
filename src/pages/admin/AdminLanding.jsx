import Landing from '../../components/Landing';

const tickerItems = [
  'Portal 1 — Admin Dashboard',
  'Manage Companies & Tenants',
  'Oversee Job Postings & Events',
  'Admin Account Management',
  'Activity Log & Monitoring',
  'Zero Effort Admin Hub',
];

const title = [
  { text: 'Manage' },
  { text: 'the' },
  { text: 'entire', accent: true },
  { text: 'park', accent: true },
  { text: 'from here.' },
];

export default function AdminLanding() {
  return (
    <Landing
      portalType="admin"
      badge="Zero Effort · Admin Portal"
      title={title}
      description="The official admin dashboard for Zero Effort. Manage tenants, oversee job postings, coordinate events — all from one centralized hub."
      buttonText="Admin Sign In"
      tickerItems={tickerItems}
      showLogo={true}
    />
  );
}
