// The ORILOS workspace at /account/*: a collapsible rail, a top bar, and one page per tab.
import {
  BookOpen,
  CalendarClock,
  Captions,
  CreditCard,
  Home as HomeIcon,
  KeyRound,
  LifeBuoy,
  LogOut,
  Menu,
  Mic,
  Plug,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings as Cog,
  Sparkles,
  Sun,
  User as UserIcon,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, getMe, type Me } from './api';
import { ClaudeConnect } from './Connect';
import { Billing, Keys, Profile, Settings } from './Manage';
import { applyTheme, Avatar, Center, PlanChip, savedTheme, type Ctx, type Go, type Theme } from './ui';
import { Autopilot, Create, Home, Schedule, Styles, Voices } from './Workspace';
import './account.css';
import './workspace.css';

interface Tab {
  path: string;
  label: string;
  icon: LucideIcon;
  page: (c: Ctx) => ReactNode;
}

const GROUPS: { label: string; tabs: Tab[] }[] = [
  {
    label: '',
    tabs: [
      { path: '/account', label: 'Home', icon: HomeIcon, page: Home },
      { path: '/account/claude', label: 'Use in Claude', icon: Plug, page: ClaudeConnect },
    ],
  },
  {
    label: 'Create',
    tabs: [
      { path: '/account/create', label: 'Clip builder', icon: Wand2, page: Create },
      { path: '/account/styles', label: 'Caption styles', icon: Captions, page: Styles },
      { path: '/account/voices', label: 'Voices', icon: Mic, page: Voices },
    ],
  },
  {
    label: 'Automate',
    tabs: [
      { path: '/account/autopilot', label: 'Autopilot', icon: Radio, page: Autopilot },
      { path: '/account/schedule', label: 'Schedule', icon: CalendarClock, page: Schedule },
    ],
  },
  {
    label: 'Account',
    tabs: [
      { path: '/account/keys', label: 'Keys', icon: KeyRound, page: Keys },
      { path: '/account/billing', label: 'Billing', icon: CreditCard, page: Billing },
      { path: '/account/profile', label: 'Profile', icon: UserIcon, page: Profile },
      { path: '/account/settings', label: 'Settings', icon: Cog, page: Settings },
    ],
  },
];
const TABS = GROUPS.flatMap((g) => g.tabs);

function usePath(): [string, Go] {
  const [path, setPath] = useState(location.pathname.replace(/\/+$/, ''));
  useEffect(() => {
    const sync = () => setPath(location.pathname.replace(/\/+$/, ''));
    addEventListener('popstate', sync);
    return () => removeEventListener('popstate', sync);
  }, []);
  const go = useCallback((to: string) => {
    history.pushState(null, '', to);
    setPath(new URL(to, location.origin).pathname.replace(/\/+$/, ''));
    scrollTo(0, 0);
  }, []);
  return [path, go];
}

// A remembered preference: never required, so storage errors are ignored.
function remembered(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  let initial = fallback;
  try {
    initial = (localStorage.getItem(key) ?? String(fallback)) === 'true';
  } catch {
    /* private mode */
  }
  return [initial, (v) => {
    try {
      localStorage.setItem(key, String(v));
    } catch {
      /* private mode */
    }
  }];
}

