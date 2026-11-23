/** Where to go after sign-in: only paths on this site, never "//evil.com" or "/\evil.com". Shared by the browser and the API. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])[\x21-\x7e]*$/.test(next) ? next : '/account';
}
