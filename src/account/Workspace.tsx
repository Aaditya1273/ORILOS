// The creative side of the account: build prompts for your AI, browse styles and voices, plan Autopilot and posting.
import {
  ArrowRight,
  Bot,
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
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { STYLES, VOICE_LANGUAGES } from '../docs/data';
import { ago } from './api';
import { GTA_PICKED, GTA_VIDEOS, gtaPrompt, type GtaFocus, type GtaKind, type GtaVideo } from './gta';
import { FREE_STYLES, plan as planOf } from './plans';
import { autopilotPrompt, BEST_HOURS, clipPrompt, DEFAULT_CHOICES, DEFAULT_SCHEDULE, EDITS, nextSlots, PLATFORMS, schedulePrompt, zonedNow, type ClipChoices, type Edit, type ScheduleChoices, type WatchChoices } from './prompts';
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

/** One choice from many: separate pills that wrap cleanly (a segmented control is for 2 to 4 short options). */
function Pick<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ws-chips" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {value === v && <Check size={14} aria-hidden="true" />}
          {text}
        </button>
      ))}
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

/** One button: copies the sentence for the AI. The sentence itself shows on hover, not as a wall of text. */
function PromptOut({ text }: { text: string }) {
  const [copied, copy] = useCopy();
  const done = copied === text;
  return (
    <div className="ws-out">
      <button type="button" className={`ac-btn pink ws-copy-prompt${done ? ' done' : ''}`} onClick={() => copy(text)} title={text} aria-label={`Copy prompt: ${text}`}>
        {done ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        {done ? 'Copied' : 'Copy prompt'}
      </button>
      <span className="ac-fine">{done ? 'Now paste it into your AI.' : 'Then paste it into Claude Code, Codex, Cursor or claude.ai.'}</span>
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

function Builder({ initialUrl = '', free = false }: { initialUrl?: string; free?: boolean }) {
  const [c, setC] = useState<ClipChoices>({ ...DEFAULT_CHOICES, url: initialUrl });
  const set = (patch: Partial<ClipChoices>) => setC({ ...c, ...patch });
  const prompt = clipPrompt(c);
  const pro = (label: string) => (free ? `${label} (Pro)` : label);
  const [HOOK, BRAND] = [pro('Spoken hook'), pro('My brand kit')];
  const needsPro = free && ((c.style && !FREE_STYLES.has(c.style)) || c.voiceHook || c.brand || c.when === 'best');

  return (
    <div className="ws-builder">
      <label className="ws-url">
        <Link2 size={20} aria-hidden="true" />
        <input value={c.url} onChange={(e) => set({ url: e.target.value })} placeholder="Paste a YouTube, Twitch, Kick or podcast link…" aria-label="Video link" inputMode="url" />
      </label>
      <div className="ws-opts">
        <Field label="Clips">
          <Seg label="Number of clips" value={c.clips} onChange={(clips) => set({ clips })} options={[3, 5, 8, 12].map((n) => [n, String(n)] as [number, string])} />
        </Field>
            <Field label="Caption style">
              <select value={c.style} onChange={(e) => set({ style: e.target.value })}>
                <option value="">Let my AI choose</option>
                {STYLES.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}: {s.look}
                    {free && !FREE_STYLES.has(s.name) ? ' (Pro)' : ''}
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
                value={[c.voiceHook && HOOK, c.brand && BRAND].filter(Boolean) as string[]}
                options={[HOOK, BRAND]}
                onChange={(v) => set({ voiceHook: v.includes(HOOK), brand: v.includes(BRAND) })}
              />
            </Field>
            <Field label="Then">
              <Seg label="After clipping" value={c.when} onChange={(when) => set({ when })} options={[['none', 'Just clip'], ['now', 'Post the best one'], ['best', pro('Schedule them all')]]} />
            </Field>
            {c.when !== 'none' && (
              <Field label="Where">
                <Chips label="Platforms" value={c.platforms} options={PLATFORMS} onChange={(platforms) => set({ platforms })} />
              </Field>
            )}
      </div>
      {needsPro && (
        <p className="ac-fine ws-pro-note">
          Some choices need Pro. <a href="/account/billing">Go Pro</a> or change them, or your AI will say they are locked.
        </p>
      )}
      <PromptOut text={prompt} />
    </div>
  );
}

/* ── Home ──────────────────────────────────────────────────── */

const FEATURES: { title: string; text: string; to: string; img: string; badge?: string }[] = [
  { title: 'Clip builder', text: 'Every option in one prompt: style, edit, language, posting.', to: '/account/create', img: '/reel/r03.jpg' },
  { title: 'Caption styles', text: `${STYLES.length} looks, rendered for real. Pick one in a click.`, to: '/account/styles', img: '/styles/orilos.webp' },
  { title: 'Autopilot', text: 'Watch a Twitch, Kick or YouTube channel. Clip every stream.', to: '/account/autopilot', img: '/reel/r01.jpg', badge: 'Live' },
  { title: 'Schedule', text: 'Best hours on 9 platforms, on a calendar you can drag.', to: '/account/schedule', img: '/studio-calendar.webp' },
];

const MORE: { icon: LucideIcon; title: string; text: string; to: string }[] = [
  { icon: Mic, title: 'Voices', text: `Spoken hooks in ${VOICE_LANGUAGES.length} languages`, to: '/account/voices' },
  { icon: Palette, title: 'Brand kits', text: 'Logo, colours and font on every clip', to: '/docs/brand-kits' },
  { icon: Flame, title: 'Hot moments', text: 'What viewers replayed and chatted about', to: '/docs/hot-moments' },
  { icon: Bot, title: 'AI actors', text: 'UGC ads presented by a Tavus actor', to: '/docs/ugc' },
];

const REEL = ['r02', 'r07', 'r04', 'r11', 'r06', 'r09', 'r13', 'r08', 'r15'];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Section({ title, sub, action, children }: { title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="ws-section">
      <header>
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** The one thing to do on Home: paste a link, copy the prompt. */
function HeroBuilder({ go }: { go: Go }) {
  const [url, setUrl] = useState('');
  const [clips, setClips] = useState(5);
  const [copied, copy] = useCopy();
  const prompt = clipPrompt({ ...DEFAULT_CHOICES, url, clips });
  return (
    <div className="ws-hb">
      <form
        className="ws-hb-row"
        onSubmit={(e) => {
          e.preventDefault();
          copy(prompt);
        }}
      >
        <label className="ws-url">
          <Link2 size={20} aria-hidden="true" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a YouTube, Twitch, Kick or podcast link" aria-label="Video link" inputMode="url" />
        </label>
        <button className="ac-btn pink ws-hb-cta">{copied === prompt ? <Check size={18} /> : <Copy size={18} />} {copied === prompt ? 'Copied' : 'Copy prompt'}</button>
      </form>
      <div className="ws-hb-meta">
        <span className="ws-hb-clips">
          <span className="ws-label-sm">Clips</span>
          <Seg label="Number of clips" value={clips} onChange={setClips} options={[3, 5, 8, 12].map((n) => [n, String(n)] as [number, string])} />
        </span>
        <a className="ac-link" href="/account/create" onClick={link(go, `/account/create${url ? `?url=${encodeURIComponent(url)}` : ''}`)}>
          Style, language, posting <ArrowRight size={14} />
        </a>
      </div>
      <p className="ws-hb-prompt" title={prompt}>
        <span>Your prompt</span> {prompt}
      </p>
    </div>
  );
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
        <div className="ws-hero-copy">
          <p className="ws-hello">
            {greeting()}, {first || 'creator'}
          </p>
          <h1>
            What are we <span className="pink">clipping</span> today?
          </h1>
          <p className="ws-hero-sub">Paste a link. Your AI finds the moments people loved, ORILOS turns them into shorts.</p>
          <HeroBuilder go={go} />
        </div>
        <div className="ws-hero-art" aria-hidden="true">
          <img className="ws-phone back l" src="/reel/r05.jpg" alt="" />
          <img className="ws-phone back r" src="/reel/r12.jpg" alt="" />
          <video className="ws-phone front" src="/reel/r03.mp4" poster="/reel/r03.jpg" autoPlay muted loop playsInline preload="metadata" />
          <span className="ws-float a">
            <Flame size={14} /> Chat spike at 41:07
          </span>
          <span className="ws-float b">
            <Sparkles size={14} /> Score 92
          </span>
        </div>
      </section>

      <Section title="Start here" sub="The four things creators use every day.">
        <div className="ws-features">
          {FEATURES.map((f) => (
            <a key={f.title} className="ws-feature" href={f.to} onClick={link(go, f.to)}>
              <span className="ws-feature-img">
                <img src={f.img} alt="" loading="lazy" />
                {f.badge && <i>{f.badge}</i>}
              </span>
              <b>{f.title}</b>
              <small>{f.text}</small>
            </a>
          ))}
        </div>
      </Section>

      <Section title="More tools">
        <div className="ws-more">
          {MORE.map((t) => (
            <a key={t.title} href={t.to} onClick={link(go, t.to)}>
              <span className="ws-more-icon">
                <t.icon size={20} aria-hidden="true" />
              </span>
              <span>
                <b>{t.title}</b>
                <small>{t.text}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          ))}
        </div>
      </Section>

      <Section title="Made with ORILOS" sub="Real clips, cut and captioned by ORILOS. Hover to play." action={<a className="ac-link" href="/#wall">See more <ArrowRight size={14} /></a>}>
        <div className="ws-reel">
          {REEL.map((r) => (
            <video
              key={r}
              src={`/reel/${r}.mp4`}
              poster={`/reel/${r}.jpg`}
              muted
              loop
              playsInline
              preload="none"
              onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ))}
        </div>
        <p className="ac-fine">Footage: Veloren gameplay by Nookrium (CC BY) and "Winning Conversations" by Heritage of Faith CC (CC BY).</p>
      </Section>

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
        <Card title="Your plan" className={me.plan === 'free' ? 'ws-plan-card' : ''}>
          <p className="ac-stat">{planOf(me.plan).name}</p>
          <p className="ac-mute">
            {me.plan === 'free' ? 'Unlimited clips on your computer. Pro adds all 67 styles, brand kits, best-time scheduling and Autopilot.' : 'Every ORILOS feature is on. Thank you for backing us.'}
          </p>
          <a className={`ac-btn${me.plan === 'free' ? ' pink' : ''}`} href="/account/billing" onClick={link(go, '/account/billing')}>
            {me.plan === 'free' ? 'Upgrade to Pro' : 'Manage plan'}
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
                <b>{STYLES.length} caption styles</b> with real previews.
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

export function Create({ me }: Ctx) {
  const url = new URLSearchParams(location.search).get('url') ?? '';
  return (
    <>
      <Head title="Clip builder" sub="Pick what you want. ORILOS turns it into one sentence for your AI." />
      <div className="ws-create">
        <Card>
          <Builder initialUrl={url} free={me.plan === 'free'} />
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

export function Styles({ me }: Ctx) {
  const free = me.plan === 'free';
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
      <Head
        title="Caption styles"
        sub={`${STYLES.length} looks. Click one to copy the prompt that uses it.${free ? ` ${FREE_STYLES.size} are on Free; Pro unlocks all.` : ''}`}
      />
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
              <img src={`/styles/${s.name}.webp`} alt={`The ${s.name} caption style`} loading="lazy" width="540" height="300" />
              <span className="ws-style-body">
                <code>
                  {s.name}
                  {free && !FREE_STYLES.has(s.name) && <em className="ws-pro">Pro</em>}
                </code>
                <span>{s.look}</span>
                <small>Best for {s.best_for.charAt(0).toLowerCase() + s.best_for.slice(1)}</small>
              </span>
              <i aria-hidden="true">{copied === text ? <Check size={16} /> : <Copy size={16} />}</i>
            </button>
          );
        })}
      </div>
      <p className="ac-fine">Previews rendered by ORILOS. Footage: "Winning Conversations" by Heritage of Faith CC (CC BY).</p>
    </>
  );
}

/* ── Voices ────────────────────────────────────────────────── */

// The flag most people link with each voice language (flag-icons, MIT, in public/flags). Kurdish has no single country, so it keeps its code.
const FLAG: Record<string, string> = {sq: 'al', ar: 'sa', hy: 'am', eu: 'es-pv', bn: 'bd', bg: 'bg', ca: 'es-ct', zh: 'cn', cs: 'cz', da: 'dk', nl: 'nl', en: 'us', et: 'ee', fa: 'ir', fi: 'fi', fr: 'fr', ka: 'ge', de: 'de', el: 'gr', he: 'il', hi: 'in', hu: 'hu', is: 'is', id: 'id', it: 'it', ja: 'jp', kk: 'kz', ko: 'kr', lv: 'lv', lt: 'lt', lb: 'lu', ml: 'in', mr: 'in', ne: 'np', no: 'no', pl: 'pl', pt: 'pt', ro: 'ro', ru: 'ru', sr: 'rs', sk: 'sk', sl: 'si', es: 'es', sw: 'tz', sv: 'se', te: 'in', th: 'th', tr: 'tr', uk: 'ua', vi: 'vn', cy: 'gb-wls'};

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
              {FLAG[code] ? <img className="ws-flag" src={`/flags/${FLAG[code]}.svg`} alt="" width="24" height="18" loading="lazy" /> : <code>{code}</code>}
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

const PLATFORM_ICON: Record<string, string> = {
  TikTok: 'tiktok', Instagram: 'insta', YouTube: 'shorts', X: 'x', LinkedIn: 'linkedin',
  Facebook: 'fb', Threads: 'threads', Pinterest: 'pintrest', Bluesky: 'bluesky',
};
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PlatformIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <img className="ws-pf" src={`/platforms/${PLATFORM_ICON[name]}.webp`} alt="" width={size} height={size} />;
}

function slotDay(day: number, weekday: number) {
  return day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : DAY[(weekday + day) % 7];
}

function away(min: number) {
  if (min < 60) return `in ${min} min`;
  if (min < 24 * 60) return `in ${Math.round(min / 60)} h`;
  return `in ${Math.round(min / 1440)} d`;
}

export function Schedule({ me }: Ctx) {
  const [c, setC] = useState<ScheduleChoices>(DEFAULT_SCHEDULE);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const set = (patch: Partial<ScheduleChoices>) => setC({ ...c, ...patch });
  const now = zonedNow(me.timezone);
  const slots = nextSlots(c.platforms, now, c.perDay, c.start);
  const togglePlatform = (p: string) => set({ platforms: c.platforms.includes(p) ? c.platforms.filter((x) => x !== p) : [...c.platforms, p] });

  return (
    <>
      <Head title="Schedule" sub="Pick where and how often. ORILOS puts every clip in the next best slot, so you never pick a time." />

      <div className="ws-sched-top">
        <Card title="Plan posts" className="ws-sched-plan">
          <Field label="Post to">
            <div className="ws-pfs" role="group" aria-label="Platforms">
              {BEST_HOURS.map(([p]) => (
                <button key={p} className={c.platforms.includes(p) ? 'on' : ''} aria-pressed={c.platforms.includes(p)} onClick={() => togglePlatform(p)}>
                  <PlatformIcon name={p} />
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Which clips">
            <Seg<ScheduleChoices['clips']> label="Which clips" value={c.clips} onChange={(clips) => set({ clips })} options={[['approved', 'All approved'], [3, 'Newest 3'], [5, 'Newest 5']]} />
          </Field>
          <Field label="How often">
            <Seg<1 | 2> label="Posts a day per platform" value={c.perDay} onChange={(perDay) => set({ perDay })} options={[[1, '1 a day'], [2, '2 a day']]} />
          </Field>
          <Field label="Start">
            <Seg<ScheduleChoices['start']> label="Start" value={c.start} onChange={(start) => set({ start })} options={[['now', 'Now'], ['tomorrow', 'Tomorrow'], ['monday', 'Next Monday']]} />
          </Field>
          {me.plan === 'free' && (
            <p className="ac-fine ws-pro-note">
              Scheduling is part of Pro. On Free you can post right away. <a href="/account/billing">Go Pro</a>
            </p>
          )}
          <PromptOut text={schedulePrompt(c)} />
        </Card>

        <Card title="Next best slots" className="ws-sched-next">
          <p className="ac-fine">Where your clips go next, in {me.timezone}. One clip per slot, in order.</p>
          {slots.length ? (
            <ol className="ws-slots">
              {slots.map((s, i) => (
                <li key={`${s.platform}-${s.day}-${s.hour}`} className={i === 0 ? 'first' : ''}>
                  <PlatformIcon name={s.platform} size={28} />
                  <span>
                    <b>{s.platform}</b>
                    <small>
                      {slotDay(s.day, now.weekday)}, {String(s.hour).padStart(2, '0')}:00
                    </small>
                  </span>
                  <em>{i === 0 ? `Next · ${away(s.minutesAway)}` : away(s.minutesAway)}</em>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ac-mute">Pick at least one platform to see its next slots.</p>
          )}
        </Card>
      </div>

      <Card title="Best hours by platform">
        <div className="ws-heat" role="table" aria-label="Best posting hours by platform">
          <div role="row" className="ws-heat-row head">
            <span role="columnheader" />
            {Array.from({ length: 24 }, (_, h) => (
              <span role="columnheader" key={h} className={h === now.hour ? 'now' : ''}>
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </span>
            ))}
          </div>
          {BEST_HOURS.map(([p, hours, note]) => (
            <div role="row" className={`ws-heat-row${c.platforms.includes(p) ? '' : ' dim'}`} key={p}>
              <span role="rowheader">
                <span className="ws-heat-name">
                  <PlatformIcon name={p} size={18} />
                  {p}
                </span>
                {note && <small>{note}</small>}
              </span>
              {Array.from({ length: 24 }, (_, h) => (
                <span role="cell" key={h} className={`${hours.includes(h) ? 'best' : ''}${h === now.hour ? ' now' : ''}`} title={hours.includes(h) ? `${p}: ${h}:00` : undefined} />
              ))}
            </div>
          ))}
        </div>
        <div className="ws-heat-foot">
          <span className="ws-legend">
            <i className="best" /> Best hour
          </span>
          <span className="ws-legend">
            <i className="now" /> Now
          </span>
          <span className="ac-fine">Hours in {me.timezone}. At most 2 posts a day per platform, never two within 3 hours. Platforms you didn't pick are dimmed.</span>
        </div>
      </Card>

      <Card className="ws-studio-row">
        <img className="ws-sheet" src="/studio-calendar.webp" alt="The ORILOS Studio calendar with a week of scheduled posts" loading="lazy" />
        <div>
          <h2>Check it on your calendar</h2>
          <ul className="ws-plan-steps ws-ticks">
            <li>See every scheduled post across your platforms, week by week.</li>
            <li>Drag a post to a new time, or drop a clip onto a slot to schedule it.</li>
            <li>Approve or skip clips before they go out.</li>
          </ul>
          <p className="ac-fine">The Studio is a private page on your computer. Open it with:</p>
          <CopyLine text="uvx orilos-mcp studio" />
        </div>
      </Card>
    </>
  );
}

/* ── GTA VI ────────────────────────────────────────────────── */

function compact(n: number) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);
}
function clock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
const GTA_KINDS: [GtaKind | 'all', string][] = [['all', 'All'], ['stream', 'Streams'], ['gameplay', 'Gameplay'], ['chaos', 'Chaos and funny']];

export function GtaHub(_: Ctx) {
  const [url, setUrl] = useState('');
  const [focus, setFocus] = useState<GtaFocus>('best');
  const [clips, setClips] = useState(5);
  const [kind, setKind] = useState<GtaKind | 'all'>('all');
  const [streamer, setStreamer] = useState('');
  const builder = useRef<HTMLDivElement>(null);
  const shown = GTA_VIDEOS.filter((v) => kind === 'all' || v.kind === kind);
  const pick = (v: GtaVideo) => {
    setUrl(`https://www.youtube.com/watch?v=${v.id}`);
    if (v.kind === 'stream') setFocus('reactions');
    builder.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Head title="GTA VI" sub="GTA VI is out. Turn its best moments into shorts, cut and captioned on your computer." />

      <div ref={builder} className="ws-gta-top">
        <Card title="Clip a GTA VI video" className="ws-gta-builder">
          <label className="ws-url">
            <Link2 size={20} aria-hidden="true" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a GTA VI video, VOD or stream link" aria-label="GTA VI video link" inputMode="url" />
          </label>
          <Field label="Focus on">
            <Pick<GtaFocus>
              label="Focus"
              value={focus}
              onChange={setFocus}
              options={[['best', 'Best moments'], ['chases', 'Chases and crashes'], ['funny', 'Funny NPCs'], ['missions', 'Heists and missions'], ['reactions', 'Streamer reactions']]}
            />
          </Field>
          <Field label="Clips">
            <Seg label="Number of clips" value={clips} onChange={setClips} options={[3, 5, 8, 12].map((n) => [n, String(n)] as [number, string])} />
          </Field>
          <PromptOut text={gtaPrompt(url, focus, clips)} />
        </Card>
        <Card title="Why it works for GTA" className="ws-gta-why">
          <ul className="ws-plan-steps ws-ticks">
            <li>The gaming edit keeps the action uncut and zooms on the peaks.</li>
            <li>On Twitch, Kick and YouTube streams it finds the moments chat exploded.</li>
            <li>Every clip credits the creator with a “via” tag.</li>
            <li>Long streams are fine: it downloads only the moments it keeps.</li>
          </ul>
        </Card>
      </div>

      <Section
        title="Trending GTA VI videos"
        sub="Pick one and press Clip this, or paste any GTA VI link above."
        action={<Seg<GtaKind | 'all'> label="Show" value={kind} onChange={setKind} options={GTA_KINDS} />}
      >
      <div className="ws-gta-grid">
        {shown.map((v) => (
          <article key={v.id} className="ws-gta-card">
            <a className="ws-gta-thumb" href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" aria-label={`Watch ${v.title} on YouTube`}>
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" width="480" height="360" />
              <span className="ws-gta-time">{clock(v.seconds)}</span>
              {v.kind === 'stream' && <span className="ws-gta-live">Stream</span>}
            </a>
            <div className="ws-gta-body">
              <b title={v.title}>{v.title}</b>
              <small>
                {v.channel} · {compact(v.views)} views
              </small>
              <button className="ac-btn pink small" onClick={() => pick(v)}>
                Clip this
              </button>
            </div>
          </article>
        ))}
      </div>
      </Section>
      <p className="ac-fine">
        Popular on YouTube, picked {GTA_PICKED}. Thumbnails and videos belong to their creators; GTA VI is by Rockstar Games. Clip what you have the rights to or the
        creator's permission for.
      </p>

      <Card title="Clip a GTA VI streamer every time they go live" className="ws-gta-auto">
        <p className="ac-mute">Autopilot watches a Twitch, Kick or YouTube channel and clips each stream's hottest moments for your review. Part of Pro.</p>
        <label className="ws-url">
          <Radio size={20} aria-hidden="true" />
          <input value={streamer} onChange={(e) => setStreamer(e.target.value)} placeholder="https://www.twitch.tv/name" aria-label="Streamer channel link" inputMode="url" />
        </label>
        <PromptOut text={autopilotPrompt({ channel: streamer, mode: 'review', clips: 5, platforms: [] })} />
      </Card>
    </>
  );
}
