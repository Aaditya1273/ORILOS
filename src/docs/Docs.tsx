// The /docs area: sidebar, article, on-page contents, search (/ or Ctrl+K), Copy as Markdown.
// It routes itself from window.location (pushState + popstate), so it can be lazy-loaded at /docs/*.

import {
  AlignLeft, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, CornerDownLeft, Hash, Info, Lightbulb, Menu, Search,
  TriangleAlert, X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { GROUPS, PAGES } from './content';
import { BASE, type Block, type Page, headings, hrefOf, neighbours, search, slugOf, slugify, toMarkdown } from './lib';
import './docs.css';

const bySlug = new Map(PAGES.map((p) => [p.slug, p]));

function go(slug: string, anchor = '') {
  const url = hrefOf(slug, anchor);
  if (url !== location.pathname + location.hash) history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Inline Markdown: `code`, **bold**, *italic*, [text](url). Internal /docs links navigate in place. */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|\*([^*\s][^*]*)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<code key={m.index}>{m[1]}</code>);
    else if (m[2] !== undefined) parts.push(<strong key={m.index}><Inline text={m[2]} /></strong>);
    else if (m[5] !== undefined) parts.push(<em key={m.index}>{m[5]}</em>);
    else {
      const href = m[4];
      const external = /^https?:/.test(href);
      parts.push(
        <a key={m.index} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          <Inline text={m[3]} />
          {external && <ArrowUpRight className="ext" size={12} aria-hidden />}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="dx-copy"
      aria-label={done ? 'Copied' : label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        });
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      <span>{done ? 'Copied' : label}</span>
    </button>
  );
}

function Code({ code, lang, title }: { code: string; lang?: string; title?: string }) {
  return (
    <figure className="dx-code">
      <figcaption>
        <span>{title ?? lang ?? 'text'}</span>
        <CopyButton text={code} />
      </figcaption>
      <pre><code>{code}</code></pre>
    </figure>
  );
}

function Tabs({ tabs }: { tabs: { label: string; code: string; lang?: string }[] }) {
  const [i, setI] = useState(() => (/Win/.test(navigator.userAgent) ? 0 : Math.min(1, tabs.length - 1)));
  const t = tabs[i];
  return (
    <figure className="dx-code">
      <figcaption>
        <span role="tablist" className="dx-tabs">
          {tabs.map((x, n) => (
            <button key={x.label} type="button" role="tab" aria-selected={n === i} onClick={() => setI(n)}>{x.label}</button>
          ))}
        </span>
        <CopyButton text={t.code} />
      </figcaption>
      <pre><code>{t.code}</code></pre>
    </figure>
  );
}

const CALLOUT = { note: [Info, 'Note'], tip: [Lightbulb, 'Tip'], warn: [TriangleAlert, 'Heads up'] } as const;

function Heading({ level, text }: { level: 2 | 3; text: string }) {
  const id = slugify(text);
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <H id={id} className="dx-h">
      <Inline text={text} />
      <a className="dx-anchor" href={`#${id}`} aria-label={`Link to ${text}`}><Hash size={14} /></a>
    </H>
  );
}

