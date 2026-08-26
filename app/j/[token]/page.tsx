import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Judge } from '@/components/Judge';
import { judge } from '@/lib/judge';
import { decodePetition } from '@/lib/permalink';
import { guardPermalink } from '@/lib/permalink-guard';

/**
 * A permalinked judgement.
 *
 * The token *is* the record. Decoding it and re-judging costs less than a
 * database lookup would have, and the result is identical every time because
 * every stage of the court is deterministic.
 */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Defence in depth, added after a relative `og:image` with no `metadataBase`
 * threw here in production. The body had rendered perfectly; the rejected
 * metadata promise alone was enough to blank the page on hydration.
 *
 * Metadata is decoration. It must never be able to take the page down, so
 * anything that throws in here degrades to a title and nothing more.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    return await buildMetadata(await params);
  } catch (error) {
    console.error('[permalink] metadata failed', error);
    return { title: 'Grimyapper — a judgement', robots: { index: false, follow: false } };
  }
}

async function buildMetadata({ token }: { token: string }): Promise<Metadata> {
  const petition = decodePetition(token);
  if (!petition) return { title: 'Grimyapper — no such roll', robots: { index: false, follow: false } };

  const result = judge(petition);
  const guard = guardPermalink(petition);
  const idea = guard.publishable ? truncate(petition.idea, 110) : 'a petition the court will not reprint';

  const title =
    result.outcome === 'rejected'
      ? 'Decree of Extinction — Grimyapper'
      : `Assayed ${result.success_likelihood}/100 — Grimyapper`;

  const description =
    result.outcome === 'rejected'
      ? `“${truncate(result.rejection.eulogy, 150)}” — on the petition: ${idea}`
      : `“${result.verdict}” — ${result.band} prospect on the petition: ${idea}`;

  const image = `/j/${token}/opengraph-image`;

  return {
    title,
    description,
    /*
     * Never indexed. A permalink carries its own petition, so allowing these
     * into a search index would let anyone launder arbitrary text into a result
     * that appears to come from this site.
     */
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'article', images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function JudgementPage({ params }: Props) {
  const { token } = await params;
  const petition = decodePetition(token);
  if (!petition) notFound();

  const guard = guardPermalink(petition);
  const shown: typeof petition = guard.publishable
    ? petition
    : { ...petition, idea: guard.reason, name: '', customer: '' };

  // The judgement is always of the real petition; only the reprinting is withheld.
  return <Judge initial={{ petition: shown, result: judge(petition) }} />;
}
