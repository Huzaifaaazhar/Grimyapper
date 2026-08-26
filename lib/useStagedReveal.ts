'use client';

import { useEffect, useState } from 'react';

/**
 * Steps a counter from 0 to `count`, one step every `stepMs`.
 *
 * Used to unseal the decree in order rather than all at once. Judgement is now
 * instant, so this is pure theatre — which, for a court that issues sealed
 * decrees, is arguably the product.
 *
 * Anyone who has asked for reduced motion gets the whole thing immediately.
 */
export function useStagedReveal(count: number, stepMs = 420): number {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(count);
      return;
    }

    setShown(0);
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      setShown(step);
      if (step >= count) clearInterval(id);
    }, stepMs);

    return () => clearInterval(id);
  }, [count, stepMs]);

  return shown;
}
