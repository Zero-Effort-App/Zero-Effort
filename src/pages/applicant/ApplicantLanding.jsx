import Landing from '../../components/Landing';

const tickerItems = [
  'NovaTech Solutions — 12 Open Roles',
  'Voyager Innovations — 8 Open Roles',
  'Accenture — 45 Open Roles',
  'PixelForge Games — 6 Open Roles',
  'ShieldNet Security — 4 Open Roles',
  'CartHub PH — 9 Open Roles',
  'IT Park Career Day — Mar 18, 2025',
];

const title = [
  { text: 'Welcome' },
  { text: 'to' },
  { text: 'Zero', accent: true },
  { text: 'Effort', accent: true },
  { text: 'Jobs' },
];

export default function ApplicantLanding() {
  return (
    <Landing
      portalType="applicant"
      badge=""
      title={title}
      description="Find your next opportunity. Browse companies, explore open jobs, and submit your application in minutes."
      buttonText="Get Started"
      tickerItems={tickerItems}
      showLogo={true}
    />
  );
}
