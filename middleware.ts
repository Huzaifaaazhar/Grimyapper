import { NextResponse, type NextRequest } from 'next/server';

/**
 * Per-request nonce CSP.
 *
 * The app renders no user-supplied HTML — React escapes everything and there is
 * not one `dangerouslySetInnerHTML` in the tree — so this is defence in depth
 * rather than a patch over a known sink. It costs the static prerender of `/`,
 * which is a fine trade for a page whose whole job is to POST somewhere.
 *
 * `strict-dynamic` lets the nonced Next bootstrap load its own chunks without
 * enumerating them. Styles keep `unsafe-inline` because the app uses inline
 * style attributes for the dial and the bar fills; style injection with no HTML
 * sink is a far smaller risk than the alternative of not shipping a CSP at all.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV !== 'production';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next reads the CSP off the request headers to nonce its own script tags.
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except Next's own static output and image optimiser.
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
