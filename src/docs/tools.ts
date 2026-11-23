// The ORILOS tools reference. Generated; don't edit by hand.

export interface Param { name: string; type: string; default: string | null }
export interface Tool { name: string; doc: string; params: Param[]; returns: string }
export interface PickField { name: string; type: string; default: string | null; description: string }

export const TOOLS: Tool[] = [
  {
    "name": "setup",
    "doc": "What's connected, and the private link where the user connects posting accounts (and optional keys).\nNo key is needed to clip; accounts are only needed to post.",
    "params": [],
    "returns": "dict"
  },
  {
    "name": "clip_video",
    "doc": "Step 1 of clipping: downloads and transcribes a video on this computer, then returns a timed transcript, the loud\nmoments and a picking guide, so YOU choose the moments and call render_clips.\n\nsource: a URL (YouTube, Twitch/Kick VOD, X, TikTok, Instagram, any yt-dlp site) or a local file path.\nclips: how many to aim for. min_seconds/max_seconds: clip length. caption_style: any of caption_styles (67 looks: bold, hormozi, karaoke, neon, beast, orilos…).\nlayout: auto (per shot: follow the speaker, stack two people or a facecam over gameplay, or fit) | track | stack | fit.\nvoice_hook: speak each hook over the opening. caption_language: e.g. \"English\" or \"Spanish\" to translate the captions\n(you can pass the translations per clip in render_clips; with a Gemini key ORILOS translates).\nfocus: what the user wants (e.g. \"funniest reactions\", \"anything about GTA 6\").\nauto: with a Gemini key, ORILOS picks the moments itself and returns finished clips in one go.\ncredit: show \"via <creator>\" on each clip. brand: a brand_kit name (\"\" = the default kit, \"none\" = no branding).\nedit_style: viral | podcast | gaming | clean (jump cuts, punch-in zooms, lit keywords, sound hits, progress bar;\n\"\" means gaming for Twitch/Kick and viral otherwise).",
    "params": [
      {
        "name": "source",
        "type": "str",
        "default": null
      },
      {
        "name": "clips",
        "type": "int",
        "default": "5"
      },
      {
        "name": "min_seconds",
        "type": "float",
        "default": "20"
      },
      {
        "name": "max_seconds",
        "type": "float",
        "default": "60"
      },
      {
        "name": "caption_style",
        "type": "str",
        "default": "\"bold\""
      },
      {
        "name": "layout",
        "type": "str",
        "default": "\"auto\""
      },
      {
        "name": "hook",
        "type": "bool",
        "default": "True"
      },
      {
        "name": "voice_hook",
        "type": "bool",
        "default": "False"
      },
      {
        "name": "voice_name",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "focus",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "credit",
        "type": "bool",
        "default": "True"
      },
      {
        "name": "caption_language",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "auto",
        "type": "bool",
        "default": "False"
      },
      {
        "name": "brand",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "edit_style",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "wait_seconds",
        "type": "int",
        "default": "45"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "clip_live",
    "doc": "Records the next `minutes` of a stream that is live right now (YouTube, Twitch, Kick…), then works like clip_video:\npoll job_status until it's \"ready\", pick the moments, render_clips.",
    "params": [
      {
        "name": "url",
        "type": "str",
        "default": null
      },
      {
        "name": "minutes",
        "type": "int",
        "default": "10"
      },
      {
        "name": "clips",
        "type": "int",
        "default": "3"
      },
      {
        "name": "caption_style",
        "type": "str",
        "default": "\"bold\""
      },
      {
        "name": "layout",
        "type": "str",
        "default": "\"auto\""
      },
      {
        "name": "hook",
        "type": "bool",
        "default": "True"
      },
      {
        "name": "voice_hook",
        "type": "bool",
        "default": "False"
      },
      {
        "name": "focus",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "credit",
        "type": "bool",
        "default": "True"
      },
      {
        "name": "auto",
        "type": "bool",
        "default": "False"
      },
      {
        "name": "edit_style",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "wait_seconds",
        "type": "int",
        "default": "45"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "job_status",
    "doc": "Progress of a job. When it's \"ready\" this returns the transcript and picking guide; when \"done\", the clips.",
    "params": [
      {
        "name": "job_id",
        "type": "str",
        "default": null
      },
      {
        "name": "wait_seconds",
        "type": "int",
        "default": "45"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "get_transcript",
    "doc": "The full timed words between `start` and `end` seconds (for long videos, before choosing exact cuts).\nPhrases are numbered so you can pass caption_translations by index.",
    "params": [
      {
        "name": "job_id",
        "type": "str",
        "default": null
      },
      {
        "name": "start",
        "type": "float",
        "default": "0"
      },
      {
        "name": "end",
        "type": "float | None",
        "default": "None"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "render_clips",
    "doc": "Step 2 of clipping: renders the moments you chose into finished 9:16 clips (framing per shot, word-by-word captions,\nyour hook on screen, loudness-normalised audio). Can be called again on the same job to make more or re-cut.",
    "params": [
      {
        "name": "job_id",
        "type": "str",
        "default": null
      },
      {
        "name": "clips",
        "type": "list[ClipPick]",
        "default": null
      },
      {
        "name": "wait_seconds",
        "type": "int",
        "default": "45"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "list_jobs",
    "doc": "Recent clipping jobs, newest first.",
    "params": [
      {
        "name": "limit",
        "type": "int",
        "default": "10"
      }
    ],
    "returns": "list[dict]"
  },
  {
    "name": "get_clip",
    "doc": "Everything about one finished clip: file, timing, hook, title, captions per platform.",
    "params": [
      {
        "name": "job_id",
        "type": "str",
        "default": null
      },
      {
        "name": "clip",
        "type": "int",
        "default": null
      }
    ],
    "returns": "dict"
  },
  {
    "name": "analyze_viral",
    "doc": "Lets YOU watch a video to learn why it works: returns its first `seconds` as frames (images) plus the words spoken,\nand a breakdown checklist (hook, beats, pacing, captions, retention tricks, how to replicate). No key needed.",
    "params": [
      {
        "name": "source",
        "type": "str",
        "default": null
      },
      {
        "name": "frames",
        "type": "int",
        "default": "8"
      },
      {
        "name": "seconds",
        "type": "int",
        "default": "60"
      }
    ],
    "returns": "list"
  },
  {
    "name": "research_trends",
    "doc": "With a Gemini key: a Google-grounded report of what's trending now for a topic (angles, hooks, formats, hashtags, sources).\nWithout one, use your own web search: this returns the checklist to research.",
    "params": [
      {
        "name": "topic",
        "type": "str",
        "default": null
      },
      {
        "name": "platform",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "region",
        "type": "str",
        "default": "\"\""
      }
    ],
    "returns": "dict"
  },
  {
    "name": "voiceover",
    "doc": "Real text-to-speech for a hook, narration or a faceless short, in 53 languages (language: \"hi\", \"es\", \"ja\", \"pt-BR\"…).\nFree offline voices by default; ElevenLabs if the user connected it. Returns the audio file path.",
    "params": [
      {
        "name": "text",
        "type": "str",
        "default": null
      },
      {
        "name": "language",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "voice_name",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "style",
        "type": "str",
        "default": "\"energetic\""
      }
    ],
    "returns": "dict"
  },
  {
    "name": "post_clip",
    "doc": "Posts a finished clip to the user's own accounts through official APIs. Only for clips and platforms the user wants.\n\nplatforms: any of tiktok, instagram, youtube, x, linkedin, facebook, threads, pinterest, bluesky.\ncaption: override every platform's caption. schedule: ISO date-time (or \"best\" for each platform's next best slot)\nwith an optional IANA timezone. See also schedule_posts.\nIf an account isn't connected, returns the private connect link instead of posting.",
    "params": [
      {
        "name": "job_id",
        "type": "str",
        "default": null
      },
      {
        "name": "clip",
        "type": "int",
        "default": null
      },
      {
        "name": "platforms",
        "type": "list[str]",
        "default": null
      },
      {
        "name": "caption",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "title",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "schedule",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "timezone",
        "type": "str",
        "default": "\"\""
      }
    ],
    "returns": "dict"
  },
  {
    "name": "post_status",
    "doc": "Status (and links, once live) of a post sent through Upload-Post.",
    "params": [
      {
        "name": "request_id",
        "type": "str",
        "default": null
      }
    ],
    "returns": "dict"
  },
  {
    "name": "caption_styles",
    "doc": "All 67 caption looks (name, look, best for). With preview, also an image showing every style, to show the user.",
    "params": [
      {
        "name": "preview",
        "type": "bool",
        "default": "True"
      }
    ],
    "returns": "list"
  },
  {
    "name": "brand_kit",
    "doc": "The user's brand on every clip: logo (png/jpg/webp file path), caption text/highlight colours (#RRGGBB), a font (.ttf/.otf).\naction: list | save | delete. The default kit is applied to every render (pass brand in render_clips to pick another).\nNo ORILOS watermark is ever added.",
    "params": [
      {
        "name": "action",
        "type": "str",
        "default": "\"list\""
      },
      {
        "name": "name",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "logo",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "logo_position",
        "type": "str",
        "default": "\"top-right\""
      },
      {
        "name": "logo_scale",
        "type": "float",
        "default": "0.14"
      },
      {
        "name": "opacity",
        "type": "float",
        "default": "0.9"
      },
      {
        "name": "text_color",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "highlight_color",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "font_file",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "default",
        "type": "bool",
        "default": "True"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "voices",
    "doc": "Free offline voices (53 languages). language: e.g. \"hi\", \"es\", \"pt-BR\" returns that language's voices, else all languages.\nUse a voice name (or just the language) in voiceover / voice_hook.",
    "params": [
      {
        "name": "language",
        "type": "str",
        "default": "\"\""
      }
    ],
    "returns": "dict"
  },
  {
    "name": "schedule_posts",
    "doc": "Plans posts: each clip to each platform at that platform's best hours (TikTok evenings, LinkedIn weekday mornings…),\nat most per_day a day per platform and never two within 3 hours. when: an ISO date-time for ONE clip, or a start\ndate for a plan (default now). Posts fire from Upload-Post / YouTube even when this computer is off where the API allows;\notherwise they post while ORILOS runs (each item says which). The user can see and drag them in open_studio.",
    "params": [
      {
        "name": "job_id",
        "type": "str",
        "default": null
      },
      {
        "name": "clips",
        "type": "list[int]",
        "default": null
      },
      {
        "name": "platforms",
        "type": "list[str]",
        "default": null
      },
      {
        "name": "when",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "per_day",
        "type": "int",
        "default": "2"
      },
      {
        "name": "timezone",
        "type": "str",
        "default": "\"\""
      }
    ],
    "returns": "dict"
  },
  {
    "name": "scheduled_posts",
    "doc": "The posting calendar. action: list (optionally by status: queued, sent_scheduled, posting, posted, failed, cancelled)\n| move (item_id to when) | cancel (item_id).",
    "params": [
      {
        "name": "status",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "action",
        "type": "str",
        "default": "\"list\""
      },
      {
        "name": "item_id",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "when",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "timezone",
        "type": "str",
        "default": "\"\""
      }
    ],
    "returns": "dict"
  },
  {
    "name": "open_studio",
    "doc": "A private page on this computer where the user watches every clip, approves or rejects, edits titles and captions,\nposts, and drags clips onto a calendar. view: clips | calendar | accounts. Give the user the link.",
    "params": [
      {
        "name": "view",
        "type": "str",
        "default": "\"\""
      }
    ],
    "returns": "dict"
  },
  {
    "name": "autopilot_watch",
    "doc": "Autopilot: watches Twitch, Kick or YouTube channels. When one goes live it records `minutes` with the chat, finds the\nhottest moments (chat spikes, viewer clips, loudness) and renders clips; after a stream it clips the VOD's peak.\naction: add (channel URL) | list | remove (channel or id) | events (what it did).\nmode: review (clips wait in the Studio for approval, the default) | auto (posted at each platform's next best time).\nRuns while ORILOS is open (any AI app), or always-on with the command `orilos-mcp autopilot`.",
    "params": [
      {
        "name": "action",
        "type": "str",
        "default": "\"list\""
      },
      {
        "name": "channel",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "clips_per_stream",
        "type": "int",
        "default": "3"
      },
      {
        "name": "platforms",
        "type": "list[str] | None",
        "default": "None"
      },
      {
        "name": "mode",
        "type": "str",
        "default": "\"review\""
      },
      {
        "name": "caption_style",
        "type": "str",
        "default": "\"hormozi\""
      },
      {
        "name": "minutes",
        "type": "int",
        "default": "20"
      },
      {
        "name": "check_now",
        "type": "bool",
        "default": "False"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "ugc_ad",
    "doc": "An AI actor (Tavus, the user's own key) presents a clip: a UGC-style ad or reaction short.\n1) list_actors=True to choose an actor. 2) Call with script (+ actor_id, and job_id/clip to put that clip with the actor);\nit starts rendering and returns video_id. 3) Call again with video_id (+ job_id/clip/layout) until it's ready; then ORILOS\ncomposes the finished 9:16 ad. layout: actor_top (actor above the clip) | actor_corner | actor_full.",
    "params": [
      {
        "name": "script",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "actor_id",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "job_id",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "clip",
        "type": "int",
        "default": "0"
      },
      {
        "name": "layout",
        "type": "str",
        "default": "\"actor_top\""
      },
      {
        "name": "video_id",
        "type": "str",
        "default": "\"\""
      },
      {
        "name": "list_actors",
        "type": "bool",
        "default": "False"
      }
    ],
    "returns": "dict"
  }
];

export const CLIP_PICK: PickField[] = [
  {
    "name": "start",
    "type": "float",
    "default": null,
    "description": "Start, in seconds of the source video"
  },
  {
    "name": "end",
    "type": "float",
    "default": null,
    "description": "End, in seconds of the source video"
  },
  {
    "name": "hook",
    "type": "str",
    "default": "\"\"",
    "description": "On-screen hook for the first seconds (max ~8 words; no emojis, no dashes)"
  },
  {
    "name": "title",
    "type": "str",
    "default": "\"\"",
    "description": "YouTube Shorts title (max 90 chars; no emojis, no dashes)"
  },
  {
    "name": "captions",
    "type": "dict[str, str]",
    "default": "dict()",
    "description": "Caption per platform: tiktok, instagram, x, linkedin, facebook, threads, … (plain sentences and hashtags: no emojis, no dashes)"
  },
  {
    "name": "score",
    "type": "int",
    "default": "0",
    "description": "Your honest 0-100 viral estimate"
  },
  {
    "name": "why",
    "type": "str",
    "default": "\"\"",
    "description": "One sentence: what makes this moment work"
  },
  {
    "name": "caption_style",
    "type": "str | None",
    "default": "None",
    "description": "Any name from caption_styles, e.g. bold, hormozi, karaoke, neon, orilos (default: the job's)"
  },
  {
    "name": "layout",
    "type": "str | None",
    "default": "None",
    "description": "auto | track | stack | fit (default: auto, per shot)"
  },
  {
    "name": "voice_hook",
    "type": "bool | None",
    "default": "None",
    "description": "Also speak the hook over the opening (real TTS)"
  },
  {
    "name": "brand",
    "type": "str | None",
    "default": "None",
    "description": "Brand kit name (default: the user's default kit; 'none' for no branding)"
  },
  {
    "name": "voice_language",
    "type": "str | None",
    "default": "None",
    "description": "Language of the spoken hook if it isn't the video's, e.g. 'es', 'hi'"
  },
  {
    "name": "edit_style",
    "type": "str | None",
    "default": "None",
    "description": "viral | podcast | gaming | clean (default: the job's)"
  },
  {
    "name": "emphasis",
    "type": "list[str] | None",
    "default": "None",
    "description": "1-4 key words that stay highlighted in the captions (default: numbers, money, superlatives)"
  },
  {
    "name": "emoji",
    "type": "list[dict] | None",
    "default": "None",
    "description": "Leave empty unless the user explicitly asks for emoji pops: [{\"word\": \"...\", \"e\": \"<emoji>\"}] or [{\"t\": seconds_into_clip, \"e\": \"<emoji>\"}]"
  },
  {
    "name": "zooms",
    "type": "list[float] | None",
    "default": "None",
    "description": "Exact punch-in times in seconds into the clip (default: automatic)"
  },
  {
    "name": "tighten",
    "type": "bool | None",
    "default": "None",
    "description": "Jump cuts: remove long pauses and um/uh (default: by edit_style)"
  },
  {
    "name": "sfx",
    "type": "bool | None",
    "default": "None",
    "description": "Sound hits on punch-ins and emoji (default: by edit_style)"
  },
  {
    "name": "progress_bar",
    "type": "bool | None",
    "default": "None",
    "description": "Thin progress bar along the bottom (default: by edit_style)"
  },
  {
    "name": "caption_translations",
    "type": "dict[str, str] | None",
    "default": "None",
    "description": "Optional: translated caption text per transcript phrase index within the clip (see get_transcript)"
  }
];

// Pro-edit presets.
export const EDIT_STYLES: Record<string, Record<string, string | number | boolean>> = {
  "viral": {
    "tighten": true,
    "zoom": "auto",
    "amp": 1.12,
    "emphasis": true,
    "sfx": true,
    "progress_bar": true
  },
  "podcast": {
    "tighten": true,
    "zoom": "auto",
    "amp": 1.08,
    "emphasis": true,
    "sfx": false,
    "progress_bar": true
  },
  "gaming": {
    "tighten": false,
    "zoom": "peaks",
    "amp": 1.15,
    "emphasis": true,
    "sfx": true,
    "progress_bar": false
  },
  "clean": {
    "tighten": false,
    "zoom": "off",
    "amp": 1.0,
    "emphasis": false,
    "sfx": false,
    "progress_bar": false
  }
};
