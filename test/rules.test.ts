import { describe, expect, it } from 'vitest';
import { pickImageModel, pickLite, pickModel, redact } from '../src/lib/gemini';
import { imagePromptFor } from '../src/lib/images';
import { composerUrl } from '../src/lib/handoff';
import { BLUESKY, INSTAGRAM, LINKEDIN, MASTODON, PINTEREST, PLATFORMS, REDDIT, X, X_PREMIUM, platform, shareText, validate, weightedLength } from '../src/lib/platforms';
import { deterministicIssues, quantitativeClaims, similarity, splitTrailingHashtags } from '../src/lib/quality';
import { friendlyWhen, nextRun } from '../src/lib/schedule';
import type { Post } from '../src/lib/types';

describe('platforms', () => {
  it('counts X links as 23 characters', () => {
    expect(weightedLength(X, `hi https://example.com/${'a'.repeat(100)}`)).toBe(3 + 23);
  });
  it('drops hashtags before ever touching an over-long X body', () => {
    const r = shareText(X, { text: 'a'.repeat(275), hashtags: ['tag'] });
    expect(r.text).toBe('a'.repeat(275));
    expect(r.warnings[0]).toMatch(/Hashtags removed/);
  });
  it('never repeats a tag already in the body', () => {
    expect(shareText(LINKEDIN, { text: 'Hello #AI', hashtags: ['ai', 'Data'] }).text).toBe('Hello #AI\n\n#Data');
  });
  it('lets X Premium go long but flags Free', () => {
    const long = 'word '.repeat(200);
    expect(validate(X, long, [])[0]).toMatch(/Too long/);
    expect(validate(X_PREMIUM, long, [])).toEqual([]);
  });
  it('wants a short Instagram first line', () => {
    expect(validate(INSTAGRAM, 'x'.repeat(130), []).join()).toMatch(/125/);
  });
});

describe('more platforms', () => {
  it('has nine platforms, each reachable by id', () => {
    expect(PLATFORMS.map((p) => p.id)).toEqual(['x', 'linkedin', 'instagram', 'threads', 'facebook', 'reddit', 'bluesky', 'mastodon', 'pinterest']);
    for (const p of PLATFORMS) expect(platform(p.id)).toBe(p);
  });
  it('enforces each platform’s limits without truncating', () => {
    expect(validate(BLUESKY, 'a'.repeat(301), [])[0]).toMatch(/Too long for Bluesky/);
    expect(validate(REDDIT, `${'t'.repeat(301)}\n\nbody`, [])).toContain('Reddit titles are limited to 300 characters: shorten the first line');
    expect(validate(PINTEREST, `${'t'.repeat(101)}\n\nbody`, [])).toContain('Pinterest titles are limited to 100 characters: shorten the first line');
    // Mastodon, like X, counts any link as 23 characters.
    expect(validate(MASTODON, `${'a'.repeat(470)} https://example.com/${'p'.repeat(60)}`, [])).toEqual([]);
  });
  it('gives Reddit and Pinterest no hashtags', () => {
    expect(shareText(REDDIT, { text: 'Title\n\nBody', hashtags: ['coffee'] }).text).toBe('Title\n\nBody');
    expect(shareText(PINTEREST, { text: 'Title\n\nBody', hashtags: ['coffee'] }).text).toBe('Title\n\nBody');
  });
});

describe('quality', () => {
  it('moves trailing hashtag lines into the tag list, deduplicated', () => {
    expect(splitTrailingHashtags('Body\n\n#One #two', ['one'])).toEqual(['Body', ['one', 'two']]);
  });
  it('finds claims but not list markers, versions or years', () => {
    expect(quantitativeClaims('1. Gemini 2.5 in 2024 grew 40% to $3m with 500 users')).toEqual(['40%', '$3m', '500 users']);
  });
  it('flags unsupported numbers, slop and copies', () => {
    const d = { text: 'We grew 40% — time to unlock growth', hashtags: [], cta: '', visual_prompt: '' };
    const issues = deterministicIssues(d, LINKEDIN, { banned: [], ctaWanted: true, evidenceText: 'nothing here', siblings: { X: d.text } });
    expect(issues.join('|')).toMatch(/Unsupported number "40%"/);
    expect(issues.join('|')).toMatch(/unlock/);
    expect(issues.join('|')).toMatch(/Missing call to action/);
    expect(issues.join('|')).toMatch(/Nearly identical to the X version/);
    expect(similarity('a b c', 'x y z')).toBe(0);
  });
});

