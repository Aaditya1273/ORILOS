import { ChevronRight, Clock, CircleAlert, CircleCheck, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { platformName } from '../lib/platforms';
import { ago } from '../lib/schedule';
import { useStore } from '../lib/store';
import type { Post, PostState } from '../lib/types';
import { PlatformBadge, Section, STATUS, useBlobUrl } from './kit';

const GROUPS: [string, PostState[]][] = [
  ['Needs your approval', ['pending']],
  ['Waiting for you to post', ['handedOff', 'approved']],
  ['Posted', ['posted']],
  ['Set aside', ['skipped']],
];

export function Content() {
  const posts = useStore((s) => s.posts);
  const groups = useMemo(() => GROUPS.map(([title, states]) => [title, posts.filter((p) => states.includes(p.state)), states.length > 1] as const).filter(([, ps]) => ps.length), [posts]);
  return (
    <div className="page narrow">
      <h1 className="h1">Content</h1>
      <p className="secondary">Everything ORILOS has written. Nothing goes out without you.</p>
      {groups.length ? (
        groups.map(([title, ps, mixed]) => (
          <Section key={title} title={`${title} · ${ps.length}`}>
            <div className="card flat list" style={{ padding: '4px 10px' }}>
              {ps.map((p) => (
                <PostRow key={p.id} post={p} showStatus={mixed} />
              ))}
            </div>
          </Section>
        ))
      ) : (
        <div className="card flat" style={{ marginTop: 24, textAlign: 'center', padding: 40 }}>
          <FileText size={28} className="muted" />
          <p className="secondary">No posts yet. Ask ORILOS for one from Home.</p>
        </div>
      )}
    </div>
  );
}

export function StatusLine({ state }: { state: PostState }) {
  const s = STATUS[state];
  const Icon = state === 'posted' ? CircleCheck : state === 'pending' ? CircleAlert : Clock;
  return (
    <span className={`row small ${s.cls}`} style={{ gap: 6, fontWeight: 600 }}>
      <Icon size={15} /> {s.label}
    </span>
  );
}

/** The status shows only where the section title doesn't already say it. */
function PostRow({ post, showStatus }: { post: Post; showStatus: boolean }) {
  const url = useBlobUrl(post.image?.blobId);
  return (
    <a className="postrow" href={`#/content/${post.id}`}>
      {url ? (
        <img className="thumb" src={url} alt="" />
      ) : (
        <span className="thumb">
          <PlatformBadge platform={post.platform} size={30} />
        </span>
      )}
      <span style={{ minWidth: 0 }} className="col">
        <span className="row" style={{ gap: 8 }}>
          <strong>{platformName(post.platform)}</strong>
          <span className="small muted">{ago(post.updatedAt)}</span>
        </span>
        <span className="secondary clamp3" style={{ marginTop: -8 }}>
          {post.text}
        </span>
        {showStatus && (
          <span style={{ marginTop: -6 }}>
            <StatusLine state={post.state} />
          </span>
        )}
      </span>
      <ChevronRight size={18} className="muted" />
    </a>
  );
}
