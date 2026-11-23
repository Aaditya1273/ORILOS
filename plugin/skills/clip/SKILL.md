---
name: orilos-clip
description: Turn any video or live stream URL (YouTube, Twitch, Kick, X, TikTok, Instagram, podcasts, gaming streams) or local video into viral vertical shorts with captions and hooks, then post them to TikTok, Instagram Reels, YouTube Shorts, X, LinkedIn, Facebook, Threads, Pinterest or Bluesky. Use whenever the user shares a video link or file and wants clips, shorts, reels, highlights, a clipping workflow, or to post/schedule clips; also when they ask what's trending to clip, or why a video went viral.
---

# Clip and post with ORILOS

You are the creative director; the ORILOS MCP tools do the heavy work on the user's computer. No AI key is needed.
Default to full automation: when the user gives a link and says "clip this" (or similar), run the whole loop without
asking for confirmation at each step. Only ask when something truly needs their choice (which platforms to post to,
if they haven't said).

## The loop

1. **Start.** `clip_video(source=<url or file>, clips=<n, default 5>, caption_style=<any of caption_styles>, focus=<what they want>)`.
   - Live right now? `clip_live(url, minutes=10)`.
   - Tools return within ~45 s. While `status` isn't `ready`/`done`, keep calling `job_status(job_id)`. Long streams take minutes: tell the user briefly what's happening, then keep polling. Never give up early.
2. **Pick (this is your job).** When the job is `ready` you get a timed transcript, loud moments and a picking guide.
   - Apply the 2-second test: every clip opens on its strongest moment and stands alone for a cold viewer.
   - Hot moments are evidence of what viewers loved: `replayed` (YouTube most-replayed), `viewer_clip`, `chat` spikes, `loud`. Check them first.
   - For long videos you get an overview: call `get_transcript(job_id, start, end)` on promising stretches before choosing exact cuts.
   - For each clip write: a hook (≤8 words, about *this* moment), a YouTube title, captions per platform, a score and a one-line why.
     Plain sentences only: never use emojis or long dashes in hooks, titles or captions.
   - Steer the edit: `edit_style` (`viral` default, `podcast`, `gaming` for streams with no jump cuts, `clean`) and 1-4 `emphasis`
     words that carry the point. Leave `emoji` empty unless the user asks for emoji pops. ORILOS adds jump
     cuts, punch-in zooms, sound hits and a progress bar, all inside the platform safe zone.
3. **Render.** `render_clips(job_id, clips=[...])`, then poll `job_status` until `done`.
4. **Show.** List the clips: score, hook, length, file path. Mention the best one, and offer the Studio (`open_studio`) to watch,
   approve and drag them onto a calendar.
5. **Post** (when the user wants it, or asked for full automation and named platforms): `post_clip(job_id, clip, platforms)`.
   - If an account isn't connected the tool returns a private `connect_link`: give it to the user as-is ("open this on your computer to connect"), wait, then retry. Never ask for keys or passwords in chat.
   - Report the result per platform. Upload-Post posts are async: `post_status(request_id)`.

## Schedule, brand, autopilot

- **Schedule:** `schedule_posts(job_id, clips, platforms)` plans each clip at each platform's best hours (or `when=` for one clip).
  `scheduled_posts` lists / moves / cancels. The Studio calendar shows the same posts.
- **Brand:** `brand_kit(action="save", name, logo, highlight_color, font_file)` once; every clip then carries the user's logo,
  colours and font. Never add an ORILOS watermark.
- **Styles:** `caption_styles` returns 67 looks plus a preview image: show it when the user hasn't chosen.
- **Languages:** captions in any script (Hindi, Arabic, Chinese, Japanese, Korean, Thai…): write the translated lines yourself or set
  `caption_language`. Spoken hooks: `voice_hook: true` + `voice_language` per clip; `voices` lists the 53 free voice languages.
- **Autopilot:** "clip every stream of <channel>" → `autopilot_watch(action="add", channel=<url>, mode="review"|"auto", platforms=[...])`.
  Review mode leaves clips in the Studio inbox; auto mode schedules them. Tell the user `orilos-mcp autopilot` keeps it running with no AI
  app open.
- **AI actor ads:** `ugc_ad` (the user's Tavus key; the tool returns a connect link if missing).

## Good to know

- Re-cut or add clips: call `render_clips` again on the same job with new times.
- Captions in another language: write the translated captions yourself and pass them per clip, or set `caption_language`.
- Spoken hook over the opening: `voice_hook: true` per clip (free offline voice).
- Learn a format before clipping: `analyze_viral(url)` shows you the video's frames and words; break down its hook, pacing and captions.
- Trends: use your own web search for what's exploding right now (or `research_trends` if the user added a Gemini key).
- Credit: clips show "via <creator>" by default (`credit: false` turns it off).
- First run downloads speech and voice models once (a few minutes); later runs are fast.