export function Account() {
  const [path, go] = usePath();
  const [state, setState] = useState<{ me: Me; billingReady: boolean } | null>(null);
  const [down, setDown] = useState('');
  const [initialSlim, saveSlim] = remembered('orilos.rail.slim', true);
  const [slim, setSlim] = useState(initialSlim);
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const flipTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setTheme(next);
  };

  useEffect(() => {
    getMe().then(
      (r) => setState({ me: r.user, billingReady: r.billingReady }),
      (e) => {
        if (e instanceof ApiError && e.status === 401) location.replace(`/signin?next=${encodeURIComponent(location.pathname + location.search)}`);
        else setDown(e.message);
      },
    );
  }, []);
  useEffect(() => setDrawer(false), [path]);

  if (down) return <Center>{down}</Center>;
  if (!state) return <Center>Loading your workspace…</Center>;

  const ctx: Ctx = { me: state.me, billingReady: state.billingReady, setMe: (me) => setState({ ...state, me }), go };
  const tab = TABS.find((t) => t.path === path) ?? TABS[0];
  const group = GROUPS.find((g) => g.tabs.includes(tab))!;
  const free = state.me.plan === 'free';
  const toggle = () => {
    setSlim(!slim);
    saveSlim(!slim);
  };

  return (
    <div className={`ac ws${slim ? ' slim' : ''}${drawer ? ' drawer' : ''}`}>
      <aside className="ws-rail" aria-label="Workspace">
        <div className="ws-rail-top">
          {slim ? (
            // Collapsed: the logo turns into an expand button on hover.
            <button className="ws-logo-btn" onClick={toggle} aria-label="Expand sidebar">
              <img src="/mascot/neutral.png" alt="" width="28" height="28" />
              <PanelLeftOpen size={20} aria-hidden="true" />
            </button>
          ) : (
            <a className="ac-brand" href="/" aria-label="ORILOS home">
              <img src="/mascot/neutral.png" alt="" width="28" height="28" />
              ORILOS
            </a>
          )}
          {!slim && (
            <button className="ws-icon-btn ws-only-desktop" onClick={toggle} aria-label="Collapse sidebar" data-tip="Collapse">
              <PanelLeftClose size={18} />
            </button>
          )}
          <button className="ws-icon-btn ws-only-mobile" onClick={() => setDrawer(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav>
          {GROUPS.map((g) => (
            <div key={g.label || 'main'} className="ws-group">
              {g.label && <p className="ws-group-label">{g.label}</p>}
              {g.tabs.map((t) => (
                <a
                  key={t.path}
                  href={t.path}
                  data-tip={t.label}
                  aria-label={slim ? t.label : undefined}
                  aria-current={t === tab ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    go(t.path);
                  }}
                >
                  <t.icon size={20} aria-hidden="true" />
                  <span className="ws-label">{t.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="ws-rail-foot">
          <a href="/docs" data-tip="Docs" aria-label={slim ? 'Docs' : undefined}>
            <BookOpen size={20} aria-hidden="true" />
            <span className="ws-label">Docs</span>
          </a>
          <a href="mailto:aaditya@agentmd.tech" data-tip="Support" aria-label={slim ? 'Support' : undefined}>
            <LifeBuoy size={20} aria-hidden="true" />
            <span className="ws-label">Support</span>
          </a>
          <button
            className="ws-rail-btn"
            onClick={flipTheme}
            data-tip={theme === 'light' ? 'Dark theme' : 'Light theme'}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            aria-pressed={theme === 'light'}
          >
            {theme === 'light' ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
            <span className="ws-label">{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
          </button>
        </div>
      </aside>
      <div className="ws-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />

      <div className="ws-body">
        <header className="ws-top">
          <button className="ws-icon-btn ws-only-mobile" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <nav className="ws-crumbs" aria-label="Breadcrumb">
            {group.label && <span>{group.label}</span>}
            <b>{tab.label}</b>
          </nav>
          <div className="ws-top-right">
            {free && (
              <a
                className="ws-upgrade"
                href="/account/billing"
                onClick={(e) => {
                  e.preventDefault();
                  go('/account/billing');
                }}
              >
                <Sparkles size={14} aria-hidden="true" /> Go Pro
              </a>
            )}
            <UserMenu me={state.me} go={go} />
          </div>
        </header>

        <main className="ws-main" id="main">
          <tab.page key={tab.path} {...ctx} />
        </main>
      </div>
    </div>
  );
}

function UserMenu({ me, go }: { me: Me; go: Go }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener('pointerdown', close);
    addEventListener('keydown', close);
    return () => {
      removeEventListener('pointerdown', close);
      removeEventListener('keydown', close);
    };
  }, [open]);
  const signOut = async () => {
    await api('/auth/signout', { method: 'POST' }).catch(() => {});
    location.href = '/';
  };
  const item = (to: string, label: string, Icon: LucideIcon) => (
    <a
      role="menuitem"
      href={to}
      onClick={(e) => {
        e.preventDefault();
        setOpen(false);
        go(to);
      }}
    >
      <Icon size={16} aria-hidden="true" /> {label}
    </a>
  );

  return (
    <div className="ws-user" ref={ref}>
      <button className="ws-user-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <Avatar me={me} size={32} />
      </button>
      {open && (
        <div className="ws-menu" role="menu">
          <div className="ws-menu-head">
            <Avatar me={me} size={40} />
            <span>
              <b>{me.name || 'You'}</b>
              <small>{me.email}</small>
            </span>
            <PlanChip me={me} />
          </div>
          {item('/account/profile', 'Profile', UserIcon)}
          {item('/account/billing', 'Billing', CreditCard)}
          {item('/account/keys', 'Licence keys', KeyRound)}
          {item('/account/settings', 'Settings', Cog)}
          <button role="menuitem" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
