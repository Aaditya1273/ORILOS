import type { PlatformId, Post } from './types';

// What X's own published ranking code predicts and penalises
// (github.com/xai-org/x-algorithm): favourites, replies, reposts, quotes,
// shares, clicks and dwell time up; "not interested", mute, block, report
// down. No guarantees, no invented weights — just write for those signals.
const xSignals =
  "Write for the signals X's published ranking code predicts: replies, reposts, quotes, shares and time spent reading. " +
  'Open with a first line that stops the scroll — a specific, surprising or contrarian point that is TRUE and backed by the evidence ' +
  '(no clickbait, no fake urgency, no "you won\'t believe"). One idea per post. End with a real question or opinion people want to answer. ' +
  'Avoid what makes people tap "not interested", mute or report: engagement bait ("like/RT if"), hashtag stuffing, ALL CAPS, vague hype. ' +
  'Prefer no link in the post itself (it can go in a reply).';

export interface Platform {
  id: PlatformId;
  label: string;
  maxChars: number;
  maxHashtags: number;
  style: string;
  needsImage: boolean;
  /** Image size ORILOS asks for. */
  ratio: '16:9' | '3:4' | '1:1' | '4:5' | '2:3';
  /**
   * The web composer can't be pre-filled (or has its own title field), so the
   * hand-off copies the post for the user to paste.
   */
  copiesText?: boolean;
}

export const X: Platform = {
  id: 'x',
  label: 'X',
  maxChars: 280,
  maxHashtags: 2,
  style: `Free X account: ONE post, max 280 characters including hashtags. No thread unless asked. 0-2 hashtags. ${xSignals}`,
  needsImage: false,
  ratio: '16:9',
};

/** X Premium: up to 25,000 characters, but only ~280 show before "Show more". */
export const X_PREMIUM: Platform = {
  ...X,
  maxChars: 25000,
  style:
    'X Premium long post. The first 280 characters must work on their own — only they show before "Show more" — so the hook and the core ' +
    'point go there. Then 2-6 short paragraphs of concrete detail; aim for 600-1500 characters in total; plain line breaks, no markdown. ' +
    `0-2 hashtags at the end. ${xSignals}`,
};

export const LINKEDIN: Platform = {
  id: 'linkedin',
  label: 'LinkedIn',
  maxChars: 3000,
  maxHashtags: 5,
  style: 'Hook in the first 2 lines (before "see more"), short paragraphs, concrete insight, 900-1300 characters ideal, 3-5 hashtags at the end.',
  needsImage: false,
  ratio: '1:1',
};

export const INSTAGRAM: Platform = {
  id: 'instagram',
  label: 'Instagram',
  maxChars: 2200,
  maxHashtags: 5,
  style:
    'Caption for an image post: hook line, 3-6 short lines, clear CTA, 3-5 specific hashtags ' +
    "(never another company's brand name). Describe the visual separately.",
  needsImage: true,
  ratio: '3:4',
};

export const THREADS: Platform = {
  id: 'threads',
  label: 'Threads',
  maxChars: 500,
  maxHashtags: 1,
  style:
    'ONE Threads post, max 500 characters. Conversational and warm, like talking to people who follow you; a clear first line, ' +
    '2-4 short lines, end with a question people want to answer. At most ONE topic tag (Threads allows one per post).',
  needsImage: false,
  ratio: '4:5',
};

export const FACEBOOK: Platform = {
  id: 'facebook',
  label: 'Facebook',
  maxChars: 63206,
  maxHashtags: 2,
  style: 'Facebook Page post: friendly and local, 40-250 characters works best (up to ~500 for a story). One clear point, a concrete detail, a simple call to action. 0-2 hashtags.',
  needsImage: false,
  ratio: '1:1',
  copiesText: true,
};

export const REDDIT: Platform = {
  id: 'reddit',
  label: 'Reddit',
  maxChars: 40000,
  maxHashtags: 0,
  style:
    'Reddit text post. FIRST LINE is the title (a plain, specific statement or question, max 300 characters, no clickbait), ' +
    'then a blank line, then the body: 600-1500 characters of genuinely useful detail written like a person in the community, ' +
    'not a brand. Value first; no marketing voice, no emojis, no hashtags, no "check out our". If the business is mentioned, ' +
    'say plainly that you work on it. End with an honest question that invites discussion. The user picks a subreddit and follows its rules.',
  needsImage: false,
  ratio: '16:9',
};

export const BLUESKY: Platform = {
  id: 'bluesky',
  label: 'Bluesky',
  maxChars: 300,
  maxHashtags: 2,
  style: 'ONE Bluesky post, max 300 characters including hashtags and links. Direct, human, a little informal; one idea, a specific detail, no hype. 0-2 hashtags.',
  needsImage: false,
  ratio: '16:9',
};

