import { useStore } from '../lib/store';
import { ActivityRow } from './Home';

export function Activity() {
  const activity = useStore((s) => s.activity);
  return (
    <div className="page narrow">
      <h1 className="h1">Activity</h1>
      <p className="secondary">Everything ORILOS did, and everything you confirmed.</p>
      <div className="card flat list" style={{ padding: '4px 16px', marginTop: 24 }}>
        {activity.length ? activity.map((a) => <ActivityRow key={a.id} a={a} />) : <p className="muted">Nothing yet.</p>}
      </div>
    </div>
  );
}