describe('schedule', () => {
  const base = { time: '09:00', day: 1 } as const;
  it('finds the next weekday run', () => {
    const fri10 = new Date(2026, 9, 9, 10).getTime(); // Friday 9 Oct 2026, 10:00
    expect(new Date(nextRun({ ...base, kind: 'weekdays' }, fri10)!).getDay()).toBe(1); // Monday
    expect(new Date(nextRun({ ...base, kind: 'daily' }, fri10)!).getDate()).toBe(10);
    expect(nextRun({ ...base, kind: 'off' }, fri10)).toBeUndefined();
  });
  it('runs once a scheduled time passes since the last run (the scheduler check)', () => {
    const t = new Date(2026, 9, 9, 8, 59).getTime();
    const due = nextRun({ ...base, kind: 'daily' }, t)!;
    expect(due).toBe(new Date(2026, 9, 9, 9, 0).getTime());
    expect(nextRun({ ...base, kind: 'once', onceAt: t + 5 }, t)).toBe(t + 5);
    expect(nextRun({ ...base, kind: 'once', onceAt: t - 5 }, t)).toBeUndefined();
  });
  it('says Today / Tomorrow', () => {
    const now = new Date(2026, 9, 9, 10).getTime();
    expect(friendlyWhen(now + 3600_000, now)).toMatch(/^Today · /);
    expect(friendlyWhen(now + 86_400_000, now)).toMatch(/^Tomorrow · /);
  });
});

describe('gemini helpers', () => {
  it('picks the maintained Flash alias, then the newest Flash', () => {
    expect(pickModel(['gemini-2.5-flash', 'gemini-flash-latest'])).toBe('gemini-flash-latest');
    expect(pickModel(['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])).toBe('gemini-2.5-flash');
    expect(pickLite(['gemini-2.5-flash', 'gemini-2.5-flash-lite'])).toBe('gemini-2.5-flash-lite');
    expect(pickImageModel(['gemini-2.5-flash', 'gemini-2.5-flash-image'])).toBe('gemini-2.5-flash-image');
  });
  it('redacts key-shaped strings', () => {
    expect(redact('bad key AIzaSyA1234567890abcdefghijklmnopqrstuv here')).toBe('bad key [key] here');
  });
});

describe('hand-off', () => {
  const post = { platform: 'x', visualPrompt: 'A coffee cup', text: 'Hi' } as Post;
  it('prefills the X and LinkedIn composers', () => {
    expect(composerUrl(post, 'a b')).toBe('https://x.com/intent/post?text=a%20b');
    expect(composerUrl({ ...post, platform: 'linkedin' }, 'a')).toBe('https://www.linkedin.com/feed/?shareActive=true&text=a');
  });
  it('uses each platform’s own composer, and copies where there is none', () => {
    expect(composerUrl({ ...post, platform: 'bluesky' }, 'a b')).toBe('https://bsky.app/intent/compose?text=a%20b');
    expect(composerUrl({ ...post, platform: 'threads' }, 'a')).toBe('https://www.threads.net/intent/post?text=a');
    expect(composerUrl({ ...post, platform: 'reddit' }, 'My title\n\nThe body')).toBe('https://www.reddit.com/submit?type=TEXT&title=My%20title&text=The%20body');
    expect(composerUrl({ ...post, platform: 'mastodon' }, 'a')).toBeUndefined();
    expect(PLATFORMS.filter((p) => p.copiesText).map((p) => p.id)).toEqual(['facebook', 'mastodon', 'pinterest']);
  });
  it('asks for the right ratio and no text in images', () => {
    expect(imagePromptFor(post)).toMatch(/16:9/);
    expect(imagePromptFor({ ...post, platform: 'instagram' })).toMatch(/3:4/);
    expect(imagePromptFor({ ...post, platform: 'pinterest' })).toMatch(/2:3 portrait/);
    expect(imagePromptFor(post)).toMatch(/Absolutely no text/);
  });
});
