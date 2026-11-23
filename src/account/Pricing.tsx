import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { maybeMe, type Me } from './api';
import { TopBar } from './Chrome';
import { PLANS, type Interval, type Plan } from './plans';
import './account.css';

const FAQ: [string, string][] = [
  ['Do I need an AI key?', 'No. The AI you already use (Claude Code, Codex and others) picks the moments. ORILOS does the heavy work on your computer.'],
  ['Is Free really free?', 'Yes. Unlimited clips on your own computer, no watermark, no credit card. Pro adds the tools creators use every day.'],
  ['Why is it this cheap?', 'Your computer does the rendering, so we pay for no servers per clip. Cloud clippers have to charge for every minute you upload.'],
  ['Can I cancel any time?', 'Yes, in one click from Billing. You keep your plan until the end of the period you paid for.'],
  ['How do I pay?', 'Card or PayPal, through Lemon Squeezy, our payment partner. They also handle your sales tax or VAT and invoices.'],
  ['Do my videos go to your servers?', 'No. Videos, clips and your platform keys never leave your computer. Your account only holds your email, plan and licence keys.'],
];

function price(p: Plan, interval: Interval) {
  return p.price[interval];
}

function ctaHref(p: Plan, interval: Interval, me: Me | null): string {
  if (p.id === 'free') return me ? '/account' : '/signin?next=/account';
  const billing = `/account/billing?plan=${p.id}&interval=${interval}`;
  return me ? billing : `/signin?next=${encodeURIComponent(billing)}`;
}

export function Pricing() {
  const [interval, setInterval] = useState<Interval>('yearly');
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    void maybeMe().then(setMe);
  }, []);

  return (
    <div className="ac ac-page">
      <TopBar right={me ? <a className="ac-btn" href="/account">Dashboard</a> : <a className="ac-btn" href="/signin">Sign in</a>} />

      <main className="ac-pricing">
        <p className="ac-eyebrow">Pricing</p>
        <h1 className="ac-display">
          Clip free.
          <br />
          <span className="pink">Grow with Pro.</span>
        </h1>
        <p className="ac-lede">Every plan clips on your own computer, with the AI you already use. No minutes to buy, no watermark.</p>

        <div className="ac-toggle" role="radiogroup" aria-label="Billing period">
          {(['monthly', 'yearly'] as const).map((i) => (
            <button key={i} role="radio" aria-checked={interval === i} className={interval === i ? 'on' : ''} onClick={() => setInterval(i)}>
              {i === 'monthly' ? 'Monthly' : 'Yearly'}
              {i === 'yearly' && <span className="ac-save">2 months free</span>}
            </button>
          ))}
        </div>

        <div className="ac-plans">
          {PLANS.map((p) => {
            const current = me?.plan === p.id;
            return (
              <section key={p.id} className={`ac-plan${p.id === 'pro' ? ' hot' : ''}`} aria-labelledby={`plan-${p.id}`}>
                {p.id === 'pro' && <span className="ac-badge">Most popular</span>}
                <h2 id={`plan-${p.id}`}>{p.name}</h2>
                <p className="ac-mute">{p.tagline}</p>
                <p className="ac-price">
                  <b>${price(p, interval)}</b>
                  <span>{p.id === 'free' ? 'forever' : '/ month'}</span>
                </p>
                <p className="ac-fine">{p.id === 'free' ? 'No card needed' : interval === 'yearly' ? `$${p.price.yearly * 12} billed yearly` : 'Billed monthly'}</p>
                {current ? (
                  <span className="ac-btn ghost wide" aria-disabled="true">
                    Your plan
                  </span>
                ) : (
                  <a className={`ac-btn wide${p.id === 'pro' ? ' pink' : ''}`} href={ctaHref(p, interval, me)}>
                    {p.cta}
                  </a>
                )}
                <ul className="ac-feats">
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={16} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <section className="ac-faq" aria-labelledby="faq">
          <h2 id="faq" className="ac-h2">
            Questions
          </h2>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </main>

      <footer className="ac-foot">
        <span>© 2026 ORILOS</span>
        <nav aria-label="Footer">
          <a href="/docs">Docs</a>
          <a href="/docs/terms">Terms</a>
          <a href="/docs/privacy">Privacy</a>
        </nav>
      </footer>
    </div>
  );
}
