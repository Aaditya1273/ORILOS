import { Brain as BrainIcon, Download, KeyRound, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { idbClear } from '../lib/db';
import { IMAGE_APPS } from '../lib/images';
import { PLATFORMS } from '../lib/platforms';
import { getState, initialState, setState, useStore } from '../lib/store';
import type { Brain, PlatformId, Settings as S, State } from '../lib/types';
import { removeKey } from '../lib/vault';
import { ai, friendly, rebuildBrain, useRun } from '../lib/worker';
import { KeySetup } from './KeySetup';
import { PlatformBadge, Section, Seg, Switch, toast } from './kit';

export function Settings({ hasKey, onKeyChange, focus }: { hasKey: boolean; onKeyChange: () => void; focus?: string }) {
  const s = useStore((st) => st);
  const run = useRun();
  const keyRef = useRef<HTMLDivElement>(null);
  const [checking, setChecking] = useState(false);
  const setSetting = (patch: Partial<S>) => setState((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const ws = s.workspace;

  useEffect(() => {
    if (focus === 'key') keyRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [focus]);

  async function check() {
    setChecking(true);
    try {
      const r = await ai.verify();
      toast(`Connected · ${r.model} · ${r.count} models`);
    } catch (e) {
      toast(friendly(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page narrow">
      <h1 className="h1">Settings</h1>

      {ws && (
        <Section title="Your business">
          <div className="card col">
            <label className="field">
              <span>Business name</span>
              <input className="input" defaultValue={ws.name} onBlur={(e) => setState((st) => ({ ...st, workspace: st.workspace && { ...st.workspace, name: e.target.value.trim() || st.workspace.name } }))} />
            </label>
            <label className="field">
              <span>Website</span>
              <input className="input" defaultValue={ws.website} onBlur={(e) => setState((st) => ({ ...st, workspace: st.workspace && { ...st.workspace, website: e.target.value.trim() } }))} />
            </label>
            <label className="field">
              <span>What you do, and for whom</span>
              <textarea className="input" rows={2} defaultValue={ws.niche} onBlur={(e) => setState((st) => ({ ...st, workspace: st.workspace && { ...st.workspace, niche: e.target.value.trim() } }))} />
            </label>
            <div className="field">
              <span>Platforms</span>
              <div className="row wrap" style={{ gap: 8 }}>
                {PLATFORMS.map((p) => {
                  const on = ws.platforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      className="choice"
                      style={{ width: 'auto' }}
                      role="checkbox"
                      aria-checked={on}
                      onClick={() =>
                        setState((st) => {
                          const cur = st.workspace!.platforms;
                          const next = on ? cur.filter((x) => x !== p.id) : ([...cur, p.id] as PlatformId[]);
                          return next.length ? { ...st, workspace: { ...st.workspace!, platforms: next } } : st;
                        })
                      }
                    >
                      <PlatformBadge platform={p.id} size={24} /> {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {ws.platforms.includes('x') && (
              <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>X account</div>
                  <div className="small muted">Premium allows long posts; only the first 280 characters show before “Show more”.</div>
                </div>
                <Seg
                  label="X account type"
                  value={ws.xPremium ? 'premium' : 'free'}
                  options={[
                    ['free', 'Free'],
                    ['premium', 'Premium'],
                  ]}
                  onChange={(v) => setState((st) => ({ ...st, workspace: st.workspace && { ...st.workspace, xPremium: v === 'premium' } }))}
                />
              </div>
            )}
          </div>
        </Section>
      )}

      {s.brain && <BrainSection brain={s.brain} running={run.running} />}

      <Section title="AI key">
        <div className="card col" ref={keyRef} id="key">
          <div className="row">
            <KeyRound size={18} className="muted" />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Google Gemini</div>
              <div className={`small ${hasKey ? 'ok' : 'warn'}`}>{hasKey ? 'Connected · encrypted in this browser' : 'Not connected'}</div>
            </div>
          </div>
          {hasKey && (
            <div className="row wrap" style={{ gap: 8 }}>
              <button className="btn outline sm" disabled={checking} onClick={() => void check()}>
                {checking ? 'Checking…' : 'Check connection'}
              </button>
              <button className="btn ghost sm danger" onClick={() => void removeKey().then(onKeyChange)}>
                Remove key
              </button>
            </div>
          )}
          <KeySetup hasKey={hasKey} onDone={onKeyChange} />
        </div>
      </Section>

      <Section title="Images">
        <div className="card col">
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Your image app</div>
              <div className="small muted">“Create in …” opens it with the image brief. Paste the result back into the post.</div>
            </div>
            <Seg label="Image app" value={s.settings.imageApp} options={Object.entries(IMAGE_APPS).map(([k, v]) => [k as S['imageApp'], v.label])} onChange={(v) => setSetting({ imageApp: v })} />
          </div>
          <div className="divider" />
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Also create images with my Gemini key</div>
              <div className="small muted">Gemini image models need a paid (billing-enabled) key. The free tier has no image allowance.</div>
            </div>
            <Switch label="Gemini images" checked={s.settings.geminiImages} onChange={(v) => setSetting({ geminiImages: v })} />
          </div>
        </div>
      </Section>

      <Section title="Learning">
        <div className="card row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Learn from my changes</div>
            <div className="small muted">{s.settings.learnFromEdits ? 'On — ORILOS studies how you edit drafts before approving them.' : 'Off — your edits are not used.'}</div>
          </div>
          <Switch label="Learn from my changes" checked={s.settings.learnFromEdits} onChange={(v) => setSetting({ learnFromEdits: v })} />
        </div>
      </Section>

      <Section title="Appearance">
        <div className="card">
          <Seg
            label="Theme"
            value={s.settings.theme}
            options={[
              ['system', 'System'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ]}
            onChange={(v) => setSetting({ theme: v })}
          />
        </div>
      </Section>

      <DataSection />
      <p className="small muted" style={{ marginTop: 32 }}>
        ORILOS stores everything in this browser. It talks only to Google Gemini, with your key. Handwriting: Hershey fonts, Dr. A. V. Hershey, U.S. National Bureau of Standards.
      </p>
    </div>
  );
}

const lines = (xs?: string[]) => (xs ?? []).join('\n');
const items = (xs?: { name: string; description?: string }[]) => (xs ?? []).map((i) => (i.description ? `${i.name} — ${i.description}` : i.name)).join('\n');
const toLines = (v: string) =>
  v
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
const toItems = (v: string) =>
  toLines(v).map((l) => {
    const [name, ...rest] = l.split(' — ');
    return { name: name.trim(), description: rest.join(' — ').trim() };
  });

function BrainSection({ brain, running }: { brain: Brain; running: boolean }) {
  const [edit, setEdit] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const fields: [keyof Brain, string, 'line' | 'lines' | 'items'][] = [
    ['one_liner', 'One-liner', 'line'],
    ['tone', 'Tone (one per line)', 'lines'],
    ['audience_segments', 'Audience (one per line)', 'lines'],
    ['content_pillars', 'Content pillars (name — description)', 'items'],
    ['key_messages', 'Key messages (one per line)', 'lines'],
    ['banned_phrases', 'Never say (one per line)', 'lines'],
  ];
  function save() {
    const f = new FormData(form.current!);
    const patch: Partial<Brain> = {};
    for (const [k, , kind] of fields) {
      const v = String(f.get(k) ?? '');
      (patch as Record<string, unknown>)[k] = kind === 'line' ? v.trim() : kind === 'lines' ? toLines(v) : toItems(v);
    }
    setState((st) => ({ ...st, brain: st.brain && { ...st.brain, ...patch, updatedAt: Date.now() } }));
    setEdit(false);
    toast('Brand Brain saved');
  }
  return (
    <Section
      title="Brand Brain"
      action={
        <div className="row" style={{ gap: 4 }}>
          <button className="btn ghost sm" onClick={() => (edit ? save() : setEdit(true))}>
            {edit ? 'Save' : 'Edit'}
          </button>
          <button className="btn ghost sm" disabled={running} onClick={() => void rebuildBrain()}>
            <RefreshCw size={16} /> Relearn
          </button>
        </div>
      }
    >
      <form ref={form} className="card col" onSubmit={(e) => (e.preventDefault(), save())}>
        <div className="row">
          <BrainIcon size={18} className="muted" />
          <strong className="grow">{brain.brand_name}</strong>
        </div>
        {fields.map(([k, label, kind]) => {
          const v = brain[k] as never;
          const text = kind === 'line' ? String(v ?? '') : kind === 'lines' ? lines(v) : items(v);
          return (
            <label key={k} className="field">
              <span>{label}</span>
              {edit ? (
                kind === 'line' ? (
                  <input className="input" name={k} defaultValue={text} />
                ) : (
                  <textarea className="input" name={k} rows={Math.max(2, text.split('\n').length)} defaultValue={text} />
                )
              ) : (
                <div className="secondary" style={{ whiteSpace: 'pre-line' }}>
                  {text || '—'}
                </div>
              )}
            </label>
          );
        })}
        {brain.sources.length > 0 && (
          <details className="small">
            <summary style={{ cursor: 'pointer' }}>Learned from {brain.sources.length} sources</summary>
            <ul style={{ paddingLeft: 18 }}>
              {brain.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    {src.title || src.url}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </form>
    </Section>
  );
}

function DataSection() {
  const file = useRef<HTMLInputElement>(null);

  function exportData() {
    // The key is never part of an export (it lives in the vault, not in state).
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orilos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  async function importData(f: File) {
    try {
      const j = JSON.parse(await f.text()) as Partial<State>;
      if (j.version !== 1 || !Array.isArray(j.posts) || !Array.isArray(j.activity)) throw new Error('not an ORILOS backup');
      const base = initialState();
      // Only known top-level fields; images are not part of backups.
      setState(() => ({
        ...base,
        workspace: j.workspace,
        brain: j.brain,
        posts: j.posts!.map((p) => ({ ...p, image: undefined })),
        activity: j.activity!.slice(0, 300),
        schedule: { ...base.schedule, ...j.schedule },
        settings: { ...base.settings, ...j.settings },
        focus: String(j.focus ?? ''),
      }));
      toast('Backup restored');
    } catch (e) {
      toast(`Couldn’t import: ${(e as Error).message}`);
    }
  }

  async function wipe() {
    if (!confirm('Delete everything ORILOS stored in this browser, including your key? This can’t be undone.')) return;
    await removeKey();
    await idbClear('blobs');
    await idbClear('kv');
    location.hash = '#/home';
    location.reload();
  }

  return (
    <Section title="Your data">
      <div className="card row wrap" style={{ gap: 8 }}>
        <button className="btn outline sm" onClick={exportData}>
          <Download size={16} /> Export backup
        </button>
        <button className="btn outline sm" onClick={() => file.current?.click()}>
          <Upload size={16} /> Import backup
        </button>
        <div className="grow" />
        <button className="btn ghost sm danger" onClick={() => void wipe()}>
          <Trash2 size={16} /> Delete everything
        </button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void importData(e.target.files[0])} />
      </div>
    </Section>
  );
}
