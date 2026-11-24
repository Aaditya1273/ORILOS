// Every docs page, as data. Keep it true to the product.

import { STYLES, VOICE_LANGUAGES } from './data';
import type { Block, Page } from './lib';
import { CLIP_PICK, EDIT_STYLES, TOOLS, type Tool } from './tools';

const G = { start: 'Getting started', clip: 'Clipping', publish: 'Publishing', ref: 'Reference', help: 'Help' };

const NOT_ON_PYPI =
  'ORILOS isn’t published to PyPI yet, so `uvx orilos-mcp` won’t resolve until it is. Until then, run it from a local checkout: `uvx --from /path/to/orilos-mcp orilos-mcp install`. The installer then writes that same command into every AI app.';

const CODEX_TOML = `[mcp_servers.orilos]
command = "uvx"
args = ["orilos-mcp"]
# Clipping long videos takes a while; first start can download models.
startup_timeout_sec = 180
tool_timeout_sec = 300`;

const JSON_CONFIG = `{
  "mcpServers": {
    "orilos": { "command": "uvx", "args": ["orilos-mcp"] }
  }
}`;

// Hand-written example calls, one per tool (arguments the tool really takes).
const EXAMPLES: Record<string, string> = {
  setup: '{}',
  clip_video: '{ "source": "https://www.youtube.com/watch?v=…", "clips": 5, "caption_style": "hormozi", "focus": "funniest reactions" }',
  clip_live: '{ "url": "https://www.twitch.tv/somestreamer", "minutes": 10, "clips": 3 }',
  job_status: '{ "job_id": "20261123-085243-video" }',
  get_transcript: '{ "job_id": "20261123-085243-video", "start": 600, "end": 780 }',
  render_clips:
    '{\n  "job_id": "20261123-085243-video",\n  "clips": [\n    { "start": 742.4, "end": 776.0, "hook": "He built a house for selfies?!", "title": "The selfie house",\n      "score": 88, "why": "Absurd reveal in the first second", "edit_style": "viral", "emphasis": ["selfies"],\n      "captions": { "tiktok": "wait for it #podcast", "x": "He built a house just for selfies." },\n      "caption_style": "orilos", "voice_hook": true }\n  ]\n}',
  list_jobs: '{ "limit": 10 }',
  get_clip: '{ "job_id": "20261123-085243-video", "clip": 1 }',
  caption_styles: '{ "preview": true }',
  brand_kit: '{ "action": "save", "name": "acme", "logo": "C:/Users/me/acme.png", "highlight_color": "#A3FF12" }',
  voices: '{ "language": "hi" }',
  voiceover: '{ "text": "Las fotos viejas pegan distinto", "language": "es" }',
  analyze_viral: '{ "source": "https://www.youtube.com/shorts/…", "frames": 8, "seconds": 60 }',
  research_trends: '{ "topic": "GTA 6", "platform": "TikTok" }',
  post_clip: '{ "job_id": "20261123-085243-video", "clip": 1, "platforms": ["tiktok", "instagram"] }',
  post_status: '{ "request_id": "…" }',
  schedule_posts: '{ "job_id": "20261123-085243-video", "clips": [1, 2, 3], "platforms": ["tiktok", "instagram", "youtube"] }',
  scheduled_posts: '{ "action": "move", "item_id": "a1b2c3d4e5", "when": "2026-11-28T19:00:00+05:30" }',
  open_studio: '{ "view": "calendar" }',
  autopilot_watch: '{ "action": "add", "channel": "https://www.twitch.tv/somestreamer", "mode": "review", "clips_per_stream": 3 }',
  ugc_ad: '{ "script": "I clipped my whole podcast in one message.", "job_id": "20261123-085243-video", "clip": 1 }',
};

/** First sentence of a docstring. */
function summary(doc: string): string {
  const flat = doc.replace(/\s+/g, ' ').replace(/\bYOU\b/g, 'you').trim();
  const end = flat.search(/\.(\s|$)/);
  const first = end > 0 ? flat.slice(0, end + 1) : flat;
  return first.length <= 200 ? first : first.slice(0, first.lastIndexOf(' ', 197)) + '…';
}

