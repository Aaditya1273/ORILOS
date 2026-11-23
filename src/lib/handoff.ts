import { download, extFor, toPng } from './images';
import { platform, shareText } from './platforms';
import { getBlob, log, updatePost } from './store';
import type { Post } from './types';

// ORILOS never posts for you. It opens the platform's own composer with the
// text filled in and puts the image on the clipboard, so posting is one paste
// and one click — by you, on your account. Nothing here logs in, clicks
// "Post", or hides what it does.

/** The platform's own composer, pre-filled where the platform supports it. Mastodon has no single server, so nothing opens. */
export function composerUrl(post: Post, text: string): string | undefined {
  const t = encodeURIComponent(text);
  switch (post.platform) {
    case 'x':
      return `https://x.com/intent/post?text=${t}`;
    case 'linkedin':
      return `https://www.linkedin.com/feed/?shareActive=true&text=${t}`;
    case 'threads':
      return `https://www.threads.net/intent/post?text=${t}`;
    case 'bluesky':
      return `https://bsky.app/intent/compose?text=${t}`;
    case 'reddit': {
      // First line is the title; the rest is the body. The user picks the community.
      const [title, ...body] = text.split('\n');
      return `https://www.reddit.com/submit?type=TEXT&title=${encodeURIComponent(title.trim())}&text=${encodeURIComponent(body.join('\n').trim())}`;
    }
    case 'instagram':
      return 'https://www.instagram.com/';
    case 'facebook':
      return 'https://www.facebook.com/';
    case 'pinterest':
      return 'https://www.pinterest.com/pin-builder/';
    case 'mastodon':
      return undefined;
  }
}

export interface HandoffResult {
  /** What the user has to do in the composer. */
  steps: string[];
  warnings: string[];
}

async function copyText(t: string) {
  await navigator.clipboard.writeText(t);
}

async function copyImage(blob: Blob) {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(blob) })]);
}

/** Must be called from a click: the clipboard and the new tab need the user's gesture. */
export async function handOff(post: Post, xPremium: boolean): Promise<HandoffResult> {
  const p = platform(post.platform, xPremium);
  const { text, warnings } = shareText(p, post);
  const image = post.image ? await getBlob(post.image.blobId) : undefined;
  const steps: string[] = [];

  if (post.platform === 'instagram' || p.copiesText) {
    // No pre-filled web composer: the post goes on the clipboard instead.
    await copyText(text).catch(() => warnings.push('Could not copy the post — use “Copy text”.'));
    if (image) download(image, post.platform);
    const open =
      post.platform === 'mastodon'
        ? 'Open your Mastodon server and start a new post'
        : post.platform === 'pinterest'
          ? 'Pinterest’s Pin builder is open'
          : `Start a new post in ${p.label}`;
    steps.push(open, image ? 'Upload the image we just saved to Downloads' : 'Add an image if you like', 'Paste the post (Ctrl/⌘ + V), check it and post');
  } else {
    if (image) {
      try {
        await copyImage(image);
        steps.push('The text is already filled in', 'Paste (Ctrl/⌘ + V) to add the image', 'Check it and press Post');
      } catch {
        download(image, post.platform);
        steps.push('The text is already filled in', 'Add the image we saved to Downloads', 'Check it and press Post');
      }
    } else {
      steps.push('The text is already filled in', 'Check it and press Post');
    }
  }

  const url = composerUrl(post, text);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
  updatePost(post.id, { state: 'handedOff' });
  log({ kind: 'handoff', platform: post.platform, title: url ? `${p.label} composer opened` : `${p.label} post copied`, detail: 'Publication not verified', ok: true });
  return { steps, warnings };
}

/** Phones and some desktops: the system share sheet with the image attached. */
export async function canShareFiles(post: Post): Promise<boolean> {
  if (!post.image || !navigator.canShare) return false;
  const blob = await getBlob(post.image.blobId);
  return !!blob && navigator.canShare({ files: [new File([blob], `post.${extFor(blob.type)}`, { type: blob.type })] });
}

export async function shareSheet(post: Post, xPremium: boolean): Promise<boolean> {
  const { text } = shareText(platform(post.platform, xPremium), post);
  const blob = post.image ? await getBlob(post.image.blobId) : undefined;
  const files = blob ? [new File([blob], `orilos-${post.platform}.${extFor(blob.type)}`, { type: blob.type })] : [];
  // Some apps drop the text when an image is shared, so the caption also goes on the clipboard.
  await copyText(text).catch(() => undefined);
  try {
    await navigator.share({ text, ...(files.length ? { files } : {}) });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return false;
    throw e;
  }
  updatePost(post.id, { state: 'handedOff' });
  log({ kind: 'handoff', platform: post.platform, title: 'Share menu used', detail: 'Publication not verified', ok: true });
  return true;
}

export function confirmPosted(post: Post) {
  updatePost(post.id, { state: 'posted' });
  log({ kind: 'posted', platform: post.platform, title: `You posted on ${platform(post.platform).label}`, detail: 'You confirmed it', ok: true });
}
