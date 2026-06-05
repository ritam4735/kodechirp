'use client';

import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import '../styles/landing.css';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

const syne = Syne({ subsets: ['latin'], variable: '--font-display' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code' });

export default function RootLayout({ children }) {
  const { initAuth } = useAuth();

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <title>KodeChirp — Learn Through Peers</title>
        <meta name="description" content="Solve coding problems and learn through peer explanations." />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
