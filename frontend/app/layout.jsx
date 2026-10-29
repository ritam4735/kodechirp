import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import '../styles/landing.css';
import '../styles/admin.css';
import { Navbar } from '../components/layout/Navbar';
import { AppInitializer } from '../components/layout/AppInitializer';
import { CookieBanner } from '../components/ui/CookieBanner';
import { AnalyticsTracker } from '../components/analytics/AnalyticsTracker';

const syne = Syne({ subsets: ['latin'], variable: '--font-display' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kodechirp.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KodeChirp — Turn Problems into Progress',
    template: '%s | KodeChirp',
  },
  description: 'KodeChirp is a modern coding practice platform for mastering data structures and algorithms, solving problems across 5 programming languages, and learning together.',
  keywords: [
    'algorithms',
    'data structures',
    'coding challenges',
    'coding practice',
    'technical interview preparation',
    'problem solving',
    'dsa practice',
    'python',
    'cpp',
    'java',
    'javascript',
  ],
  authors: [{ name: 'KodeChirp Team' }],
  creator: 'KodeChirp',
  publisher: 'KodeChirp',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'KodeChirp',
    title: 'KodeChirp — Practice Coding Problems & Master DSA',
    description: 'Practice coding problems, test solutions across 5 programming languages with automated test cases, and learn with fellow developers.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KodeChirp — Practice Coding Problems & Master DSA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KodeChirp — Practice Coding Problems & Master DSA',
    description: 'Practice coding problems, test solutions across 5 programming languages with automated test cases, and learn with fellow developers.',
    images: ['/og-image.png'],
    creator: '@kodechirp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark" data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var pref = localStorage.getItem('kc_theme') || 'system';
                var isDark = pref === 'dark' || (pref === 'system' && window.matchMedia && !window.matchMedia('(prefers-color-scheme: light)').matches);
                var active = isDark ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', active);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${syne.variable} ${jetbrainsMono.variable} antialiased`}>
        <AppInitializer />
        <AnalyticsTracker />
        <div className="min-h-screen min-h-[100dvh] flex flex-col">
          <Navbar />
          <main className="flex-1 flex flex-col min-w-0 min-h-0">
            {children}
          </main>
        </div>
        <CookieBanner />
      </body>
    </html>
  );
}
