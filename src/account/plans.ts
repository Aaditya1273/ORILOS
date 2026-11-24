// The ORILOS plans. One source for the pricing page, the account pages and the billing API.

export type PlanId = 'free' | 'pro' | 'team';
export type Interval = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** US dollars per month; yearly is billed once a year at `yearly * 12`. */
  price: { monthly: number; yearly: number };
  features: string[];
  cta: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need to start clipping.',
    price: { monthly: 0, yearly: 0 },
    features: [
      'Unlimited clips on your own computer',
      'Works in Claude Code, Codex, Cursor and more',
      'Hot-moment finder, 9:16 framing, jump cuts',
      '12 caption styles',
      'Post now to 9 platforms',
      'No watermark, ever',
    ],
    cta: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For creators who post every day.',
    price: { monthly: 19, yearly: 15 },
    features: [
      'Everything in Free',
      'All 67 caption styles',
      'Brand kit: your logo, colours and font',
      'Best-time scheduling and the Studio calendar',
      'Autopilot on 3 Twitch, Kick or YouTube channels',
      'Spoken hooks and voiceovers in 53 languages',
      'Use it on 3 computers',
      'Priority support',
    ],
    cta: 'Go Pro',
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For agencies and channel networks.',
    price: { monthly: 59, yearly: 49 },
    features: [
      'Everything in Pro',
      'Up to 10 brand kits',
      'Autopilot on up to 10 channels',
      'Use it on 15 computers',
      'A direct line to the team',
    ],
    cta: 'Go Team',
  },
];

export const plan = (id: string): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];

/** Licence keys per plan: each key works on one computer. */
export const KEY_LIMITS: Record<PlanId, number> = { free: 1, pro: 3, team: 15 };

/** The caption styles on Free; the ORILOS app's Free list must match. */
export const FREE_STYLES = new Set(['bold', 'hormozi', 'clean', 'pill', 'boxed', 'karaoke', 'neon', 'minimal', 'subtitle', 'oneword', 'comic', 'orilos']);

/** A subscription in these states still has its plan (cancelled runs until the period ends). */
export const LIVE_STATUSES = new Set(['active', 'on_trial', 'past_due', 'cancelled']);
