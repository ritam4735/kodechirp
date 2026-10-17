import AdminClientLayout from './AdminClientLayout';

export const metadata = {
  title: {
    default: 'Admin Console',
    template: '%s | Admin · KodeChirp',
  },
  description: 'KodeChirp administrative control panel for challenge curation, submissions, user management, and platform analytics.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
