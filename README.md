# ORILOS Web

ORILOS in the browser: an AI worker that researches what's happening in your space, writes posts in your voice for **X, LinkedIn, Instagram, Threads, Facebook, Reddit, Bluesky, Mastodon and Pinterest**, and gets them ready to publish. You approve. You post.

Live: **https://orilos.pages.dev**

**Design ("Lit Glass")**, the same language as the Android app:
- a softly lit, grain-textured ground behind every page, with frosted glass for whatever you read or act on;
- light large headlines, small uppercase section labels and pill buttons;
- in dark and warm-paper light themes, with every text colour ≥ 4.5:1;
- ORILOS's face is a small cloud (from VERBAL, same author, MIT) that shows what it's doing: at rest it blinks, it works with its eyes on you, it's bright-eyed when your posts are ready, and it's taken aback (with a "!") when something fails;
- light theme uses the ink cloud; *reduce motion* stops the blink and the animation.

React 19 + TypeScript + Vite. No backend: everything lives in your browser, and the only service it talks to is Google Gemini, using your own free key.

## What it does

| | |
|---|---|
| **Brand Brain** | Gemini reads your website (URL context) and searches the web, then builds a profile: tone, audience, pillars, key messages, words to avoid. You can edit it. |
| **Research** | Every run uses Google Search grounding for this week's news and data, with sources kept for each fact. It also reads your **watched pages** (blog, changelog, a competitor's pricing page) for anything new. |
| **Writing** | One idea per run, then a native version for each platform. X Free is 280 characters; X Premium allows long posts with the hook in the first 280. X guidance follows the signals in X's published ranking code. |
| **Quality gate** | Checks length, hashtags, banned phrases, generic AI phrasing, and numbers that aren't in the evidence. An editor pass scores each post, and weak posts are revised once. |
| **Learning** | Your edits before approving are shown to the next run (can be switched off). |
| **Images** | “Create in ChatGPT” opens chatgpt.com with the image brief already filled in. Gemini and Copilot get the brief copied. You paste, drop or upload the result, and big images are downscaled. With a paid Gemini key it can also create images itself (opt-in). |
| **Hand-off** | **X**, **LinkedIn**, **Threads** and **Bluesky** open their composers with the text filled in, and the image is put on the clipboard so you only paste it. **Reddit** opens a text post with the title and body filled in; you pick the community. **Instagram**, **Facebook** and **Pinterest** get the post copied and the image saved, then open. **Mastodon** has no single server, so the post is copied for you to paste on yours. On phones, the system share sheet attaches the image. |
| **Truthful states** | Needs approval → Waiting for you to post → **Posted only when you confirm**. ORILOS can't see your accounts and never claims it posted. |
| **Schedule** | Daily, Mon–Fri, weekly or once. It runs while a tab is open; a Web Lock makes sure only one tab runs it. A run missed in the last 12 hours catches up when you return. Notifications are optional. |
| **Data** | Export or import a backup (it never contains your key or images), or delete everything. |

## What it deliberately does not do
- It never logs in to your accounts, presses “Post”, or drives another site's page.
- It never hides what it does from you or from the platforms.
- It never automates ChatGPT, Gemini or Claude; their terms forbid that. It opens them for you.

The composer pre-fill uses the platforms' own public share links.

## Security
- The Gemini key is encrypted with AES-GCM under a **non-extractable** WebCrypto key stored in IndexedDB.
  - It is sent only to `generativelanguage.googleapis.com`, in a header (never in a URL).
  - It is never part of an export.
  - Key-shaped strings are redacted from error messages.
- The production build ships a strict **Content-Security-Policy**: no third-party scripts, and connections only to Gemini. It also sets `no-referrer`.
- Web pages and search results are fenced and treated as **untrusted data** in every prompt, to resist prompt injection.

## Run it

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # → dist/ (static; host anywhere)
npm test            # unit tests
```

A live end-to-end test runs the whole pipeline against real Gemini. It is skipped without a key, and the key is never printed:

```bash
GEMINI_API_KEY=… npx vitest run test/live.test.ts
```

Get a free key at https://aistudio.google.com/apikey.

## Free-tier notes
- Text generation works on the free Gemini tier.
- **Search grounding has its own small free quota.** When it runs out, ORILOS still reads your website and watched pages, and says so in Activity.
- Gemini **image** models need a billing-enabled key.

## Layout
```
src/lib/   gemini (client, fallback, grounding) · agent (pipeline + prompts) · platforms · quality
           handoff · images · schedule · worker (runs, scheduler) · store/db/vault (storage)
src/ui/    Home · Content · PostView · Schedule · Activity · Settings · Onboarding · Intro · kit
test/      rules.test.ts (unit) · live.test.ts (real Gemini, opt-in)
```
