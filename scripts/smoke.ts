/**
 * Smoke test against a running server — `npm run smoke`
 *
 * Exists because of a specific bug that every other check missed.
 *
 * A relative `og:image` with no `metadataBase` resolves to localhost in
 * development (a warning) and **throws in production**. The page body rendered
 * perfectly, so curl, the build, the unit tests and the eval all passed — but
 * the rejected metadata promise blanked the page on hydration with
 * "Application error: a client-side exception has occurred".
 *
 * The tell is in the SSR HTML: React marks a failed boundary with
 * `data-dgst`, and a rejected metadata promise serialises as `"error":"$Z"`.
 * Both are cheap to look for and neither shows up in a status code, which is
 * why this asserts on the markup rather than on `res.ok`.
 *
 * Point it at any deploy: `BASE_URL=https://grimyapper.vercel.app npm run smoke`
 */
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const failures: string[] = [];
const fail = (what: string, detail: string) => failures.push(`${what}: ${detail}`);

const token = (idea: string, name = '', customer = '') =>
  Buffer.from([idea, name, customer].join('\t')).toString('base64url');

const DECREE = token('A marketplace connecting dog owners with vetted local dog walkers.');
const ASSAY = token('An agent that reads insurance claims and drafts the adjuster decision.');
const GUARDED = token('A bakery. Email me at victim@example.com to order bread.');

/** The two markers that mean the server rendered, but something threw doing it. */
function checkRenderHealth(label: string, html: string) {
  if (html.includes('data-dgst')) {
    fail(label, 'a React boundary failed during SSR (data-dgst present)');
  }
  if (/"error":"\$Z"/.test(html)) {
    fail(label, 'a metadata promise rejected on the server ("error":"$Z")');
  }
  if (html.includes('Application error')) {
    fail(label, 'the page shipped an application-error shell');
  }
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const type = res.headers.get('content-type') ?? '';
  const body = type.startsWith('image/') ? '' : await res.text();
  return { res, body, type };
}

async function page(label: string, path: string, expect: { status: number; contains?: string[] }) {
  const { res, body } = await get(path);

  if (res.status !== expect.status) {
    fail(label, `expected ${expect.status}, got ${res.status}`);
  }
  if (res.status === 200) checkRenderHealth(label, body);
  for (const needle of expect.contains ?? []) {
    if (!body.includes(needle)) fail(label, `missing expected content: ${needle}`);
  }

  const ok = !failures.some((f) => f.startsWith(`${label}:`));
  console.log(`  ${ok ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`} ${label.padEnd(34)} ${DIM}${path.slice(0, 46)}${OFF}`);
  return body;
}

async function main() {
  console.log(`\n${BOLD}Smoke test${OFF} ${DIM}· ${BASE}${OFF}\n`);

  await page('court', '/', { status: 200, contains: ['Should this'] });
  await page('model page', '/model', { status: 200, contains: ['Held-out accuracy'] });

  const decree = await page('permalink · decree', `/j/${DECREE}`, {
    status: 200,
    contains: ['Decree of Extinction'],
  });
  await page('permalink · assay', `/j/${ASSAY}`, { status: 200, contains: ['The seven virtues'] });
  await page('permalink · guarded', `/j/${GUARDED}`, { status: 200, contains: ['will not reprint'] });
  await page('permalink · bad token', '/j/not-a-real-token', { status: 404 });

  /*
   * The actual regression: og:image must resolve to an absolute URL. A relative
   * one is what threw in production, and it is invisible in a status code.
   */
  const ogImage = /<meta property="og:image" content="([^"]+)"/.exec(decree)?.[1];
  if (!ogImage) {
    fail('og:image', 'no og:image meta tag on the permalink');
  } else if (!/^https?:\/\//.test(ogImage)) {
    fail('og:image', `relative URL "${ogImage}" — set metadataBase`);
  } else if (ogImage.includes('localhost') && !BASE.includes('localhost') && !BASE.includes('127.0.0.1')) {
    fail('og:image', `resolves to localhost on a remote deploy: ${ogImage}`);
  }
  console.log(
    `  ${ogImage && /^https?:\/\//.test(ogImage) ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`} ` +
      `${'og:image is absolute'.padEnd(34)} ${DIM}${ogImage ?? 'missing'}${OFF}`,
  );

  const { res: imgRes, type } = await get(`/j/${DECREE}/opengraph-image`);
  if (imgRes.status !== 200) fail('share image', `expected 200, got ${imgRes.status}`);
  if (!type.startsWith('image/png')) fail('share image', `expected image/png, got "${type}"`);
  console.log(
    `  ${imgRes.status === 200 && type.startsWith('image/png') ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`} ` +
      `${'share image renders'.padEnd(34)} ${DIM}${type}${OFF}`,
  );

  console.log(`\n${BOLD}${failures.length === 0 ? `${GREEN}SMOKE PASSED` : `${RED}SMOKE FAILED`}${OFF}`);
  for (const f of failures) console.log(`  ${RED}✗${OFF} ${f}`);
  console.log();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
