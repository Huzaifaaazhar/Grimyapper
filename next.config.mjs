/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Satori needs the real font file at render time, and the tracer will not
  // find it through a runtime readFileSync. Without this the OpenGraph image
  // falls back to a sans and stops looking like a decree.
  // The page is listed alongside the image route because Next imports the
  // opengraph-image module while resolving the page's metadata, so the fonts
  // have to be present in both bundles.
  outputFileTracingIncludes: {
    '/j/[token]': ['./assets/fonts/**'],
    '/j/[token]/opengraph-image': ['./assets/fonts/**'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
