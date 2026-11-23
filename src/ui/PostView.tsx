import { ArrowLeft, Check, Copy, Download, ExternalLink, Image as ImageIcon, Share2, Sparkles, Trash2, Undo2, Upload, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { rewrite } from '../lib/agent';
import { canShareFiles, confirmPosted, handOff, shareSheet, type HandoffResult } from '../lib/handoff';
import { download, IMAGE_APPS, imagePromptFor, prepareImage } from '../lib/images';
import { platform, shareText, validate, weightedLength } from '../lib/platforms';
import { SLOP } from '../lib/quality';
import { getBlob, log, pruneBlobs, saveBlob, updatePost, useStore } from '../lib/store';
import type { Post } from '../lib/types';
import { ai, friendly } from '../lib/worker';
import { StatusLine } from './Content';
import { go, PlatformBadge, toast, useBlobUrl } from './kit';

const QUICK = ['Shorter', 'Stronger first line', 'More casual', 'More professional', 'Add a question at the end'];

export function PostView({ id }: { id: string }) {
  const post = useStore((s) => s.posts.find((p) => p.id === id));
  const xPremium = useStore((s) => !!s.workspace?.xPremium);
  if (!post) {
    return (
      <div className="page narrow">
        <p className="secondary">This post no longer exists.</p>
        <a href="#/content">Back to Content</a>
      </div>
    );
  }
  return <Editor key={post.id} post={post} xPremium={xPremium} />;
}

function Editor({ post, xPremium }: { post: Post; xPremium: boolean }) {
  const p = platform(post.platform, xPremium);
  const [text, setText] = useState(post.text);
  const [tags, setTags] = useState(post.hashtags.join(' '));
  const [undo, setUndo] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [steps, setSteps] = useState<HandoffResult>();
  const [shareable, setShareable] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const settings = useStore((s) => s.settings);

  const hashtags = tags
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean);
  const dirty = text !== post.text || hashtags.join(' ') !== post.hashtags.join(' ');
  const save = () => dirty && updatePost(post.id, { text, hashtags });
  const final = shareText(p, { text, hashtags });
  const issues = [...validate(p, text, hashtags), ...SLOP.filter((s) => text.toLowerCase().includes(s)).map((s) => `Generic AI phrasing: "${s}"`)];
  const len = weightedLength(p, final.text);
  const needsImage = p.needsImage && !post.image;

  useEffect(() => {
    void canShareFiles(post).then(setShareable);
  }, [post]);

  // Paste an image anywhere on this page to attach it.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void attach(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  async function attach(file: Blob) {
    try {
      const img = await prepareImage(file);
      updatePost(post.id, { image: { blobId: await saveBlob(img.blob), source: 'upload', width: img.width, height: img.height } });
      void pruneBlobs();
      toast('Image attached');
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function geminiImage() {
    setBusy('image');
    try {
      const blob = await ai.image(imagePromptFor({ ...post, text }));
      updatePost(post.id, { image: { blobId: await saveBlob(blob), source: 'gemini' } });
      log({ kind: 'image', platform: post.platform, title: `Image created for ${p.label}`, ok: true });
      void pruneBlobs();
    } catch (e) {
      toast(friendly(e) === 'Something got in the way. Details are in Activity.' ? (e as Error).message : friendly(e));
    } finally {
      setBusy(undefined);
    }
  }

  async function imageApp() {
    const app = IMAGE_APPS[settings.imageApp];
    const prompt = imagePromptFor({ ...post, text });
    await navigator.clipboard.writeText(prompt).catch(() => undefined);
    window.open(app.url(prompt), '_blank', 'noopener,noreferrer');
    toast(app.prefills ? `Opened ${app.label} with the prompt. Paste or drop the image here when it’s ready.` : `Prompt copied — paste it into ${app.label}, then paste the image here.`);
  }

  async function doRewrite(instruction: string) {
    setBusy('rewrite');
    try {
      const d = await rewrite(ai, { ...post, text, hashtags }, instruction, xPremium);
      setUndo(text);
      setText(d.text);
      setTags(d.hashtags.join(' '));
      updatePost(post.id, { text: d.text, hashtags: d.hashtags });
    } catch (e) {
      toast(friendly(e));
    } finally {
      setBusy(undefined);
    }
  }

  async function approve() {
    save();
    const latest = { ...post, text, hashtags };
    if (post.state === 'pending') log({ kind: 'approved', platform: post.platform, title: `${p.label} post approved`, detail: 'Ready to publish', ok: true });
    try {
      const r = await handOff(latest, xPremium);
      setSteps(r);
      dialog.current?.showModal();
    } catch (e) {
      toast(`Couldn’t open ${p.label}: ${(e as Error).message}`);
    }
  }

  async function copy() {
    save();
    await navigator.clipboard.writeText(final.text);
    toast('Text copied');
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 20 }}>
        <button className="iconbtn" onClick={() => (save(), go('content'))} aria-label="Back to Content">
          <ArrowLeft size={20} />
        </button>
        <PlatformBadge platform={post.platform} size={36} />
        <div className="grow">
          <div className="h2">{p.label} post</div>
          <StatusLine state={post.state} />
        </div>
      </div>

      <div className="editor">
        <div className="col" style={{ gap: 16 }}>
          <div className="card col">
            <textarea className="input" rows={Math.min(18, Math.max(6, text.split('\n').length + 2))} value={text} onChange={(e) => setText(e.target.value)} onBlur={save} aria-label="Post text" />
            <label className="field">
              <span>Hashtags</span>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} onBlur={save} placeholder="coffee homebrew" />
            </label>
            <div className="row wrap" style={{ justifyContent: 'space-between' }}>
              <span className={`counter ${len > p.maxChars ? 'bad' : 'muted'}`}>
                {len.toLocaleString()} / {p.maxChars.toLocaleString()} characters{post.platform === 'x' && xPremium ? ' · first 280 show before “Show more”' : ''}
              </span>
              {undo !== undefined && (
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setText(undo);
                    updatePost(post.id, { text: undo });
                    setUndo(undefined);
                  }}
                >
                  <Undo2 size={16} /> Undo rewrite
                </button>
              )}
            </div>
            {[...issues, ...final.warnings].length > 0 && (
              <div className="notice">
                <div className="small">
                  {[...issues, ...final.warnings].map((i) => (
                    <div key={i}>• {i}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card col">
            <div className="row">
              <Wand2 size={18} className="muted" />
              <strong className="grow">Ask for changes</strong>
              {busy === 'rewrite' && <span className="small muted">Rewriting…</span>}
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              {QUICK.map((q) => (
                <button key={q} className="chip" style={{ border: 0, cursor: 'pointer' }} disabled={!!busy} onClick={() => void doRewrite(q)}>
                  {q}
                </button>
              ))}
            </div>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                const v = new FormData(e.currentTarget).get('ask')?.toString().trim();
                if (v) void doRewrite(v);
                e.currentTarget.reset();
              }}
            >
              <input className="input" name="ask" placeholder="Or say what to change…" disabled={!!busy} />
              <button className="btn" disabled={!!busy}>
                Rewrite
              </button>
            </form>
          </div>

          {(post.why || post.sources.length > 0) && (
            <details className="card">
              <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Why this post</summary>
              <p className="secondary">{post.why}</p>
              {post.sources.length > 0 && (
                <ul className="small" style={{ paddingLeft: 18 }}>
                  {post.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.title || s.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="small muted">ORILOS score {Math.round(post.score * 100)} / 100</p>
            </details>
          )}
        </div>

        <div className="col" style={{ gap: 16, position: 'sticky', top: 24 }}>
          <ImagePanel post={post} busy={busy === 'image'} onFile={attach} onGemini={settings.geminiImages ? geminiImage : undefined} onApp={imageApp} appLabel={IMAGE_APPS[settings.imageApp].label} />

          <div className="card col">
            {post.state === 'handedOff' ? (
              <>
                <strong>Did your post go out?</strong>
                <p className="small secondary" style={{ margin: 0 }}>
                  ORILOS can’t see your account, so it only marks a post as posted when you say so.
                </p>
                <button className="btn primary" onClick={() => confirmPosted(post)}>
                  <Check size={18} /> Yes, it’s posted
                </button>
                <button className="btn outline" onClick={() => void approve()}>
                  <ExternalLink size={16} /> Open {p.label} again
                </button>
              </>
            ) : post.state === 'posted' ? (
              <span className="row ok" style={{ fontWeight: 650 }}>
                <Check size={18} /> Posted — you confirmed it
              </span>
            ) : post.state === 'skipped' ? (
              <button className="btn" onClick={() => updatePost(post.id, { state: 'pending' })}>
                Restore
              </button>
            ) : (
              <>
                <button className="btn primary" disabled={needsImage || !text.trim() || len > p.maxChars} onClick={() => void approve()}>
                  <ExternalLink size={18} /> {post.platform === 'mastodon' ? 'Approve & copy' : <>Approve &amp; open {p.label}</>}
                </button>
                {needsImage && <span className="small warn">{p.label} posts need an image — add one above.</span>}
                <p className="small muted" style={{ margin: 0 }}>
                  {post.platform === 'mastodon'
                    ? 'ORILOS copies the post. Paste it on your Mastodon server.'
                    : post.platform === 'instagram' || p.copiesText
                      ? `ORILOS copies the post${post.image ? ' and saves the image' : ''}, then opens ${p.label}. You paste and post.`
                      : `ORILOS fills in the text${post.image ? ' and copies the image' : ''}. You press Post.`}
                </p>
              </>
            )}
            <div className="row wrap" style={{ gap: 8 }}>
              <button className="btn outline sm" onClick={() => void copy()}>
                <Copy size={16} /> Copy text
              </button>
              {shareable && (
                <button className="btn outline sm" onClick={() => void shareSheet({ ...post, text, hashtags }, xPremium)}>
                  <Share2 size={16} /> Share…
                </button>
              )}
              {post.state === 'pending' && (
                <button
                  className="btn ghost sm danger"
                  onClick={() => {
                    updatePost(post.id, { state: 'skipped' });
                    log({ kind: 'skipped', platform: post.platform, title: `You set aside your ${p.label} post`, ok: true });
                    go('content');
                  }}
                >
                  Set aside
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <dialog ref={dialog} className="sheet" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="col">
          <div className="row">
            <PlatformBadge platform={post.platform} size={32} />
            <div className="h2 grow">{p.label} is open in a new tab</div>
          </div>
          <ol className="howto">
            {steps?.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {steps?.warnings.map((w) => (
            <div key={w} className="small warn">
              {w}
            </div>
          ))}
          <p className="small muted">Come back and tell ORILOS once it’s posted.</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => dialog.current?.close()}>
              Got it
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function ImagePanel({
  post,
  busy,
  onFile,
  onGemini,
  onApp,
  appLabel,
}: {
  post: Post;
  busy: boolean;
  onFile: (f: Blob) => void;
  onGemini?: () => void;
  onApp: () => void;
  appLabel: string;
}) {
  const url = useBlobUrl(post.image?.blobId);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ratio = platform(post.platform).ratio;
  return (
    <div
      className="card col"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
        if (f) onFile(f);
      }}
    >
      <div className="row">
        <ImageIcon size={18} className="muted" />
        <strong className="grow">Image</strong>
        <span className="small muted">{ratio}</span>
      </div>
      {url ? (
        <>
          <img className="preview-img" src={url} alt={`Image for the ${post.platform} post`} />
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn outline sm" onClick={() => void getBlob(post.image!.blobId).then((b) => b && download(b, post.platform))}>
              <Download size={16} /> Save
            </button>
            <button className="btn outline sm" onClick={() => input.current?.click()}>
              <Upload size={16} /> Replace
            </button>
            <button className="btn ghost sm danger" onClick={() => (updatePost(post.id, { image: undefined }), void pruneBlobs())}>
              <Trash2 size={16} /> Remove
            </button>
          </div>
        </>
      ) : (
        <div className={`dropzone col ${over ? 'over' : ''}`} style={{ gap: 10 }}>
          <span className="small secondary">Drop, paste (Ctrl/⌘ + V) or upload an image</span>
          <button className="btn primary" disabled={busy} onClick={onApp}>
            <Sparkles size={18} /> Create in {appLabel}
          </button>
          {onGemini && (
            <button className="btn" disabled={busy} onClick={onGemini}>
              <Wand2 size={16} /> {busy ? 'Creating…' : 'Create with my Gemini key'}
            </button>
          )}
          <button className="btn outline" onClick={() => input.current?.click()}>
            <Upload size={16} /> Upload
          </button>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
