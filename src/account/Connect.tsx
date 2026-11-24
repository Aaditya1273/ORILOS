// "Use in Claude": ORILOS Connect links claude.ai (web and phone) to ORILOS on the person's computer.
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from './api';
import { Card, CopyLine, Head, type Ctx } from './ui';

const MCP_URL = `${location.origin}/mcp`;

export function ClaudeConnect({ go }: Ctx) {
  const [status, setStatus] = useState<{ online: boolean; version: string | null; tools: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => api<{ online: boolean; version: string | null; tools: number }>('/connect/status').then((s) => alive && setStatus(s), () => {});
    void check();
    const t = window.setInterval(check, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <>
      <Head title="Use in Claude" sub="Clip from claude.ai on the web or your phone. ORILOS still does the work on your computer." />

      <Card className={`ws-link-status${status?.online ? ' on' : ''}`}>
        <span className="ws-dot" aria-hidden="true" />
        <div>
          <b>{status === null ? 'Checking your computer…' : status.online ? 'Your computer is connected' : 'Your computer is not connected yet'}</b>
          <small>
            {status?.online
              ? `ORILOS ${status.version ?? ''} · ${status.tools} tools ready for Claude`
              : 'Run step 1 on the computer you clip on and keep it open. This updates by itself.'}
          </small>
        </div>
      </Card>

      <Card title="Connect in 3 steps">
        <ol className="ac-fresh-steps ws-connect-steps">
          <li>
            <b>On your computer, start ORILOS Connect</b>
            <CopyLine text="uvx orilos-mcp connect" />
            <span className="ac-fine">
              First time on this computer? Make a key in{' '}
              <a
                href="/account/keys"
                onClick={(e) => {
                  e.preventDefault();
                  go('/account/keys');
                }}
              >
                Keys
              </a>{' '}
              and run <code>uvx orilos-mcp activate &lt;key&gt;</code> once.
            </span>
          </li>
          <li>
            <b>In Claude, add ORILOS as a connector</b>
            <CopyLine text={MCP_URL} label="Copy address" />
            <span className="ac-fine">
              Settings, Connectors, Add custom connector. Name it ORILOS and paste the address.
            </span>
            <a className="ac-btn soft ws-open-claude" href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">
              Open Claude connectors <ExternalLink size={14} aria-hidden="true" />
            </a>
          </li>
          <li>
            <b>Click Connect, sign in to ORILOS and press Allow</b>
            <span className="ac-fine">Then ask Claude something like: “Clip https://youtu.be/… into the 5 best shorts.”</span>
          </li>
        </ol>
      </Card>

      <Card title="Good to know">
        <ul className="ws-plan-steps ws-ticks">
          <li>Claude's Free plan allows one custom connector; paid plans allow more.</li>
          <li>Keep the computer awake with ORILOS Connect open while Claude works. Long renders keep going if you close the chat.</li>
          <li>Clips are saved on your computer; the Studio and file links open there.</li>
          <li>Claude Desktop, Claude Code, Codex and Cursor don't need this: <code>uvx orilos-mcp install</code> connects them directly.</li>
          <li>Disconnect Claude any time in Settings.</li>
        </ul>
      </Card>
    </>
  );
}
