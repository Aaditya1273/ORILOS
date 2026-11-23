// Turns choices made in the dashboard into one plain sentence for Claude Code or Codex.
// The AI reads ORILOS's tool docs, so plain words map onto the right tools and arguments.

export const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'X', 'LinkedIn', 'Facebook', 'Threads', 'Pinterest', 'Bluesky'] as const;
export const EDITS = {
  viral: 'Jump cuts, punch-ins on the big words, sound hits, progress bar',
  podcast: 'Calmer cuts and zooms for talking heads',
  gaming: 'No cuts (the screams are the content), zooms on the peaks',
  clean: 'Captions only, no extra effects',
} as const;
export type Edit = keyof typeof EDITS;

export interface ClipChoices {
  url: string;
  clips: number;
  style: string; // '' lets the AI choose
  edit: Edit | '';
  language: string; // '' keeps the video's language
  voiceHook: boolean;
  brand: boolean;
  platforms: string[];
  when: 'none' | 'now' | 'best';
}

export const DEFAULT_CHOICES: ClipChoices = { url: '', clips: 5, style: '', edit: '', language: '', voiceHook: false, brand: false, platforms: [], when: 'none' };

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function clipPrompt(c: ClipChoices): string {
  const url = c.url.trim() || '<paste a video link>';
  const parts = [`Clip ${url} into the ${c.clips} best shorts`];
  const look: string[] = [];
  if (c.style) look.push(`the ${c.style} caption style`);
  if (c.edit) look.push(`the ${c.edit} edit`);
  if (look.length) parts[0] += ` with ${list(look)}`;
  parts[0] += '.';
  if (c.language) parts.push(`Captions${c.voiceHook ? ' and a spoken hook' : ''} in ${c.language}.`);
  else if (c.voiceHook) parts.push('Add a spoken hook.');
  if (c.brand) parts.push('Put my brand kit on every clip.');
  if (c.platforms.length && c.when !== 'none')
    parts.push(c.when === 'now' ? `Then post the best one to ${list(c.platforms)}.` : `Then schedule them to ${list(c.platforms)} at each platform's best hours.`);
  return parts.join(' ');
}

export interface WatchChoices {
  channel: string;
  mode: 'review' | 'auto';
  clips: number;
  platforms: string[];
}

export function autopilotPrompt(w: WatchChoices): string {
  const channel = w.channel.trim() || '<channel link>';
  const base = `Autopilot ${channel}: clip every stream, ${w.clips} clips each`;
  if (w.mode === 'review') return `${base}. Keep them for my review in the Studio.`;
  const where = w.platforms.length ? list(w.platforms) : 'TikTok, Instagram and YouTube';
  return `${base}, and schedule them to ${where} at the best hours without asking me.`;
}

/** Best hours to post, local time (averaged from public studies; the engine uses the same table). */
export const BEST_HOURS: [platform: string, hours: number[], note?: string][] = [
  ['TikTok', [12, 19, 21]],
  ['Instagram', [11, 13, 19]],
  ['YouTube', [15, 18, 20]],
  ['X', [9, 12, 17]],
  ['LinkedIn', [8, 12, 17], 'weekdays only'],
  ['Facebook', [9, 13, 19]],
  ['Threads', [8, 12, 20]],
  ['Pinterest', [14, 20, 21]],
  ['Bluesky', [9, 13, 18]],
];
