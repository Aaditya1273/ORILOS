<p align="center">
  <img src=".github/assets/mascot.png" width="88" alt="ORILOS">
</p>

<h1 align="center">ORILOS</h1>

<p align="center"><b>Long in. Short out.</b></p>

<p align="center">
  Paste a link into Claude Code or Codex. Get captioned, hooked, vertical shorts, ready to post.<br>
  Free. No AI key. On your own computer.
</p>

<p align="center">
  <a href="https://orilos.pages.dev"><img alt="Website" src="https://img.shields.io/badge/website-orilos.pages.dev-ff2e93?style=flat-square&labelColor=000"></a>
  <a href="https://orilos.pages.dev/docs"><img alt="Docs" src="https://img.shields.io/badge/docs-read-ffffff?style=flat-square&labelColor=000"></a>
  <a href="https://orilos.pages.dev/docs/connect"><img alt="Works with Claude Code and Codex" src="https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20Codex-ffffff?style=flat-square&labelColor=000"></a>
  <img alt="Windows, macOS, Linux" src="https://img.shields.io/badge/runs%20on-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-ffffff?style=flat-square&labelColor=000">
</p>

<p align="center">
  <img src=".github/assets/platforms/shorts.png" width="32" alt="YouTube Shorts" title="YouTube Shorts">&nbsp;
  <img src=".github/assets/platforms/tiktok.png" width="32" alt="TikTok" title="TikTok">&nbsp;
  <img src=".github/assets/platforms/insta.png" width="32" alt="Instagram Reels" title="Instagram Reels">&nbsp;
  <img src=".github/assets/platforms/x.png" width="32" alt="X" title="X">&nbsp;
  <img src=".github/assets/platforms/linkedin.png" width="32" alt="LinkedIn" title="LinkedIn">&nbsp;
  <img src=".github/assets/platforms/fb.png" width="32" alt="Facebook" title="Facebook">&nbsp;
  <img src=".github/assets/platforms/threads.png" width="32" alt="Threads" title="Threads">&nbsp;
  <img src=".github/assets/platforms/pintrest.png" width="32" alt="Pinterest" title="Pinterest">&nbsp;
  <img src=".github/assets/platforms/bluesky.png" width="32" alt="Bluesky" title="Bluesky">
</p>

<p align="center">
  <img src=".github/assets/clips.jpg" width="100%" alt="Shorts made by ORILOS from a gaming stream and a podcast">
</p>

<p align="center"><sub>Real ORILOS output. Sources: Veloren gameplay by Nookrium (CC BY) and "Winning Conversations" by Heritage of Faith CC (CC BY).</sub></p>

---

## What it does

You tell the AI you already use: *"clip this"* and a link. ORILOS does the rest.

| | |
|---|---|
| **Finds the moments people loved** | YouTube's most replayed graph, chat explosions, the clips viewers made, the loudest seconds, and every word said. |
| **Frames for 9:16** | Follows the speaker, stacks a facecam over gameplay, or fits a wide shot. Shot by shot. |
| **Captions every word** | 67 caption looks. Any script: Hindi, Arabic, Chinese, Japanese, Korean, Thai, Russian and more. |
| **Edits like a pro** | Jump cuts, punch-in zooms, lit keywords, sound hits, a progress bar, all inside each app's safe zone. |
| **Speaks** | A spoken hook in 53 languages, with free voices that run offline. |
| **Your brand** | Your logo, colours and font on every clip. Never an ORILOS watermark. |
| **Posts everywhere** | TikTok, Reels, Shorts, X, LinkedIn, Facebook, Threads, Pinterest and Bluesky. Now, or at each platform's best hours. |
| **Autopilot** | Watches your Twitch, Kick or YouTube channel and clips every stream while you sleep. |
| **Studio** | A private page on your computer to watch, approve, edit and drag clips onto a calendar. |

## How it works

```mermaid
flowchart LR
    A["You: clip this + a link"] --> B["Your AI<br/>Claude Code or Codex"]
    B --> C["ORILOS on your computer<br/>download, transcribe, hot moments"]
    C --> B
    B -- "picks the moments<br/>writes hooks and captions" --> D["ORILOS renders<br/>9:16, captions, edits, brand"]
    D --> E["Studio<br/>approve and schedule"]
    E --> F["9 platforms"]
```

Your AI is the creative director. ORILOS is its editing suite. Your videos, clips and keys never leave your computer.

<table>
  <tr>
    <td width="34%" valign="top"><img src=".github/assets/short.jpg" alt="A finished ORILOS short: facecam over gameplay, captions and hook"></td>
    <td valign="top">
      <img src=".github/assets/caption-styles.jpg" alt="The 67 ORILOS caption styles">
      <br><br>
      <img src=".github/assets/studio-calendar.jpg" alt="The ORILOS Studio posting calendar">
    </td>
  </tr>
</table>

## Get started

ORILOS plugs into Claude Code, Codex, Claude Desktop, Cursor, Windsurf and VS Code.

```bash
uvx orilos-mcp install
```

Then, in your AI app:

```text
clip this https://www.youtube.com/watch?v=...
```

In Claude Code you can also add it as a plugin from this repository:

```text
/plugin marketplace add Aaditya1273/ORILOS
/plugin install orilos@orilos
```

> **Release status:** the ORILOS package is being published. Until it is live, the install command above will not resolve. Watch this repository for the release.

Full guide: **[orilos.pages.dev/docs](https://orilos.pages.dev/docs)**

## This repository

The public home of ORILOS: the website, the docs and the Claude Code plugin.

| Path | What |
|---|---|
| `src/landing/` | The landing page at `/` |
| `src/docs/` | The docs at `/docs`: content, search and the tools reference |
| `src/ui/`, `src/lib/` | The ORILOS web app at `/app` (BYOK, runs in your browser) |
| `src/theme.css` | Brand tokens: black, white and hot pink, Inter Tight, Inter and JetBrains Mono |
| `public/` | Clips, images, logos and the mascot |
| `.claude-plugin/`, `plugin/` | The Claude Code plugin marketplace |
| `scripts/reel.sh` | Rebuilds the landing clip reel from finished clips |

Built with React 19, TypeScript and Vite. No backend.

```bash
npm install
npm run dev       # local site at http://localhost:5173
npm test          # unit tests
npm run build     # production build in dist/
```

The site is deployed to Cloudflare Pages (`orilos.pages.dev`). Security and cache headers live in `public/_headers`.

## Credits

- Demo clips made by ORILOS from **Veloren gameplay by Nookrium** and **"Winning Conversations" by Heritage of Faith CC**, both licensed CC BY.
- Miami night photo by **Sunira Moses** on Unsplash.
- Fonts: Inter, Inter Tight and JetBrains Mono (SIL Open Font License).
- Platform names and logos are trademarks of their owners and are used only to show where ORILOS can post.
- ORILOS is not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and GTA VI are their trademarks.

## Licence

Copyright (c) 2026 ORILOS. All rights reserved.
