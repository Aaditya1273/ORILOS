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

/* ── Scheduling ── */

export interface ScheduleChoices {
  platforms: string[];
  clips: 'approved' | 3 | 5;
  perDay: 1 | 2;
  start: 'now' | 'tomorrow' | 'monday';
}

export const DEFAULT_SCHEDULE: ScheduleChoices = { platforms: ['TikTok', 'Instagram', 'YouTube'], clips: 'approved', perDay: 2, start: 'now' };

export function schedulePrompt(c: ScheduleChoices): string {
  const what = c.clips === 'approved' ? 'my approved clips' : `my ${c.clips} newest clips`;
  const where = c.platforms.length ? list(c.platforms) : '<pick platforms>';
  const often = c.perDay === 1 ? '1 post a day' : 'up to 2 posts a day';
  const start = c.start === 'now' ? 'starting now' : c.start === 'tomorrow' ? 'starting tomorrow' : 'starting next Monday';
  return `Schedule ${what} to ${where} at each platform's best hours, ${often} per platform, ${start}.`;
}

/** Wall-clock "now" in a time zone: weekday (0 = Sunday), hour and minute. */
export interface ZonedNow {
  weekday: number;
  hour: number;
  minute: number;
}

export function zonedNow(timeZone: string, at = new Date()): ZonedNow {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(at);
  } catch {
    return { weekday: at.getDay(), hour: at.getHours(), minute: at.getMinutes() };
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), hour: Number(get('hour')) % 24, minute: Number(get('minute')) };
}

export interface Slot {
  platform: string;
  day: number; // days from today
  hour: number;
  minutesAway: number;
}

/** The next posting slots, by the same rules ORILOS schedules with: each platform's best hours,
 *  at most perDay a day, never two within 3 hours, LinkedIn on weekdays only. */
export function nextSlots(platforms: string[], now: ZonedNow, perDay: 1 | 2, start: ScheduleChoices['start'], count = 6): Slot[] {
  const nowMin = now.hour * 60 + now.minute;
  const first = start === 'now' ? 0 : start === 'tomorrow' ? 1 : ((8 - now.weekday) % 7) || 7;
  const out: Slot[] = [];
  for (const [platform, hours] of BEST_HOURS) {
    if (!platforms.includes(platform)) continue;
    for (let day = first; day < first + 8; day++) {
      const weekday = (now.weekday + day) % 7;
      if (platform === 'LinkedIn' && (weekday === 0 || weekday === 6)) continue;
      const taken: number[] = [];
      for (const h of [...hours].sort((a, b) => a - b)) {
        if (taken.length >= perDay || taken.some((t) => Math.abs(t - h) < 3)) continue;
        if (day === 0 && h * 60 <= nowMin) continue;
        taken.push(h);
        out.push({ platform, day, hour: h, minutesAway: day * 1440 + h * 60 - nowMin });
      }
    }
  }
  return out.sort((a, b) => a.minutesAway - b.minutesAway).slice(0, count);
}
