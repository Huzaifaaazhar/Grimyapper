import { NextResponse } from 'next/server';

import { JudgeError, judge } from '@/lib/judge';
import { checkRateLimit, clientIp } from '@/lib/ratelimit';
import { JudgeRequestSchema, MAX_IDEA_CHARS } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Anything bigger than this is not a startup pitch. Reject before parsing. */
const MAX_BODY_BYTES = 4_000;

/**
 * Blocks a third-party page from driving this endpoint with a user's browser.
 * A request with no Origin at all (curl, a script) still gets through — only the
 * rate limiter can speak to that — but it stops the cheapest form of embedding.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return json({ error: 'Cross-origin submissions are not accepted.' }, 403);
  }

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return json({ error: 'That is far too much pitch.' }, 413);
  }

  const rate = checkRateLimit(clientIp(request.headers));
  if (!rate.ok) {
    return json(
      {
        error:
          rate.reason === 'daily'
            ? 'The bureau has issued its quota of judgements for today. Come back tomorrow.'
            : 'Slow down. The bureau processes one death certificate at a time.',
      },
      429,
      { 'Retry-After': String(rate.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ error: 'That is far too much pitch.' }, 413);
    }
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  const parsed = JudgeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error:
          parsed.error.issues[0]?.message ??
          `Give me a real pitch, under ${MAX_IDEA_CHARS} characters.`,
      },
      400,
    );
  }

  try {
    // Synchronous: the whole court is arithmetic running in this process.
    return json(judge(parsed.data), 200);
  } catch (err) {
    // Fail closed. No stack, no internals, nothing but a sentence.
    const stage = err instanceof JudgeError ? err.stage : 'unknown';
    console.error(`[judge] failed at stage=${stage}`);
    return json(
      { error: 'The court is unable to reach a judgement. Try again in a moment.' },
      500,
    );
  }
}

export async function GET() {
  return json({ error: 'POST a pitch.' }, 405);
}
