// GTA VI hub data: popular public GTA VI videos on YouTube, picked from YouTube search on 24 November 2026
// (5 days after launch). Thumbnails load from YouTube and link back to it; ORILOS hosts nothing here.
export type GtaKind = 'stream' | 'gameplay' | 'chaos';

export interface GtaVideo {
  id: string;
  title: string;
  channel: string;
  views: number;
  seconds: number;
  kind: GtaKind;
}

export const GTA_PICKED = '24 Nov 2026';

export const GTA_VIDEOS: GtaVideo[] = [
  {"id": "qSyo5d-dVzA", "title": "PLAYING GTA 6 EARLY ACCESS GAMEPLAY GET IN HERE!", "channel": "IShowSpeed", "views": 70564819, "seconds": 85542, "kind": "stream"},
  {"id": "5tdj53ioJ-c", "title": "PLAYING GTA 6 FOR THE FIRST TIME (DAY 2)", "channel": "Kai Cenat Live", "views": 4653996, "seconds": 42141, "kind": "stream"},
  {"id": "AITUq3aW_8w", "title": "GTA 6 | FULL GAME | PART 1", "channel": "CaseOh", "views": 4591018, "seconds": 50874, "kind": "stream"},
  {"id": "irNhWMG560k", "title": "CARRYMINATI PLAYS GTA VI | NO PROMOTIONS", "channel": "CarryisLive", "views": 18621460, "seconds": 35107, "kind": "stream"},
  {"id": "ymCHX_Dcc-U", "title": "I Survived 100 Hours In GTA 6", "channel": "MrBeast Gaming", "views": 69283380, "seconds": 1821, "kind": "gameplay"},
  {"id": "QQV-0OUGxGs", "title": "Whatever You Steal in GTA 6, You Keep!", "channel": "MrBeast Gaming", "views": 49979966, "seconds": 1286, "kind": "gameplay"},
  {"id": "169ZzvPxvvM", "title": "MY FIRST DAY IN VICE CITY | GTA 6 GAMEPLAY #1", "channel": "Techno Gamerz", "views": 34444677, "seconds": 7439, "kind": "gameplay"},
  {"id": "rQLEb0W7REo", "title": "GTA 6 Walkthrough Gameplay Part 1 - INTRO (GRAND THEFT AUTO 6)", "channel": "theRadBrad", "views": 10037518, "seconds": 4044, "kind": "gameplay"},
  {"id": "8-DRGbQ1IXc", "title": "GTA 6 – CRAZY 5-Star Police Chase & Rampage at Vice Ocean Beach!", "channel": "Champs Network", "views": 6961265, "seconds": 523, "kind": "chaos"},
  {"id": "dUYIMa2ifWM", "title": "GTA 6 WTF and Funny Moments! #2", "channel": "Zynxize", "views": 4748064, "seconds": 1099, "kind": "chaos"},
  {"id": "AIvSTjArIZo", "title": "Do GTA 6 NPCs Actually Have Lives?", "channel": "Sonny Evans", "views": 4865653, "seconds": 627, "kind": "chaos"},
  {"id": "x9A8elqIyK8", "title": "GTA 6", "channel": "CoryxKenshin", "views": 11466508, "seconds": 6270, "kind": "chaos"},
];

export const GTA_FOCUS = {
  best: 'the best moments',
  chases: 'police chases, crashes and five-star rampages',
  funny: 'funny NPC reactions and fails',
  missions: 'heists, missions and big story moments',
  reactions: "the streamer's loudest reactions and chat spikes",
} as const;
export type GtaFocus = keyof typeof GTA_FOCUS;

export function gtaPrompt(url: string, focus: GtaFocus, clips: number): string {
  const link = url.trim() || '<paste a GTA VI video or stream link>';
  return `Clip ${link} into the ${clips} best GTA VI shorts, focusing on ${GTA_FOCUS[focus]}, with the gaming edit. Credit the creator on every clip.`;
}
