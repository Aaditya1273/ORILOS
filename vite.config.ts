import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// A strict Content-Security-Policy for the built app only (Vite's dev server
// needs inline scripts). The page may talk to Gemini and nothing else.
function csp(): Plugin {
  const connect = "'self' https://generativelanguage.googleapis.com";
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images.unsplash.com",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  return {
    name: 'orilos-csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  };
}

export default defineConfig({
  plugins: [react(), csp()],
});
