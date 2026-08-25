import type { MonthRow } from '@/lib/schemas';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-US');

const HEAD = ['M', 'Users', 'Paying', 'Gross MRR', 'Burn', 'Net', 'Cumulative'];

export function ProjectionTable({ months }: { months: MonthRow[] }) {
  return (
    <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <caption className="sr-only">
          Twelve-month projection of users, paying accounts, revenue, burn and cumulative net.
        </caption>
        <thead>
          <tr className="border-b rule">
            {HEAD.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`label-caps py-3 text-bone-3 ${i === 0 ? 'text-left' : 'text-right'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular font-mono">
          {months.map((r) => (
            <tr key={r.month} className="border-b border-[rgba(236,229,216,0.06)]">
              <th scope="row" className="py-2.5 text-left text-bone-3 font-normal">
                {String(r.month).padStart(2, '0')} <span className="text-bone-3">{r.label}</span>
              </th>
              <td className="py-2.5 text-right text-bone-2">{num.format(r.users)}</td>
              <td className="py-2.5 text-right text-bone-2">{num.format(r.paying)}</td>
              <td className="py-2.5 text-right text-bone">{usd.format(r.gross_mrr)}</td>
              <td className="py-2.5 text-right text-bone-3">−{usd.format(r.burn)}</td>
              <td
                className={`py-2.5 text-right ${r.net >= 0 ? 'text-verdant' : 'text-stamp-bright'}`}
              >
                {r.net >= 0 ? '+' : '−'}
                {usd.format(Math.abs(r.net))}
              </td>
              <td
                className={`py-2.5 text-right ${
                  r.cumulative_net >= 0 ? 'text-verdant' : 'text-bone-3'
                }`}
              >
                {r.cumulative_net >= 0 ? '+' : '−'}
                {usd.format(Math.abs(r.cumulative_net))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
