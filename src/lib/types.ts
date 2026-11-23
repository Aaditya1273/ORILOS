export type PlatformId = 'x' | 'linkedin' | 'instagram' | 'threads' | 'facebook' | 'reddit' | 'bluesky' | 'mastodon' | 'pinterest';

export interface Workspace {
  name: string;
  website: string;
  niche: string;
  goal: string;
  platforms: PlatformId[];
  xPremium: boolean;
  /** Pages ORILOS re-reads on every run (news, competitors, docs, changelog). */
  watch: string[];
}

export interface BrainItem {
  name: string;
  description?: string;
}

export interface Brain {
  brand_name: string;
  one_liner: string;
  description?: string;
  audience_segments: string[];
  audience_pains?: string[];
  tone: string[];
  style_rules?: string[];
  banned_phrases?: string[];
  content_pillars: BrainItem[];
  products?: BrainItem[];
  positioning_statement?: string;
  differentiators?: string[];
  competitors?: BrainItem[];
  key_messages: string[];
  sources: Source[];
  updatedAt: number;
}

export interface Source {
  title: string;
  url: string;
}

/** A fact with where it came from. Web text is data, never instructions. */
export interface Evidence {
  id: string;
  title: string;
  url: string;
  facts: string[];
  kind: 'website' | 'watch' | 'web';
}

/**
 * Truthful publication states. ORILOS never posts: "handedOff" means the
 * composer was opened; only the user's confirmation makes a post "posted".
 */
export type PostState = 'pending' | 'approved' | 'handedOff' | 'posted' | 'skipped';

export interface PostImage {
  blobId: string;
  source: 'gemini' | 'upload';
  width?: number;
  height?: number;
}

export interface Post {
  id: string;
  runId: string;
  platform: PlatformId;
  text: string;
  /** Text as ORILOS wrote it, to learn from the user's edits. */
  original: string;
  hashtags: string[];
  cta: string;
  visualPrompt: string;
  image?: PostImage;
  state: PostState;
  score: number;
  issues: string[];
  sources: Source[];
  why: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityEntry {
  id: string;
  at: number;
  kind: 'run' | 'brain' | 'approved' | 'skipped' | 'handoff' | 'posted' | 'error' | 'image' | 'schedule';
  title: string;
  detail?: string;
  platform?: PlatformId;
  ok: boolean;
}

export interface Schedule {
  kind: 'off' | 'daily' | 'weekdays' | 'weekly' | 'once';
  /** "HH:MM", local time. */
  time: string;
  /** 0 = Sunday … 6 = Saturday, for weekly. */
  day: number;
  /** Epoch ms, for once. */
  onceAt?: number;
  lastRunAt?: number;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  /** Opt-in: Gemini image models need a paid-tier key. */
  geminiImages: boolean;
  learnFromEdits: boolean;
  /** Preferred chat-AI site for the image hand-off. */
  imageApp: 'chatgpt' | 'gemini' | 'copilot';
  notifications: boolean;
}

export interface State {
  version: 1;
  workspace?: Workspace;
  brain?: Brain;
  posts: Post[];
  activity: ActivityEntry[];
  schedule: Schedule;
  settings: Settings;
  /** The last thing the user asked for in "Tell ORILOS". */
  focus: string;
}

export type Phase = 'brain' | 'research' | 'plan' | 'write' | 'check' | 'image' | 'done';
