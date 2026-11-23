import { ArrowRight, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { maybeMe, type Me } from "../account/api";
import "./landing.css";

// Everything the page claims is true of ORILOS today. No em dashes, no emoji in visible copy.
const PLATFORMS = ["TikTok", "Reels", "Shorts", "X", "LinkedIn", "Facebook", "Threads", "Pinterest", "Bluesky"];
const APPS = ["Claude Code", "Codex", "Claude Desktop", "Cursor", "Windsurf"];
const INSTALL = {
  "Every AI app": "uvx orilos-mcp install",
  "Claude Code": "claude mcp add --scope user orilos -- uvx orilos-mcp",
  Codex: "codex mcp add orilos -- uvx orilos-mcp",
} as const;
type Client = keyof typeof INSTALL;
const UV = {
  Windows: 'powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
  "macOS, Linux": "curl -LsSf https://astral.sh/uv/install.sh | sh",
};
const NUMBERS: [string, string][] = [
  ["$0", "No minutes, no credits"],
  ["67", "Caption looks"],
  ["53", "Voice languages"],
  ["9", "Platforms"],
  ["21", "Tools for your AI"],
];
// Real ORILOS caption style names (captions.STYLES).
const LOOKS = "bold hormozi pill lime oneword clean orilos orilos-neon orilos-glass bold-pop beast reveal shout impact headline punch tayo boxed redbox karaoke karaoke-glow karaoke-pink fill progress neon neon-blue neon-green cyber vice gamer arcade esports 3d 3d-red comic cartoon candy retro minimal minimal-lower subtitle spotlight editorial lifestyle clean-box underline typewriter story cozy marker script horror yellow cyan red green purple orange pink gold blackout outline-swap slide stack duo fire ice".split(" ");
const LINES: { lang: string; words: string[]; dir?: "rtl" }[] = [
  { lang: "English", words: ["THIS", "IS", "THE", "MOMENT"] },
  { lang: "Hindi", words: ["यही", "वो", "पल", "है"] },
  { lang: "Spanish", words: ["ESTE", "ES", "EL", "MOMENTO"] },
  { lang: "Japanese", words: ["これが", "その", "瞬間だ"] },
  { lang: "Arabic", words: ["هذه", "هي", "اللحظة"], dir: "rtl" },
  { lang: "Korean", words: ["바로", "이", "순간이야"] },
  { lang: "Portuguese", words: ["ESTE", "É", "O", "MOMENTO"] },
];
const PHOTO = {
  src: "https://images.unsplash.com/photo-1779333429848-d6494e6b11ff?w=1800&q=70&auto=format&fit=crop",
  by: "Sunira Moses",
  page: "https://unsplash.com/photos/vibrant-nightlife-scene-with-neon-lit-buildings-and-palm-trees-M99uIpg7PGM",
};

type Reel = { credits: string[]; clips: { src: string; poster: string }[] };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// One rAF loop for the whole page: every [data-p] element gets --p, its scroll progress.
// Pinned sections ([data-pin]) measure 0..1 across their sticky run; others across their pass through the viewport.
function useScrollProgress() {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = innerHeight;
      document.querySelectorAll<HTMLElement>("[data-p]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > 2 * vh) return;
        const p = el.hasAttribute("data-pin") ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (r.height + vh);
        const c = Math.min(1, Math.max(0, p));
        el.style.setProperty("--p", c.toFixed(4));
        el.dispatchEvent(new CustomEvent("progress", { detail: c }));
      });
      document.documentElement.classList.toggle("lp-scrolled", scrollY > 24);
    };
    const on = () => (raf ||= requestAnimationFrame(tick));
    tick();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);
}

