import { NextResponse } from 'next/server';

import { JudgeError, judge } from '@/lib/judge';
import { checkRateLimit, clientIp } from '@/lib/ratelimit';
import { JudgeRequestSchema, MAX_IDEA_CHARS } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Anything bigger than this is not a startup pitch. Reject before parsing. */
const MAX_BODY_BYTES = 4_000;

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });

export async function POST(request: Request) {
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

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return json({ error: 'That is far too much pitch.' }, 413);
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
    const result = await judge(parsed.data);
    return json(result, 200);
  } catch (err) {
    // Fail closed. No model text, no stack, no key, nothing internal leaves here.
    const stage = err instanceof JudgeError ? err.stage : 'unknown';
    console.error(`[judge] failed at stage=${stage}`);
    return json(
      { error: 'The bureau is temporarily unable to reach the afterlife. Try again in a moment.' },
      502,
    );
  }
}

export async function GET() {
  return json({ error: 'POST a pitch.' }, 405);
}
