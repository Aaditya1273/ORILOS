// ORILOS Connect sign-in: an app such as claude.ai asks to use ORILOS on this person's computer.
import { Check, Laptop, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, maybeMe, type Me } from './api';
import { Brand } from './Chrome';
import './account.css';

export function Consent() {
  const query = location.search.slice(1);
  const p = new URLSearchParams(query);
  const [me, setMe] = useState<Me | null>(null);
  const [app, setApp] = useState<{ name: string; host: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void maybeMe().then((m) => {
      if (!m) return location.replace(`/signin?next=${encodeURIComponent(location.pathname + location.search)}`);
      setMe(m);
      api<{ name: string; host: string }>(`/oauth/client?client_id=${encodeURIComponent(p.get('client_id') ?? '')}&redirect_uri=${encodeURIComponent(p.get('redirect_uri') ?? '')}`).then(
        setApp,
        (e) => setError((e as Error).message),
      );
    });
  }, []);

  const answer = async (allow: boolean) => {
    setBusy(true);
    try {
      const r = await api<{ redirect: string }>('/oauth/approve', { method: 'POST', body: { query, allow } });
      location.href = r.redirect;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const name = app?.name || 'This app';
  return (
    <div className="ac ac-consent">
      <main className="ac-consent-card">
        <Brand />
        {error ? (
          <>
            <h1>That didn't work</h1>
            <p className="ac-mute">{error}</p>
            <a className="ac-btn wide" href="/account/connect#web">
              Back to ORILOS
            </a>
          </>
        ) : !app || !me ? (
          <p className="ac-mute">Loading…</p>
        ) : (
          <>
            <h1>Allow {name} to use ORILOS?</h1>
            <p className="ac-mute">
              Signed in as <b>{me.email}</b>. {name} will return to <b>{app.host}</b>.
            </p>
            <ul className="ac-consent-list">
              <li>
                <Laptop size={18} aria-hidden="true" /> Clip, render, schedule and post with ORILOS running on your computer.
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Videos, clips and your platform keys stay on your computer.
              </li>
              <li>
                <ShieldCheck size={18} aria-hidden="true" /> Disconnect it any time in Settings.
              </li>
            </ul>
            <div className="ac-consent-actions">
              <button className="ac-btn ghost" onClick={() => answer(false)} disabled={busy}>
                Deny
              </button>
              <button className="ac-btn pink" onClick={() => answer(true)} disabled={busy}>
                {busy ? 'Connecting…' : 'Allow'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