// Reveal on scroll: CSS scroll-driven animations where supported, this observer elsewhere.
function useReveal() {
  useEffect(() => {
    if (CSS.supports("animation-timeline: view()")) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { rootMargin: "0px 0px -12% 0px" });
    const watch = () => document.querySelectorAll(".rv:not(.in)").forEach((el) => io.observe(el));
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

// Videos play only while on screen (and never with reduced motion).
function useAutoplay() {
  useEffect(() => {
    if (reduced()) return;
    const io = new IntersectionObserver((es) =>
      es.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      }),
    );
    const watch = () => document.querySelectorAll("video[data-auto]").forEach((v) => io.observe(v));
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

function useCopy(): [string, (key: string, text: string) => void] {
  const [done, setDone] = useState("");
  const copy = (key: string, text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setDone(key);
      setTimeout(() => setDone((d) => (d === key ? "" : d)), 1800);
    });
  };
  return [done, copy];
}

function Clip({ c, play = true }: { c: { src: string; poster: string }; play?: boolean }) {
  return play ? (
    <video data-auto src={c.src} poster={c.poster} muted loop playsInline preload="none" aria-hidden="true" />
  ) : (
    <img src={c.poster} alt="" loading="lazy" aria-hidden="true" />
  );
}

// ── Sections ─────────────────────────────────────────────────────────────

function Nav() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    void maybeMe().then(setMe);
  }, []);
  const first = me ? (me.name || me.email).split(" ")[0] : "";
  return (
    <header className="lp-nav">
      <a className="lp-logo" href="/" aria-label="ORILOS home">
        <img src="/mascot/neutral.png" alt="" width="26" height="26" />
        ORILOS
      </a>
      <nav aria-label="Main">
        <a href="#story">How</a>
        <a href="#autopilot">Autopilot</a>
        <a href="#ai">Your AI</a>
        <a href="/docs">Docs</a>
        <a href="/pricing">Pricing</a>
      </nav>
      <div className="lp-nav-cta">
        {me ? (
          <>
            <a className="lp-welcome" href="/account">
              {me.avatar ? <img src={me.avatar} alt="" width="26" height="26" referrerPolicy="no-referrer" /> : <i aria-hidden="true">{first.charAt(0).toUpperCase()}</i>}
              <span>Welcome back, {first}</span>
            </a>
            <a className="lp-btn" href="/account">
              Dashboard <ArrowRight size={16} aria-hidden="true" />
            </a>
          </>
        ) : (
          <>
            <a className="lp-signin" href="/signin">Sign in</a>
            <a className="lp-btn" href="#install">
              Install free <ArrowRight size={16} aria-hidden="true" />
            </a>
          </>
        )}
      </div>
    </header>
  );
}

