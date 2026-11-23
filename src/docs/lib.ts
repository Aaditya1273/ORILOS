// Pure helpers for the docs: page model, routing, search, and Markdown export.

export type Block =
  | { h2: string }
  | { h3: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { code: string; lang?: string; title?: string }
  | { tabs: { label: string; code: string; lang?: string }[] }
  | { callout: string; kind?: 'note' | 'tip' | 'warn' }
  | { table: string[][]; head: string[] }
  | { cards: { title: string; text: string; to: string }[] }
  | { img: string; alt: string; caption?: string }
  | { flow: { label: string; note: string }[] };

export interface Page {
  slug: string; // '' is the introduction; 'tools/clip_video' is nested
  title: string;
  group: string;
  description: string;
  blocks: Block[];
  sub?: string; // a sidebar sub-group (Tools reference)
}

export const BASE = '/docs';

/** '/docs/tools/clip_video/' → 'tools/clip_video'; '/docs' → ''. */
export function slugOf(pathname: string): string {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return rest.replace(/^\/+|\/+$/g, '');
}

export function hrefOf(slug: string, anchor = ''): string {
  return (slug ? `${BASE}/${slug}` : BASE) + (anchor ? `#${anchor}` : '');
}

/** A heading's anchor: lowercase words joined by '-'. */
export function slugify(text: string): string {
  return plain(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Inline Markdown (`code`, **bold**, [text](url)) reduced to its words. */
export function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|`|\*(?=\S)|(?<=\S)\*/g, '');
}

export interface Heading { id: string; text: string; level: 2 | 3 }

export function headings(page: Page): Heading[] {
  return page.blocks.flatMap((b): Heading[] =>
    'h2' in b ? [{ id: slugify(b.h2), text: plain(b.h2), level: 2 }]
      : 'h3' in b ? [{ id: slugify(b.h3), text: plain(b.h3), level: 3 }]
        : [],
  );
}

function blockText(b: Block): string {
  if ('h2' in b) return b.h2;
  if ('h3' in b) return b.h3;
  if ('p' in b) return b.p;
  if ('ul' in b) return b.ul.join(' ');
  if ('ol' in b) return b.ol.join(' ');
  if ('code' in b) return b.code;
  if ('tabs' in b) return b.tabs.map((t) => t.code).join(' ');
  if ('callout' in b) return b.callout;
  if ('table' in b) return [b.head, ...b.table].flat().join(' ');
  if ('img' in b) return `${b.alt} ${b.caption ?? ''}`;
  if ('flow' in b) return b.flow.map((x) => `${x.label} ${x.note}`).join(' ');
  return b.cards.map((c) => `${c.title} ${c.text}`).join(' ');
}

export interface Hit { slug: string; title: string; anchor: string; section: string; snippet: string; score: number }

/** Ranks pages and their sections for a query: every word must appear; titles beat headings beat text. */
export function search(pages: Page[], query: string, limit = 12): Hit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: Hit[] = [];
  for (const page of pages) {
    // A page is split into sections at each heading, so a hit can jump straight to it.
    let section = { anchor: '', title: page.title, text: page.description };
    const sections = [section];
    for (const b of page.blocks) {
      if ('h2' in b || 'h3' in b) {
        const t = 'h2' in b ? b.h2 : b.h3;
        section = { anchor: slugify(t), title: plain(t), text: '' };
        sections.push(section);
      } else {
        section.text += ' ' + plain(blockText(b));
      }
    }
    for (const s of sections) {
      const body = s.text.toLowerCase();
      const title = page.title.toLowerCase();
      const head = s.title.toLowerCase();
      const text = `${head} ${body}`;
      if (!words.every((w) => text.includes(w) || title.includes(w))) continue;
      let score = 0;
      for (const w of words) {
        score += title.includes(w) ? 6 : 0;
        score += head.includes(w) ? 4 : 0;
        score += text.includes(w) ? 1 : 0;
      }
      if (!s.anchor) score += 1; // the page itself, ahead of its sections on a tie
      const at = Math.max(0, body.indexOf(words.find((w) => body.includes(w)) ?? ''));
      const start = Math.max(0, at - 40);
      const snippet = (start ? '…' : '') + s.text.slice(start, start + 140).trim() + (s.text.length > start + 140 ? '…' : '');
      hits.push({ slug: page.slug, title: page.title, anchor: s.anchor, section: s.anchor ? s.title : '', snippet, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** The page as Markdown, for "Copy as Markdown" (paste it into your AI). */
export function toMarkdown(page: Page): string {
  const out = [`# ${page.title}`, '', page.description, ''];
  for (const b of page.blocks) {
    if ('h2' in b) out.push(`## ${b.h2}`, '');
    else if ('h3' in b) out.push(`### ${b.h3}`, '');
    else if ('p' in b) out.push(b.p, '');
    else if ('ul' in b) out.push(...b.ul.map((x) => `- ${x}`), '');
    else if ('ol' in b) out.push(...b.ol.map((x, i) => `${i + 1}. ${x}`), '');
    else if ('code' in b) out.push('```' + (b.lang ?? ''), b.code, '```', '');
    else if ('tabs' in b) for (const t of b.tabs) out.push(`**${t.label}**`, '', '```' + (t.lang ?? ''), t.code, '```', '');
    else if ('callout' in b) out.push(`> ${b.callout}`, '');
    else if ('table' in b) {
      out.push(`| ${b.head.join(' | ')} |`, `|${b.head.map(() => '---').join('|')}|`);
      out.push(...b.table.map((r) => `| ${r.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`), '');
    } else if ('img' in b) out.push(`![${b.alt}](${b.img})`, '');
    else if ('flow' in b) out.push(...b.flow.map((x, i) => `${i + 1}. **${x.label}**: ${x.note}`), '');
    else out.push(...b.cards.map((c) => `- [${c.title}](${hrefOf(c.to)}): ${c.text}`), '');
  }
  return out.join('\n').trim() + '\n';
}

/** Previous and next page in reading order. */
export function neighbours(pages: Page[], slug: string): { prev?: Page; next?: Page } {
  const i = pages.findIndex((p) => p.slug === slug);
  return i < 0 ? {} : { prev: pages[i - 1], next: pages[i + 1] };
}
