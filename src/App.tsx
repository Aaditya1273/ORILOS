import { CalendarDays, FileText, History, House, Plus, Settings as Cog } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from './lib/store';
import { readKey } from './lib/vault';
import { startRun, useRun } from './lib/worker';
import { Activity } from './ui/Activity';
import { Content } from './ui/Content';
import { Home } from './ui/Home';
import { Intro } from './ui/Intro';
import { Mark, Toast, useRoute } from './ui/kit';
import { Onboarding } from './ui/Onboarding';
import { PostView } from './ui/PostView';
import { Schedule } from './ui/Schedule';
import { Settings } from './ui/Settings';

const NAV = [
  ['home', 'Home', House],
  ['content', 'Content', FileText],
  ['schedule', 'Schedule', CalendarDays],
  ['activity', 'Activity', History],
  ['settings', 'Settings', Cog],
] as const;

export function App() {
  const route = useRoute();
  const ws = useStore((s) => s.workspace);
  const theme = useStore((s) => s.settings.theme);
  const posts = useStore((s) => s.posts);
  const run = useRun();
  const [hasKey, setHasKey] = useState<boolean>();
  const checkKey = useCallback(() => void readKey().then((k) => setHasKey(!!k)), []);

  useEffect(checkKey, [checkKey]);
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const n = posts.filter((p) => p.state === 'pending').length;
    document.title = run.running ? 'ORILOS · working…' : n ? `(${n}) ORILOS` : 'ORILOS';
  }, [posts, run.running]);

  if (hasKey === undefined) return null;
  if (!ws) {
    return (
      <>
        <Intro />
        <Onboarding hasKey={hasKey} onKey={checkKey} />
        <Toast />
      </>
    );
  }

  const pending = posts.filter((p) => p.state === 'pending').length;
  const [tab, sub] = route;
  const page =
    tab === 'content' && sub ? (
      <PostView id={sub} />
    ) : tab === 'content' ? (
      <Content />
    ) : tab === 'schedule' ? (
      <Schedule />
    ) : tab === 'activity' ? (
      <Activity />
    ) : tab === 'settings' ? (
      <Settings hasKey={hasKey} onKeyChange={checkKey} focus={sub} />
    ) : (
      <Home hasKey={hasKey} />
    );

  return (
    <div className="shell">
      <Intro />
      <aside className="sidebar">
        <div className="brand">
          <Mark size={30} state={run.running ? 'working' : 'idle'} /> ORILOS
        </div>
        {NAV.map(([id, label, Icon]) => (
          <a key={id} className="navlink" href={`#/${id}`} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={20} /> {label}
            {id === 'content' && pending > 0 && <span className="badge">{pending}</span>}
          </a>
        ))}
        <div className="grow" />
        <button className="btn primary" disabled={run.running || !hasKey} onClick={() => void startRun()}>
          <Plus size={18} /> {run.running ? 'Working…' : 'New run'}
        </button>
        <div className="small muted" style={{ padding: '10px 4px 0' }}>
          {ws.name}
        </div>
      </aside>

      <div>
        <header className="topbar">
          <Mark size={28} state={run.running ? 'working' : 'idle'} />
          <strong>ORILOS</strong>
          <div className="grow" />
          <button className="iconbtn" aria-label="New run" disabled={run.running || !hasKey} onClick={() => void startRun()}>
            <Plus size={20} />
          </button>
        </header>
        <main className="main" key={route.join('/')}>
          {page}
        </main>
      </div>

      <nav className="bottomnav" aria-label="Main">
        {NAV.map(([id, label, Icon], i) => (
          <a key={id} href={`#/${id}`} aria-current={tab === id ? 'page' : undefined} aria-label={`${label}, tab ${i + 1} of ${NAV.length}`}>
            <Icon size={20} />
            {label}
          </a>
        ))}
      </nav>
      <Toast />
    </div>
  );
}
