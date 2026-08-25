import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-face',
  display: 'swap',
});

const description =
  'Grimyapper judges startup ideas. If it is an AI startup, it gets a real rubric score and a suspiciously precise 12-month projection. If it is not, it gets a death certificate.';

export const metadata: Metadata = {
  title: 'Grimyapper — Should This Exist?',
  description,
  openGraph: {
    title: 'Grimyapper — Should This Exist?',
    description,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Grimyapper', description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#09090a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} ${mono.variable}`}>
      <body className="grain min-h-dvh antialiased">{children}</body>
    </html>
  );
}