/** Docstring prose with identifiers as code: tool names, snake_case names, and "param:" lead-ins. */
function codeify(text: string, t: Tool): string {
  const names = new Set([...TOOLS.map((x) => x.name), ...t.params.map((p) => p.name)]);
  return text
    .replace(/\bYOU\b/g, 'you')
    .replace(/(^|[\s(/])([a-z]+(?:_[a-z]+)+|[a-z]+(?=:\s))(?![\w`])/g, (m, pre: string, w: string) => (names.has(w) || w.includes('_') ? `${pre}\`${w}\`` : m));
}

function toolPage(t: Tool): Page {
  const lede = summary(t.doc);
  const paragraphs = t.doc.split(/\n\s*\n/).map((x) => x.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  // The lede already says the first sentence.
  if (paragraphs[0]?.replace(/\bYOU\b/g, 'you').startsWith(lede)) paragraphs[0] = paragraphs[0].slice(lede.length).trim();
  const blocks: Block[] = paragraphs.filter(Boolean).map((p) => ({ p: codeify(p, t) }));
  const waits = t.params.some((p) => p.name === 'wait_seconds');
  blocks.push(
    { h2: 'Parameters' },
    t.params.length
      ? { head: ['Name', 'Type', 'Default'], table: t.params.map((p) => [`\`${p.name}\``, `\`${p.type}\``, p.default === null ? 'required' : `\`${p.default}\``]) }
      : { p: 'None.' },
  );
  if (t.name === 'render_clips') {
    blocks.push(
      { h3: 'Each clip (ClipPick)' },
      { head: ['Field', 'Type', 'Default', 'Meaning'], table: CLIP_PICK.map((f) => [`\`${f.name}\``, `\`${f.type}\``, f.default === null ? 'required' : `\`${f.default}\``, f.description]) },
    );
  }
  blocks.push(
    { h2: 'Returns' },
    { p: `\`${t.returns || 'dict'}\`: ${t.returns === 'list' ? 'text plus images your AI can see.' : 'a JSON object.'}${waits ? ' It answers within `wait_seconds` (about 45 s) even while the job keeps working; call `job_status` to keep waiting.' : ''}` },
    { h2: 'Example call' },
    { code: EXAMPLES[t.name] ?? '{}', lang: 'json', title: t.name },
  );
  return { slug: `tools/${t.name}`, title: t.name, group: G.ref, sub: 'Tools reference', description: summary(t.doc), blocks };
}

const EDIT_FIELDS = ['edit_style', 'emphasis', 'emoji', 'zooms', 'tighten', 'sfx', 'progress_bar'];
const editFields = CLIP_PICK.filter((f) => EDIT_FIELDS.includes(f.name));

export const PAGES: Page[] = [
  {
    slug: '',
    title: 'What is ORILOS?',
    group: G.start,
    description: 'Clip anything into viral shorts, from the AI you already use.',
    blocks: [
      { p: 'ORILOS turns long videos and live streams into finished vertical shorts (9:16, word-by-word captions, a hook on screen, framed on the faces) and posts them to TikTok, Instagram, YouTube Shorts, X, LinkedIn, Facebook, Threads, Pinterest and Bluesky.' },
      { p: 'It is an **MCP server**: it plugs into Claude Code, Codex, Claude Desktop, Cursor, Windsurf or any MCP client. **Your own AI is the creative brain**: it reads the transcript, picks the moments and writes the hooks and captions. ORILOS does the heavy work on your computer: download, transcribe, find hot moments, frame, caption, render, post.' },
      { callout: 'No AI key, no account needed, no watermark, no minutes to buy. Clipping runs on your computer: your videos, clips and keys stay there.', kind: 'tip' },
      { h2: 'The core flow' },
      { flow: [
        { label: 'Paste a link', note: 'In Claude Code or Codex: “clip this”. Any of 1,800+ sites, or a file.' },
        { label: 'Hot moments', note: 'Transcript, replays, chat spikes, viewer clips, the loudest seconds.' },
        { label: 'Your AI picks', note: 'The 2-second test, a hook, a title and a caption per platform.' },
        { label: 'ORILOS renders', note: '9:16 framing, pro edits, 67 caption styles, your brand, a spoken hook.' },
        { label: 'Post', note: 'Now, at each platform’s best hour, or after review in the Studio.' },
      ] },
      { h2: 'What else is in the box' },
      { ul: [
        '**[Autopilot](/docs/autopilot)**: watch Twitch, Kick and YouTube channels and clip every stream by itself.',
        '**[Studio](/docs/scheduling)**: a private page on your computer to watch, approve, edit and drag clips onto a calendar.',
        '**[Brand kits](/docs/brand-kits)**: your logo, colours and font on every clip.',
        '**[AI UGC actors](/docs/ugc)**: a Tavus actor presents your clip (your own Tavus key).',
        '**[analyze_viral](/docs/tools/analyze_viral)**: your AI watches a video’s frames and words to learn why it worked.',
      ] },
      { h2: 'Key terms' },
      { head: ['Term', 'Meaning'], table: [
        ['Job', 'One source video or recording being clipped. It is “ready” when the transcript is in, “done” when clips are made.'],
        ['Hot moment', 'Evidence of what viewers loved: `replayed`, `chat`, `viewer_clip` or `loud`, with a 0 to 1 strength.'],
        ['Clip', 'A finished 9:16 MP4 with captions, hook, framing and per-platform captions.'],
        ['Brand kit', 'A saved logo, colours and font, applied to every render.'],
        ['Studio', 'The private local page for reviewing and scheduling clips.'],
      ] },
      { h2: 'Where to start' },
      { cards: [
        { title: 'Quickstart', text: 'Install in one command on Windows, macOS or Linux.', to: 'quickstart' },
        { title: 'Connect your AI', text: 'Claude Code, Codex, Claude Desktop, Cursor, Windsurf, VS Code.', to: 'connect' },
        { title: 'Your first clip', text: 'The loop, and what to say to your AI.', to: 'first-clip' },
        { title: 'Tools reference', text: 'Every MCP tool, parameter and default.', to: 'tools' },
      ] },
    ],
  },
  {
    slug: 'quickstart',
    title: 'Quickstart',
    group: G.start,
    description: 'From nothing to your first clip in a few minutes, on any computer.',
    blocks: [
      { p: 'ORILOS runs on Windows, macOS and Linux, on a normal CPU. No GPU needed (it uses one if it can). ffmpeg comes bundled.' },
      { h2: '1. Get uv' },
      { p: '[uv](https://docs.astral.sh/uv/) runs Python apps on every OS and fetches the right Python for you. Skip this if you already have it.' },
      { tabs: [
        { label: 'Windows', lang: 'powershell', code: 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"' },
        { label: 'macOS / Linux', lang: 'bash', code: 'curl -LsSf https://astral.sh/uv/install.sh | sh' },
        { label: 'Homebrew', lang: 'bash', code: 'brew install uv' },
      ] },
      { h2: '2. Install ORILOS into your AI apps' },
      { code: 'uvx orilos-mcp install', lang: 'bash' },
      { p: 'The installer downloads the speech model (about 500 MB) and a voice once, so your first clip is fast and no app times out. Then it connects ORILOS to every AI app it finds (**Claude Code, Codex, Claude Desktop, Cursor and Windsurf**) and adds the `orilos-clip` skill to Claude Code and Codex. Add `--no-models` to skip the downloads.' },
      { callout: NOT_ON_PYPI, kind: 'warn' },
      { h2: '3. Check it' },
      { code: 'uvx orilos-mcp doctor', lang: 'bash' },
      { p: 'Doctor checks ffmpeg, yt-dlp, speech, face detection, voice, the keychain, the data folder and the command your AI apps will run.' },
      { h2: '4. Clip something' },
      { p: 'Restart your AI app, paste a video link and say:' },
      { code: 'https://www.youtube.com/watch?v=…  clip the 5 best moments, hormozi captions', lang: 'text' },
      { p: 'Your AI calls `clip_video`, reads the transcript and hot moments, picks the clips, calls `render_clips`, and tells you where the files are. Next: [Your first clip](/docs/first-clip).' },
    ],
  },
  {
    slug: 'connect',
    title: 'Connect your AI',
    group: G.start,
    description: 'ORILOS works in any MCP client. The installer does this for you; here is how to do it by hand.',
    blocks: [
      { callout: '`uvx orilos-mcp install` registers ORILOS in Claude Code, Codex, Claude Desktop, Cursor and Windsurf automatically, with the absolute path to uvx (desktop apps don’t inherit your shell’s PATH).', kind: 'tip' },
      { h2: 'Claude Code' },
      { code: 'claude mcp add --scope user orilos -- uvx orilos-mcp', lang: 'bash' },
      { p: 'The installer also copies the `orilos-clip` skill to `~/.claude/skills/orilos-clip/`, which teaches Claude the whole clip → pick → render → post loop.' },
      { h3: 'As a plugin' },
      { p: 'ORILOS ships a Claude Code plugin (MCP server + skill) and a marketplace file. Once the repository is public:' },
      { code: '/plugin marketplace add Aaditya1273/ORILOS\n/plugin install orilos@orilos', lang: 'text' },
      { callout: 'The plugin marketplace only works after the repository is pushed to GitHub. Until then use `claude mcp add` above.', kind: 'note' },
      { h2: 'Codex' },
      { code: 'codex mcp add orilos -- uvx orilos-mcp', lang: 'bash' },
      { p: 'Codex stops a tool call after 60 seconds and gives a server 10 seconds to start, by default. ORILOS tools return within about 45 seconds and your AI keeps polling, but give it room. Add this to `~/.codex/config.toml` (or `$CODEX_HOME/config.toml`). The installer writes it for you:' },
      { code: CODEX_TOML, lang: 'toml', title: '~/.codex/config.toml' },
      { p: 'The skill goes to `~/.codex/skills/orilos-clip/`.' },
      { h2: 'Claude Desktop, Cursor, Windsurf' },
      { code: JSON_CONFIG, lang: 'json' },
      { head: ['App', 'Config file'], table: [
        ['Claude Desktop (Windows)', '`%APPDATA%\\Claude\\claude_desktop_config.json`'],
        ['Claude Desktop (macOS)', '`~/Library/Application Support/Claude/claude_desktop_config.json`'],
        ['Claude Desktop (Linux)', '`~/.config/Claude/claude_desktop_config.json`'],
        ['Cursor', '`~/.cursor/mcp.json`'],
        ['Windsurf', '`~/.codeium/windsurf/mcp_config.json`'],
      ] },
      { p: 'Restart Claude Desktop after editing its config.' },
      { h2: 'VS Code' },
      { p: 'VS Code reads MCP servers from `.vscode/mcp.json` in your workspace (the installer doesn’t write this one):' },
      { code: '{\n  "servers": {\n    "orilos": { "type": "stdio", "command": "uvx", "args": ["orilos-mcp"] }\n  }\n}', lang: 'json', title: '.vscode/mcp.json' },
      { h2: 'Any other MCP client' },
      { p: 'ORILOS speaks MCP over stdio. The command is `uvx orilos-mcp` (no arguments). Allow long tool calls if your client has a timeout setting.' },
    ],
  },
  {
    slug: 'first-clip',
    title: 'Your first clip',
    group: G.start,
    description: 'The clipping loop, what your AI does at each step, and what to ask for.',
    blocks: [
      { h2: 'The loop' },
      { ol: [
        '`clip_video(source)`: downloads and transcribes on your computer. For a stream that is live right now, `clip_live(url, minutes)` records it first.',
        'When the job is **ready**, your AI gets a timed transcript, the hot moments and a picking guide.',
        'Your AI picks the moments and calls `render_clips` with start/end, a hook, a title and captions per platform.',
        'When the job is **done**, it lists the clips: score, hook, length, file.',
        '`post_clip`, `schedule_posts` or `open_studio`: whatever you asked for.',
      ] },
      { callout: 'Tools answer within about 45 seconds. A long video keeps working in the background; your AI calls `job_status` until it is ready. That is normal, so don’t stop it.', kind: 'note' },
      { h2: 'Say it like this' },
      { ul: [
        '“Clip this: https://www.twitch.tv/videos/…” The best moments of a stream, screams and wins first.',
        '“Make 8 shorts from this podcast, pill captions, in Spanish.”',
        '“He’s live right now. Record 10 minutes and clip it.”',
        '“Why did this short go viral? Then make my clips like it.”',
        '“Post clip 2 to TikTok, Reels and Shorts tomorrow at 6pm”, or “plan my week”.',
        '“Autopilot this Twitch channel. Clip every stream, I’ll approve them.”',
        '“Put my logo and brand colours on every clip.” · “Show me the caption styles.”',
      ] },
      { h2: 'How your AI picks' },
      { p: 'ORILOS hands your AI a picking guide with every ready job. In short:' },
      { ul: [
        '**The 2-second test**: each clip opens on its strongest moment; a cold viewer keeps watching after 2 seconds.',
        '**Stands alone**: never opens on a pronoun or an answer to an earlier question; keeps the payoff and ends just after it.',
        '**Hot moments first**: what viewers replayed, clipped and chatted about, and the loudest seconds.',
        '**Diversity**: no two clips that land the same joke.',
        '**Hooks** of up to 8 words about *this* moment: open question, hot take, number shock, story loop, POV, reaction tease.',
        '**The edit**: an `edit_style`, the 1 to 4 words to keep lit, and punch-ins on the punchline. See [Pro edits](/docs/pro-edits).',
        '**Captions per platform**: TikTok/Instagram 1 to 2 lines + 3 to 5 real hashtags, X under 240 characters, YouTube a title up to 90 characters.',
      ] },
      { h2: 'Long videos' },
      { p: 'Up to about 60,000 characters of transcript come back inline. Longer videos return a 90-second overview instead, and your AI reads the stretches it likes with `get_transcript(job_id, start, end)` before choosing exact cuts. Streams longer than 20 minutes are fetched audio-first: only the minutes you clip are ever downloaded as video.' },
      { h2: 'Framing' },
      { p: 'ORILOS finds the camera cuts and the faces in each shot with a 227 KB on-device model, then per shot it follows the speaker (`track`), stacks two people or a streamer’s facecam over the gameplay (`stack`), or fits a wide shot over a blurred copy of itself (`fit`). Force one with `layout`.' },
      { h2: 'Re-cuts' },
      { p: 'Call `render_clips` again on the same job with new times. The source is already on disk, so it is fast.' },
    ],
  },
  {
    slug: 'account',
    title: 'Account and licence keys',
    group: G.start,
    description: 'Sign in, create a licence key and connect your computer to your plan.',
    blocks: [
      { p: 'You can clip without an account. Make one when you want Pro or Team: it holds your plan and the licence keys that unlock it on your computers.' },
      { ol: [
        '[Sign in with Google](/signin). That makes your free account.',
        'Open [Keys](/account/keys) and create a key named after the computer, like Studio PC. Copy it: it is shown only once.',
        'On that computer run `uvx orilos-mcp activate <your key>`.',
        'Check it with `uvx orilos-mcp doctor`: it shows your plan.',
      ] },
      { callout: 'A key is like a password. If one leaks, revoke it in Keys and make a new one. Revoking takes effect the next time ORILOS checks in.', kind: 'tip' },
      { p: 'Each key works on one computer: the first one that activates it. Free includes 1 computer, Pro 3 and Team 15. To move to a new computer, revoke the old key and make a new one.' },
      { h2: 'Plans and billing' },
      { p: 'Free has 12 caption styles and posting right away. Pro adds all 67 styles, a brand kit, best-time scheduling, spoken hooks and voiceovers, and Autopilot on 3 channels. Team adds up to 10 brand kits and 10 Autopilot channels. Ask for a Pro feature on Free and ORILOS tells your AI it is locked instead of doing it.' },
      { p: 'Upgrade, switch between monthly and yearly, update your card, download invoices or cancel from [Billing](/account/billing). Cancelling keeps your plan until the end of the period you paid for. New subscribers can get a full refund within 14 days; see the [terms](/docs/terms).' },
      { h2: 'Your AI and platform keys' },
      { p: 'Gemini, ElevenLabs, Tavus, Upload-Post, Instagram and YouTube keys never go to your ORILOS account. Ask your AI to run `setup` and add them on your computer.' },
    ],
  },
  {
    slug: 'hot-moments',
    title: 'Hot moments',
    group: G.clip,
    description: 'Hard evidence of what viewers loved, gathered without any key.',
    blocks: [
      { p: 'A transcript ranks what was *said*. On gaming and IRL streams the best moment is often a scream and twelve seconds of nobody talking. So with every ready job ORILOS adds **hot moments** (up to 20, strongest first), and your AI checks them first.' },
      { head: ['Kind', 'Where it comes from', 'Works on'], table: [
        ['`replayed`', 'YouTube’s “Most replayed” graph', 'YouTube videos with enough views to have one'],
        ['`chat`', 'Chat messages per 10 s against the running median, plus hype bursts (LOL, W, OMG, KEKW, “clip it”, laughing reactions)', 'YouTube chat replay (past streams), Twitch VOD chat, live chat while recording'],
        ['`viewer_clip`', 'Clips Twitch viewers made from the VOD', 'Twitch VODs'],
        ['`loud`', 'Loudness peaks (EBU R128): screams, cheers, crashes', 'Everything with audio'],
      ] },
      { p: 'Each moment has a time, a 0 to 1 strength and a short note, e.g. `12:42.0 chat 0.91`.' },
      { h2: 'Live recordings' },
      { p: '`clip_live` and Autopilot count the chat while they record: Twitch through anonymous IRC, YouTube live chat, and Kick by polling its public API.' },
      { h2: 'Limits' },
      { ul: [
        'YouTube chat replay downloads slowly, so long streams only get about their first 15 minutes of chat.',
        'Kick’s public API returns the last 25 messages, so busy Kick chats are undercounted.',
        'Kick VOD chat isn’t available without a key, so Kick VODs get loudness only.',
        'Small videos have no “Most replayed” graph. Everything here is best effort: a missing signal never fails a job.',
      ] },
    ],
  },
  {
    slug: 'captions',
    title: 'Captions & styles',
    group: G.clip,
    description: `${STYLES.length} caption styles, word by word, in any writing system.`,
    blocks: [
      { p: 'Every clip gets word-by-word captions burned in by libass with fonts bundled in ORILOS, so they look the same on every OS. Pick a style for the whole job (`caption_style` in `clip_video`) or per clip (`caption_style` in `render_clips`). Ask your AI to “show me the caption styles”: `caption_styles` returns the list **and a preview image of every style**.' },
      { h2: 'All styles' },
      { img: '/caption-styles.webp', alt: `All ${STYLES.length} ORILOS caption styles, each showing a sample line`, caption: 'Every style, rendered by ORILOS itself: the same image `caption_styles` shows your AI.' },
      { head: ['Style', 'Look', 'Best for'], table: STYLES.map((s) => [`\`${s.name}\``, s.look, s.best_for]) },
      { h2: 'Any language, any script' },
      { p: 'Captions follow the transcript, or the translation your AI writes (`caption_translations`, by phrase index from `get_transcript`) or `caption_language`. When a style’s font is missing a letter, ORILOS switches that block to the right Noto font, downloaded once:' },
      { ul: [
        'Indic: Devanagari (Hindi, Marathi, Nepali), Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Sinhala.',
        'Southeast Asian: Thai, Lao, Khmer, Myanmar.',
        'Right-to-left: Arabic (incl. Urdu and Persian), Hebrew.',
        'East Asian: Japanese, Korean, Simplified and Traditional Chinese.',
        'Also Georgian, Armenian, Ethiopic, and Latin, Greek and Cyrillic.',
      ] },
      { p: 'Words are uppercased only where the script has case; Chinese, Japanese, Thai, Lao, Khmer and Burmese are split into timed pieces so a phrase never overflows.' },
      { callout: 'Verified by rendering: Hindi, Arabic, Urdu, Hebrew, Japanese, Chinese, Korean, Thai, Russian, Vietnamese, Tamil, Bengali, Amharic, Georgian, Greek. The Lao, Khmer, Myanmar, Gurmukhi, Gujarati, Kannada, Malayalam, Odia, Sinhala and Armenian fonts are wired up but not yet rendered in a test. Thai and Khmer line splitting is a rule of thumb, not true word segmentation.', kind: 'note' },
      { h2: 'Hook and credit' },
      { p: 'The hook shows in a card at the top for the first 3 to 4.5 seconds; turn it off with `hook: false`. A small “via <creator>” credit sits at the bottom unless `credit: false`. Emoji typed into caption text are left out (libass can’t draw colour emoji); add them as [emoji pops](/docs/pro-edits) instead.' },
    ],
  },
  {
    slug: 'voices',
    title: 'Voices & languages',
    group: G.clip,
    description: `Free offline voices in ${VOICE_LANGUAGES.length} languages, for spoken hooks and narration.`,
    blocks: [
      { p: `ORILOS speaks with **Piper** voices that run on your computer: free, offline, no key. It picks the best voice for the language automatically (exact locale first, then the highest quality). ${VOICE_LANGUAGES.length} languages:` },
      { p: VOICE_LANGUAGES.map(([c, n]) => `${n} (\`${c}\`)`).join(' · ') },
      { h2: 'Spoken hooks' },
      { p: 'Set `voice_hook: true` (job-wide in `clip_video`, or per clip). The hook is spoken over the opening and the original audio ducks under it. The voice follows the video’s language; if your hook is in another language, pass `voice_language` per clip, e.g. `"es"`.' },
      { h2: 'Narration' },
      { p: '`voiceover(text, language)` returns an audio file for faceless shorts or narration. `voices(language)` lists what’s available, e.g. `voices("hi")`.' },
      { h2: 'Premium voices' },
      { p: 'Connect an ElevenLabs key on the private connect page and ORILOS uses it first, in any language (`eleven_multilingual_v2`). Without one, Piper is used.' },
      { callout: 'Voices are downloaded once per language (tens of MB each) into your data folder. The catalogue has no gender field, so “male”/“female” hints aren’t supported. Pass a voice name from `voices` instead.', kind: 'note' },
    ],
  },
  {
    slug: 'pro-edits',
    title: 'Pro edits',
    group: G.clip,
    description: 'The edit decisions that make viewers stay, chosen per clip by your AI.',
    blocks: editFields.length
      ? [
          { p: 'Cutting the right moment is half of it. Viewers stay because of the *edit*: no dead air, the frame moving, the key word lit up. ORILOS makes those moves for every clip, and your AI tunes them per moment.' },
          { h2: 'The moves' },
          { ul: [
            '**Jump cuts** (`tighten`): pauses longer than about half a second, and pure fillers (um, uh…), are cut down so speech still breathes; captions are retimed to match.',
            '**Punch-in zooms** (`zooms`): quick 1.08 to 1.15× pushes every 2.5 to 5 seconds, varied so the eye never learns the rhythm; or only on the hot peaks.',
            '**Keyword emphasis** (`emphasis`): numbers, money and superlatives stay lit in the captions, or exactly the words your AI picks.',
            '**Emoji pops** (`emoji`): full-colour emoji images pop in above the captions at the moment they fit.',
            '**Sound design** (`sfx`): a soft whoosh on punch-ins and a pop on emoji, synthesized by ORILOS (no licensed samples).',
            '**Progress bar** (`progress_bar`): a thin bar that tells the viewer how much is left.',
          ] },
          ...(Object.keys(EDIT_STYLES).length
            ? ([
                { h2: 'Edit styles' },
                { p: 'Your AI usually just names a preset with `edit_style` (for the whole job in `clip_video` / `clip_live`, or per clip), then overrides single moves where a moment needs it. Without one, Twitch and Kick get `gaming` (screams and pauses *are* the content, so no jump cuts; punch-ins land on the loud and chat peaks) and everything else gets `viral`.' },
                {
                  head: ['edit_style', 'Jump cuts', 'Zooms', 'Emphasis', 'Sound', 'Progress bar'],
                  table: Object.entries(EDIT_STYLES).map(([name, v]) => [
                    `\`${name}\``,
                    v.tighten ? 'yes' : 'no',
                    v.zoom === 'off' ? 'no' : `${v.zoom}${v.amp ? ` · ${v.amp}×` : ''}`,
                    v.emphasis ? 'yes' : 'no',
                    v.sfx ? 'yes' : 'no',
                    v.progress_bar ? 'yes' : 'no',
                  ]),
                },
              ] as Block[])
            : []),
          { h2: 'Per-clip fields' },
          { head: ['Field', 'Type', 'Default', 'What it does'], table: editFields.map((f) => [`\`${f.name}\``, `\`${f.type}\``, f.default === null ? 'required' : `\`${f.default}\``, f.description]) },
          { p: 'They go on each clip in [render_clips](/docs/tools/render_clips), next to `start`, `end` and `hook`:' },
          { code: '{ "start": 742.4, "end": 776.0, "hook": "He built a house for selfies?!",\n  "edit_style": "viral", "emphasis": ["selfies", "$40,000"],\n  "zooms": [3.2, 11.8] }', lang: 'json', title: 'one clip' },
          { callout: 'Emoji: 0 to 4 per clip, only where the emotion peaks. One well-placed emoji beats five. Emoji images are downloaded once from Google’s Noto Emoji set.', kind: 'tip' },
        ]
      : [
            { p: 'Today every clip already gets per-shot framing, a caption style, the hook card, a credit, loudness-normalised audio (−14 LUFS) and an optional spoken hook.' },
        ],
  },
  {
    slug: 'brand-kits',
    title: 'Brand kits',
    group: G.clip,
    description: 'Your logo, colours and font on every clip. Never an ORILOS watermark.',
    blocks: [
      { p: 'Save a kit once and ORILOS applies the default kit to every render. Just tell your AI “put my logo and brand colours on every clip” and give it the file paths.' },
      { code: '{ "action": "save", "name": "acme", "logo": "/path/to/logo.png", "logo_position": "top-right",\n  "highlight_color": "#A3FF12", "text_color": "#FFFFFF", "font_file": "/path/to/Brand-Black.ttf" }', lang: 'json', title: 'brand_kit' },
      { head: ['Option', 'Values'], table: [
        ['`logo`', 'A `.png`, `.jpg`, `.jpeg` or `.webp` file'],
        ['`logo_position`', '`top-left`, `top-right`, `bottom-left`, `bottom-right`, `top-center`'],
        ['`logo_scale`', 'Width as a share of the frame (default `0.14`)'],
        ['`opacity`', '`0` to `1` (default `0.9`)'],
        ['`text_color` / `highlight_color`', '`#RRGGBB`: caption text and the spoken-word highlight'],
        ['`font_file`', 'A `.ttf` or `.otf` used for the captions'],
        ['`default`', 'Make it the kit every render uses (default `true`)'],
      ] },
      { h2: 'Several brands' },
      { p: '`brand_kit(action="list")` shows your kits. Use another kit for a whole job with `brand` in `clip_video`, or per clip with `brand` in `render_clips`; `"none"` renders without branding. Kits live in `<data folder>/brands/<name>/` with copies of the logo and font.' },
    ],
  },
  {
    slug: 'posting',
    title: 'Posting & accounts',
    group: G.publish,
    description: 'Post to nine platforms through official APIs, with your own accounts.',
    blocks: [
      { p: 'Ask your AI to post. If a platform isn’t connected yet, the tool returns a **private connect link** that opens on your own computer. Your AI never sees your keys, and never asks for them in the chat.' },
      { h2: 'Connections' },
      { head: ['Connection', 'Platforms', 'What you need'], table: [
        ['**Upload-Post**', 'TikTok, Instagram, YouTube, X, LinkedIn, Facebook, Threads, Pinterest, Bluesky', 'An API key and profile name from [upload-post.com](https://www.upload-post.com), with your accounts connected there'],
        ['**Instagram, direct**', 'Instagram Reels', 'A Business or Creator account linked to a Facebook Page; a long-lived token with `instagram_content_publish` and the account ID'],
        ['**YouTube, direct**', 'YouTube Shorts', 'A Google Cloud OAuth client of type *Desktop app* with YouTube Data API v3 enabled; then “Sign in with Google” on the connect page'],
      ] },
      { p: 'A platform with a direct connection uses it; otherwise Upload-Post; otherwise you get the connect link.' },
      { h2: 'The connect page' },
      { ul: [
        'Served on `127.0.0.1` only, on a random port, behind a one-time token in the link.',
        'Rejects requests for any other host name (protection against DNS rebinding), with a strict Content-Security-Policy and no caching.',
        'Keys go into your OS keychain (Windows Credential Manager, macOS Keychain or the Linux Secret Service) or, on a machine without one, a file only your user can read.',
        'Tools only ever learn *whether* a key is set, never the key.',
      ] },
      { h2: 'Checking a post' },
      { p: 'Upload-Post posts asynchronously: `post_clip` returns a `request_id`, and `post_status(request_id)` returns the status and links once live.' },
      { callout: 'Posting to real accounts hasn’t been tested end to end yet. The request shapes are tested against each API’s documentation with the network mocked. Try one post on a test account first.', kind: 'warn' },
    ],
  },
  {
    slug: 'scheduling',
    title: 'Scheduling & Studio',
    group: G.publish,
    description: 'Every clip at each platform’s best hours, and a private page to run it all.',
    blocks: [
      { h2: 'Plan a week' },
      { p: 'Say “plan my week” or call `schedule_posts(job_id, clips, platforms)`. Each clip goes to each platform at that platform’s next best free slot, in your local time:' },
      { head: ['Platform', 'Best hours (local)'], table: [
        ['TikTok', '12:00 · 19:00 · 21:00'],
        ['Instagram', '11:00 · 13:00 · 19:00'],
        ['YouTube', '15:00 · 18:00 · 20:00'],
        ['X', '09:00 · 12:00 · 17:00'],
        ['LinkedIn', '08:00 · 12:00 · 17:00, weekdays only'],
        ['Facebook', '09:00 · 13:00 · 19:00'],
        ['Threads', '08:00 · 12:00 · 20:00'],
        ['Pinterest', '14:00 · 20:00 · 21:00'],
        ['Bluesky', '09:00 · 13:00 · 18:00'],
      ] },
      { p: 'At most `per_day` posts a day per platform (default 2), never two on one platform within 3 hours. The hours are averaged from public “best time to post” studies; they aren’t learned from your own analytics yet. For one clip at a set time, pass `when` (ISO 8601) and optionally `timezone` (IANA, e.g. `Asia/Kolkata`).' },
      { h2: 'How a scheduled post fires' },
      { head: ['Route', 'What happens'], table: [
        ['Upload-Post', 'Handed over ahead of time; Upload-Post publishes it on time even if your computer is off.'],
        ['YouTube, direct', 'Uploaded private with a publish time; YouTube publishes it.'],
        ['Instagram, direct', 'Kept on your computer and posted at its time. Needs ORILOS running (your AI app or the Studio open).'],
      ] },
      { p: 'Statuses: `queued`, `sent_scheduled`, `posting`, `posted`, `failed`, `cancelled`. **“posted” only ever means the platform’s API confirmed it.** A post missed by more than 2 hours, or stuck posting for 30 minutes, is marked failed, never posted twice.' },
      { p: '`scheduled_posts` lists, moves (`action: "move"`) and cancels (`action: "cancel"`) posts. A YouTube post that was already handed over can only be changed in YouTube Studio.' },
      { h2: 'The Studio' },
      { img: '/studio-calendar.webp', alt: 'The ORILOS Studio calendar: a week of scheduled posts, best hours starred', caption: 'The Studio calendar. Drag a clip onto a time to schedule it.' },
      { p: 'A private page on your computer. Ask your AI to “open the Studio”, or run:' },
      { code: 'uvx orilos-mcp studio', lang: 'bash' },
      { ul: [
        '**Clips**: every job’s clips with a player, score, length and layout. Approve or reject, edit the title and per-platform captions, post now, or pick a time. Autopilot clips waiting for review sit in an inbox on top. “Plan my week” schedules the approved ones.',
        '**Calendar**: week and month views with each platform’s best hours starred. Drag a clip onto a time to schedule it; drag a post to move it.',
        '**Accounts**: which platforms are connected, with buttons to the connect page.',
      ] },
      { p: 'It uses the same protections as the connect page: `127.0.0.1` only, a one-time token, host checks, a strict Content-Security-Policy, and writes only from its own page.' },
    ],
  },
  {
    slug: 'autopilot',
    title: 'Autopilot',
    group: G.publish,
    description: 'Watch channels and clip every stream, with nobody at the keyboard.',
    blocks: [
      { p: 'Tell your AI “autopilot <channel link>” (Twitch, Kick or YouTube). It calls:' },
      { code: '{ "action": "add", "channel": "https://www.twitch.tv/somestreamer", "mode": "review",\n  "clips_per_stream": 3, "minutes": 20, "caption_style": "hormozi" }', lang: 'json', title: 'autopilot_watch' },
      { h2: 'What it does' },
      { ul: [
        'Every 5 minutes it checks each watched channel.',
        '**Live** → records `minutes` of the stream with its chat (up to 2 recordings per stream), finds the hottest moments and renders clips.',
        '**Stream just ended** → takes the newest VOD, finds where chat, viewer clips, replays and loudness peak, downloads only that stretch and clips it.',
        'Moments are ranked without any AI key, by the hot signals plus how much is said, and snapped to sentence edges. The hook is the punchiest line said in the clip (Gemini writes hooks if you added a key).',
      ] },
      { h2: 'Review or auto' },
      { head: ['Mode', 'What happens to new clips'], table: [
        ['`review` (default)', 'They wait in the Studio inbox for you to approve.'],
        ['`auto`', 'They’re scheduled to `platforms` at each platform’s next best time.'],
      ] },
      { h2: 'Keep it running' },
      { p: 'Autopilot runs while any AI app has ORILOS open. Only one ORILOS process runs it at a time, so nothing is clipped twice. To keep watching with no AI app open:' },
      { code: 'uvx orilos-mcp autopilot', lang: 'bash' },
      { p: '`autopilot_watch` also takes `action: "list"`, `"remove"` (by channel or id) and `"events"` (what it did recently).' },
      { callout: 'A pass records channels one after another. A stream clipped live may be clipped again from its VOD afterwards.', kind: 'note' },
    ],
  },
  {
    slug: 'ugc',
    title: 'AI UGC actors',
    group: G.publish,
    description: 'A Tavus AI actor presents your clip, for ads and reaction shorts.',
    blocks: [
      { p: 'Bring your own [Tavus](https://www.tavus.io) key; if it’s missing, `ugc_ad` returns the private connect link.' },
      { ol: [
        '`ugc_ad(list_actors=true)`: choose an actor from Tavus’s stock faces.',
        '`ugc_ad(script, actor_id, job_id, clip)`: starts rendering; returns a `video_id` (usually a few minutes).',
        '`ugc_ad(video_id, job_id, clip, layout)`: call again until it’s ready; ORILOS downloads it and composes the finished 9:16 ad.',
      ] },
      { head: ['Layout', 'Result'], table: [
        ['`actor_top`', 'The actor above, your clip below'],
        ['`actor_corner`', 'Your clip full screen, the actor picture-in-picture'],
        ['`actor_full`', 'The actor full screen, your clip inset'],
      ] },
      { p: 'The ad lasts as long as the actor speaks; your clip loops underneath with its sound at 20%.' },
      { callout: 'Tested with mocked Tavus responses only. No real Tavus call has been made yet.', kind: 'warn' },
    ],
  },
  {
    slug: 'tools',
    title: 'Tools reference',
    group: G.ref,
    sub: 'Tools reference',
    description: `All ${TOOLS.length} MCP tools ORILOS gives your AI.`,
    blocks: [
      { p: 'You don’t call these yourself. Your AI does. This is what it can do, generated from the server’s source.' },
      { head: ['Tool', 'What it does'], table: TOOLS.map((t) => [`[\`${t.name}\`](/docs/tools/${t.name})`, summary(t.doc)]) },
    ],
  },
  ...TOOLS.map(toolPage),
  {
    slug: 'cli',
    title: 'CLI reference',
    group: G.ref,
    description: 'The orilos-mcp command.',
    blocks: [
      { head: ['Command', 'What it does'], table: [
        ['`orilos-mcp`', 'Starts the MCP server on stdio. Your AI app runs this.'],
        ['`orilos-mcp install [--no-models]`', 'Downloads models, then connects Claude Code, Codex, Claude Desktop, Cursor and Windsurf.'],
        ['`orilos-mcp doctor`', 'Checks every component and prints the start command.'],
        ['`orilos-mcp studio`', 'Opens the Studio and keeps it open (Ctrl+C to close).'],
        ['`orilos-mcp autopilot`', 'Keeps clipping watched channels and posting scheduled posts, always on.'],
        ['`orilos-mcp --version`', 'Prints the version.'],
      ] },
      { p: 'Prefix with `uvx` (e.g. `uvx orilos-mcp doctor`) unless you installed it as a tool.' },
      { h2: 'Environment variables' },
      { head: ['Variable', 'Effect'], table: [
        ['`ORILOS_HOME`', 'Use another data folder.'],
        ['`ORILOS_WHISPER`', 'Whisper model size (default `small` up to 40 minutes, `base` above).'],
        ['`ORILOS_WHISPER_DEVICE`', 'Force `cpu` or `cuda` for transcription.'],
        ['`ORILOS_FRAMING=gemini`', 'Let Gemini choose layouts instead of on-device face detection (needs a key).'],
        ['`ORILOS_NO_KEYRING`', 'Don’t use the OS keychain; keep keys in the private file.'],
        ['`ORILOS_<KEY NAME>`', 'Provide a key without the connect page, e.g. `ORILOS_UPLOADPOST_API_KEY`, `ORILOS_GEMINI_API_KEY`.'],
      ] },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy & data',
    group: G.ref,
    description: 'What stays on your computer, and what ORILOS talks to.',
    blocks: [
      { p: 'Clipping runs on **your computer**. Videos, transcripts, clips and your platform and AI keys stay there and never reach an ORILOS server.' },
      { h2: 'Your ORILOS account' },
      { p: 'An account is optional and only holds what billing needs: your Google name, email and photo, your handle and time zone, your plan, your licence keys (we keep only a hash of each key) and the devices you signed in from (browser, OS and country, never your IP address). Payments are handled by Lemon Squeezy; we never see your card.' },
      { p: 'When ORILOS checks a licence key (at most once a day) it sends the key, your computer’s name and a random ID ORILOS made for that computer, so a key works on one computer. Nothing about your videos is sent. Download everything we hold from [Settings](/account/settings), or delete your account there at any time.' },
      { p: 'We don’t sell your data, show ads or use tracking cookies. Sign-in sessions last 30 days; signing out or deleting your account removes them.' },
      { h2: 'Where things live' },
      { head: ['OS', 'Data folder'], table: [
        ['Windows', '`%APPDATA%\\orilos`'],
        ['macOS', '`~/Library/Application Support/orilos`'],
        ['Linux', '`~/.local/share/orilos` (or `$XDG_DATA_HOME/orilos`)'],
      ] },
      { p: 'Inside: `clips/` (one folder per job), `brands/`, `voices/`, `fonts/`, `schedule.json`, `autopilot.json`.' },
      { h2: 'Keys' },
      { p: 'Keys go to the OS keychain, or a file only your user can read on machines without one. They’re never printed, logged or returned to your AI.' },
      { h2: 'What ORILOS connects to' },
      { ul: [
        'The video sites you give it (through yt-dlp).',
        'Hugging Face, once, for the Whisper speech model and Piper voices; GitHub, once per script, for Noto fonts.',
        'Google’s font server, once per emoji, for emoji pops.',
        'The platforms you post to, through their official APIs or Upload-Post.',
        'Gemini, ElevenLabs or Tavus only if you added their key.',
        'orilos.pages.dev, to check your licence key, only if you activated one.',
      ] },
      { h2: 'Contact' },
      { p: 'Questions or requests about your data: [aaditya@agentmd.tech](mailto:aaditya@agentmd.tech). We answer within 30 days.' },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of service',
    group: G.ref,
    description: 'The rules for using ORILOS and an ORILOS account.',
    blocks: [
      { p: 'Last updated 24 November 2026. By using ORILOS, its website or an ORILOS account you agree to these terms. If you do not agree, do not use ORILOS.' },
      { h2: 'Who can use ORILOS' },
      { p: 'You must be at least 18, or have the permission of a parent or guardian. If you use ORILOS for a company, you confirm you may accept these terms for it.' },
      { h2: 'The software' },
      { p: 'ORILOS runs on your computer. You are responsible for that computer, for the videos you give it and for what you post with it. We license ORILOS to you for your own use; you may not resell it, share it as a service, remove or bypass its licence checks, or reverse-engineer it.' },
      { h2: 'Your content' },
      { p: 'Your videos and clips are yours, and they never reach our servers. Only clip and post what you own or have permission to use, and follow the rules of every platform you post to. Do not use ORILOS to break the law, infringe copyright, spam or mislead people.' },
      { h2: 'Accounts and licence keys' },
      { p: 'Keep your account and licence keys private. Each key works on one computer, and your plan sets how many computers you can use: Free 1, Pro 3, Team 15. We may suspend keys that are shared, sold or abused.' },
      { h2: 'Plans and payments' },
      { p: 'Paid plans renew each month or year until you cancel. Payments, taxes and invoices are handled by Lemon Squeezy, our merchant of record, under their terms. Cancel any time from Billing; your plan stays on until the end of the paid period. Prices can change, with notice before your next renewal.' },
      { h2: 'Refunds' },
      { p: 'If ORILOS Pro or Team is not right for you, email [aaditya@agentmd.tech](mailto:aaditya@agentmd.tech) within 14 days of your first payment for a full refund. Renewals are not refunded, but you can cancel before the next one. Where the law gives you more rights, those apply.' },
      { h2: 'Other services' },
      { p: 'ORILOS connects to services you choose, such as video sites, Upload-Post, Gemini, ElevenLabs and Tavus. Their terms and prices apply to your use of them, and we are not responsible for them.' },
      { h2: 'Ending your use' },
      { p: 'You can stop using ORILOS and delete your account at any time from Settings. We may suspend or close an account that breaks these terms; if we close a paid account without a breach, we refund the unused part of the period.' },
      { h2: 'No warranty' },
      { p: 'ORILOS is provided as is. We work hard to make it reliable, but we cannot promise it is free of bugs, always available, or that any post performs well. To the extent the law allows, we are not liable for indirect or lost-profit damages, and our total liability is limited to what you paid us in the last 12 months.' },
      { h2: 'Law' },
      { p: 'These terms are governed by the laws of India, and the courts of India have jurisdiction over any dispute about them.' },
      { h2: 'Changes and contact' },
      { p: 'We may update these terms and will say so here with a new date; big changes are announced before they apply. Questions: [aaditya@agentmd.tech](mailto:aaditya@agentmd.tech).' },
    ],
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    group: G.help,
    description: 'The usual suspects, and how to fix them.',
    blocks: [
      { h2: 'Codex says the tool timed out' },
      { p: 'Codex’s default tool timeout is 60 seconds and its startup timeout 10. Set `tool_timeout_sec = 300` and `startup_timeout_sec = 180` under `[mcp_servers.orilos]` (see [Connect your AI](/docs/connect#codex)). `orilos-mcp install` writes them.' },
      { h2: 'The first clip is slow' },
      { p: 'The first run downloads the Whisper speech model (about 500 MB) and a voice (about 60 MB). Run `uvx orilos-mcp install` once to download them up front. Later runs are fast; YouTube videos with captions skip Whisper entirely.' },
      { h2: 'Transcription crashed on an NVIDIA PC' },
      { p: 'ORILOS tries the GPU, and if the CUDA libraries are missing (common on gaming PCs) it falls back to the CPU automatically. To skip the GPU entirely set `ORILOS_WHISPER_DEVICE=cpu`.' },
      { h2: 'ffmpeg not found' },
      { p: 'ORILOS uses your system ffmpeg if there is one, otherwise the copy bundled with it. Run `uvx orilos-mcp doctor` to see which.' },
      { h2: 'Claude Desktop or Cursor can’t start ORILOS' },
      { p: 'Desktop apps don’t inherit your terminal’s PATH. Use the absolute path to `uvx` in the config (`where uvx` on Windows, `which uvx` elsewhere; the installer does this), then restart the app.' },
      { h2: 'Windows' },
      { p: 'Install uv in PowerShell (see [Quickstart](/docs/quickstart)), then open a new terminal so `uvx` is on your PATH.' },
      { callout: 'ORILOS is tested on Linux. Windows and macOS builds and tests are set up in CI but haven’t run yet. Please report anything that breaks.', kind: 'warn' },
      { h2: 'An account won’t connect' },
      { p: 'Ask your AI for the connect link again (`setup`). A link is private to the running ORILOS and stops working when it restarts. Open it on the same computer.' },
    ],
  },
  {
    slug: 'faq',
    title: 'FAQ',
    group: G.help,
    description: 'Short answers.',
    blocks: [
      { h3: 'Do I need an AI key?' },
      { p: 'No. The AI you already chat with (Claude, Codex…) does the thinking. A Gemini key only adds auto mode and trend reports.' },
      { h3: 'What does it cost?' },
      { p: 'Free covers unlimited clips on your own computer. Pro and Team add the daily-creator tools; see [Pricing](/pricing). Posting through Upload-Post, and the optional ElevenLabs and Tavus features, use your own accounts with those services.' },
      { h3: 'Is there a watermark?' },
      { p: 'No. Only your brand kit, if you add one, and a “via <creator>” credit you can turn off.' },
      { h3: 'Do I need a GPU?' },
      { p: 'No. Everything runs on a normal CPU; a GPU speeds up transcription when it’s available.' },
      { h3: 'Which sites can I clip from?' },
      { p: 'Anything yt-dlp supports: YouTube, Twitch, Kick, X, TikTok, Instagram and 1,800+ more, or a local file.' },
      { h3: 'Can I clip other creators?' },
      { p: 'Clip what you have the rights or permission to use. Many streamers welcome clippers; ORILOS adds a creator credit by default.' },
      { h3: 'Which AI apps work?' },
      { p: 'Any MCP client. The installer sets up Claude Code, Codex, Claude Desktop, Cursor and Windsurf.' },
    ],
  },
  {
    slug: 'changelog',
    title: 'Changelog',
    group: G.help,
    description: 'What changed, newest first.',
    blocks: [
      { h2: '0.1.0 (2026-11-23)' },
      { h3: 'Styles, languages, Studio and Autopilot' },
      { ul: [
        `${STYLES.length} caption styles, captions in any script, ${VOICE_LANGUAGES.length} voice languages.`,
        'Pro edits: jump cuts, punch-in zooms, lit keywords, emoji pops, sound hits and a progress bar, with `viral`, `podcast`, `gaming` and `clean` presets.',
        'Brand kits, best-time scheduling, the Studio, Autopilot, hot moments without a key, AI UGC actors.',
        'New tools: `caption_styles`, `brand_kit`, `voices`, `schedule_posts`, `scheduled_posts`, `open_studio`, `autopilot_watch`, `ugc_ad`. New commands: `studio`, `autopilot`.',
      ] },
      { h3: 'No AI key needed' },
      { ul: ['Your own AI picks the moments; YouTube captions or local Whisper; on-device face framing; loud moments; free offline voice; `orilos-mcp install` and `doctor`; Claude Code plugin and skill.'] },
      { h3: 'First release' },
      { ul: ['Clip, research, voice and post from any MCP client.'] },
    ],
  },
];

/** Sidebar groups, in order. */
export const GROUPS = [G.start, G.clip, G.publish, G.ref, G.help];
