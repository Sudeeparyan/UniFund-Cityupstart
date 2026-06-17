import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoxelCharacter } from './VoxelCharacter';
import { STUDIO_AGENTS } from '../data/knowledgeBase';

// ── Agent Arena — a living space-station simulation ─────────────────────────
// Every STUDIO_AGENT has a docking pod orbiting the Command Core (the user's
// own agent). Crew wander their deck idly. When the chat/resume pipeline marks
// an agent 'active' (AgentStudioPage's `statuses` state), that crew member
// walks in from its pod toward the Core, "talks" via a speech bubble, fires a
// knowledge-transfer photon at the Core, then walks back to its pod. Same
// `statuses`/`logs` props the old ring visualization used — drop-in replacement.

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function truncate(s, n) { if (!s) return ''; return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
function colorFor(id) { return STUDIO_AGENTS.find(a => a.id === id)?.color || '#7B61FF'; }

function buildStationLayout(width, height) {
  const center = { x: width / 2, y: height * 0.52 };
  const rx = width * 0.43;
  const ry = height * 0.38;
  const homes = {};
  STUDIO_AGENTS.forEach((agent, i) => {
    const angle = (i / STUDIO_AGENTS.length) * Math.PI * 2 - Math.PI / 2 + (i % 2 === 0 ? 0.11 : -0.09);
    homes[agent.id] = {
      x: clamp(center.x + Math.cos(angle) * rx, 24, width - 24),
      y: clamp(center.y + Math.sin(angle) * ry, 28, height - 32),
    };
  });
  return { center, homes, rx, ry };
}

function meetingSpot(home, center, t = 0.32) {
  return { x: center.x + (home.x - center.x) * t, y: center.y + (home.y - center.y) * t };
}

const headerBtnStyle = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7,
  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 12, flexShrink: 0,
};

// ── Backdrop: starfield + nebula + station deck ring ───────────────────────────

function useStarfield(width, height, count) {
  return useMemo(() => {
    const stars = [];
    for (let i = 0; i < count; i++) {
      const seed = i * 137.51;
      stars.push({
        id: i,
        x: (Math.sin(seed) * 0.5 + 0.5) * width,
        y: (Math.cos(seed * 1.7) * 0.5 + 0.5) * height,
        size: 1 + ((i * 13) % 3) * 0.5,
        twinkle: i % 5 === 0,
        delay: (i % 7) * 0.35,
        opacity: 0.16 + ((i * 29) % 50) / 100,
      });
    }
    return stars;
  }, [width, height, count]);
}

function Starfield({ width, height, count }) {
  const stars = useStarfield(width, height, count);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {stars.map(s => (
        <div key={s.id} className={s.twinkle ? 'star-twinkle' : undefined}
          style={{ position: 'absolute', left: s.x, top: s.y, width: s.size, height: s.size, borderRadius: '50%', background: '#fff',
            opacity: s.twinkle ? undefined : s.opacity, animationDelay: s.twinkle ? `${s.delay}s` : undefined }} />
      ))}
    </div>
  );
}

