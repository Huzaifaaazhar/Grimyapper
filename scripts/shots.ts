/**
 * `npm run shots` — record the sequences and cut them into frames.
 *
 * The brief's rule is that motion is judged by watching, not by reading code,
 * and this is the apparatus for it: both verdicts recorded at phone and desktop
 * sizes, then a frame every 100ms extracted so the beats can be laid out and
 * looked at side by side.
 *
 * Two things it does that a naive recorder would not:
 *
 *   - it warms `/api/judge` and the lazy three.js chunk before the real run.
 *     In dev the first call compiles the route, which outlasts the 3.6s
 *     curtain, and the recording then shows a sequence that appears never to
 *     have played.
 *   - it records the whole page rather than an element, because the verdict
 *     is a full-screen takeover and an element clip would miss the scrim, the
 *     skip control and the text that the scene has to sit against.
 *
 * Usage:
 *   npm run shots                      # against http://localhost:3310
 *   BASE_URL=... npm run shots
 *   npm run shots -- --only=reject
 */

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { chromium, type Browser, type Page } from 'playwright';

const exec = promisify(execFile);

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3310';
const OUT = process.env.SHOTS_DIR ?? path.join(process.cwd(), '.shots');
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

/** A pitch the classifier reliably routes each way. Keep these stable. */
const CASES = [
  {
    id: 'reject',
    label: 'Execution — the decree burns',
    idea: 'A bakery selling sourdough loaves and pastries to the neighbourhood each morning.',
  },
  {
    id: 'bless',
    label: 'Blessing — gold leaf',
    idea: 'An agent that reconciles freight invoices against the original bill of lading and disputes the gaps.',
  },
] as const;

const VIEWPORTS = [
  { id: 'phone', width: 390, height: 844 },
  { id: 'desktop', width: 1440, height: 900 },
] as const;

/** How long to record from submit: curtain (3.6s) + overture (~4s) + slack. */
const RECORD_MS = 9000;

async function warm(page: Page): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(
    (idea) =>
      fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      }).catch(() => {}),
    'warm the route so the first real submission is not a compile',
  );
  // Long enough for a cold dev compile of the route and the lazy three chunk.
  await page.waitForTimeout(5000);
}

async function record(
  browser: Browser,
  kase: (typeof CASES)[number],
  vp: (typeof VIEWPORTS)[number],
): Promise<{ dir: string; errors: string[] }> {
  const dir = path.join(OUT, `${kase.id}-${vp.id}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const errors: string[] = [];
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    // 1x: these are read as a filmstrip, and 2x quadruples the encode for
    // nothing a critique of weight, lighting or timing would use.
    deviceScaleFactor: 1,
    recordVideo: { dir, size: { width: vp.width, height: vp.height } },
  });

  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`);
  });

  await warm(page);
  await page.reload({ waitUntil: 'networkidle' });

  await page.fill('#idea', kase.idea);
  await page.click('button[type=submit]');
  await page.waitForTimeout(RECORD_MS);

  // The video is only flushed on close.
  await ctx.close();
  return { dir, errors };
}

/** Cut the recording into stills. Needs ffmpeg; says so plainly if absent. */
async function explode(dir: string): Promise<number> {
  const video = readdirSync(dir).find((f) => f.endsWith('.webm'));
  if (!video) {
    console.error(`  no video written in ${dir}`);
    return 0;
  }
  const frames = path.join(dir, 'frames');
  mkdirSync(frames, { recursive: true });

  try {
    await exec('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path.join(dir, video),
      // 10fps: one frame every 100ms, as asked.
      '-vf',
      'fps=10',
      path.join(frames, 'f-%03d.png'),
    ]);
  } catch (err) {
    console.error('  ffmpeg failed — frames not extracted.', (err as Error).message);
    return 0;
  }
  return readdirSync(frames).filter((f) => f.endsWith('.png')).length;
}

async function main() {
  const chosen = only ? CASES.filter((c) => c.id === only) : CASES;
  if (chosen.length === 0) {
    console.error(`--only=${only} matched nothing. Known: ${CASES.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  // Playwright's own Chromium if present, the preinstalled one otherwise.
  const executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  console.log(`\nRecording against ${BASE_URL}\n`);
  let failures = 0;

  for (const kase of chosen) {
    for (const vp of VIEWPORTS) {
      process.stdout.write(`  ${kase.id} @ ${vp.id} (${vp.width}x${vp.height}) … `);
      const { dir, errors } = await record(browser, kase, vp);
      const count = await explode(dir);
      console.log(`${count} frames → ${path.relative(process.cwd(), dir)}/frames`);
      if (errors.length) {
        failures += 1;
        console.log(`    page errors:\n      ${errors.slice(0, 5).join('\n      ')}`);
      }
    }
  }

  await browser.close();

  console.log(
    `\n${failures === 0 ? 'No page errors.' : `${failures} run(s) reported page errors.`}`,
  );
  console.log(`Open the frames and look at them. ${path.relative(process.cwd(), OUT)}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