function Hero({ reel }: { reel: Reel }) {
  const [link, setLink] = useState("");
  const [done, copy] = useCopy();
  const cols = [0, 1, 2, 3, 4, 5].map((i) => reel.clips.filter((_, n) => n % 6 === i));
  const prompt = `clip this ${link.trim() || "<your video link>"}: the 5 best moments, then plan them on TikTok, Reels and Shorts`;
  return (
    <section className="lp-hero" data-p>
      <div className="lp-hero-wall" aria-hidden="true">
        {cols.map((col, i) => (
          <div className={`lp-col c${i}`} key={i}>
            <div className="lp-col-run">
              {[...col, ...col].map((c, n) => (
                <Clip key={n} c={c} play={n < col.length && i % 2 === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="lp-hero-glow" aria-hidden="true" />
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-hero-in">
        <h1 className="lp-mega">
          <span>Long in.</span>
          <span className="pink">Short out.</span>
        </h1>
        <p className="lp-sub">Paste a link into Claude Code or Codex. Get captioned shorts, ready to post. Free, on your own computer.</p>
        <form
          className="lp-ask"
          onSubmit={(e) => {
            e.preventDefault();
            copy("hero", prompt);
          }}
        >
          <label className="sr" htmlFor="lp-link">
            Video link
          </label>
          <input id="lp-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube, Twitch or Kick link" inputMode="url" autoComplete="off" />
          <button type="submit">
            {done === "hero" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {done === "hero" ? "Copied. Paste it into your AI" : "Copy prompt for my AI"}
          </button>
        </form>
        <ul className="lp-platforms" aria-label="Posts to">
          {LOGOS.map(([file, name]) => (
            <li key={file}>
              <img src={`/platforms/${file}.webp`} alt={name} title={name} width={28} height={28} loading="eager" decoding="async" />
            </li>
          ))}
        </ul>
        <p className="lp-fine">No upload. No account. No AI key. Windows, macOS, Linux.</p>
      </div>
    </section>
  );
}

const LOGOS = [
  ["shorts", "YouTube Shorts"], ["tiktok", "TikTok"], ["insta", "Instagram Reels"], ["x", "X"],
  ["linkedin", "LinkedIn"], ["fb", "Facebook"], ["threads", "Threads"], ["pintrest", "Pinterest"], ["bluesky", "Bluesky"],
] as const;

const STEPS = ["One long stream.", "Find what people loved.", "Cut to 9:16.", "Caption every word.", "Punch in.", "Post everywhere."];
const STEP_AT = [0, 0.12, 0.32, 0.52, 0.66, 0.8];
const PEAKS = [13, 30, 47];
const BARS = Array.from({ length: 64 }, (_, i) => (PEAKS.includes(i) ? 1 : 0.18 + 0.5 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.31))));

function Story() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const el = ref.current!;
    const on = (e: Event) => {
      const p = (e as CustomEvent<number>).detail;
      setStep(STEP_AT.findLastIndex((a) => p >= a));
    };
    el.addEventListener("progress", on);
    return () => el.removeEventListener("progress", on);
  }, []);
  return (
    <section id="story" className="lp-story" data-p data-pin ref={ref}>
      <div className="lp-stage">
        <ol className="lp-steps" aria-label="How ORILOS works">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "on" : i < step ? "past" : ""}>
              <span className="n">0{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="lp-shot">
          <div className="lp-frame">
            <video data-auto src="/story/wide.mp4" poster="/story/wide.jpg" muted loop playsInline preload="none" aria-hidden="true" />
            <div className="lp-short">
              <video data-auto src="/story/short.mp4" poster="/story/short.jpg" muted loop playsInline preload="none" aria-hidden="true" />
            </div>
          </div>
          <div className="lp-time" aria-hidden="true">
            {BARS.map((h, i) => (
              <i key={i} className={PEAKS.includes(i) ? "pk" : ""} style={{ height: `${h * 100}%` }} />
            ))}
            {["chat x9", "most replayed", "viewer clip"].map((t, i) => (
              <b key={t} style={{ left: `${(PEAKS[i] / 64) * 100}%` }}>
                {t}
              </b>
            ))}
          </div>
          <ul className="lp-dest" aria-label="Platforms">
            {PLATFORMS.map((p, i) => (
              <li key={p} style={{ ["--i" as string]: i }}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Wall({ reel }: { reel: Reel }) {
  const cols = [0, 1, 2, 3, 4].map((i) => reel.clips.filter((_, n) => n % 5 === i));
  return (
    <section className="lp-wall" data-p aria-labelledby="wall-h">
      <div className="lp-wall-head rv">
        <h2 id="wall-h" className="lp-h2">
          Real clips.
          <br />
          <span className="pink">Made by ORILOS.</span>
        </h2>
      </div>
      <div className="lp-wall-cols" aria-hidden="true">
        {cols.map((col, i) => (
          <div key={i} className={`lp-wcol w${i}`}>
            {col.map((c, n) => (
              <Clip key={n} c={c} />
            ))}
          </div>
        ))}
      </div>
      <p className="lp-credit">{reel.credits.join(" · ")}</p>
    </section>
  );
}

function Karaoke() {
  const [line, setLine] = useState(0);
  const [word, setWord] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => {
      setWord((w) => {
        if (w < LINES[line].words.length + 2) return w + 1; // a short hold after the last word
        setLine((l) => (l + 1) % LINES.length);
        return 0;
      });
    }, 360);
    return () => clearInterval(t);
  }, [line]);
  const l = LINES[line];
  return (
    <div className="lp-kara" aria-hidden="true">
      <span className="lp-lang">{l.lang}</span>
      <p dir={l.dir} key={line}>
        {l.words.map((w, i) => (
          <span key={i} className={i === word ? "on" : i < word ? "said" : ""}>
            {w}
          </span>
        ))}
      </p>
    </div>
  );
}

function Looks() {
  return (
    <section className="lp-looks" data-p aria-labelledby="looks-h">
      <div className="lp-looks-bg" aria-hidden="true" />
      <h2 id="looks-h" className="lp-h2 rv">
        67 looks.
        <br />
        <span className="pink">Any language.</span>
      </h2>
      <Karaoke />
      <p className="lp-body rv">Word by word captions in Hindi, Arabic, Japanese, Korean, Thai and every other script. Keywords light up, the frame punches in, silences disappear.</p>
      <div className="lp-names" aria-label="Caption styles">
        <div>
          {[...LOOKS, ...LOOKS].map((n, i) => (
            <span key={i} aria-hidden={i >= LOOKS.length}>
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const HEAT = Array.from({ length: 90 }, (_, i) => 0.12 + 0.35 * Math.abs(Math.sin(i * 0.9) * Math.sin(i * 0.23)) + (i % 23 === 7 ? 0.6 : 0));

function Autopilot() {
  const [done, copy] = useCopy();
  const cmd = "autopilot twitch.tv/yourname, clip every stream, I approve";
  return (
    <section id="autopilot" className="lp-auto" data-p aria-labelledby="auto-h">
      <img className="lp-auto-bg" src={PHOTO.src} alt="" aria-hidden="true" referrerPolicy="no-referrer" />
      <div className="lp-auto-tint" aria-hidden="true" />
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-rec" aria-hidden="true">
        <i /> REC
      </div>
      <div className="lp-auto-in">
        <p className="lp-eyebrow">Autopilot. GTA VI season.</p>
        <h2 id="auto-h" className="lp-mega small rv">
          You stream.
          <br />
          <span className="pink">It clips.</span>
        </h2>
        <p className="lp-body rv">Autopilot watches your Twitch, Kick and YouTube channels. It records live streams with the chat and clips the peaks of every VOD. Approve them in the Studio, or let it post at the best hours.</p>
        <button className="lp-cmd" onClick={() => copy("auto", cmd)}>
          <code>{cmd}</code>
          {done === "auto" ? <Check size={18} aria-label="Copied" /> : <Copy size={18} aria-label="Copy" />}
        </button>
      </div>
      <div className="lp-heat" aria-hidden="true">
        <div>
          {[...HEAT, ...HEAT].map((h, i) => (
            <i key={i} className={h > 0.7 ? "pk" : ""} style={{ height: `${Math.min(0.95, h) * 100}%` }} />
          ))}
        </div>
      </div>
      <p className="lp-legal">
        ORILOS is not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and GTA VI are their trademarks. Photo:{" "}
        <a href={PHOTO.page} target="_blank" rel="noreferrer">
          {PHOTO.by}, Unsplash
        </a>
      </p>
    </section>
  );
}

const SESSION = [
  { t: "you", s: "clip this twitch.tv/videos/2931745878, the 5 best moments, plan them on TikTok, Reels and Shorts" },
  { t: "tool", s: "clip_video   transcribed 3 h 12 min, 14 hot moments: chat spikes, viewer clips, replays" },
  { t: "tool", s: "render_clips   5 clips, framed per shot, captions, punch-ins, jump cuts" },
  { t: "tool", s: "schedule_posts   15 posts this week at each platform's best hour" },
  { t: "ai", s: "Done. The heist finale is the strongest one. Open the Studio to watch them." },
];

function Terminal({ reel }: { reel: Reel }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0); // characters typed across the whole session
  const total = SESSION.reduce((a, l) => a + l.s.length, 0);
  useEffect(() => {
    if (reduced()) return setN(total);
    let t = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || t) return;
        t = window.setInterval(() => setN((x) => (x >= total ? (clearInterval(t), x) : x + 3)), 16);
      },
      { threshold: 0.4 },
    );
    io.observe(ref.current!);
    return () => {
      io.disconnect();
      clearInterval(t);
    };
  }, [total]);
  let left = n;
  return (
    <section id="ai" className="lp-ai" aria-labelledby="ai-h">
      <h2 id="ai-h" className="lp-h2 rv">
        Lives inside
        <br />
        <span className="pink">your AI.</span>
      </h2>
      <p className="lp-apps rv">
        {APPS.map((a) => (
          <span key={a}>{a}</span>
        ))}
      </p>
      <div className="lp-term" ref={ref} role="img" aria-label="An example session: the AI calls ORILOS tools and gets five finished clips">
        <div className="lp-term-bar">
          <span>claude code</span>
          <span>example session</span>
        </div>
        {SESSION.map((l, i) => {
          const shown = l.s.slice(0, Math.max(0, left));
          left -= l.s.length;
          if (!shown) return null;
          return (
            <p key={i} className={l.t}>
              <b>{l.t === "you" ? ">" : l.t === "tool" ? "+" : "ai"}</b>
              {shown}
            </p>
          );
        })}
        <div className={`lp-term-clips ${n >= total ? "on" : ""}`}>
          {reel.clips.slice(0, 5).map((c, i) => (
            <img key={i} src={c.poster} alt="" loading="lazy" style={{ ["--i" as string]: i }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Install() {
  const [client, setClient] = useState<Client>("Every AI app");
  const [done, copy] = useCopy();
  return (
    <section id="install" className="lp-install" aria-labelledby="install-h">
      <h2 id="install-h" className="lp-h2 rv">
        One line.
        <br />
        <span className="pink">Then just ask.</span>
      </h2>
      <div className="lp-tabs" role="tablist" aria-label="Your AI app">
        {(Object.keys(INSTALL) as Client[]).map((k) => (
          <button key={k} role="tab" aria-selected={client === k} onClick={() => setClient(k)}>
            {k}
          </button>
        ))}
      </div>
      <button className="lp-big-cmd" onClick={() => copy("install", INSTALL[client])} aria-label={`Copy: ${INSTALL[client]}`}>
        <code>
          <span className="dim">$ </span>
          {INSTALL[client]}
        </code>
        <span className="lp-copy">{done === "install" ? "Copied" : "Copy"}</span>
      </button>
      <p className="lp-fine">
        It downloads the speech and voice models once, then connects ORILOS to the AI apps on this computer. <a href="/docs/quickstart">Full setup guide</a>
      </p>
      <details className="lp-uv">
        <summary>No uv yet?</summary>
        {Object.entries(UV).map(([os, c]) => (
          <button key={os} className="lp-cmd" onClick={() => copy(os, c)}>
            <span className="os">{os}</span>
            <code>{c}</code>
            {done === os ? <Check size={16} aria-label="Copied" /> : <Copy size={16} aria-label="Copy" />}
          </button>
        ))}
      </details>
      <dl className="lp-nums">
        {NUMBERS.map(([n, l]) => (
          <div key={l} className="rv">
            <dt>{n}</dt>
            <dd>{l}</dd>
          </div>
        ))}
      </dl>
      <p className="lp-facts">Free. No AI key. Runs on your PC. Brand kits, a posting calendar, nine platforms.</p>
    </section>
  );
}

function Footer({ reel }: { reel: Reel }) {
  return (
    <footer className="lp-foot">
      <div className="lp-foot-top">
        <a className="lp-logo big" href="/">
          <img src="/mascot/neutral.png" alt="" width="40" height="40" />
          ORILOS
        </a>
        <nav aria-label="Footer">
          <a href="/docs">Docs</a>
          <a href="/docs/quickstart">Quickstart</a>
          <a href="/pricing">Pricing</a>
          <a href="/account">Account</a>
          <a href="/docs">GitHub</a>
          <a href="/app">Web app</a>
        </nav>
      </div>
      <p className="lp-credit">
        Clips: {reel.credits.join(" · ")}. Photo: <a href={PHOTO.page}>{PHOTO.by}, Unsplash</a>.
      </p>
    </footer>
  );
}

export function Landing() {
  const [reel, setReel] = useState<Reel>({ credits: [], clips: [] });
  useEffect(() => {
    document.title = "ORILOS. Long video in, shorts out.";
    fetch("/reel/reel.json")
      .then((r) => r.json())
      .then(setReel)
      .catch(() => {});
  }, []);
  useScrollProgress();
  useReveal();
  useAutoplay();
  return (
    <div className="lp">
      <a className="sr skip" href="#story">
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero reel={reel} />
        <Story />
        <Wall reel={reel} />
        <Looks />
        <Autopilot />
        <Terminal reel={reel} />
        <Install />
      </main>
      <Footer reel={reel} />
    </div>
  );
}
