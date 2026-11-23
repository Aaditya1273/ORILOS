import { ArrowUp, CalendarDays, Square } from 'lucide-react';
import { useMemo, useState } from 'react';
import { platformName } from '../lib/platforms';
import { ago, friendlyWhen, nextRun } from '../lib/schedule';
import { setState, useStore } from '../lib/store';
import type { ActivityEntry, Phase, Post } from '../lib/types';
import { clearError, rebuildBrain, startRun, stop, useRun } from '../lib/worker';
import { go, Mark, PlatformBadge, Section, useBlobUrl, type MarkState } from './kit';

const PHASES: [Phase, string][] = [
  ['research', 'Researching'],
  ['plan', 'Planning'],
  ['write', 'Writing'],
  ['check', 'Checking'],
  ['image', 'Images'],
];

function greeting(h = new Date().getHours()) {
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function list(names: string[]) {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function Home({ hasKey }: { hasKey: boolean }) {
  const posts = useStore((s) => s.posts);
  const activity = useStore((s) => s.activity);
  const schedule = useStore((s) => s.schedule);
  const brain = useStore((s) => s.brain);
  const ws = useStore((s) => s.workspace);
  const run = useRun();
  const [ask, setAsk] = useState('');

  const pending = useMemo(() => posts.filter((p) => p.state === 'pending'), [posts]);
  const waiting = useMemo(() => posts.filter((p) => p.state === 'handedOff'), [posts]);
  const next = nextRun(schedule, Date.now());

  // One headline, one work surface, one face — by state.
  let headline: string;
  let sub: string | undefined;
  let work: React.ReactNode;
  let face: MarkState = 'idle';

  if (run.running) {
    face = 'working';
    headline = 'ORILOS is working.';
    sub = 'You can leave this tab open. ORILOS will let you know when it’s ready.';
    const idx = PHASES.findIndex(([p]) => p === run.phase);
    work = (
      <div className="col" style={{ gap: 14 }}>
        <div className="h3">{run.kind === 'brain' ? 'Learning about your business…' : 'Researching and writing your next posts…'}</div>
        <div className="small secondary" aria-live="polite">
          {run.note}
        </div>
        {run.kind === 'run' && (
          <div className="steps">
            {PHASES.map(([p, label], i) => (
              <span key={p} className={i < idx ? 'done' : i === idx ? 'on' : ''}>
                {label}
              </span>
            ))}
          </div>
        )}
        <div>
          <button className="btn outline sm" onClick={stop}>
            <Square size={14} /> Stop
          </button>
        </div>
      </div>
    );
  } else if (!hasKey) {
    headline = 'Let’s get you set up.';
    work = <Simple title="Add your free Gemini key" body="It takes a minute. The key stays encrypted in this browser." action="Add key" onClick={() => go('settings/key')} />;
  } else if (run.error) {
    face = 'error';
    headline = 'Something got in the way.';
    sub = 'Nothing was lost.';
    work = (
      <Simple
        title="ORILOS couldn’t finish this yet"
        body={run.error}
        action="Try again"
        onClick={() => {
          clearError();
          void (brain ? startRun() : rebuildBrain());
        }}
      />
    );
  } else if (!brain) {
    headline = 'Let’s learn about your business.';
    work = <Simple title="Read my website" body={`About a minute. ORILOS reads ${ws?.website || 'the web'} once and uses what it learns for every post.`} action="Start learning" onClick={() => void rebuildBrain()} />;
  } else if (pending.length) {
    face = 'attention';
    headline = 'Your work is ready.';
    sub = pending.length === 1 ? `1 post is ready for ${platformName(pending[0].platform)}.` : `${pending.length} posts are ready for ${list([...new Set(pending.map((p) => platformName(p.platform)))])}.`;
    work = <ReadyCard posts={pending} />;
  } else if (waiting.length) {
    face = 'attention';
    headline = 'Did your post go out?';
    sub = `ORILOS opened ${list([...new Set(waiting.map((p) => platformName(p.platform)))])} with your post. Only you can confirm it was published.`;
    work = <ReadyCard posts={waiting.slice(0, 1)} action="Tell ORILOS" />;
  } else {
    headline = 'Nothing needs your attention.';
    sub = next ? `ORILOS will prepare your next posts ${friendlyWhen(next).toLowerCase().replace(' · ', ' at ')}.` : undefined;
    work = (
      <form
        className="card ask"
        onSubmit={(e) => {
          e.preventDefault();
          setState((s) => ({ ...s, focus: ask }));
          void startRun();
        }}
      >
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Tell ORILOS what you need…" aria-label="Tell ORILOS what you need" />
        <button className="send" type="submit" aria-label={ask.trim() ? 'Write it' : 'Surprise me'}>
          <ArrowUp size={20} />
        </button>
      </form>
    );
  }

  const recent = activity.slice(0, 4);
  return (
    <div className="page">
      <Mark size={112} state={face} label={face === 'idle' ? 'ORILOS' : undefined} />
      <div className="secondary muted" style={{ marginTop: 14 }}>
        {greeting()}
      </div>
      <h1 className="h1" style={{ margin: '6px 0 10px' }}>
        {headline}
      </h1>
      {sub && <div className="secondary">{sub}</div>}

      <div className="home-grid">
        <div className="col" style={{ gap: 8 }}>
          {pending.length || waiting.length || !brain || !hasKey || run.running || run.error ? <div className="card">{work}</div> : work}
          <div className="quiet">
            <CalendarDays size={18} />
            <span className="grow">{next ? `Next run · ${friendlyWhen(next)}` : 'No routine yet'}</span>
            {next ? (
              <button className="btn ghost sm" disabled={run.running || !hasKey} onClick={() => void (brain ? startRun() : rebuildBrain())}>
                Run now
              </button>
            ) : (
              <button className="btn ghost sm" onClick={() => go('schedule')}>
                Set up
              </button>
            )}
          </div>
        </div>
        <Section title="Recent" action={activity.length ? <button className="btn ghost sm" onClick={() => go('activity')}>See all</button> : undefined}>
          <div className="list">
            {recent.length ? recent.map((a) => <ActivityRow key={a.id} a={a} />) : <p className="muted">Nothing yet. Your first run will show up here.</p>}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Simple({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return (
    <div className="col" style={{ gap: 18 }}>
      <div>
        <div className="h2">{title}</div>
        <p className="secondary" style={{ margin: '8px 0 0' }}>
          {body}
        </p>
      </div>
      <button className="btn primary" onClick={onClick}>
        {action}
      </button>
    </div>
  );
}

/** The prepared posts themselves — the work is the hero, not a count. */
function ReadyCard({ posts, action }: { posts: Post[]; action?: string }) {
  const shown = posts.slice(0, 3);
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="list">
        {shown.map((p) => (
          <ReadyRow key={p.id} post={p} />
        ))}
      </div>
      {posts.length > shown.length && <div className="small muted">and {posts.length - shown.length} more</div>}
      <button className="btn primary" style={{ marginTop: 10 }} onClick={() => go(posts.length === 1 ? `content/${posts[0].id}` : 'content')}>
        {action ?? (posts.length === 1 ? 'Review post' : 'Review posts')}
      </button>
    </div>
  );
}

function ReadyRow({ post }: { post: Post }) {
  const url = useBlobUrl(post.image?.blobId);
  return (
    <a className="ready-row" href={`#/content/${post.id}`}>
      <PlatformBadge platform={post.platform} size={34} />
      <div style={{ minWidth: 0 }}>
        <div className="h3" style={{ fontSize: 15 }}>
          {platformName(post.platform)}
        </div>
        <div className="clamp3" style={{ marginTop: 2 }}>
          {post.text.replace(/\n+/g, ' ')}
        </div>
      </div>
      {url ? <img className="thumb" src={url} alt={`Image for the ${platformName(post.platform)} post`} /> : <span />}
    </a>
  );
}

export function ActivityRow({ a }: { a: ActivityEntry }) {
  return (
    <div className="activity-row">
      {a.platform ? (
        <PlatformBadge platform={a.platform} size={36} />
      ) : (
        <span className="facetile">
          <Mark size={28} state={a.ok ? 'idle' : 'error'} label="" />
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{a.title}</div>
        {a.detail && <div className="small secondary clamp2">{a.detail}</div>}
      </div>
      <span className="small muted">{ago(a.at)}</span>
    </div>
  );
}
