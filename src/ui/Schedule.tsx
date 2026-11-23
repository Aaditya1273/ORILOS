import { Bell, Globe, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { describe, friendlyWhen, nextRun } from '../lib/schedule';
import { setState, useStore } from '../lib/store';
import type { Schedule as Sched } from '../lib/types';
import { Section, Seg, Switch, toast } from './kit';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localInput(t: number) {
  const d = new Date(t - new Date(t).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export function Schedule() {
  const schedule = useStore((s) => s.schedule);
  const settings = useStore((s) => s.settings);
  const ws = useStore((s) => s.workspace);
  const focus = useStore((s) => s.focus);
  const [url, setUrl] = useState('');
  const next = nextRun(schedule, Date.now());

  // Changing the schedule restarts its clock, so a new time never fires a "missed" run.
  const save = (patch: Partial<Sched>) => setState((s) => ({ ...s, schedule: { ...s.schedule, ...patch, lastRunAt: Date.now() } }));

  async function toggleNotifications(on: boolean) {
    if (on && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      if ((await Notification.requestPermission()) !== 'granted') return toast('Notifications are blocked in this browser');
    }
    setState((s) => ({ ...s, settings: { ...s.settings, notifications: on } }));
  }

  function addWatch() {
    let u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) u = `https://${u}`;
    try {
      new URL(u);
    } catch {
      return toast('That isn’t a web address');
    }
    if (!ws || ws.watch.includes(u)) return setUrl('');
    if (ws.watch.length >= 20) return toast('Up to 20 pages');
    setState((s) => ({ ...s, workspace: s.workspace && { ...s.workspace, watch: [...s.workspace.watch, u] } }));
    setUrl('');
  }

  return (
    <div className="page narrow">
      <h1 className="h1">Schedule</h1>
      <p className="secondary">When ORILOS works on its own, and what it keeps an eye on.</p>

      <Section title="When">
        <div className="card col">
          <Seg
            label="How often"
            value={schedule.kind}
            options={[
              ['off', 'Off'],
              ['daily', 'Daily'],
              ['weekdays', 'Mon–Fri'],
              ['weekly', 'Weekly'],
              ['once', 'Once'],
            ]}
            onChange={(kind) => save({ kind, ...(kind === 'once' && !schedule.onceAt ? { onceAt: Date.now() + 3600_000 } : {}) })}
          />
          {schedule.kind === 'weekly' && (
            <Seg label="Day" value={String(schedule.day)} options={DAYS.map((d, i) => [String(i), d] as [string, string])} onChange={(d) => save({ day: Number(d) })} />
          )}
          {schedule.kind === 'once' ? (
            <label className="field">
              <span>Date and time</span>
              <input className="input" type="datetime-local" value={schedule.onceAt ? localInput(schedule.onceAt) : ''} min={localInput(Date.now())} onChange={(e) => save({ onceAt: new Date(e.target.value).getTime() })} />
            </label>
          ) : (
            schedule.kind !== 'off' && (
              <label className="field">
                <span>Time</span>
                <input className="input" type="time" value={schedule.time} onChange={(e) => save({ time: e.target.value || '09:00' })} style={{ maxWidth: 180 }} />
              </label>
            )
          )}
          <div className="secondary small">
            {describe(schedule)}
            {next && ` · next ${friendlyWhen(next)}`}
          </div>
          <div className="notice info small">Runs happen while ORILOS is open in a browser tab (it can stay in the background). If the browser was closed, a run missed in the last 12 hours happens when you come back.</div>
        </div>
      </Section>

      <Section title="Focus">
        <div className="card col">
          <label className="field">
            <span>What should ORILOS write about next? (optional)</span>
            <input className="input" value={focus} onChange={(e) => setState((s) => ({ ...s, focus: e.target.value }))} placeholder="Leave empty and ORILOS picks from your content pillars" />
          </label>
        </div>
      </Section>

      <Section title="Pages to watch">
        <div className="card col">
          <p className="small secondary" style={{ margin: 0 }}>
            On every run Gemini reads these pages for anything new worth posting about — your blog, changelog, a news page, a competitor’s pricing page.
          </p>
          {ws?.watch.map((u) => (
            <div key={u} className="row">
              <Globe size={16} className="muted" />
              <a className="grow small" href={u} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>
                {u}
              </a>
              <button
                className="btn ghost sm"
                aria-label={`Stop watching ${u}`}
                onClick={() => setState((s) => ({ ...s, workspace: s.workspace && { ...s.workspace, watch: s.workspace.watch.filter((x) => x !== u) } }))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              addWatch();
            }}
          >
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" aria-label="Page to watch" />
            <button className="btn" type="submit">
              <Plus size={16} /> Add
            </button>
          </form>
        </div>
      </Section>

      <Section title="Notifications">
        <div className="card row">
          <Bell size={18} className="muted" />
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Tell me when posts are ready</div>
            <div className="small muted">A browser notification when a run finishes while you’re in another tab.</div>
          </div>
          <Switch label="Notifications" checked={settings.notifications} onChange={(v) => void toggleNotifications(v)} />
        </div>
      </Section>
    </div>
  );
}
