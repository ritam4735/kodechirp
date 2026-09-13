'use client';

import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import '../styles/landing.css';
import '../styles/admin.css';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { initTheme } from '../lib/theme';

const syne = Syne({ subsets: ['latin'], variable: '--font-display' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code' });

export default function RootLayout({ children }) {
  const { initAuth } = useAuth();

  useEffect(() => {
    initAuth();
    initTheme();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <title>KodeChirp — Turn Problems into Progress</title>
        <meta name="description" content="KodeChirp is a developer platform designed for deep algorithmic understanding and peer learning." />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
