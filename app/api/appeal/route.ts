import { NextResponse } from 'next/server';

import { hearAppeal } from '@/lib/appeal';
import { checkRateLimit, clientIp } from '@/lib/ratelimit';
import { AppealRequestSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4_000;

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

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

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return json({ error: 'Cross-origin addresses are not accepted.' }, 403);
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return json({ error: 'That is far too much address.' }, 413);
  }

  const rate = await checkRateLimit(clientIp(request.headers));
  if (!rate.ok) {
    return json(
      { error: 'The court hears one address at a time.' },
      429,
      { 'Retry-After': String(rate.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: 'That is far too much address.' }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  const parsed = AppealRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Address the court properly.' }, 400);
  }

  try {
    return json(hearAppeal(parsed.data), 200);
  } catch {
    console.error('[appeal] failed');
    return json({ error: 'The court is unable to hear thee. Try again in a moment.' }, 500);
  }
}

export async function GET() {
  return json({ error: 'POST an address.' }, 405);
}
