// Plugin: ORILOS works inside the AI people already use. Pick the app, get its steps.
import { ExternalLink, Plug } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { APP_LOGOS, type AppLogo } from './logos';
import { Card, CopyLine, Head, type Ctx } from './ui';

const MCP_URL = `${location.origin}/mcp`;

type AppId = 'desktop' | 'web' | 'other';
type Mark = AppLogo | 'claudecode' | 'codex' | 'plug';
const APPS: { id: AppId; name: string; sub: string; marks: Mark[] }[] = [
  { id: 'desktop', name: 'Claude Code, Codex, Cursor and more', sub: 'Apps on your computer', marks: ['claudecode', 'codex', 'cursor', 'windsurf'] },
  { id: 'web', name: 'claude.ai', sub: 'Claude on the web and phone', marks: ['claude'] },
  { id: 'other', name: 'Any other MCP app', sub: 'Add it by hand', marks: ['mcp'] },
];
const DESKTOP_APPS: [string, Mark][] = [['Claude Code', 'claudecode'], ['Codex', 'codex'], ['Claude Desktop', 'claude'], ['Cursor', 'cursor'], ['Windsurf', 'windsurf']];

// Claude Code's pixel mascot, drawn on a 19 x 15 grid.
const CLAUDE_CODE_PIXELS = 'M2 0h15v6h2v3h-2v3h-1v3h-1v-3h-1v3h-1v-3h-5v3h-1v-3h-1v3h-1v-3h-1v-3h-2v-3h2z';

/** An app's logo: Simple Icons where it has one (Claude keeps its orange, the others follow the text colour);
 *  Claude Code's pixel mascot and the Codex cloud are drawn here. */
function Logo({ mark, size = 20 }: { mark: Mark; size?: number }) {
  if (mark === 'claudecode')
    return (
      <svg className="ws-logo" viewBox="0 0 19 15" width={size} height={size} aria-hidden="true" shapeRendering="crispEdges">
        <path d={CLAUDE_CODE_PIXELS} fill="#D97757" />
        <path d="M6 2h1v2H6zM12 2h1v2h-1z" fill="#000" />
      </svg>
    );
  if (mark === 'codex')
    return (
      <svg className="ws-logo" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="codex-g" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#8EA6FF" />
            <stop offset="0.55" stopColor="#5B5CF0" />
            <stop offset="1" stopColor="#3A2FD6" />
          </linearGradient>
        </defs>
        <g fill="url(#codex-g)">
          <circle cx="12" cy="12" r="8" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <circle key={a} cx={12 + 7.2 * Math.cos((a * Math.PI) / 180)} cy={12 + 7.2 * Math.sin((a * Math.PI) / 180)} r="3.6" />
          ))}
        </g>
        <path d="M7.4 8.6l3.4 3.4-3.4 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.4 15.6h4.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  if (mark === 'plug') return <Plug size={size} className="ws-logo" aria-hidden="true" />;
  const l = APP_LOGOS[mark];
  return (
    <svg className="ws-logo" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={l.d} fill={mark === 'claude' ? l.hex : 'currentColor'} />
    </svg>
  );
}
const CONFIG = `{
  "mcpServers": {
    "orilos": { "command": "uvx", "args": ["orilos-mcp"] }
  }
}`;

function Steps({ children }: { children: ReactNode }) {
  return <ol className="ac-fresh-steps ws-connect-steps">{children}</ol>;
}

function WebStatus() {
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
    <Card className={`ws-link-status${status?.online ? ' on' : ''}`}>
      <span className="ws-dot" aria-hidden="true" />
      <div>
        <b>{status === null ? 'Checking your computer…' : status.online ? 'Your computer is connected' : 'Your computer is not connected yet'}</b>
        <small>
          {status?.online
            ? `ORILOS ${status.version ?? ''} · ${status.tools} tools ready for claude.ai`
            : 'Run step 1 on the computer you clip on and keep it open. This updates by itself.'}
        </small>
      </div>
    </Card>
  );
}

