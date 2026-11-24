// Paddle.js, loaded only when someone pays: it opens Paddle's checkout over the page.
interface PaddleJs {
  Environment: { set: (env: string) => void };
  Initialize: (o: { token: string }) => void;
  Checkout: { open: (o: Record<string, unknown>) => void };
}

let loaded: Promise<PaddleJs> | null = null;

export function loadPaddle(token: string, environment: string): Promise<PaddleJs> {
  loaded ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.onload = () => {
      const P = (window as unknown as { Paddle: PaddleJs }).Paddle;
      if (environment === 'sandbox') P.Environment.set('sandbox');
      P.Initialize({ token }); // also opens the checkout by itself when the page has ?_ptxn= (Paddle payment links)
      resolve(P);
    };
    s.onerror = () => {
      loaded = null;
      reject(new Error('The payment form did not load. Check your connection or turn off the ad blocker for this site.'));
    };
    document.head.append(s);
  });
  return loaded;
}

/** Pages that Paddle links to (?_ptxn=...): load Paddle.js so the checkout opens. */
export async function openPaymentLink(): Promise<void> {
  if (!new URLSearchParams(location.search).has('_ptxn')) return;
  const c = (await (await fetch('/api/billing/config')).json()) as { ready: boolean; token: string; environment: string };
  if (c.ready) await loadPaddle(c.token, c.environment);
}
