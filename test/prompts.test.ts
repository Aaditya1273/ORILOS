import { describe, expect, it } from 'vitest';
import { autopilotPrompt, clipPrompt, DEFAULT_CHOICES, nextSlots, schedulePrompt, zonedNow } from '../src/account/prompts';

describe('prompts for your AI', () => {
  it('keeps the simple case simple', () => {
    expect(clipPrompt({ ...DEFAULT_CHOICES, url: ' https://youtu.be/x ' })).toBe('Clip https://youtu.be/x into the 5 best shorts.');
  });
  it('says every choice in plain words', () => {
    const p = clipPrompt({ url: 'u', clips: 8, style: 'hormozi', edit: 'viral', language: 'Spanish', voiceHook: true, brand: true, platforms: ['TikTok', 'Instagram', 'YouTube'], when: 'best' });
    expect(p).toBe(
      "Clip u into the 8 best shorts with the hormozi caption style and the viral edit. Captions and a spoken hook in Spanish. Put my brand kit on every clip. Then schedule them to TikTok, Instagram and YouTube at each platform's best hours.",
    );
  });
  it('never asks to post with no platform picked', () => {
    expect(clipPrompt({ ...DEFAULT_CHOICES, url: 'u', when: 'now' })).not.toMatch(/post/);
  });
  it('writes Autopilot prompts for both modes', () => {
    expect(autopilotPrompt({ channel: 'https://twitch.tv/a', mode: 'review', clips: 3, platforms: [] })).toBe('Autopilot https://twitch.tv/a: clip every stream, 3 clips each. Keep them for my review in the Studio.');
    expect(autopilotPrompt({ channel: '', mode: 'auto', clips: 2, platforms: ['X'] })).toMatch(/^Autopilot <channel link>: .*schedule them to X/);
  });
});

describe('scheduling', () => {
  it('writes one plain sentence', () => {
    expect(schedulePrompt({ platforms: ['TikTok', 'YouTube'], clips: 'approved', perDay: 2, start: 'now' })).toBe(
      "Schedule my approved clips to TikTok and YouTube at each platform's best hours, up to 2 posts a day per platform, starting now.",
    );
    expect(schedulePrompt({ platforms: ['X'], clips: 3, perDay: 1, start: 'monday' })).toContain('my 3 newest clips to X');
  });
  it('lists the next slots by the scheduler rules', () => {
    const tue18 = { weekday: 2, hour: 18, minute: 30 };
    const s = nextSlots(['TikTok'], tue18, 2, 'now', 4);
    // TikTok best hours 12, 19, 21: 19 and 21 are 2 h apart, so 2 a day means 12 and 19 (or 19 today, 21 skipped).
    expect(s.map((x) => [x.day, x.hour])).toEqual([[0, 19], [1, 12], [1, 19], [2, 12]]);
    expect(s[0].minutesAway).toBe(30);
    expect(nextSlots(['TikTok'], tue18, 1, 'now', 2).map((x) => [x.day, x.hour])).toEqual([[0, 19], [1, 12]]);
    // LinkedIn skips the weekend: from Saturday the first slot is Monday.
    const sat = { weekday: 6, hour: 9, minute: 0 };
    expect(nextSlots(['LinkedIn'], sat, 2, 'now', 1)[0].day).toBe(2);
    // "Next Monday" from a Monday is a week later.
    expect(nextSlots(['TikTok'], { weekday: 1, hour: 8, minute: 0 }, 1, 'monday', 1)[0].day).toBe(7);
    expect(nextSlots([], tue18, 2, 'now')).toEqual([]);
  });
  it('reads the wall clock in a time zone', () => {
    const at = new Date('2026-11-24T12:30:00Z'); // a Tuesday
    expect(zonedNow('Asia/Kolkata', at)).toEqual({ weekday: 2, hour: 18, minute: 0 });
    expect(zonedNow('UTC', at)).toEqual({ weekday: 2, hour: 12, minute: 30 });
  });
});
