// Account management: profile, billing, licence keys and settings.
import { Check, KeyRound, TriangleAlert, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ago, api, device, getMe, when, type LicenceKey, type Me, type Session } from './api';
import { loadPaddle } from './paddle';
import { YearlyLine } from './YearlyLine';
import { KEY_LIMITS, LIVE_STATUSES, plan as planOf, PLANS, type Interval, type PlanId } from './plans';
import { Avatar, Card, CopyLine, Head, useKeys, type Ctx } from './ui';

/* ── Profile ───────────────────────────────────────────────── */

const ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();

export function Profile({ me, setMe }: Ctx) {
  const [form, setForm] = useState({ name: me.name, handle: me.handle ?? '', timezone: me.timezone });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = form.name !== me.name || form.handle !== (me.handle ?? '') || form.timezone !== me.timezone;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ user: Me }>('/me', { method: 'PATCH', body: form });
      setMe(r.user);
      setStatus({ ok: true, text: 'Saved.' });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head title="Profile" sub="How you appear in ORILOS." />
      <Card>
        <div className="ac-profile-top">
          <Avatar me={me} size={72} />
          <div>
            <p className="ac-stat">{me.name || 'You'}</p>
            <p className="ac-mute">{me.email}</p>
            <p className="ac-fine">Signed in with Google. Your photo comes from your Google account.</p>
          </div>
        </div>
        <form className="ac-form" onSubmit={save}>
          <label>
            <span>Name</span>
            <input value={form.name} maxLength={60} required onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </label>
          <label>
            <span>Handle</span>
            <div className="ac-prefix">
              <i>@</i>
              <input
                value={form.handle}
                maxLength={24}
                pattern="[a-zA-Z0-9_]{3,24}"
                placeholder="yourname"
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                autoComplete="username"
              />
            </div>
            <small>3 to 24 letters, numbers or underscores.</small>
          </label>
          <label>
            <span>Time zone</span>
            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              {(ZONES.includes(form.timezone) ? ZONES : [form.timezone, ...ZONES]).map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
            <small>Used for dates here and for best-time posting.</small>
          </label>
          <label>
            <span>Email</span>
            <input value={me.email} disabled />
            <small>Managed by Google.</small>
          </label>
          <div className="ac-actions">
            <button className="ac-btn pink" disabled={!dirty || busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            {form.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
              <button type="button" className="ac-link" onClick={() => setForm({ ...form, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
                Use this device's time zone
              </button>
            )}
            {status && (
              <span className={status.ok ? 'ac-ok' : 'ac-err'} role="status">
                {status.text}
              </span>
            )}
          </div>
        </form>
      </Card>
    </>
  );
}

/* ── Billing ───────────────────────────────────────────────── */

const STATUS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment failed: update your card',
  paused: 'Paused',
  canceled: 'Ended',
};

export function Billing({ me, setMe, billingReady }: Ctx) {
  const params = new URLSearchParams(location.search);
  const [interval, setInterval] = useState<Interval>(params.get('interval') === 'monthly' ? 'monthly' : 'yearly');
  const wanted = params.get('plan');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(params.get('paid') === '1' && me.plan === 'free');

  // Back from the payment page: the webhook usually lands within seconds.
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const t = window.setInterval(async () => {
      tries++;
      const r = await getMe().catch(() => null);
      if (r && r.user.plan !== 'free') {
        setMe(r.user);
        setWaiting(false);
      } else if (tries >= 15) setWaiting(false);
    }, 2000);
    return () => clearInterval(t);
  }, [waiting, setMe]);

  const open = async (what: 'checkout' | 'portal', planId?: string) => {
    setBusy(planId ?? what);
    setError('');
    try {
      if (what === 'portal') {
        location.href = (await api<{ url: string }>('/billing/portal', { method: 'POST' })).url;
        return;
      }
      const r = await api<{ transactionId: string; email: string | null; token: string; environment: string }>('/billing/checkout', {
        method: 'POST',
        body: { plan: planId, interval },
      });
      const paddle = await loadPaddle(r.token, r.environment);
      paddle.Checkout.open({
        transactionId: r.transactionId,
        ...(r.email ? { customer: { email: r.email } } : {}),
        settings: { displayMode: 'overlay', successUrl: `${location.origin}/account/billing?paid=1` },
      });
      setBusy('');
    } catch (e) {
      setError((e as Error).message);
      setBusy('');
    }
  };

  const sub = me.subscription;
  const current = planOf(me.plan);
  const live = !!sub && LIVE_STATUSES.has(sub.status ?? '');
  const [cancel, setCancel] = useState<{ refundable: boolean; refundUntil: number | null; cancelled: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const askCancel = async () => {
    setBusy('cancel');
    setError('');
    try {
      setCancel(await api<{ refundable: boolean; refundUntil: number | null; cancelled: boolean }>('/billing/cancel'));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  };
  const doCancel = async () => {
    setBusy('cancel');
    setError('');
    try {
      const r = await api<{ refunded: boolean }>('/billing/cancel', { method: 'POST' });
      setMe((await getMe()).user);
      setNotice(r.refunded ? 'Cancelled and refunded. Paddle returns the money to your card or account, usually within 5 to 10 business days. You are on Free now.' : `Cancelled. ${current.name} stays on until the end of the period you paid for, and you will not be charged again.`);
      setCancel(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  };
  return (
    <>
      <Head title="Billing" sub="Your plan, payments and invoices." />
      {params.get('paid') === '1' && (
        <p className={waiting ? 'ac-alert' : 'ac-alert ok'} role="status">
          {waiting ? 'Payment received. Turning on your plan…' : me.plan !== 'free' ? `Welcome to ${current.name}. Thank you!` : 'Payment received. Your plan will appear here in a minute.'}
        </p>
      )}
      {error && (
        <p className="ac-alert" role="alert">
          {error}
        </p>
      )}

      <Card className="ac-current">
        <div>
          <p className="ac-stat-label">Current plan</p>
          <p className="ac-stat">
            {current.name} {me.plan !== 'free' && <span className="ac-mute">· {sub?.interval === 'yearly' ? 'yearly' : 'monthly'}</span>}
          </p>
          <p className="ac-fine">
            {sub
              ? sub.endsAt && LIVE_STATUSES.has(sub.status ?? '')
                ? `Cancelled · ${current.name} stays on until ${when(sub.endsAt, me.timezone)}. Changed your mind? Resume it in Manage billing.`
                : `${STATUS[sub.status] ?? sub.status}${sub.renewsAt && LIVE_STATUSES.has(sub.status ?? '') ? ` · renews ${when(sub.renewsAt, me.timezone)}` : ''}`
              : 'Free forever. No card on file.'}
          </p>
        </div>
        {sub && (
          <div className="ac-end">
            {live && (
              <button className="ac-btn ghost" onClick={askCancel} disabled={!!busy}>
                {busy === 'cancel' && !cancel ? 'Checking…' : sub.endsAt ? 'Refund options' : 'Cancel plan'}
              </button>
            )}
            <button className="ac-btn soft" onClick={() => open('portal')} disabled={!!busy}>
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          </div>
        )}
      </Card>

      {notice && (
        <p className="ac-alert ok" role="status">
          {notice}
        </p>
      )}
      {cancel && (
        <CancelDialog
          info={cancel}
          planName={current.name}
          until={cancel.refundUntil ? when(cancel.refundUntil, me.timezone) : ''}
          endsOn={sub?.endsAt ? when(sub.endsAt, me.timezone) : sub?.renewsAt ? when(sub.renewsAt, me.timezone) : 'the end of the period you paid for'}
          busy={busy === 'cancel'}
          onConfirm={doCancel}
          onClose={() => setCancel(null)}
        />
      )}

      {!sub || !LIVE_STATUSES.has(sub.status ?? '') ? (
        <>
          <div className="ac-row">
            <h2 className="ac-h3">Upgrade</h2>
            <div className="ac-toggle small" role="radiogroup" aria-label="Billing period">
              {(['monthly', 'yearly'] as const).map((i) => (
                <button key={i} role="radio" aria-checked={interval === i} className={interval === i ? 'on' : ''} onClick={() => setInterval(i)}>
                  {i === 'monthly' ? 'Monthly' : 'Yearly · 2 months free'}
                </button>
              ))}
            </div>
          </div>
          <div className="ac-upgrades">
            {PLANS.filter((p) => p.id !== 'free').map((p) => (
              <Card key={p.id} className={`ac-up${wanted === p.id || (!wanted && p.id === 'pro') ? ' hot ac-shine' : ''}`}>
                {p.id === 'pro' && <span className="ac-badge">Most popular</span>}
                <h2>{p.name}</h2>
                <p className="ac-mute ac-up-tag">{p.tagline}</p>
                <p className="ac-price">
                  <b>${p.price[interval]}</b>
                  <span>/ month</span>
                </p>
                <YearlyLine p={p} interval={interval} />
                <ul className="ac-feats">
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={16} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="ac-btn pink wide" disabled={!billingReady || !!busy} onClick={() => open('checkout', p.id)}>
                  {!billingReady ? 'Payments open soon' : busy === p.id ? 'Opening checkout…' : `Upgrade to ${p.name}`}
                </button>
              </Card>
            ))}
          </div>
          <p className="ac-fine">
            Secure checkout by Paddle: cards, PayPal, Apple Pay, Google Pay and UPI in India. Cancel any time. <a href="/pricing">Compare plans</a>
          </p>
        </>
      ) : (
        <Card title="Invoices and payment method">
          <p className="ac-mute">Download invoices, change your card, switch between Pro and Team, or cancel, all from Manage billing.</p>
        </Card>
      )}
    </>
  );
}

// Cancelling, GitHub style: read what happens, confirm you understood, then type a phrase. Nothing is sent before the last step.
function CancelDialog(props: {
  info: { refundable: boolean; cancelled: boolean };
  planName: string;
  until: string;
  endsOn: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { info, planName, until, endsOn, busy, onConfirm, onClose } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<'read' | 'type'>('read');
  const [typed, setTyped] = useState('');
  const phrase = info.refundable ? 'cancel and refund' : `cancel ${planName.toLowerCase()}`;
  const nothingToDo = !info.refundable && info.cancelled;
  useEffect(() => ref.current?.showModal(), []);

  const effects = info.refundable
    ? [
        `Your ${planName} plan ends right away and your account goes back to Free.`,
        `We refund your first payment in full. Paddle sends it to the card or account you paid with; banks usually show it within 5 to 10 business days.`,
        `${planName} features stop on your computers the next time ORILOS checks your licence (within a day).`,
        `This is your one refund: if you subscribe again later, the 14-day refund does not apply.`,
      ]
    : [
        `You will not be charged again.`,
        `${planName} stays on until ${endsOn}, then your account goes back to Free.`,
        `There is no refund for the time left: refunds are only possible within 14 days of the first payment.`,
      ];

  return (
    <dialog ref={ref} className="ac-dialog" onClose={onClose} aria-labelledby="cancel-title">
      <header>
        <h2 id="cancel-title">{nothingToDo ? 'Your plan is already cancelled' : info.refundable ? `Cancel ${planName} and refund` : `Cancel ${planName}`}</h2>
        <button className="ac-dialog-x" onClick={() => ref.current?.close()} aria-label="Close" disabled={busy}>
          <X size={18} />
        </button>
      </header>
      <div className="ac-dialog-hero">
        <b>ORILOS {planName}</b>
        <span>{info.refundable ? `Full refund available${until ? ` until ${until}` : ''}` : nothingToDo ? `Stays on until ${endsOn}` : 'No refund after 14 days'}</span>
      </div>

      {nothingToDo ? (
        <div className="ac-dialog-body">
          <p className="ac-mute">
            {planName} stays on until {endsOn}, then switches to Free. Refunds are only possible within 14 days of the first payment.
          </p>
          <button className="ac-btn wide" onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
      ) : step === 'read' ? (
        <div className="ac-dialog-body">
          <p className="ac-dialog-warn">
            <TriangleAlert size={18} aria-hidden="true" /> Please read this before you continue.
          </p>
          <ul className="ac-dialog-list">
            {effects.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button className="ac-btn wide" onClick={() => setStep('type')}>
            I have read and understand these effects
          </button>
        </div>
      ) : (
        <form
          className="ac-dialog-body"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim().toLowerCase() === phrase) onConfirm();
          }}
        >
          <label className="ac-dialog-label" htmlFor="cancel-phrase">
            To confirm, type <b>{phrase}</b> in the box below
          </label>
          <input id="cancel-phrase" autoFocus autoComplete="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy} />
          <button className="ac-btn danger wide" disabled={busy || typed.trim().toLowerCase() !== phrase}>
            {busy ? (info.refundable ? 'Refunding…' : 'Cancelling…') : info.refundable ? 'Cancel and refund' : `Cancel ${planName}`}
          </button>
        </form>
      )}
    </dialog>
  );
}

/* ── Keys ──────────────────────────────────────────────────── */

export function Keys({ me }: Ctx) {
  const { keys, setKeys } = useKeys();
  const max = KEY_LIMITS[me.plan as PlanId] ?? 1;
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { key, ...row } = await api<LicenceKey & { key: string }>('/keys', { method: 'POST', body: { name } });
      setFresh(key);
      setName('');
      setKeys([row, ...(keys ?? [])]);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const revoke = async (id: string) => {
    await api(`/keys/${id}`, { method: 'DELETE' });
    setKeys((keys ?? []).filter((k) => k.id !== id));
    setConfirm('');
  };

  return (
    <>
      <Head title="Keys" sub={`Each licence key connects one computer to this account. Your ${planOf(me.plan).name} plan includes ${max} ${max === 1 ? 'computer' : 'computers'}.`} />

      {fresh && (
        <Card className="ac-fresh">
          <div className="ac-fresh-head">
            <span className="ac-fresh-icon" aria-hidden="true">
              <KeyRound size={18} />
            </span>
            <div>
              <h2>Your new key is ready</h2>
              <p className="ac-mute">Copy it now: we only show it once. Treat it like a password.</p>
            </div>
          </div>
          <ol className="ac-fresh-steps">
            <li>
              <b>Copy your key</b>
              <CopyLine text={fresh} label="Copy key" />
            </li>
            <li>
              <b>Run this on the computer you clip on</b>
              <CopyLine text={`uvx orilos-mcp activate ${fresh}`} label="Copy command" />
            </li>
          </ol>
          <div className="ac-fresh-foot">
            <button className="ac-btn" onClick={() => setFresh(null)}>
              Done, hide the key
            </button>
          </div>
        </Card>
      )}

      <Card title={keys ? `Create a key (${keys.length} of ${max} used)` : 'Create a key'}>
        <form className="ac-inline" onSubmit={create}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Name it after the computer, like Studio PC" aria-label="Key name" />
          <button className="ac-btn pink">Create key</button>
        </form>
        {error && <p className="ac-err">{error}</p>}
      </Card>

      <Card title="Your keys">
        {!keys ? (
          <p className="ac-mute">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="ac-mute">No keys yet. Create one above for each computer you clip on. A key stays with the first computer that uses it; revoke it to move to another.</p>
        ) : (
          <div className="ac-table" role="table">
            <div role="row" className="ac-tr head">
              <span role="columnheader">Name</span>
              <span role="columnheader">Key</span>
              <span role="columnheader">Created</span>
              <span role="columnheader">Last used</span>
              <span role="columnheader" />
            </div>
            {keys.map((k) => (
              <div role="row" className="ac-tr" key={k.id}>
                <span role="cell">
                  <b>{k.name}</b>
                  {k.device && <small>{k.device}</small>}
                </span>
                <span role="cell">
                  <code>{k.prefix}…</code>
                </span>
                <span role="cell">{when(k.createdAt)}</span>
                <span role="cell" className={k.usedAt ? '' : 'ac-faint'}>{k.usedAt ? ago(k.usedAt) : 'Not used yet'}</span>
                <span role="cell" className="ac-end">
                  {confirm === k.id ? (
                    <>
                      <button className="ac-btn danger small" onClick={() => revoke(k.id)}>
                        Revoke
                      </button>
                      <button className="ac-link" onClick={() => setConfirm('')}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button className="ac-btn ghost small" onClick={() => setConfirm(k.id)}>
                      Revoke
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Your AI and platform keys stay on your computer">
        <p className="ac-mute">
          Gemini, ElevenLabs, Tavus, Upload-Post, Instagram and YouTube keys never come to ORILOS. Add them on your computer: ask your AI to run{' '}
          <code>setup</code> and it opens a private page there. They go into your system keychain.
        </p>
      </Card>
    </>
  );
}

/* ── Settings ──────────────────────────────────────────────── */

export function Settings({ me }: Ctx) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [apps, setApps] = useState<{ id: string; name: string; createdAt: number; usedAt: number | null }[] | null>(null);
  const load = useCallback(() => api<{ sessions: Session[] }>('/sessions').then((r) => setSessions(r.sessions)), []);
  const loadApps = useCallback(() => api<{ apps: NonNullable<typeof apps> }>('/oauth/tokens').then((r) => setApps(r.apps)), []);
  useEffect(() => {
    void load();
    void loadApps();
  }, [load, loadApps]);
  const disconnect = async (id: string) => {
    await api(`/oauth/tokens/${id}`, { method: 'DELETE' });
    void loadApps();
  };

  const end = async (id?: string) => {
    await api(id ? `/sessions/${id}` : '/sessions', { method: 'DELETE' });
    void load();
  };
  const remove = async () => {
    setError('');
    try {
      await api('/me', { method: 'DELETE' });
      location.href = '/?deleted=1';
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <Head title="Settings" sub="Security, your data and your account." />

      <Card title="Where you're signed in">
        {!sessions ? (
          <p className="ac-mute">Loading…</p>
        ) : (
          <ul className="ac-sessions">
            {sessions.map((s) => (
              <li key={s.id}>
                <span>
                  <b>{device(s.agent)}</b>
                  {s.current && <span className="ac-chip pro">This device</span>}
                  <small>
                    {s.country && `${s.country} · `}Signed in {when(s.createdAt, me.timezone)} · active {ago(s.seenAt)}
                  </small>
                </span>
                {!s.current && (
                  <button className="ac-link" onClick={() => end(s.id)}>
                    Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {sessions && sessions.length > 1 && (
          <button className="ac-btn" onClick={() => end()}>
            Sign out everywhere else
          </button>
        )}
      </Card>

      <Card title="Connected apps">
        {!apps ? (
          <p className="ac-mute">Loading…</p>
        ) : apps.length === 0 ? (
          <p className="ac-mute">
            None yet. Connect claude.ai on the web or your phone from <a href="/account/plugin#web">Plugin</a>.
          </p>
        ) : (
          <ul className="ac-sessions">
            {apps.map((a) => (
              <li key={a.id}>
                <span>
                  <b>{a.name}</b>
                  <small>
                    Connected {when(a.createdAt, me.timezone)} · last used {ago(a.usedAt)}
                  </small>
                </span>
                <button className="ac-link" onClick={() => disconnect(a.id)}>
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Your data">
        <p className="ac-mute">Download everything ORILOS stores about your account as one JSON file. Your videos and clips are never on our side.</p>
        <a className="ac-btn" href="/api/export" download>
          Download my data
        </a>
      </Card>

      <Card title="Delete account" className="ac-danger">
        <p className="ac-mute">
          This deletes your account and revokes every licence key at once. ORILOS keeps working on your computers on the Free plan. This cannot be undone.
        </p>
        <form
          className="ac-inline"
          onSubmit={(e) => {
            e.preventDefault();
            void remove();
          }}
        >
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" />
          <button className="ac-btn danger" disabled={typed !== 'DELETE'}>
            Delete my account
          </button>
        </form>
        {error && <p className="ac-err">{error}</p>}
      </Card>
    </>
  );
}
