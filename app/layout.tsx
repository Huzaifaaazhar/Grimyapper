import type { Metadata, Viewport } from 'next';
import { Cinzel, EB_Garamond, UnifrakturMaguntia } from 'next/font/google';

import './globals.css';

/** Blackletter, for display only — it is beautiful and unreadable in quantity. */
const fraktur = UnifrakturMaguntia({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-fraktur',
  display: 'swap',
});

/** Roman inscriptional capitals: the Renaissance revival of Trajan's column. */
const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
});

/** Claude Garamond, 1540-ish. The text face this whole thing is set in. */
const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-garamond',
  display: 'swap',
});

/**
 * Where relative metadata URLs resolve from.
 *
 * The share image is referenced as `/j/{token}/opengraph-image`, and Next has to
 * turn that into an absolute URL. Without this it falls back to localhost in
 * development — a warning — and **throws in production**, which rejects the
 * metadata promise and takes the whole page down as a client-side exception on
 * hydration. The page body renders fine, which is what makes it so easy to miss
 * with a curl check.
 *
 * The production domain is preferred over VERCEL_URL so a share image on a
 * preview deploy still points at the stable host rather than an ephemeral one.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  'http://localhost:3000';

const description =
  'Grimyapper weighs ventures. Those built upon thinking engines are assayed against a rubric of seven virtues and a reckoning of twelve months. All others are issued a sealed decree of death.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
  themeColor: '#e9dfc6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraktur.variable} ${cinzel.variable} ${garamond.variable}`}
    >
      <body className="parchment fibres min-h-dvh antialiased">{children}</body>
    </html>
  );
}
