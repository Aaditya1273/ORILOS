import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import './styles.css';

// Three sites in one bundle, split by path: the landing page at "/", the docs
// at "/docs", and the BYOK posting app at "/app". Each loads only its own code.
const path = location.pathname.replace(/\/+$/, '') || '/';

// The app used to live at "/" with hash routes (#/content/…): keep those links working.
if (path === '/' && location.hash.startsWith('#/')) location.replace(`/app${location.hash}`);

const root = createRoot(document.getElementById('root')!);
const mount = (node: ReactNode) => root.render(<StrictMode>{node}</StrictMode>);

if (path === '/app' || path.startsWith('/app/')) {
  const [{ App }, { loadState }, { startScheduler }] = await Promise.all([import('./App'), import('./lib/store'), import('./lib/worker')]);
  await loadState();
  startScheduler();
  // Ask the browser not to evict ORILOS's data under storage pressure.
  void navigator.storage?.persist?.();
  mount(<App />);
} else if (path === '/docs' || path.startsWith('/docs/')) {
  const { Docs } = await import('./docs/Docs');
  mount(<Docs />);
} else {
  const { Landing } = await import('./landing/Landing');
  mount(<Landing />);
}
