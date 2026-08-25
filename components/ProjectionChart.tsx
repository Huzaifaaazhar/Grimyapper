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
 * Two small multiples, never a dual axis. Users and MRR are different measures
 * on different scales; stacking them on one plot with two y-scales is the single
 * most common way to make a chart lie.
 */
const SERIES = {
  users: { color: '#3987e5', label: 'Signed-up users' },
  gross_mrr: { color: '#199e70', label: 'Monthly recurring revenue' },
} as const;

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const exact = new Intl.NumberFormat('en-US');

type Key = keyof typeof SERIES;

function ChartTooltip({
  active,
  payload,
  label,
  dataKey,
}: {
  active?: boolean;
  payload?: Array<{ payload: MonthRow }>;
  label?: string | number;
  dataKey: Key;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const value = row[dataKey];
  return (
    <div className="border rule bg-ink-3 px-3 py-2 shadow-xl">
      <p className="label-caps text-bone-3">
        Month {row.month} · {label}
      </p>
      <p className="tabular mt-1 font-mono text-sm text-bone">
        {dataKey === 'gross_mrr' ? money.format(value) : exact.format(value)}
      </p>
      <p className="tabular mt-0.5 font-mono text-xs text-bone-3">
        {exact.format(row.paying)} paying
      </p>
    </div>
  );
}

function Panel({ months, dataKey }: { months: MonthRow[]; dataKey: Key }) {
  const series = SERIES[dataKey];
  const final = months[months.length - 1];
  const gradientId = `grad-${dataKey}`;

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: series.color }}
            aria-hidden
          />
          <span className="label-caps text-bone-2">{series.label}</span>
        </span>
        <span className="tabular font-mono text-sm text-bone-3">
          month 12:{' '}
          <span className="text-bone">
            {dataKey === 'gross_mrr'
              ? money.format(final.gross_mrr)
              : exact.format(final.users)}
          </span>
        </span>
      </figcaption>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={months} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.color} stopOpacity={0.34} />
                <stop offset="100%" stopColor={series.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(236,229,216,0.07)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: '#8a8377', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(236,229,216,0.12)' }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={{ fill: '#8a8377', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) =>
                dataKey === 'gross_mrr' ? `$${compact.format(v)}` : compact.format(v)
              }
            />
            <Tooltip
              cursor={{ stroke: 'rgba(236,229,216,0.32)', strokeWidth: 1 }}
              content={<ChartTooltip dataKey={dataKey} />}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={series.color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4.5, stroke: '#0f0f11', strokeWidth: 2, fill: series.color }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function ProjectionChart({ months }: { months: MonthRow[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Panel months={months} dataKey="users" />
      <Panel months={months} dataKey="gross_mrr" />
    </div>
  );
}
