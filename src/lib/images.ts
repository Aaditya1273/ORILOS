import { platform, platformName } from './platforms';
import type { Post, Settings } from './types';

/** The brief for one finished, professional image that fits the platform. */
export function imagePromptFor(p: Pick<Post, 'platform' | 'visualPrompt' | 'text'>): string {
  const r = platform(p.platform).ratio;
  const ratio = `${r} ${r === '1:1' ? 'square' : r === '16:9' ? 'landscape' : 'portrait'}`;
  const idea = p.visualPrompt.trim() || p.text.split('\n')[0];
  return (
    `Create one high-quality, professional image for a ${platformName(p.platform)} post (${ratio}).\n\n${idea}\n\n` +
    'Style: clean, modern, editorial; one clear focal point; strong contrast so it stands out in a feed. ' +
    // Seen on real runs: models misspell small labels and invent logos. The caption carries the words.
    'Absolutely no text: no words, letters, numbers, labels, captions, logos, watermarks or UI text anywhere in the image.'
  );
}

export const IMAGE_APPS: Record<Settings['imageApp'], { label: string; url: (prompt: string) => string; prefills: boolean }> = {
  // chatgpt.com fills the message box from ?q=.
  chatgpt: { label: 'ChatGPT', url: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`, prefills: true },
  gemini: { label: 'Gemini', url: () => 'https://gemini.google.com/app', prefills: false },
  copilot: { label: 'Copilot', url: () => 'https://copilot.microsoft.com/', prefills: false },
};

/** Downscale big uploads (max 2048 px) and re-encode; keeps PNG transparency. */
export async function prepareImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  if (scale === 1 && file.size < 4_000_000) return { blob: file, width, height };
  const c = new OffscreenCanvas(width, height);
  c.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return { blob: await c.convertToBlob({ type, quality: 0.92 }), width, height };
}

/** The clipboard only takes PNG images. */
export async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  return c.convertToBlob({ type: 'image/png' });
}

export function extFor(type: string) {
  return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
}

/** Save with the same naming as the Android app: ORILOS-<Platform>-<YYYY-MM-DD>.<ext>. */
export function download(blob: Blob, platform: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ORILOS-${platformName(platform)}-${new Date().toISOString().slice(0, 10)}.${extFor(blob.type)}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
