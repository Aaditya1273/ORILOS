import type { Interval, Plan } from './plans';

/** "$228 $180 billed yearly · Save $48": the struck price is 12 months at the monthly price, so the saving is real. */
export function YearlyLine({ p, interval }: { p: Plan; interval: Interval }) {
  if (p.id === 'free') return <p className="ac-fine">No card needed</p>;
  if (interval === 'monthly') return <p className="ac-fine">Billed monthly</p>;
  const monthly = p.price.monthly * 12;
  const yearly = p.price.yearly * 12;
  return (
    <p className="ac-fine ac-yearly">
      <s title={`12 months at $${p.price.monthly}`}>${monthly}</s> ${yearly} billed yearly
      <span className="ac-save-chip">Save ${monthly - yearly}</span>
    </p>
  );
}
