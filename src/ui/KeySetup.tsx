import { ChevronRight, ExternalLink, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { saveKey, looksLikeGeminiKey, removeKey } from '../lib/vault';
import { ai, friendly } from '../lib/worker';

/** "Get a free key" when empty, "Add key" once something is pasted. */
export function KeySetup({ onDone, hasKey }: { onDone?: () => void; hasKey?: boolean }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  async function add() {
    if (!looksLikeGeminiKey(value)) return setMsg({ ok: false, text: 'That doesn’t look like a Gemini key. It starts with “AIza”.' });
    setBusy(true);
    setMsg(undefined);
    await saveKey(value);
    try {
      const r = await ai.verify();
      setValue('');
      setMsg({ ok: true, text: `Connected · ${r.model}` });
      onDone?.();
    } catch (e) {
      await removeKey();
      setMsg({ ok: false, text: friendly(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col">
      <label className="field">
        <span>{hasKey ? 'Replace your Gemini key' : 'Your Gemini key'}</span>
        <input
          className="input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="AIza…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value && void add()}
        />
      </label>
      {value ? (
        <button className="btn primary" disabled={busy} onClick={() => void add()}>
          <KeyRound size={18} /> {busy ? 'Checking…' : 'Add key'}
        </button>
      ) : (
        <a className="btn primary" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
          Get a free key <ExternalLink size={16} />
        </a>
      )}
      {msg && (
        <div className={`small ${msg.ok ? 'ok' : 'bad'}`} role="status">
          {msg.text}
        </div>
      )}
      <details>
        <summary className="row small secondary" style={{ cursor: 'pointer', fontWeight: 600 }}>
          <ChevronRight size={16} /> How to get a key
        </summary>
        <ol className="howto small secondary" style={{ marginTop: 10 }}>
          <li>Open Google AI Studio (button above) and sign in with Google.</li>
          <li>Click “Create API key”.</li>
          <li>Copy the key — it starts with “AIza”.</li>
          <li>Paste it here and press “Add key”.</li>
        </ol>
        <p className="small muted">It’s free. The key is encrypted and stays in this browser; it is only ever sent to Google.</p>
      </details>
    </div>
  );
}