function BlockView({ b }: { b: Block }) {
  if ('h2' in b) return <Heading level={2} text={b.h2} />;
  if ('h3' in b) return <Heading level={3} text={b.h3} />;
  if ('p' in b) return <p><Inline text={b.p} /></p>;
  if ('ul' in b) return <ul>{b.ul.map((x) => <li key={x}><Inline text={x} /></li>)}</ul>;
  if ('ol' in b) return <ol className="dx-steps">{b.ol.map((x) => <li key={x}><Inline text={x} /></li>)}</ol>;
  if ('code' in b) return <Code code={b.code} lang={b.lang} title={b.title} />;
  if ('tabs' in b) return <Tabs tabs={b.tabs} />;
  if ('callout' in b) {
    const [Icon, label] = CALLOUT[b.kind ?? 'note'];
    return (
      <aside className={`dx-callout ${b.kind ?? 'note'}`} aria-label={label}>
        <Icon size={18} aria-hidden />
        <div><Inline text={b.callout} /></div>
      </aside>
    );
  }
  if ('table' in b)
    return (
      <div className="dx-table" tabIndex={0}>
        <table>
          <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{b.table.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Inline text={c} /></td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  if ('flow' in b)
    return (
      <ol className="dx-flow" aria-label="How ORILOS works">
        {b.flow.map((x, i) => (
          <li key={x.label}>
            <span className="dx-flow-n">{String(i + 1).padStart(2, '0')}</span>
            <strong>{x.label}</strong>
            <span className="dx-flow-note">{x.note}</span>
          </li>
        ))}
      </ol>
    );
  if ('img' in b)
    return (
      <figure className="dx-img">
        <img src={b.img} alt={b.alt} loading="lazy" decoding="async" />
        {b.caption && <figcaption><Inline text={b.caption} /></figcaption>}
      </figure>
    );
  return (
    <div className="dx-cards">
      {b.cards.map((c) => (
        <a key={c.to} className="dx-card" href={hrefOf(c.to)}>
          <strong>{c.title}</strong>
          <span>{c.text}</span>
          <ChevronRight className="dx-card-go" size={16} aria-hidden />
        </a>
      ))}
    </div>
  );
}

function Mascot({ size = 28 }: { size?: number }) {
  return (
    <span className="dx-mascot" style={{ width: size, height: size }} aria-hidden>
      <img className="w" src="/mascot/neutral.png" alt="" width={size} height={size} />
      <img className="i" src="/mascot/neutral_ink.png" alt="" width={size} height={size} />
    </span>
  );
}

function Sidebar({ slug, onPick }: { slug: string; onPick: () => void }) {
  const inTools = slug.startsWith('tools');
  const [toolsOpen, setToolsOpen] = useState(inTools);
  useEffect(() => { if (inTools) setToolsOpen(true); }, [inTools]);
  return (
    <nav className="dx-nav" aria-label="Docs">
      {GROUPS.map((g) => {
        const pages = PAGES.filter((p) => p.group === g && (!p.sub || p.slug === 'tools'));
        return (
          <div key={g} className="dx-group">
            <p className="dx-group-title">{g}</p>
            {pages.map((p) => (
              <Fragment key={p.slug}>
                <div className="dx-row">
                  <a href={hrefOf(p.slug)} aria-current={p.slug === slug ? 'page' : undefined} onClick={onPick}>{p.title}</a>
                  {p.sub && (
                    <button type="button" className="dx-twisty" aria-label={toolsOpen ? 'Hide tools' : 'Show tools'} aria-expanded={toolsOpen}
                      onClick={() => setToolsOpen(!toolsOpen)}>
                      <ChevronDown size={14} />
                    </button>
                  )}
                </div>
                {p.sub && toolsOpen && (
                  <div className="dx-sub">
                    {PAGES.filter((t) => t.sub && t.slug !== 'tools').map((t) => (
                      <a key={t.slug} href={hrefOf(t.slug)} aria-current={t.slug === slug ? 'page' : undefined} onClick={onPick}><code>{t.title}</code></a>
                    ))}
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const hits = useMemo(() => search(PAGES, q), [q]);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => setAt(0), [q]);
  useEffect(() => list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }), [at]);
  const open = (i: number) => {
    const h = hits[i];
    if (!h) return;
    onClose();
    go(h.slug, h.anchor);
  };
  return (
    <div className="dx-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dx-search" role="dialog" aria-modal="true" aria-label="Search the docs">
        <label className="dx-search-field">
          <Search size={18} aria-hidden />
          <input
            autoFocus
            value={q}
            placeholder="Search the docs…"
            aria-label="Search the docs"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="dx-hits"
            aria-activedescendant={hits.length ? `dx-hit-${at}` : undefined}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setAt((a) => Math.min(hits.length - 1, a + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
              else if (e.key === 'Enter') open(at);
              else if (e.key === 'Escape') onClose();
            }}
          />
          <kbd>Esc</kbd>
        </label>
        {q && (
          <ul id="dx-hits" ref={list} role="listbox" className="dx-hits">
            {hits.length === 0 && <li className="dx-none">No results for “{q}”.</li>}
            {hits.map((h, i) => (
              <li key={`${h.slug}#${h.anchor}`} id={`dx-hit-${i}`} role="option" aria-selected={i === at}
                onMouseEnter={() => setAt(i)} onClick={() => open(i)}>
                <span className="dx-hit-title">{h.title}{h.section && <> <ChevronRight size={12} aria-hidden /> {h.section}</>}</span>
                <span className="dx-hit-snip">{h.snippet}</span>
                {i === at && <CornerDownLeft className="dx-hit-go" size={14} aria-hidden />}
              </li>
            ))}
          </ul>
        )}
        {!q && (
          <div className="dx-hint">
            Try <button type="button" onClick={() => setQ('codex timeout')}>codex timeout</button>
            <button type="button" onClick={() => setQ('karaoke')}>karaoke</button>
            <button type="button" onClick={() => setQ('autopilot')}>autopilot</button>
            <button type="button" onClick={() => setQ('hindi')}>hindi</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Toc({ page, active }: { page: Page; active: string }) {
  const hs = headings(page);
  if (!hs.length) return null;
  return (
    <nav className="dx-toc" aria-label="On this page">
      <p><AlignLeft size={14} aria-hidden /> On this page</p>
      {hs.map((h) => (
        <a key={h.id} href={`#${h.id}`} className={`l${h.level}`} aria-current={h.id === active ? 'location' : undefined}>{h.text}</a>
      ))}
    </nav>
  );
}

function useActiveHeading(page: Page): string {
  const [active, setActive] = useState('');
  useEffect(() => {
    const ids = headings(page).map((h) => h.id);
    setActive(ids[0] ?? '');
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    // The heading nearest the top of the reading area wins.
    const pick = () => {
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top < 120) current = el.id;
      setActive(current);
    };
    addEventListener('scroll', pick, { passive: true });
    pick();
    return () => removeEventListener('scroll', pick);
  }, [page]);
  return active;
}

export function Docs() {
  const [slug, setSlug] = useState(() => slugOf(location.pathname));
  const [drawer, setDrawer] = useState(false);
  const [finding, setFinding] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const page = bySlug.get(slug);

  useEffect(() => {
    const onPop = () => {
      setSlug(slugOf(location.pathname));
      setDrawer(false);
      setTocOpen(false);
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  // In-place navigation for every /docs link on the page (sidebar, content, cards, prev/next).
  const onClick = useCallback((e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // same-page anchor: let the browser scroll
    if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return;
    e.preventDefault();
    go(slugOf(url.pathname), url.hash.slice(1));
  }, []);

  // Scroll to the anchor (or the top) after each navigation; keep the tab title right.
  useEffect(() => {
    document.title = page ? `${page.title} · ORILOS Docs` : 'Not found · ORILOS Docs';
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView();
    else scrollTo({ top: 0 });
  }, [slug, page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setFinding(true);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawer || finding ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer, finding]);

  const active = useActiveHeading(page ?? PAGES[0]);
  const { prev, next } = page ? neighbours(PAGES, slug) : {};
  const hs = page ? headings(page) : [];
  const claude = page ? `https://claude.ai/new?q=${encodeURIComponent(`Read ${location.origin}${hrefOf(page.slug)} and help me with ORILOS.`)}` : '';

  return (
    <div className="dx" onClick={onClick}>
      <header className="dx-top">
        <a className="dx-brand" href={BASE}><Mascot /> <b>ORILOS</b> <span className="dx-pill">Docs</span></a>
        <button type="button" className="dx-icon" aria-label="Search" onClick={() => setFinding(true)}><Search size={20} /></button>
        <button type="button" className="dx-icon" aria-label={drawer ? 'Close menu' : 'Open menu'} aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
          {drawer ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {page && hs.length > 0 && (
        <div className="dx-toc-bar">
          <button type="button" aria-expanded={tocOpen} onClick={() => setTocOpen(!tocOpen)}>
            <span>{hs.find((h) => h.id === active)?.text ?? 'On this page'}</span>
            <ChevronDown size={16} aria-hidden />
          </button>
          {tocOpen && (
            <div className="dx-toc-drop">
              {hs.map((h) => <a key={h.id} href={`#${h.id}`} className={`l${h.level}`} onClick={() => setTocOpen(false)}>{h.text}</a>)}
            </div>
          )}
        </div>
      )}

      <aside className={`dx-side${drawer ? ' open' : ''}`}>
        <a className="dx-brand" href={BASE}><Mascot /> <b>ORILOS</b> <span className="dx-pill">Docs</span></a>
        <button type="button" className="dx-find" onClick={() => setFinding(true)}>
          <Search size={16} aria-hidden /> <span>Search</span> <kbd>/</kbd>
        </button>
        <a className="dx-open" href="/"><ArrowUpRight size={16} aria-hidden /> Open ORILOS</a>
        <Sidebar slug={slug} onPick={() => setDrawer(false)} />
      </aside>
      {drawer && <div className="dx-scrim dx-drawer-scrim" onClick={() => setDrawer(false)} />}

      <main className="dx-main" id="dx-main">
        {page ? (
          <article className="dx-article">
            <p className="dx-kicker">{page.sub ?? page.group}</p>
            <h1>{page.title.match(/^[a-z_]+$/) ? <code>{page.title}</code> : page.title}</h1>
            <p className="dx-lede">{page.description}</p>
            <div className="dx-actions">
              <CopyButton text={toMarkdown(page)} label="Copy as Markdown" />
              <a className="dx-copy" href={claude} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={14} aria-hidden /> <span>Ask Claude</span></a>
            </div>
            <div className="dx-body">
              {page.blocks.map((b, i) => <BlockView key={i} b={b} />)}
            </div>
            <nav className="dx-pager" aria-label="Previous and next">
              {prev ? (
                <a href={hrefOf(prev.slug)} className="prev"><span><ChevronLeft size={14} aria-hidden /> Previous</span><strong>{prev.title}</strong></a>
              ) : <span />}
              {next && (
                <a href={hrefOf(next.slug)} className="next"><span>Next <ChevronRight size={14} aria-hidden /></span><strong>{next.title}</strong></a>
              )}
            </nav>
            <footer className="dx-foot">ORILOS is open source (MIT). Something wrong or missing here? Tell us and we’ll fix it.</footer>
          </article>
        ) : (
          <article className="dx-article dx-404">
            <Mascot size={72} />
            <h1>That page isn’t here</h1>
            <p className="dx-lede">It may have moved. Search, or start from the introduction.</p>
            <div className="dx-actions">
              <button type="button" className="dx-copy" onClick={() => setFinding(true)}><Search size={14} /> <span>Search</span></button>
              <a className="dx-copy" href={BASE}><span>Introduction</span></a>
            </div>
          </article>
        )}
      </main>

      {page && <Toc page={page} active={active} />}
      {finding && <SearchDialog onClose={() => setFinding(false)} />}
    </div>
  );
}