export function ClaudeConnect({ go }: Ctx) {
  const [app, setApp] = useState<AppId>(() => (location.hash === '#web' ? 'web' : location.hash === '#other' ? 'other' : 'desktop'));
  const pick = (id: AppId) => {
    setApp(id);
    history.replaceState(null, '', `#${id}`);
  };
  const keysLink = (
    <a
      href="/account/keys"
      onClick={(e) => {
        e.preventDefault();
        go('/account/keys');
      }}
    >
      Keys
    </a>
  );

  return (
    <>
      <Head title="Plugin" sub="Add ORILOS to the AI you already use. Pick yours and follow the steps." />

      <div className="ws-apps" role="tablist" aria-label="Your AI app">
        {APPS.map((a) => (
          <button key={a.id} role="tab" aria-selected={app === a.id} className={app === a.id ? 'on' : ''} onClick={() => pick(a.id)}>
            <span className="ws-app-marks">
              {a.marks.map((m) => (
                <Logo key={m} mark={m} size={22} />
              ))}
            </span>
            <b>{a.name}</b>
            <small>{a.sub}</small>
          </button>
        ))}
      </div>

      {app === 'desktop' && (
        <>
          <Card title="One command connects all of them">
            <p className="ac-mute ws-app-list">
              {DESKTOP_APPS.map(([n, m]) => (
                <span key={n}>
                  <Logo mark={m} size={18} /> {n}
                </span>
              ))}
            </p>
            <Steps>
              <li>
                <b>Get uv (it runs Python apps on every OS; skip if you have it)</b>
                <CopyLine text='powershell -c "irm https://astral.sh/uv/install.ps1 | iex"' label="Copy Windows command" />
                <CopyLine text="curl -LsSf https://astral.sh/uv/install.sh | sh" label="Copy macOS and Linux command" />
                <span className="ac-fine">First line for Windows (PowerShell), second for macOS and Linux.</span>
              </li>
              <li>
                <b>Connect ORILOS to every AI app on this computer</b>
                <CopyLine text="uvx orilos-mcp install" />
                <span className="ac-fine">It finds the apps above that you have, connects each one, and adds the clipping skill to Claude Code and Codex.</span>
              </li>
              <li>
                <b>Restart the app and ask it to clip a link</b>
                <span className="ac-fine">For example: “Clip https://youtu.be/… into the 5 best shorts.” Check everything with <code>uvx orilos-mcp doctor</code>.</span>
              </li>
            </Steps>
          </Card>
          <Card title="On a paid plan?">
            <p className="ac-mute">
              Make a key in {keysLink} and run <code>uvx orilos-mcp activate &lt;key&gt;</code> once to unlock your plan's features on this computer.
            </p>
          </Card>
        </>
      )}

      {app === 'web' && (
        <>
          <WebStatus />
          <Card title="Use ORILOS in claude.ai, in 3 steps">
            <Steps>
              <li>
                <b>On your computer, start ORILOS Connect</b>
                <CopyLine text="uvx orilos-mcp connect" />
                <span className="ac-fine">
                  First time on this computer? Make a key in {keysLink} and run <code>uvx orilos-mcp activate &lt;key&gt;</code> once.
                </span>
              </li>
              <li>
                <b>In Claude, add ORILOS as a connector</b>
                <CopyLine text={MCP_URL} label="Copy address" />
                <span className="ac-fine">Settings, Connectors, Add custom connector. Name it ORILOS and paste the address.</span>
                <a className="ac-btn soft ws-open-claude" href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">
                  Open Claude connectors <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
              <li>
                <b>Click Connect, sign in to ORILOS and press Allow</b>
                <span className="ac-fine">Then ask Claude something like: “Clip https://youtu.be/… into the 5 best shorts.”</span>
              </li>
            </Steps>
          </Card>
          <Card title="Good to know">
            <ul className="ws-plan-steps ws-ticks">
              <li>The work still happens on your computer: claude.ai reaches it through your ORILOS account.</li>
              <li>Keep the computer awake with ORILOS Connect open while Claude works. Long renders keep going if you close the chat.</li>
              <li>Claude's Free plan allows one custom connector; paid plans allow more.</li>
              <li>Clips are saved on your computer; the Studio and file links open there.</li>
              <li>Disconnect Claude any time in Settings, Connected apps.</li>
            </ul>
          </Card>
        </>
      )}

      {app === 'other' && (
        <Card title="Add ORILOS to any MCP app">
          <Steps>
            <li>
              <b>Get uv, the same way as above</b>
              <span className="ac-fine">
                macOS and Linux: <code>curl -LsSf https://astral.sh/uv/install.sh | sh</code>. Windows: <code>powershell -c "irm https://astral.sh/uv/install.ps1 | iex"</code>.
              </span>
            </li>
            <li>
              <b>Add a local (stdio) MCP server that runs this command</b>
              <CopyLine text="uvx orilos-mcp" />
              <span className="ac-fine">Apps that use a JSON settings file take it like this:</span>
              <pre className="ws-config">{CONFIG}</pre>
            </li>
            <li>
              <b>Restart the app and ask it to clip a link</b>
              <span className="ac-fine">
                Long clipping tools need a generous timeout: allow at least 2 minutes per tool call. See the <a href="/docs">docs</a> for every tool.
              </span>
            </li>
          </Steps>
        </Card>
      )}
    </>
  );
}
