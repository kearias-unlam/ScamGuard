import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScamGuard',
  description: 'Detección de indicios de estafa en mensajes de texto',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
