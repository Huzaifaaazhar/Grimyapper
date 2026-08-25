import { headers } from 'next/headers';

import { Judge } from '@/components/Judge';

/**
 * Rendered per request, not prerendered. The nonce CSP in `middleware.ts` only
 * works if Next gets to stamp this request's nonce onto its own script tags — a
 * cached static shell would carry a stale nonce and every script would be
 * blocked. Reading the nonce header is what opts this route into per-request
 * rendering; that is the trade, made deliberately.
 */
export const dynamic = 'force-dynamic';

export default async function Page() {
  await headers();
  return <Judge />;
}
