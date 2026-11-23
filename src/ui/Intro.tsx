import { useEffect, useState } from 'react';
import { helloDot, helloSize, helloStrokes } from './helloPath';

// Handwritten "orilos", once per browser session (like the app's cold start).
// Click to skip; skipped entirely with reduced motion.
const DURATIONS = [1.25, 0.7, 0.3];

export function Intro() {
  const [phase, setPhase] = useState<'on' | 'out' | 'gone'>(() => {
    try {
      if (sessionStorage.getItem('orilos.intro') || matchMedia('(prefers-reduced-motion: reduce)').matches) return 'gone';
      sessionStorage.setItem('orilos.intro', '1');
    } catch {
      return 'gone';
    }
    return 'on';
  });
  useEffect(() => {
    if (phase !== 'on') return;
    const total = DURATIONS.reduce((a, b) => a + b, 0) * 1000 + 700;
    const t1 = setTimeout(() => setPhase('out'), total);
    return () => clearTimeout(t1);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'out') return;
    const t = setTimeout(() => setPhase('gone'), 500);
    return () => clearTimeout(t);
  }, [phase]);
  if (phase === 'gone') return null;
  let delay = 0.15;
  return (
    <div className={`intro ${phase === 'out' ? 'out' : ''}`} onClick={() => setPhase('out')} aria-hidden>
      <svg viewBox={`0 0 ${helloSize[0]} ${helloSize[1]}`}>
        {helloStrokes.map((d, i) => {
          const style = { strokeDasharray: 1, strokeDashoffset: 1, animation: `draw ${DURATIONS[i]}s cubic-bezier(.45,.05,.4,1) ${delay}s forwards` };
          delay += DURATIONS[i];
          return <path key={i} d={d} pathLength={1} style={style} />;
        })}
        <circle cx={helloDot[0]} cy={helloDot[1]} r={1.9} fill="var(--text)" style={{ opacity: 0, animation: `dot .2s ease ${delay}s forwards` }} />
      </svg>
    </div>
  );
}
