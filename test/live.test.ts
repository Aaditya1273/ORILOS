// Live end-to-end run against the real Gemini API. Skipped unless
// GEMINI_API_KEY is set in the environment; the key is never printed.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { runOnce } from '../src/lib/agent';
import { Gemini } from '../src/lib/gemini';
import { getState, loadState, setState } from '../src/lib/store';

const key = import.meta.env.GEMINI_API_KEY as string | undefined; // vitest maps process.env here

describe.skipIf(!key)('live Gemini', () => {
  it('learns a real business from its website and writes native posts', async () => {
    await loadState();
    setState((s) => ({
      ...s,
      workspace: {
        name: 'Blue Bottle Coffee',
        website: 'https://bluebottlecoffee.com',
        niche: 'Specialty coffee roaster and cafés; sells beans and subscriptions online',
        goal: 'Get more customers',
        platforms: ['x', 'linkedin', 'instagram'],
        xPremium: false,
        watch: [],
      },
    }));
    const ai = new Gemini(async () => key);
    const phases: string[] = [];
    const t0 = Date.now();
    const r = await runOnce(ai, (p, note) => {
      phases.push(`${p}: ${note}`);
      console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${p}: ${note} (${ai.lastModel ?? "?"})`);
    });
    const s = getState();
    console.log(JSON.stringify({ model: ai.lastModel, phases, warnings: r.warnings, brain: { name: s.brain?.brand_name, oneLiner: s.brain?.one_liner, tone: s.brain?.tone, sources: s.brain?.sources.length } }, null, 2));
    for (const p of r.posts) console.log(`\n── ${p.platform} (score ${p.score.toFixed(2)}; issues: ${p.issues.join(' | ') || 'none'})\n${p.text}\n${p.hashtags.map((h) => '#' + h).join(' ')}\nsources: ${p.sources.length}`);
    expect(s.brain?.brand_name).toBeTruthy();
    expect(r.posts.map((p) => p.platform)).toEqual(['x', 'linkedin', 'instagram']);
    expect(r.posts.every((p) => p.state === 'pending' && p.text.length > 20)).toBe(true);
    expect(r.posts[0].text.length).toBeLessThanOrEqual(280);
  }, 600_000);
});
