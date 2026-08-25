import type { Assumptions, MonthRow } from './schemas';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const HORIZON_MONTHS = 12;

const round = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Deterministic 12-month projection. The LLM supplies the six seed assumptions;
 * every monthly number below is arithmetic, so the same assumptions always
 * produce the same table and the whole thing is unit-testable.
 *
 * The over-precision is the joke. The arithmetic is not.
 */
export function projectTwelveMonths(a: Assumptions, startMonthIndex = 0): MonthRow[] {
  const g = a.monthly_growth_rate;

  // Seed month 1 so that month 12 lands on reachable_users_year1.
  const seedUsers = a.reachable_users_year1 / Math.pow(1 + g, HORIZON_MONTHS - 1);

  const rows: MonthRow[] = [];
  let usersExact = seedUsers;
  let prevUsers = round(seedUsers);
  let payingExact = round(seedUsers) * a.free_to_paid_conversion;
  let cumulative = 0;

  for (let m = 1; m <= HORIZON_MONTHS; m += 1) {
    if (m > 1) {
      usersExact *= 1 + g;
      const users = round(usersExact);
      // Churn hits the existing paying base first, then this month's new signups convert.
      const retained = payingExact * (1 - a.monthly_churn);
      const newlyConverted = Math.max(0, users - prevUsers) * a.free_to_paid_conversion;
      payingExact = retained + newlyConverted;
      prevUsers = users;
    }

    const users = round(usersExact);
    const paying = Math.max(0, round(payingExact));
    const gross_mrr = round2(paying * a.price_per_month_usd);
    const net_revenue = gross_mrr;
    const burn = round2(a.monthly_burn_usd);
    const net = round2(net_revenue - burn);
    cumulative = round2(cumulative + net);

    rows.push({
      month: m,
      label: MONTH_LABELS[(startMonthIndex + m - 1) % 12],
      users,
      paying,
      gross_mrr,
      net_revenue,
      burn,
      net,
      cumulative_net: cumulative,
    });
  }

  return rows;
}
