import { notFound } from 'next/navigation';

import { MotionLab } from '@/components/dev/MotionLab';

/**
 * A bench for the motion layer: every beat in isolation, with a scrubber.
 *
 * Development only. In production this 404s rather than rendering, so the lab
 * and the debug controls it pulls in never reach a real visitor — checked at
 * request time rather than trusting tree-shaking to have removed it.
 */
export const dynamic = 'force-dynamic';

export default function DevMotionPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <MotionLab />;
}
