import { validate, type Platform } from './platforms';

/** Phrases that make copy read as generic AI output. */
export const SLOP = [
  'delve',
  'unlock',
  'unleash',
  'game-changer',
  'game changer',
  "in today's fast-paced",
  'revolutionize',
  'elevate your',
  'seamless',
  'harness the power',
  'in the ever-evolving',
  'look no further',
  'dive into',
];

/**
 * Models sometimes end the body with the hashtag line *and* return the same
 * tags separately. Trailing hashtag-only lines move into the tag list, deduplicated.
 */
export function splitTrailingHashtags(text: string, tags: string[]): [string, string[]] {
  const lines = text.trimEnd().split('\n');
  const found: string[] = [];
  const onlyTags = /^\s*(#[\p{L}\p{N}_]+\s*)+$/u;
  while (lines.length && onlyTags.test(lines[lines.length - 1])) {
    found.unshift(...[...lines.pop()!.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]));
  }
  const seen = new Set<string>();
  const merged = [...tags, ...found].map((t) => t.replaceAll('#', '').trim()).filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
  return [lines.join('\n').trimEnd(), merged];
}

const claim = new RegExp(
  [
    String.raw`(?:[$€£₹]\s?\d[\d,.]*(?:\s?(?:k|m|bn|b|million|billion))?)`, // money
    String.raw`(?:\d[\d,.]*\s?%)`, // percentages
    String.raw`(?:\b\d[\d,.]*x\b)`, // multipliers (3x)
    String.raw`(?:\b\d[\d,.]*\s?(?:k|K|M|bn|million|billion|thousand)\b)`, // magnitudes
    String.raw`(?:\b\d[\d,]*\+?\s+(?:users|customers|people|downloads|installs|companies|teams|developers|clients|sales|stars|followers|subscribers|members|signups|orders|hours|minutes|days|weeks|months|years|times|percent)\b)`,
  ].join('|'),
  'gi',
);

/**
 * Numbers that assert something about the world and therefore need evidence.
 * List markers ("1."), versions, years and clock times are not.
 */
export const quantitativeClaims = (text: string) =>
  [...text.replace(/^\s*\d+[.)]\s/gm, '').matchAll(claim)].map((m) => m[0].trim().replace(/[.,]+$/, ''));

/** A claim is supported when its leading number appears in the evidence. */
function supported(c: string, evidenceLower: string) {
  const n = (c.match(/\d[\d,.]*/)?.[0] ?? c).replace(/[.,]+$/, '');
  return evidenceLower.includes(n.toLowerCase()) || evidenceLower.includes(n.replaceAll(',', ''));
}

/** Word-set overlap (Jaccard) — catches copy-pasted platform variants. */
export function similarity(a: string, b: string) {
  const words = (t: string) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}

export interface Draft {
  text: string;
  hashtags: string[];
  cta: string;
  visual_prompt: string;
}

/** Deterministic quality gate: length, hashtags, banned/slop phrases, CTA, unsupported numbers, copies. */
export function deterministicIssues(
  d: Draft,
  p: Platform,
  opts: { banned: string[]; ctaWanted: boolean; evidenceText: string; siblings: Record<string, string> },
): string[] {
  const lower = d.text.toLowerCase();
  const ev = opts.evidenceText.toLowerCase();
  return [
    ...validate(p, d.text, d.hashtags),
    ...opts.banned.filter((b) => b.trim() && lower.includes(b.toLowerCase())).map((b) => `Uses banned phrase "${b}"`),
    ...SLOP.filter((b) => lower.includes(b)).map((b) => `Generic AI phrasing: "${b}"`),
    ...(opts.ctaWanted && !d.cta.trim() ? ['Missing call to action'] : []),
    ...quantitativeClaims(d.text)
      .filter((n) => !supported(n, ev))
      .map((n) => `Unsupported number "${n}" (not in evidence)`),
    ...Object.entries(opts.siblings)
      .filter(([, t]) => similarity(d.text, t) > 0.8)
      .map(([k]) => `Nearly identical to the ${k} version — rewrite natively for ${p.label}`),
  ];
}
