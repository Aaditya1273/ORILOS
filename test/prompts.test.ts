import { describe, expect, it } from 'vitest';
import { autopilotPrompt, clipPrompt, DEFAULT_CHOICES } from '../src/account/prompts';

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
