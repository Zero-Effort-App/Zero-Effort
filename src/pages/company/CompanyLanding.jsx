import Landing from '../../components/Landing';

const tickerItems = [
  'Portal 2 — Company Dashboard',
  'Post & Manage Job Listings',
  'Review Applicants & Track Hiring',
  'Accept · Decline · Contact Applicants',
  'Manage Company Profile',
  'HANAP Tenant Portal',
];

const title = [
  { text: 'Manage' },
  { text: 'your' },
  { text: 'hiring', accent: true },
  { text: 'pipeline', accent: true },
  { text: 'here.' },
];

export default function CompanyLanding() {
  return (
    <Landing
      portalType="company"
      badge="HANAP · Company Portal"
      title={title}
      description="The official company portal for HANAP. Post jobs, review applicants, and build your team — all in one dedicated space for park tenants."
      buttonText="Company Sign In"
      tickerItems={tickerItems}
      showLogo={true}
    />
  );
}
