import { describe, expect, it } from 'vitest';
import { PAGES } from './content';
import { headings, hrefOf, neighbours, search, slugOf, slugify, toMarkdown } from './lib';
import { TOOLS } from './tools';

describe('docs routing', () => {
  it('maps paths to slugs and back', () => {
    expect(slugOf('/docs')).toBe('');
    expect(slugOf('/docs/')).toBe('');
    expect(slugOf('/docs/tools/clip_video/')).toBe('tools/clip_video');
    expect(hrefOf('')).toBe('/docs');
    expect(hrefOf('quickstart', 'get-uv')).toBe('/docs/quickstart#get-uv');
  });

  it('has one page per slug, a page per tool, and prev/next in order', () => {
    const slugs = PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const t of TOOLS) expect(slugs).toContain(`tools/${t.name}`);
    expect(neighbours(PAGES, '').prev).toBeUndefined();
    expect(neighbours(PAGES, '').next?.slug).toBe('quickstart');
  });

  it('every internal link points at a real page', () => {
    const slugs = new Set(PAGES.map((p) => p.slug));
    const md = PAGES.map(toMarkdown).join('\n');
    for (const [, path] of md.matchAll(/\]\((\/docs[^)#]*)/g)) expect(slugs, path).toContain(slugOf(path));
  });
});

describe('docs search', () => {
  it('slugifies headings for anchors', () => {
    expect(slugify('1. Get **uv**')).toBe('1-get-uv');
    expect(headings(PAGES.find((p) => p.slug === 'quickstart')!)[0].id).toBe('1-get-uv');
  });

  it('finds sections, title hits first', () => {
    const hits = search(PAGES, 'codex timeout');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.slug === 'troubleshooting' && h.anchor === 'codex-says-the-tool-timed-out')).toBe(true);
    expect(search(PAGES, 'autopilot')[0].slug).toBe('autopilot');
    expect(search(PAGES, 'karaoke').some((h) => h.slug === 'captions')).toBe(true);
    expect(search(PAGES, 'zzqx-nothing')).toEqual([]);
    expect(search(PAGES, '   ')).toEqual([]);
  });

  it('exports a page as Markdown', () => {
    const md = toMarkdown(PAGES.find((p) => p.slug === 'quickstart')!);
    expect(md.startsWith('# Quickstart')).toBe(true);
    expect(md).toContain('```bash\nuvx orilos-mcp install\n```');
  });
});

describe('docs voice', () => {
  it('never shows an em/en dash or an emoji', () => {
    const all = PAGES.map((p) => `${p.title}\n${p.description}\n${toMarkdown(p)}`).join('\n');
    expect(all.match(/[—–]/g), 'dashes').toBeNull();
    expect(all.match(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu), 'emoji').toBeNull();
  });
});
