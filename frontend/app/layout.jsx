import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import '../styles/landing.css';
import '../styles/admin.css';
import { Navbar } from '../components/layout/Navbar';
import { AppInitializer } from '../components/layout/AppInitializer';

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
  description: 'KodeChirp is an engineering-first developer platform designed for deep algorithmic understanding, peer-driven reasoning, and building technical instinct.',
  keywords: [
    'algorithms',
    'data structures',
    'coding challenges',
    'technical interview preparation',
    'algorithm visualization',
    'peer learning',
    'software engineering practice',
  ],
  authors: [{ name: 'KodeChirp Team' }],
  creator: 'KodeChirp',
  publisher: 'KodeChirp',
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
    title: 'KodeChirp — Turn Problems into Progress',
    description: 'KodeChirp is an engineering-first developer platform designed for deep algorithmic understanding and peer learning.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KodeChirp — Turn Problems into Progress',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KodeChirp — Turn Problems into Progress',
    description: 'KodeChirp is an engineering-first developer platform designed for deep algorithmic understanding and peer learning.',
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
    <html lang="en" suppressHydrationWarning className="dark">
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
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 flex flex-col min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
