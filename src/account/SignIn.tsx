import { useEffect } from 'react';
import { maybeMe, signInUrl } from './api';
import { Brand, GoogleMark } from './Chrome';
import { safeNext } from './next';
import './account.css';

const ERRORS: Record<string, string> = {
  cancelled: 'Sign-in was cancelled. Try again when you are ready.',
  expired: 'That sign-in link expired. Start again.',
  google: 'Google did not answer. Try again in a minute.',
  unverified: 'Your Google email is not verified yet.',
  unavailable: 'Sign-in opens very soon. You can already use ORILOS for free without an account.',
};

const WALL = ['r03', 'r07', 'r01', 'r11', 'r05', 'r14', 'r09', 'r02', 'r16'];

export function SignIn() {
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get('next'));
  const error = ERRORS[params.get('error') ?? ''];

  // Already signed in: go straight on.
  useEffect(() => {
    void maybeMe().then((me) => me && location.replace(next));
  }, [next]);

  return (
    <div className="ac ac-auth">
      <aside className="ac-auth-art" aria-hidden="true">
        <div className="ac-auth-wall">
          {WALL.map((r) => (
            <img key={r} src={`/reel/${r}.jpg`} alt="" loading="lazy" />
          ))}
        </div>
        <p className="ac-auth-quote">
          Long in.
          <br />
          <span className="pink">Short out.</span>
        </p>
      </aside>

      <main className="ac-auth-main">
        <Brand />
        <div className="ac-auth-box">
          <h1>Sign in to ORILOS</h1>
          <p className="ac-mute">Your licence keys, plan and billing. Clipping still runs on your own computer.</p>
          {error && (
            <p className="ac-alert" role="alert">
              {error}
            </p>
          )}
          <a className="ac-google" href={signInUrl(next)}>
            <GoogleMark />
            Continue with Google
          </a>
          <p className="ac-fine">
            New here? The same button makes your free account. By continuing you agree to the <a href="/docs/terms">terms</a> and{' '}
            <a href="/docs/privacy">privacy policy</a>.
          </p>
        </div>
        <p className="ac-fine">
          <a href="/pricing">See plans</a> · <a href="/docs">Read the docs</a>
        </p>
      </main>
    </div>
  );
}