export const MASTODON: Platform = {
  id: 'mastodon',
  label: 'Mastodon',
  maxChars: 500,
  maxHashtags: 4,
  style:
    'ONE Mastodon post, max 500 characters. Informative and sincere; the community dislikes marketing speak and engagement bait. ' +
    'Hashtags are how people find posts here: 2-4 relevant ones at the end, in CamelCase for screen readers (#SpecialtyCoffee).',
  needsImage: false,
  ratio: '16:9',
  copiesText: true,
};

export const PINTEREST: Platform = {
  id: 'pinterest',
  label: 'Pinterest',
  maxChars: 500,
  maxHashtags: 0,
  style:
    'Pinterest Pin for an image. FIRST LINE is the Pin title (max 100 characters, searchable words people would type). ' +
    'Then a blank line and a 150-450 character description with natural keywords and what the reader gets. No hashtags. ' +
    'Describe the visual separately: a tall 2:3 image.',
  needsImage: true,
  ratio: '2:3',
  copiesText: true,
};

export const PLATFORMS = [X, LINKEDIN, INSTAGRAM, THREADS, FACEBOOK, REDDIT, BLUESKY, MASTODON, PINTEREST];

export function platform(id: PlatformId, xPremium = false): Platform {
  if (id === 'x' && xPremium) return X_PREMIUM;
  return PLATFORMS.find((p) => p.id === id) ?? X;
}

export const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.label ?? id;

const url = /https?:\/\/\S+/g;

/** Length as the platform counts it. X and Mastodon count every link as 23 characters. */
export const weightedLength = (p: Platform, text: string) => (p.id === 'x' || p.id === 'mastodon' ? text.replace(url, 'x'.repeat(23)).length : text.length);

/** Deterministic checks. Human-readable issues; empty = OK. */
export function validate(p: Platform, text: string, hashtags: string[]): string[] {
  const full = hashtags.length ? `${text}\n\n${hashtags.map((h) => `#${h}`).join(' ')}` : text;
  const firstLine = text.trim().split('\n')[0] ?? '';
  const issues: string[] = [];
  if (!text.trim()) issues.push('Post text is empty');
  const len = weightedLength(p, full);
  if (len > p.maxChars) issues.push(`Too long for ${p.label}: ${len}/${p.maxChars} characters`);
  if (hashtags.length > p.maxHashtags) issues.push(`Too many hashtags for ${p.label}: ${hashtags.length}/${p.maxHashtags}`);
  if (/\n\s*\n\s*\n\s*\n/.test(text)) issues.push('Too many empty lines in a row');
  if (p.id === 'instagram' && firstLine.length > 125) issues.push('Instagram shows ~125 characters before "more": shorten the first line');
  if (p.id === 'linkedin' && firstLine.length > 210) issues.push('LinkedIn shows ~210 characters before "see more": put the hook in a short first line');
  if (p.id === 'linkedin' && text.split(/\n\s*\n/).some((para) => para.length > 600)) issues.push('Break long paragraphs up (LinkedIn readers skim)');
  if (p.id === 'reddit' && firstLine.length > 300) issues.push('Reddit titles are limited to 300 characters: shorten the first line');
  if (p.id === 'pinterest' && firstLine.length > 100) issues.push('Pinterest titles are limited to 100 characters: shorten the first line');
  return issues;
}

const tagRe = /#([\p{L}\p{N}_]+)/gu;

/**
 * Final share text. Never repeats a tag the body already contains. X is
 * hard-limited: hashtags are dropped before the body is touched; an
 * over-long body is reported, never truncated.
 */
export function shareText(p: Platform, post: Pick<Post, 'text' | 'hashtags'>): { text: string; warnings: string[] } {
  const inBody = new Set([...post.text.matchAll(tagRe)].map((m) => m[1].toLowerCase()));
  const tags = post.hashtags
    .slice(0, p.maxHashtags)
    .map((h) => h.replaceAll('#', ''))
    .filter((h) => h && !inBody.has(h.toLowerCase()))
    .map((h) => `#${h}`)
    .join(' ');
  let text = tags ? `${post.text}\n\n${tags}` : post.text;
  const warnings: string[] = [];
  if (weightedLength(p, text) > p.maxChars && tags) {
    text = post.text;
    warnings.push(`Hashtags removed to fit ${p.label}'s ${p.maxChars}-character limit`);
  }
  if (weightedLength(p, text) > p.maxChars) warnings.push(`Post is ${weightedLength(p, text)}/${p.maxChars} characters — shorten it before posting`);
  return { text, warnings };
}
