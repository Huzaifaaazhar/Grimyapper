'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { MonthRow } from '@/lib/schemas';

/**
 * Two plots, never one with two scales. Souls and rents are different measures;
 * putting them on a single pair of axes is the ordinary way a chart lies.
 *
 * Both are drawn in the same iron-gall ink on purpose. Each panel holds one
 * series and is named by its own heading, so colour has nothing left to encode
 * — and a scribe with one inkhorn would not have coloured them differently.
 */
const INK = '#3d2c1a';

const SERIES = {
  users: { label: 'Souls enrolled', kind: 'count' },
  gross_mrr: { label: 'Rents received each month', kind: 'coin' },
} as const;

type Key = keyof typeof SERIES;

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const coin = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const exact = new Intl.NumberFormat('en-US');

function ChartTooltip({
  active,
  payload,
  dataKey,
}: {
  active?: boolean;
  payload?: Array<{ payload: MonthRow }>;
  dataKey: Key;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div
      className="border border-ink px-3.5 py-2.5"
      style={{
        /*
         * Lit from the upper left, as everything else in the court is: a warm
         * wash across the card, a gold rim on the lit edge, and a long soft
         * shadow falling away from the source. A flat panel with an even
         * border sits on the page; this one sits above it.
         */
        background:
          'radial-gradient(120% 140% at 12% 0%, #fdf6e4 0%, #f2ecdb 46%, #e4d7b8 100%)',
        boxShadow:
          'inset 1px 1px 0 rgba(255,246,222,0.9), inset -1px -1px 0 rgba(122,92,46,0.18), 0 10px 24px -10px rgba(42,30,18,0.7), 0 2px 5px -2px rgba(42,30,18,0.4)',
      }}
    >
      <p className="titling text-[0.6rem] text-vermilion">
        Month {row.month} · {row.label}
      </p>
      <p className="tabular mt-1.5 text-base text-ink">
        {dataKey === 'gross_mrr' ? coin.format(row.gross_mrr) : exact.format(row.users)}
      </p>
      <p className="tabular mt-0.5 text-sm text-ink-faint">
        {exact.format(row.paying)} paying
      </p>
    </div>
  );
}

function Panel({ months, dataKey }: { months: MonthRow[]; dataKey: Key }) {
  const reduceMotion = prefersReducedMotion();
  const series = SERIES[dataKey];
  const final = months[months.length - 1];
  const gradientId = `wash-${dataKey}`;

  return (
    <figure className="border border-[rgba(90,72,46,0.34)] bg-[rgba(255,250,235,0.34)] p-4 sm:p-5">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b rule-faint pb-2.5">
        <span className="titling text-[0.66rem] text-ink">{series.label}</span>
        <span className="tabular text-sm text-ink-soft">
          by the twelfth:{' '}
          <span className="text-ink">
            {dataKey === 'gross_mrr' ? coin.format(final.gross_mrr) : exact.format(final.users)}
          </span>
        </span>
      </figcaption>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={months} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INK} stopOpacity={0.26} />
                <stop offset="100%" stopColor={INK} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(90,72,46,0.2)" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6f5c3f', fontSize: 12, fontFamily: 'var(--font-garamond)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(42,30,18,0.5)' }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={{ fill: '#6f5c3f', fontSize: 12, fontFamily: 'var(--font-garamond)' }}
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={(v: number) =>
                dataKey === 'gross_mrr' ? `$${compact.format(v)}` : compact.format(v)
              }
            />
            <Tooltip
              cursor={{ stroke: 'rgba(42,30,18,0.45)', strokeWidth: 1 }}
              content={<ChartTooltip dataKey={dataKey} />}
            />
            {/*
             * Animated, where it used to snap.
             *
             * Recharts interpolates the path between the old and new series, so
             * dragging an assumption morphs the curve rather than replacing it
             * — which is the behaviour MorphSVG would have been used for, and
             * is already correct here because the two paths share a point
             * count. The first render draws it on from nothing.
             *
             * The easing is Recharts' own; its prop takes a named curve rather
             * than a CustomEase, so this is the one place a stock ease is used,
             * and 'ease-out' is the closest of the five it offers to the
             * glide the rest of the app uses.
             */}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={INK}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4.5, stroke: '#e9dfc6', strokeWidth: 2, fill: INK }}
              isAnimationActive={!reduceMotion}
              animationDuration={620}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ProjectionChart({ months }: { months: MonthRow[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel months={months} dataKey="users" />
      <Panel months={months} dataKey="gross_mrr" />
    </div>
  );
}
