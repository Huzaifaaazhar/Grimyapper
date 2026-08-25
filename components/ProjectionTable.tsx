import type { MonthRow } from '@/lib/schemas';

const coin = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-US');

const HEAD: Array<[string, string]> = [
  ['Month', ''],
  ['Souls', 'users'],
  ['Paying', 'paying'],
  ['Rents', 'gross MRR'],
  ['Outlay', 'burn'],
  ['Balance', 'net'],
  ['Coffers', 'cumulative'],
];

export function ProjectionTable({ months }: { months: MonthRow[] }) {
  return (
    <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[660px] border-collapse">
        <caption className="sr-only">
          A reckoning of twelve months: users, paying accounts, revenue, burn, and the running
          balance of the coffers.
        </caption>
        <thead>
          <tr className="border-b-[2px] border-[rgba(42,30,18,0.55)]">
            {HEAD.map(([label, plain], i) => (
              <th
                key={label}
                scope="col"
                className={`pb-2.5 align-bottom ${i === 0 ? 'text-left' : 'text-right'}`}
              >
                <span className="titling block text-[0.62rem] text-ink">{label}</span>
                {plain && (
                  <span className="block text-[0.7rem] italic text-ink-faint">{plain}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular text-[0.95rem]">
          {months.map((r) => (
            <tr
              key={r.month}
              className="border-b border-[rgba(138,118,88,0.34)] even:bg-[rgba(217,201,166,0.22)]"
            >
              <th scope="row" className="py-2.5 text-left font-normal text-ink-soft">
                <span className="titling text-[0.62rem] text-vermilion">
                  {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'][
                    r.month - 1
                  ]}
                </span>
                <span className="ml-2 text-ink-faint">{r.label}</span>
              </th>
              <td className="py-2.5 text-right text-ink-soft">{num.format(r.users)}</td>
              <td className="py-2.5 text-right text-ink-soft">{num.format(r.paying)}</td>
              <td className="py-2.5 text-right text-ink">{coin.format(r.gross_mrr)}</td>
              <td className="py-2.5 text-right text-ink-faint">−{coin.format(r.burn)}</td>
              <td
                className={`py-2.5 text-right ${r.net >= 0 ? 'text-verdigris' : 'text-vermilion'}`}
              >
                {r.net >= 0 ? '+' : '−'}
                {coin.format(Math.abs(r.net))}
              </td>
              <td
                className={`py-2.5 text-right ${
                  r.cumulative_net >= 0 ? 'text-verdigris' : 'text-ink-faint'
                }`}
              >
                {r.cumulative_net >= 0 ? '+' : '−'}
                {coin.format(Math.abs(r.cumulative_net))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
