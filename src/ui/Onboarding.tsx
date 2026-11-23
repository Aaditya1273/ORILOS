import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { PLATFORMS } from '../lib/platforms';
import { setState } from '../lib/store';
import type { PlatformId, Workspace } from '../lib/types';
import { rebuildBrain } from '../lib/worker';
import { KeySetup } from './KeySetup';
import { Mark, PlatformBadge, Seg } from './kit';

const GOALS = ['Get more customers', 'Build trust and authority', 'Launch something new', 'Grow an audience'];

export function Onboarding({ hasKey, onKey }: { hasKey: boolean; onKey: () => void }) {
  const [step, setStep] = useState(0);
  const [ws, setWs] = useState<Workspace>({ name: '', website: '', niche: '', goal: GOALS[0], platforms: ['x', 'linkedin', 'instagram'], xPremium: false, watch: [] });
  const patch = (p: Partial<Workspace>) => setWs((w) => ({ ...w, ...p }));
  const website = ws.website.trim() && !/^https?:\/\//.test(ws.website.trim()) ? `https://${ws.website.trim()}` : ws.website.trim();

  function finish() {
    setState((s) => ({ ...s, workspace: { ...ws, website } }));
    void rebuildBrain();
    location.hash = '#/home';
  }

  const steps = [
    {
      title: 'Hi, I’m ORILOS.',
      sub: 'I research what’s happening in your space, write posts in your voice for X, LinkedIn, Instagram, Threads, Reddit and more, and get them ready. You approve. You post.',
      body: null,
      next: 'Let’s start',
      ok: true,
    },
    {
      title: 'What’s your business?',
      sub: 'I’ll read your website to learn how you talk and what you offer.',
      body: (
        <div className="col">
          <label className="field">
            <span>Business name</span>
            <input className="input" value={ws.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Acme Coffee" autoFocus />
          </label>
          <label className="field">
            <span>Website (optional)</span>
            <input className="input" value={ws.website} onChange={(e) => patch({ website: e.target.value })} placeholder="acme.coffee" inputMode="url" />
          </label>
          <label className="field">
            <span>What do you do, and for whom?</span>
            <textarea className="input" rows={3} value={ws.niche} onChange={(e) => patch({ niche: e.target.value })} placeholder="Specialty coffee roaster selling subscriptions to home brewers" />
          </label>
        </div>
      ),
      next: 'Continue',
      ok: ws.name.trim().length > 1 && ws.niche.trim().length > 5,
    },
    {
      title: 'What should your posts do?',
      sub: 'I plan every post around this.',
      body: (
        <div className="col">
          {GOALS.map((g) => (
            <button key={g} className="choice" aria-pressed={ws.goal === g} onClick={() => patch({ goal: g })}>
              <span className="grow">{g}</span>
              {ws.goal === g && <Check size={18} />}
            </button>
          ))}
        </div>
      ),
      next: 'Continue',
      ok: true,
    },
    {
      title: 'Where do you post?',
      sub: 'Each post is written natively for each place — not copied. Start with two or three: each one adds AI requests to every run.',
      body: (
        <div className="col">
          {PLATFORMS.map((p) => {
            const on = ws.platforms.includes(p.id);
            return (
              <button
                key={p.id}
                className="choice"
                role="checkbox"
                aria-checked={on}
                onClick={() => patch({ platforms: on ? ws.platforms.filter((x) => x !== p.id) : ([...ws.platforms, p.id] as PlatformId[]) })}
              >
                <PlatformBadge platform={p.id} size={32} />
                <span className="grow">{p.label}</span>
                {on && <Check size={18} />}
              </button>
            );
          })}
          {ws.platforms.includes('x') && (
            <div className="row wrap" style={{ justifyContent: 'space-between' }}>
              <span className="small secondary">Your X account</span>
              <Seg
                label="X account type"
                value={ws.xPremium ? 'premium' : 'free'}
                options={[
                  ['free', 'Free · 280'],
                  ['premium', 'Premium · long posts'],
                ]}
                onChange={(v) => patch({ xPremium: v === 'premium' })}
              />
            </div>
          )}
        </div>
      ),
      next: 'Continue',
      ok: ws.platforms.length > 0,
    },
    {
      title: 'Connect your AI',
      sub: 'ORILOS runs on Google Gemini with your own free key. Free from Google. Encrypted in this browser.',
      body: hasKey ? <p className="ok">Your key is connected.</p> : <KeySetup onDone={onKey} />,
      next: 'Build my Brand Brain',
      ok: hasKey,
    },
  ];
  const s = steps[step];

  return (
    <main className="main" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div className="page narrow" style={{ width: '100%', maxWidth: 520 }} key={step}>
        <div className="row" style={{ marginBottom: 28 }}>
          <Mark size={56} />
          <div className="grow" />
          <span className="small muted">
            {step + 1} / {steps.length}
          </span>
        </div>
        <h1 className="h1">{s.title}</h1>
        <p className="secondary" style={{ margin: '10px 0 24px' }}>
          {s.sub}
        </p>
        {s.body}
        <div className="row" style={{ marginTop: 28 }}>
          {step > 0 && (
            <button className="btn ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <div className="grow" />
          <button className="btn primary" disabled={!s.ok} onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}>
            {s.next} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
