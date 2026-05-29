'use client';

import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} text-[#e6edf3] antialiased`}
        style={{
          backgroundImage: 'url(/background.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#06090e',
        }}
      >
        {/* Dark overlay so text/UI remains readable over the vivid background */}
        <div className="min-h-screen flex flex-col" style={{ background: 'rgba(4,6,12,0.25)' }}>
          <Navbar />
          <main className="flex-1 flex flex-col min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
