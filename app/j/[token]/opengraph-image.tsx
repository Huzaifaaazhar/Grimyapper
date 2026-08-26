import { readFileSync } from 'node:fs';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import { judge } from '@/lib/judge';
import { decodePetition } from '@/lib/permalink';
import { guardPermalink } from '@/lib/permalink-guard';
import { BAND_COLORS } from '@/lib/scoring';

/**
 * The decree, rendered as an image.
 *
 * The certificate was always the shareable artefact and sharing it needed a
 * manual crop. This renders it server-side at share dimensions so a judgement
 * can be posted straight from the link.
 *
 * Deliberately not a screenshot of the page: satori supports a small subset of
 * CSS, so this is a separate and simpler composition in the same palette. It
 * has to survive being seen at thumbnail size in a feed, which the full
 * parchment never would.
 *
 * Satori cannot use the `next/font` faces the site is set in — it needs a real
 * font file at render time — so Crimson Pro is committed under `assets/fonts`
 * and listed in `outputFileTracingIncludes`. Read once at module scope: the
 * file never changes, and re-reading it per request would be pure waste.
 */

const fontDir = path.join(process.cwd(), 'assets', 'fonts');
const CRIMSON_REGULAR = readFileSync(path.join(fontDir, 'CrimsonPro-Regular.ttf'));
const CRIMSON_BOLD = readFileSync(path.join(fontDir, 'CrimsonPro-Bold.ttf'));

const FONTS = [
  { name: 'Crimson', data: CRIMSON_REGULAR, weight: 400 as const, style: 'normal' as const },
  { name: 'Crimson', data: CRIMSON_BOLD, weight: 700 as const, style: 'normal' as const },
];
export const runtime = 'nodejs';
export const alt = 'A judgement of the court of Grimyapper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const VELLUM = '#e9dfc6';
const VELLUM_LIT = '#f4eedd';
const INK = '#2a1e12';
const INK_SOFT = '#5c4a34';
const INK_FAINT = '#6f5c3f';
const VERMILION = '#9c2b21';
const RULE = 'rgba(90,72,46,0.34)';

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/*
 * Rendering a PNG is the most expensive thing this application does, and this
 * is the one route with no rate limit — crawlers unfurling a link arrive from
 * many addresses at once, so limiting by IP would break the feature it exists
 * for. Caching is the right lever instead: the image is a pure function of the
 * token, so a repeat costs nothing and only a flood of *distinct* crafted
 * tokens reaches the renderer at all.
 */
const NO_WORK_TWICE = {
  'Cache-Control': 'public, immutable, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const petition = decodePetition(token);

  const frame = {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100%',
    padding: '54px 64px',
    background: VELLUM,
    // satori has no radial-gradient, so the aged edge is a linear approximation.
    backgroundImage: `linear-gradient(135deg, ${VELLUM_LIT} 0%, ${VELLUM} 45%, #ddd0b2 100%)`,
    color: INK,
    fontFamily: 'Crimson',
  };

  if (!petition) {
    return new ImageResponse(
      (
        <div style={{ ...frame, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 64, color: VERMILION }}>Grimyapper</div>
          <div style={{ fontSize: 28, color: INK_SOFT, marginTop: 16 }}>No such roll.</div>
        </div>
      ),
      { ...size, fonts: FONTS, headers: NO_WORK_TWICE },
    );
  }

  const result = judge(petition);
  const rejected = result.outcome === 'rejected';
  const accent = rejected ? VERMILION : BAND_COLORS[result.band].hex;
  const eulogy = rejected ? truncate(result.rejection.eulogy, 138) : '';

  /*
   * The share image is the part that travels furthest from this site while
   * still wearing its name, so it is the part that must not reprint a petition
   * the guard has refused.
   */
  const guard = guardPermalink(petition);
  const petitionLine = guard.publishable
    ? truncate(petition.idea, rejected ? 130 : 145)
    : 'A petition the court has declined to reprint.';

  return new ImageResponse(
    (
      <div style={frame}>
        {/* engraved border */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            border: `2px solid ${RULE}`,
            padding: '38px 46px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 17,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: INK_FAINT,
            }}
          >
            <span>Grimyapper · on a petition submitted by a visitor</span>
            <span>{rejected ? 'Decree of extinction' : 'Roll of assay'}</span>
          </div>

          <div style={{ display: 'flex', height: 1, background: RULE, marginTop: 20 }} />

          {rejected ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                marginTop: 30,
                justifyContent: 'space-between',
              }}
            >
              {/* Sized to the text rather than fixed: a long lament at 62px ran
                  off the card and over the line beneath it. */}
              <div
                style={{
                  display: 'flex',
                  fontSize: eulogy.length > 96 ? 40 : eulogy.length > 64 ? 48 : 58,
                  lineHeight: 1.14,
                  color: INK,
                }}
              >
                {eulogy}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 22,
                  color: INK_SOFT,
                  lineHeight: 1.4,
                  marginTop: 22,
                }}
              >
                {petitionLine}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 26,
                }}
              >
                <div style={{ display: 'flex', fontSize: 19, color: INK_FAINT, letterSpacing: 3 }}>
                  SUPPLANTED BY {truncate(result.rejection.ai_that_replaces_it, 58).toUpperCase()}
                </div>
                {/* the seal, as far as satori will allow */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 108,
                    height: 108,
                    borderRadius: 999,
                    background: '#8e1f1a',
                    border: '5px solid #5e120f',
                    color: '#f2ddd6',
                    fontSize: 46,
                  }}
                >
                  G
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, marginTop: 34 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  paddingRight: 44,
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', fontSize: 52, lineHeight: 1.12, color: INK }}>
                  {truncate(result.verdict, 78)}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 22,
                    color: INK_SOFT,
                    lineHeight: 1.4,
                    marginTop: 22,
                  }}
                >
                  {petitionLine}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 250,
                  borderLeft: `1px solid ${RULE}`,
                }}
              >
                <div style={{ display: 'flex', fontSize: 148, lineHeight: 1, color: accent }}>
                  {result.success_likelihood}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 17,
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    color: INK_FAINT,
                    marginTop: 10,
                  }}
                >
                  of one hundred
                </div>
                <div
                  style={{
                    display: 'flex',
                    marginTop: 18,
                    padding: '7px 18px',
                    border: `2px solid ${accent}`,
                    color: accent,
                    fontSize: 17,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {BAND_COLORS[result.band].label}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts: FONTS, headers: NO_WORK_TWICE },
  );
}