function DeckRing({ center, rx, ry }) {
  return (
    <div style={{ position: 'absolute', left: center.x, top: center.y, width: rx * 2.08, height: ry * 2.16, transform: 'translate(-50%,-50%)',
      borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.07)', zIndex: 1, pointerEvents: 'none' }} />
  );
}

// ── Visual pieces ─────────────────────────────────────────────────────────────

function BeaconRing({ color, active }) {
  return (
    <motion.div animate={{ opacity: active ? 0.95 : 0.4, scale: active ? [1, 1.18, 1] : 1 }}
      transition={{ duration: 1.1, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
      style={{ position: 'absolute', bottom: -3, left: '50%', width: active ? 26 : 18, height: active ? 9 : 6,
        transform: 'translateX(-50%)', borderRadius: '50%', background: `radial-gradient(ellipse, ${color}90, transparent 72%)`, pointerEvents: 'none' }} />
  );
}

function CommandCore({ active }) {
  return (
    <>
      <motion.div animate={{ opacity: active ? [0.55, 0.9, 0.55] : 0.4, scale: active ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: -14, left: '50%', width: 96, height: 30, transform: 'translateX(-50%)', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,209,255,0.42), rgba(123,97,255,0.2) 55%, transparent 76%)', filter: 'blur(1px)', pointerEvents: 'none' }} />
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', bottom: -10, left: '50%', width: 80, height: 22, transform: 'translateX(-50%)', borderRadius: '50%',
          border: '1px dashed rgba(0,209,255,0.32)', pointerEvents: 'none' }} />
    </>
  );
}

function TransitLane({ from, to, active }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <div style={{ position: 'absolute', left: from.x, top: from.y, width: dist, height: active ? 2 : 1, transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`, overflow: 'visible', zIndex: 1,
      background: active ? 'linear-gradient(90deg, rgba(0,209,255,0.55), rgba(0,209,255,0.05))' : 'rgba(255,255,255,0.05)',
      boxShadow: active ? '0 0 8px rgba(0,209,255,0.55)' : 'none' }}>
      <motion.div animate={{ left: [0, dist] }} transition={{ duration: active ? 0.8 : 3.6, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', top: '50%', width: active ? 4 : 2, height: active ? 4 : 2, marginTop: active ? -2 : -1, marginLeft: active ? -2 : -1,
          borderRadius: '50%', background: active ? '#fff' : 'rgba(255,255,255,0.4)', boxShadow: active ? '0 0 6px #00D1FF' : 'none' }} />
    </div>
  );
}

function Pod({ agent, pos, active }) {
  return (
    <motion.div animate={{ opacity: active ? 1 : 0.62, boxShadow: active ? `0 0 18px ${agent.color}90` : `0 0 5px ${agent.color}25` }}
      transition={{ duration: 0.4 }}
      style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%,-30%)', zIndex: 2, pointerEvents: 'none',
        width: 24, height: 20, borderRadius: '8px 8px 11px 11px', background: `linear-gradient(180deg, ${agent.color}30, rgba(10,12,22,0.75))`,
        border: `1px solid ${agent.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5 }}>
      <div style={{ position: 'absolute', top: -4, left: '50%', width: 2, height: 5, background: agent.color, transform: 'translateX(-50%)', borderRadius: 1 }} />
      {agent.icon}
    </motion.div>
  );
}

function KnowledgePhoton({ orb }) {
  return (
    <motion.div initial={{ left: orb.x1, top: orb.y1, opacity: 1, scale: 0.5 }}
      animate={{ left: orb.x2, top: orb.y2, opacity: [1, 1, 0], scale: [0.5, 1, 0.3] }}
      exit={{ opacity: 0 }} transition={{ duration: 0.72, ease: 'easeIn' }}
      style={{ position: 'absolute', width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: '50%',
        background: orb.color, boxShadow: `0 0 12px 3px ${orb.color}`, zIndex: 9, pointerEvents: 'none' }} />
  );
}

function SpeechBubble({ agent, message }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.85 }}
      transition={{ duration: 0.22 }}
      style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, maxWidth: 136,
        padding: '5px 8px', borderRadius: 9, background: 'rgba(7,8,16,0.94)', border: `1px solid ${agent.color}55`,
        fontSize: 8.5, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)', textAlign: 'center', boxShadow: `0 4px 14px ${agent.color}30`, zIndex: 12 }}>
      <span style={{ color: agent.color, fontWeight: 700 }}>{agent.id}</span> {truncate(message, 58)}
      <div style={{ position: 'absolute', top: '100%', left: '50%', width: 0, height: 0, transform: 'translateX(-50%)',
        borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${agent.color}55` }} />
    </motion.div>
  );
}

function CrewSprite({ agent, state, message, size }) {
  if (!state) return null;
  const walking = state.mode === 'toHelp' || state.mode === 'toHome';
  const showBubble = state.mode === 'helping' && !!message;
  return (
    <motion.div initial={{ left: state.x, top: state.y }} animate={{ left: state.x, top: state.y }}
      transition={{ duration: state.duration, ease: 'easeInOut' }}
      style={{ position: 'absolute', transform: 'translate(-50%,-78%)', zIndex: state.mode === 'home' ? 4 : 7 }}>
      <AnimatePresence>{showBubble && <SpeechBubble agent={agent} message={message} />}</AnimatePresence>
      <div title={`${agent.id} · ${agent.role}`} style={{ position: 'relative' }}>
        <VoxelCharacter level="SMALL" size={size} idle={!walking} compact walking={walking} facing={state.facing} />
        <BeaconRing color={agent.color} active={state.mode === 'helping'} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 7.5, marginTop: 2, color: agent.color, fontWeight: 700, letterSpacing: '0.04em', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}>{agent.id}</div>
    </motion.div>
  );
}

const AMBIENT_LEVELS = ['BABY', 'SMALL'];

function DriftingCrew({ bounds, size, seed }) {
  const [pos, setPos] = useState(() => ({
    x: clamp((Math.sin(seed * 12.9) * 0.5 + 0.5) * bounds.w, 16, bounds.w - 16),
    y: clamp(bounds.h * 0.58 + Math.cos(seed * 7.3) * bounds.h * 0.22, bounds.h * 0.4, bounds.h - 14),
    facing: 1, duration: 2,
  }));
  useEffect(() => {
    let alive = true;
    let t;
    const step = () => {
      if (!alive) return;
      setPos(p => {
        const nx = clamp(p.x + (Math.random() - 0.5) * 70, 16, bounds.w - 16);
        const ny = clamp(p.y + (Math.random() - 0.5) * 36, bounds.h * 0.4, bounds.h - 14);
        return { x: nx, y: ny, facing: nx >= p.x ? 1 : -1, duration: 1.7 + Math.random() * 1.1 };
      });
      t = setTimeout(step, 2800 + Math.random() * 3200);
    };
    t = setTimeout(step, 400 + seed * 900);
    return () => { alive = false; clearTimeout(t); };
  }, [bounds.w, bounds.h, seed]);
  return (
    <motion.div initial={{ left: pos.x, top: pos.y }} animate={{ left: pos.x, top: pos.y }} transition={{ duration: pos.duration, ease: 'easeInOut' }}
      style={{ position: 'absolute', transform: 'translate(-50%,-70%)', opacity: 0.45, zIndex: 2, pointerEvents: 'none' }}>
      <VoxelCharacter level={AMBIENT_LEVELS[seed % 2]} size={size} idle walking compact facing={pos.facing} />
    </motion.div>
  );
}

function StoryTicker({ logs, lines, userName }) {
  const recent = logs.slice(-lines);
  return (
    <div style={{ position: 'absolute', left: 10, right: 10, bottom: 8, zIndex: 11 }}>
      {recent.length === 0 ? (
        <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          Ask {userName ? `${userName}'s` : 'your'} agent something — watch the station crew mobilize.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <AnimatePresence initial={false}>
            {recent.map((l, i) => (
              <motion.div key={`${logs.length}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(5,6,12,0.74)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(6px)' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: colorFor(l.from_agent) }}>{l.from_agent}</span>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>→</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: l.to_agent === 'USER' ? '#4ADE80' : colorFor(l.to_agent) }}>{l.to_agent}</span>
                <p style={{ margin: '2px 0 0', fontSize: 9.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.4 }}>{l.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ArenaHeader({ arenaActive, fullscreen, onExpand }) {
  return (
    <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'linear-gradient(135deg, #00D1FF, #7B61FF)', boxShadow: '0 0 6px #00D1FF' }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>AGENT ARENA</span>
        {arenaActive && (
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#4ADE80', fontFamily: 'monospace', marginLeft: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} /> LIVE
          </motion.div>
        )}
      </div>
      {/* In fullscreen, the overlay's own header already provides a close affordance (+ Esc) — avoid a second redundant ✕ here. */}
      {!fullscreen && onExpand && <button onClick={onExpand} style={headerBtnStyle} title="Fullscreen space arena">⤢</button>}
    </div>
  );
}

// ── Main scene ────────────────────────────────────────────────────────────────

export function SpaceArena({ statuses = {}, logs = [], coreLevel = 'BABY', userName, width = 280, height = 300, fullscreen = false, onExpand }) {
  const { center, homes, rx, ry } = useMemo(() => buildStationLayout(width, height), [width, height]);

  const [agentsState, setAgentsState] = useState(() => {
    const init = {};
    STUDIO_AGENTS.forEach(a => { const h = homes[a.id]; init[a.id] = { x: h.x, y: h.y, facing: 1, duration: 0, mode: 'home' }; });
    return init;
  });
  const [orbs, setOrbs] = useState([]);

  const modeRef = useRef({});
  const posRef = useRef({});
  const prevStatusesRef = useRef({});
  const agentTimers = useRef({});
  const orbIdRef = useRef(0);

  useEffect(() => {
    const m = {};
    Object.entries(agentsState).forEach(([id, v]) => { m[id] = v.mode; });
    modeRef.current = m;
    posRef.current = agentsState;
  }, [agentsState]);

  const spawnOrb = useCallback((x1, y1, x2, y2, color) => {
    const id = ++orbIdRef.current;
    setOrbs(prev => [...prev, { id, x1, y1, x2, y2, color }]);
    setTimeout(() => setOrbs(prev => prev.filter(o => o.id !== id)), 760);
  }, []);

  // Idle wander — each crew member nudges to a new nearby spot every few
  // seconds while at home; paused automatically (via modeRef) while helping.
  useEffect(() => {
    let alive = true;
    const timers = [];
    STUDIO_AGENTS.forEach((agent, i) => {
      const home = homes[agent.id];
      const wander = () => {
        if (!alive) return;
        if ((modeRef.current[agent.id] || 'home') === 'home') {
          setAgentsState(prev => {
            const cur = prev[agent.id];
            const nx = clamp(home.x + (Math.random() - 0.5) * 32, 18, width - 18);
            const ny = clamp(home.y + (Math.random() - 0.5) * 22, 22, height - 18);
            return { ...prev, [agent.id]: { ...cur, x: nx, y: ny, facing: nx >= cur.x ? 1 : -1, duration: 1.3 + Math.random() * 0.9 } };
          });
        }
        timers[i] = setTimeout(wander, 3200 + Math.random() * 3600);
      };
      timers[i] = setTimeout(wander, 500 + i * 260);
    });
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [homes, width, height]);

  // Walk-to-help choreography, driven by the `statuses` prop from the pipeline.
  useEffect(() => {
    const prev = prevStatusesRef.current;
    STUDIO_AGENTS.forEach(agent => {
      const id = agent.id;
      const prevStatus = prev[id] || 'idle';
      const curStatus = statuses[id] || 'idle';
      if (prevStatus === curStatus) return;
      const home = homes[id];
      const cur = posRef.current[id] || home;
      if (agentTimers.current[id]) { clearTimeout(agentTimers.current[id]); delete agentTimers.current[id]; }

      if (curStatus === 'active') {
        const spot = meetingSpot(home, center);
        const travelDur = 0.85 + Math.random() * 0.3;
        setAgentsState(prevS => ({ ...prevS, [id]: { ...prevS[id], x: spot.x, y: spot.y, facing: spot.x >= cur.x ? 1 : -1, duration: travelDur, mode: 'toHelp' } }));
        agentTimers.current[id] = setTimeout(() => {
          setAgentsState(prevS => ({ ...prevS, [id]: { ...prevS[id], mode: 'helping' } }));
        }, travelDur * 1000);
      } else if (curStatus === 'done') {
        spawnOrb(cur.x, cur.y, center.x, center.y, agent.color);
        agentTimers.current[id] = setTimeout(() => {
          const c2 = posRef.current[id] || home;
          const travelDur = 0.95 + Math.random() * 0.3;
          setAgentsState(prevS => ({ ...prevS, [id]: { ...prevS[id], x: home.x, y: home.y, facing: home.x >= c2.x ? 1 : -1, duration: travelDur, mode: 'toHome' } }));
          agentTimers.current[id] = setTimeout(() => {
            setAgentsState(prevS => ({ ...prevS, [id]: { ...prevS[id], mode: 'home' } }));
          }, travelDur * 1000);
        }, 1050);
      } else if (curStatus === 'idle' && cur.mode !== 'home') {
        const travelDur = 0.9;
        setAgentsState(prevS => ({ ...prevS, [id]: { ...prevS[id], x: home.x, y: home.y, facing: home.x >= cur.x ? 1 : -1, duration: travelDur, mode: 'toHome' } }));
        agentTimers.current[id] = setTimeout(() => {
          setAgentsState(prevS => ({ ...prevS, [id]: { ...prevS[id], mode: 'home' } }));
        }, travelDur * 1000);
      }
    });
    prevStatusesRef.current = statuses;
  }, [statuses, homes, center, spawnOrb]);

  useEffect(() => () => { Object.values(agentTimers.current).forEach(clearTimeout); }, []);

  const lastMessageFor = useCallback((id) => {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].from_agent === id || logs[i].to_agent === id) return logs[i].message;
    }
    return null;
  }, [logs]);

  const arenaActive = Object.values(statuses).some(s => s === 'active');
  const spriteSize = fullscreen ? 44 : 28;
  const coreSize = fullscreen ? 96 : 58;
  const ambientCount = fullscreen ? 7 : 0;
  const starCount = fullscreen ? 90 : 46;

  return (
    <div style={{
      position: 'relative', width, height, borderRadius: fullscreen ? 22 : 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      background: `
        radial-gradient(46% 40% at 50% 54%, rgba(0,209,255,0.10), transparent 70%),
        radial-gradient(70% 60% at 18% 14%, rgba(255,95,182,0.06), transparent 60%),
        radial-gradient(70% 60% at 86% 88%, rgba(123,97,255,0.08), transparent 65%),
        radial-gradient(120% 100% at 50% 100%, rgba(0,0,0,0.55), transparent 60%),
        linear-gradient(180deg, #060710, #03040a)`,
    }}>
      <Starfield width={width} height={height} count={starCount} />
      <DeckRing center={center} rx={rx} ry={ry} />

      <ArenaHeader arenaActive={arenaActive} fullscreen={fullscreen} onExpand={onExpand} />

      {STUDIO_AGENTS.map(agent => <TransitLane key={`p-${agent.id}`} from={homes[agent.id]} to={center} active={statuses[agent.id] === 'active'} />)}
      {STUDIO_AGENTS.map(agent => <Pod key={`h-${agent.id}`} agent={agent} pos={homes[agent.id]} active={statuses[agent.id] === 'active'} />)}

      {Array.from({ length: ambientCount }).map((_, i) => (
        <DriftingCrew key={`amb-${i}`} bounds={{ w: width, h: height }} size={26} seed={i + 1} />
      ))}

      <AnimatePresence>{orbs.map(o => <KnowledgePhoton key={o.id} orb={o} />)}</AnimatePresence>

      {STUDIO_AGENTS.map(agent => (
        <CrewSprite key={agent.id} agent={agent} state={agentsState[agent.id]} message={lastMessageFor(agent.id)} size={spriteSize} />
      ))}

      <div style={{ position: 'absolute', left: center.x, top: center.y, transform: 'translate(-50%,-58%)', zIndex: 6 }}>
        <CommandCore active={arenaActive} />
        <VoxelCharacter level={coreLevel} size={coreSize} idle compact={!fullscreen} />
      </div>

      <StoryTicker logs={logs} lines={fullscreen ? 3 : 1} userName={userName} />
    </div>
  );
}

// ── Fullscreen overlay ───────────────────────────────────────────────────────

export function ArenaFullscreenOverlay({ statuses, logs, coreLevel, userName, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const w = typeof window !== 'undefined' ? Math.min(1180, window.innerWidth - 80) : 1000;
  const h = typeof window !== 'undefined' ? Math.min(660, window.innerHeight - 200) : 600;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(2,3,10,0.97)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 32px' }}>
      <div style={{ width: w, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Agent Arena · {userName ? `${userName}'s` : 'Your'} Space Station</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Watch your network warp in and help your agent, in real time</div>
        </div>
        <button onClick={onClose} style={{ ...headerBtnStyle, width: 32, height: 32, fontSize: 15 }} title="Close (Esc)">✕</button>
      </div>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <SpaceArena statuses={statuses} logs={logs} coreLevel={coreLevel} userName={userName} width={w} height={h} fullscreen />
      </motion.div>
      <p style={{ marginTop: 14, fontSize: 10.5, color: 'rgba(255,255,255,0.25)' }}>Press <b style={{ color: 'rgba(255,255,255,0.4)' }}>Esc</b> to exit fullscreen</p>
    </motion.div>
  );
}
