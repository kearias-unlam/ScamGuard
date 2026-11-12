import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';

import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

// Downloaded at build time and served by the app; the browser never calls Google (Feature 5).
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' });

export const metadata: Metadata = {
  title: 'ScamGuard',
  description: 'Detección de indicios de estafa en mensajes de texto',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={manrope.variable}>
      <body>
        {/* No server-side session: the client reads it from GET /api/auth/session (mockable in E2E). */}
        <SessionProvider>
          <SiteHeader />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
