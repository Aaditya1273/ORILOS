import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import './styles.css';

// One bundle, split by path: the landing page at "/", the docs at "/docs", sign-in, pricing and the
// account at "/signin", "/pricing" and "/account", and the BYOK posting app at "/app". Each loads only its own code.
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
} else if (path === '/signin' || path === '/pricing' || path === '/oauth/consent' || path === '/account' || path.startsWith('/account/')) {
  // Sign-in, pricing and the workspace share a light/dark theme, applied before they draw.
  const { savedTheme } = await import('./account/ui');
  document.documentElement.dataset.theme = savedTheme();
  if (path === '/signin') {
    const { SignIn } = await import('./account/SignIn');
    mount(<SignIn />);
  } else if (path === '/oauth/consent') {
    const { Consent } = await import('./account/Consent');
    mount(<Consent />);
  } else if (path === '/pricing') {
    const { Pricing } = await import('./account/Pricing');
    mount(<Pricing />);
  } else {
    const { Account } = await import('./account/Account');
    mount(<Account />);
  }
} else if (path === '/docs' || path.startsWith('/docs/')) {
  const { Docs } = await import('./docs/Docs');
  mount(<Docs />);
} else {
  const { Landing } = await import('./landing/Landing');
  mount(<Landing />);
}
