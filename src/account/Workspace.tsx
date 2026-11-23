// The creative side of the account: build prompts for your AI, browse styles and voices, plan Autopilot and posting.
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Captions,
  Check,
  Copy,
  Flame,
  KeyRound,
  Link2,
  Mic,
  Palette,
  Radio,
  Search,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { STYLES, VOICE_LANGUAGES } from '../docs/data';
import { ago } from './api';
import { plan as planOf } from './plans';
import { autopilotPrompt, BEST_HOURS, clipPrompt, DEFAULT_CHOICES, EDITS, PLATFORMS, type ClipChoices, type Edit, type WatchChoices } from './prompts';
import { Card, CopyLine, Head, useKeys, type Ctx, type Go } from './ui';

/* ── Small pieces ──────────────────────────────────────────── */

function useCopy(): [string, (text: string) => void] {
  const [copied, setCopied] = useState('');
  const copy = (text: string) =>
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied((c) => (c === text ? '' : c)), 1400);
    });
  return [copied, copy];
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ws-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Chips({ value, options, onChange, label }: { value: string[]; options: readonly string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="ws-chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} className={on ? 'on' : ''} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
            {on && <Check size={14} aria-hidden="true" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ws-field">
      <span>{label}</span>
      {children}
    </div>
  );
}

function PromptOut({ text }: { text: string }) {
  return (
    <div className="ws-out">
      <p className="ac-stat-label">Paste this into Claude Code or Codex</p>
      <CopyLine text={text} label="Copy prompt" />
    </div>
  );
}

const link = (go: Go, to: string) => (e: MouseEvent) => {
  if (to.startsWith('/account')) {
    e.preventDefault();
    go(to);
  }
};

/* ── The clip builder ──────────────────────────────────────── */

function Builder({ go, compact = false, initialUrl = '' }: { go: Go; compact?: boolean; initialUrl?: string }) {
  const [c, setC] = useState<ClipChoices>({ ...DEFAULT_CHOICES, url: initialUrl });
  const set = (patch: Partial<ClipChoices>) => setC({ ...c, ...patch });
  const prompt = clipPrompt(c);

  return (
    <div className={`ws-builder${compact ? ' compact' : ''}`}>
      <label className="ws-url">
        <Link2 size={20} aria-hidden="true" />
        <input value={c.url} onChange={(e) => set({ url: e.target.value })} placeholder="Paste a YouTube, Twitch, Kick or podcast link…" aria-label="Video link" inputMode="url" />
      </label>
      <div className="ws-opts">
        <Field label="Clips">
          <Seg label="Number of clips" value={c.clips} onChange={(clips) => set({ clips })} options={[3, 5, 8, 12].map((n) => [n, String(n)] as [number, string])} />
        </Field>
        {!compact && (
          <>
            <Field label="Caption style">
              <select value={c.style} onChange={(e) => set({ style: e.target.value })}>
                <option value="">Let my AI choose</option>
                {STYLES.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}: {s.look}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Edit">
              <Seg<Edit | ''> label="Edit style" value={c.edit} onChange={(edit) => set({ edit })} options={[['', 'Auto'], ...(Object.keys(EDITS) as Edit[]).map((e) => [e, e[0].toUpperCase() + e.slice(1)] as [Edit, string])]} />
            </Field>
            <Field label="Language">
              <select value={c.language} onChange={(e) => set({ language: e.target.value })}>
                <option value="">Same as the video</option>
                {VOICE_LANGUAGES.map(([code, name]) => (
                  <option key={code}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="Extras">
              <Chips
                label="Extras"
                value={[c.voiceHook && 'Spoken hook', c.brand && 'My brand kit'].filter(Boolean) as string[]}
                options={['Spoken hook', 'My brand kit']}
                onChange={(v) => set({ voiceHook: v.includes('Spoken hook'), brand: v.includes('My brand kit') })}
              />
            </Field>
            <Field label="Then">
              <Seg label="After clipping" value={c.when} onChange={(when) => set({ when })} options={[['none', 'Just clip'], ['now', 'Post the best one'], ['best', 'Schedule them all']]} />
            </Field>
            {c.when !== 'none' && (
              <Field label="Where">
                <Chips label="Platforms" value={c.platforms} options={PLATFORMS} onChange={(platforms) => set({ platforms })} />
              </Field>
            )}
          </>
        )}
      </div>
      <PromptOut text={prompt} />
      {compact && (
        <a className="ac-link" href="/account/create" onClick={link(go, `/account/create${c.url ? `?url=${encodeURIComponent(c.url)}` : ''}`)}>
          Styles, language, posting and more <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}

/* ── Home ──────────────────────────────────────────────────── */

const TOOLS: { icon: LucideIcon; title: string; text: string; to: string }[] = [
  { icon: Wand2, title: 'Clip builder', text: 'Every option, one prompt', to: '/account/create' },
  { icon: Captions, title: 'Caption styles', text: `${STYLES.length} looks, any script`, to: '/account/styles' },
  { icon: Mic, title: 'Voices', text: `Spoken hooks in ${VOICE_LANGUAGES.length} languages`, to: '/account/voices' },
  { icon: Radio, title: 'Autopilot', text: 'Clip every stream, live', to: '/account/autopilot' },
  { icon: CalendarClock, title: 'Schedule', text: 'Best hours on 9 platforms', to: '/account/schedule' },
  { icon: Palette, title: 'Brand kits', text: 'Logo, colours, font', to: '/docs/brand-kits' },
  { icon: Flame, title: 'Hot moments', text: 'What viewers loved', to: '/docs/hot-moments' },
  { icon: Bot, title: 'AI actors', text: 'UGC ads with Tavus', to: '/docs/ugc' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night session' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home({ me, go }: Ctx) {
  const { keys } = useKeys();
  const first = (me.name || '').split(' ')[0];
  const active = keys?.filter((k) => k.usedAt).sort((a, b) => (b.usedAt ?? 0) - (a.usedAt ?? 0)) ?? [];
  const steps = [
    { done: (keys?.length ?? 0) > 0, title: 'Create a licence key', to: '/account/keys' },
    { done: active.length > 0, title: 'Install and activate ORILOS', to: '/account/keys' },
    { done: active.length > 0, title: 'Clip your first video', to: '/docs/first-clip' },
  ];
  const setupDone = keys !== null && steps.every((s) => s.done);

  return (
    <>
      <section className="ws-hero">
        <p className="ac-eyebrow">
          {greeting()}, {first || 'creator'}
        </p>
        <h1>
          What are we <span className="pink">clipping</span> today?
        </h1>
        <Builder compact go={go} />
      </section>

      <div className="ws-tiles">
        {TOOLS.map((t) => (
          <a key={t.title} className="ws-tile" href={t.to} onClick={link(go, t.to)}>
            <span className="ws-tile-icon">
              <t.icon size={22} aria-hidden="true" />
            </span>
            <b>{t.title}</b>
            <small>{t.text}</small>
          </a>
        ))}
      </div>

      <div className="ws-row">
        {!setupDone ? (
          <Card title="Finish setting up">
            <ol className="ac-steps">
              {steps.map((s, i) => (
                <li key={s.title} className={s.done ? 'done' : ''}>
                  <span className="ac-step-n">{s.done ? <Check size={14} /> : i + 1}</span>
                  <span>
                    <b>{s.title}</b>
                  </span>
                  {!s.done && (
                    <a className="ac-link" href={s.to} onClick={link(go, s.to)}>
                      Go <ArrowRight size={14} />
                    </a>
                  )}
                </li>
              ))}
            </ol>
            <CopyLine text="uvx orilos-mcp install" />
          </Card>
        ) : (
          <Card title="Your computers">
            <ul className="ws-list">
              {active.map((k) => (
                <li key={k.id}>
                  <KeyRound size={16} aria-hidden="true" />
                  <b>{k.name}</b>
                  <small>{k.device}</small>
                  <span>{ago(k.usedAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card title="Your plan">
          <p className="ac-stat">{planOf(me.plan).name}</p>
          <p className="ac-mute">
            {me.plan === 'free' ? 'Unlimited clips on your computer. Pro adds every style, brand kits, scheduling and Autopilot.' : 'Every ORILOS feature is on. Thank you for backing us.'}
          </p>
          <a className={`ac-btn${me.plan === 'free' ? ' pink' : ''}`} href="/account/billing" onClick={link(go, '/account/billing')}>
            {me.plan === 'free' ? 'See Pro' : 'Manage plan'}
          </a>
        </Card>
        <Card title="What's new">
          <ul className="ws-news">
            <li>
              <Sparkles size={16} aria-hidden="true" />
              <span>
                <b>Accounts and licence keys.</b> Connect every computer you clip on.
              </span>
            </li>
            <li>
              <Captions size={16} aria-hidden="true" />
              <span>
                <b>{STYLES.length} caption styles</b> in every script, plus the new ORILOS pink looks.
              </span>
            </li>
            <li>
              <Radio size={16} aria-hidden="true" />
              <span>
                <b>Autopilot</b> clips Twitch, Kick and YouTube streams while you sleep.
              </span>
            </li>
          </ul>
          <a className="ac-link" href="/docs/changelog">
            Full changelog <ArrowRight size={14} />
          </a>
        </Card>
      </div>
    </>
  );
}

/* ── Create ────────────────────────────────────────────────── */

export function Create({ go }: Ctx) {
  const url = new URLSearchParams(location.search).get('url') ?? '';
  return (
    <>
      <Head title="Clip builder" sub="Pick what you want. ORILOS turns it into one sentence for your AI." />
      <div className="ws-create">
        <Card>
          <Builder go={go} initialUrl={url} />
        </Card>
        <Card title="What happens next" className="ws-how">
          <ol>
            <li>
              <span>
                <b>Copy the prompt</b> and paste it into Claude Code, Codex or any AI app with ORILOS.
              </span>
            </li>
            <li>
              <span>
                <b>ORILOS listens</b> on your computer: transcript, chat spikes, most replayed and the loudest seconds.
              </span>
            </li>
            <li>
              <span>
                <b>Your AI picks</b> the moments that pass the 2-second test and writes the hooks and captions.
              </span>
            </li>
            <li>
              <span>
                <b>ORILOS renders</b> 9:16 clips with your captions, edits and brand, then posts where you said.
              </span>
            </li>
          </ol>
          <a className="ac-link" href="/docs/first-clip">
            Read the guide <ArrowRight size={14} />
          </a>
        </Card>
      </div>
    </>
  );
}

/* ── Caption styles ────────────────────────────────────────── */

const STYLE_FILTERS: [string, RegExp][] = [
  ['All', /./],
  ['ORILOS', /^orilos/],
  ['Podcasts', /podcast|interview|talking|advice/i],
  ['Gaming', /gaming|stream|night/i],
  ['Hype', /hype|hook|punch|energy|viral/i],
  ['Brand', /brand|founder|product|business/i],
  ['Minimal', /minimal|clean|calm|subtle|explainer/i],
];

export function Styles(_: Ctx) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [copied, copy] = useCopy();
  const shown = useMemo(() => {
    const rx = STYLE_FILTERS.find(([f]) => f === filter)![1];
    const needle = q.trim().toLowerCase();
    return STYLES.filter((s) => {
      const text = `${s.name} ${s.look} ${s.best_for}`;
      return rx.test(filter === 'ORILOS' ? s.name : text) && (!needle || text.toLowerCase().includes(needle));
    });
  }, [q, filter]);

  return (
    <>
      <Head title="Caption styles" sub={`${STYLES.length} looks. Click one to copy the prompt that uses it.`} />
      <img className="ws-sheet" src="/caption-styles.webp" alt="A sheet of ORILOS caption styles" loading="lazy" />
      <div className="ws-toolbar">
        <label className="ws-search">
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search styles" aria-label="Search styles" />
        </label>
        <Seg label="Filter" value={filter} onChange={setFilter} options={STYLE_FILTERS.map(([f]) => [f, f])} />
        <span className="ac-fine">{shown.length} styles</span>
      </div>
      <div className="ws-grid">
        {shown.map((s) => {
          const text = `Use the ${s.name} caption style.`;
          return (
            <button key={s.name} className="ws-style" onClick={() => copy(text)}>
              <code>{s.name}</code>
              <span>{s.look}</span>
              <small>Best for: {s.best_for}</small>
              <i aria-hidden="true">{copied === text ? <Check size={16} /> : <Copy size={16} />}</i>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Voices ────────────────────────────────────────────────── */

export function Voices(_: Ctx) {
  const [q, setQ] = useState('');
  const [copied, copy] = useCopy();
  const shown = VOICE_LANGUAGES.filter(([code, name]) => `${code} ${name}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Head title="Voices" sub={`A spoken hook and captions in ${VOICE_LANGUAGES.length} languages. Free voices that run offline on your computer.`} />
      <div className="ws-toolbar">
        <label className="ws-search">
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search languages" aria-label="Search languages" />
        </label>
        <span className="ac-fine">Click a language to copy its prompt</span>
      </div>
      <div className="ws-langs">
        {shown.map(([code, name]) => {
          const text = `Add a spoken hook and captions in ${name}.`;
          return (
            <button key={code} onClick={() => copy(text)} className={copied === text ? 'on' : ''}>
              <code>{code}</code>
              {name}
              {copied === text && <Check size={14} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <Card title="Want studio-grade voices?">
        <p className="ac-mute">
          Add an ElevenLabs key on your computer (ask your AI to run <code>setup</code>) and ORILOS uses it for every spoken hook. <a href="/docs/voices">Voices guide</a>
        </p>
      </Card>
    </>
  );
}

/* ── Autopilot ─────────────────────────────────────────────── */

export function Autopilot(_: Ctx) {
  const [w, setW] = useState<WatchChoices>({ channel: '', mode: 'review', clips: 3, platforms: [] });
  return (
    <>
      <Head title="Autopilot" sub="Watch a channel. Every stream becomes clips, live and after it ends." />
      <div className="ws-steps3">
        {[
          ['Live', 'When the stream goes live, ORILOS records it with the chat and clips the moments chat exploded.'],
          ['After', 'When it ends, ORILOS clips the VOD where viewers clipped, chatted and replayed the most.'],
          ['You', 'Review mode waits for your OK in the Studio. Auto mode schedules the posts itself.'],
        ].map(([t, d], i) => (
          <Card key={t}>
            <p className="ac-stat-label">0{i + 1}</p>
            <p className="ac-stat">{t}</p>
            <p className="ac-mute">{d}</p>
          </Card>
        ))}
      </div>
      <Card title="Watch a channel">
        <label className="ws-url">
          <Radio size={20} aria-hidden="true" />
          <input value={w.channel} onChange={(e) => setW({ ...w, channel: e.target.value })} placeholder="https://www.twitch.tv/yourchannel" aria-label="Channel link" inputMode="url" />
        </label>
        <div className="ws-opts">
          <Field label="Mode">
            <Seg label="Mode" value={w.mode} onChange={(mode) => setW({ ...w, mode })} options={[['review', 'Review first'], ['auto', 'Post automatically']]} />
          </Field>
          <Field label="Clips per stream">
            <Seg label="Clips per stream" value={w.clips} onChange={(clips) => setW({ ...w, clips })} options={[2, 3, 5, 8].map((n) => [n, String(n)] as [number, string])} />
          </Field>
          {w.mode === 'auto' && (
            <Field label="Post to">
              <Chips label="Platforms" value={w.platforms} options={PLATFORMS} onChange={(platforms) => setW({ ...w, platforms })} />
            </Field>
          )}
        </div>
        <PromptOut text={autopilotPrompt(w)} />
      </Card>
      <Card title="Keep it on all the time">
        <p className="ac-mute">Autopilot runs while any AI app has ORILOS open. To keep it running without one, leave this going on any computer:</p>
        <CopyLine text="uvx orilos-mcp autopilot" />
        <p className="ac-fine">
          Works with Twitch, Kick and YouTube channels. <a href="/docs/autopilot">Autopilot guide</a>
        </p>
      </Card>
    </>
  );
}

/* ── Schedule ──────────────────────────────────────────────── */

export function Schedule({ me }: Ctx) {
  const now = new Date().getHours();
  return (
    <>
      <Head title="Schedule" sub="Each platform's best hours, starred. ORILOS spreads your clips across them." />
      <Card title="Best hours to post">
        <div className="ws-heat" role="table" aria-label="Best posting hours by platform">
          <div role="row" className="ws-heat-row head">
            <span role="columnheader" />
            {Array.from({ length: 24 }, (_, h) => (
              <span role="columnheader" key={h} className={h === now ? 'now' : ''}>
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </span>
            ))}
          </div>
          {BEST_HOURS.map(([p, hours, note]) => (
            <div role="row" className="ws-heat-row" key={p}>
              <span role="rowheader">
                {p}
                {note && <small>{note}</small>}
              </span>
              {Array.from({ length: 24 }, (_, h) => (
                <span role="cell" key={h} className={`${hours.includes(h) ? 'best' : ''}${h === now ? ' now' : ''}`} title={hours.includes(h) ? `${p}: ${h}:00` : undefined} />
              ))}
            </div>
          ))}
        </div>
        <p className="ac-fine">
          Local time on the computer running ORILOS (your profile says {me.timezone}). The pink line is now. At most 2 posts a day per platform, never two within 3 hours.
        </p>
      </Card>
      <div className="ws-row two">
        <Card title="Plan your week">
          <PromptOut text="Plan my week: schedule my approved clips to TikTok, Instagram and YouTube at their best hours." />
        </Card>
        <Card title="See it on a calendar">
          <img className="ws-sheet" src="/studio-calendar.webp" alt="The ORILOS Studio calendar" loading="lazy" />
          <p className="ac-mute">Drag clips onto times in the Studio, a private page on your computer.</p>
          <CopyLine text="uvx orilos-mcp studio" />
        </Card>
      </div>
    </>
  );
}
