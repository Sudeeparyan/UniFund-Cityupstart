import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createUniFundWeb } from '../lib/scene2.js';
import { AGENTS, USER_IDX, hydrateAgents, bfsPath, pathToEdgeIndices, setUserName } from '../lib/agentData.js';
import { runSimulate } from '../lib/api.js';
import { SIMULATION_SCENARIOS, PLATFORM_STATS } from '../data/knowledgeBase.js';

// ---------- Scene host ----------
function WebSceneHost({ onReady }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const inst = createUniFundWeb(ref.current);
    onReady && onReady(inst);
    return () => inst.destroy();
  }, []);
  return <div ref={ref} className="absolute inset-0" />;
}

// ---------- Top brand bar ----------
function TopBar({ phase, simRunning }) {
  return (
    <div className="absolute top-0 inset-x-0 z-30 px-10 pt-7 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-6 h-6 rounded-md" style={{
            background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)',
            filter: 'blur(0.2px)',
          }} />
          <div className="absolute inset-0 rounded-md" style={{ boxShadow: '0 0 24px rgba(123,97,255,0.55)' }} />
        </div>
        <div className="text-white text-[14px] tracking-[0.18em] font-medium">UNIFUND</div>
        <div className="text-white/30 text-[12px] tracking-[0.18em]">/ AGENTIC WEB</div>
      </div>
      {simRunning && (
        <div className="text-[11px] mono text-white/45 tracking-wider">
          {`RUNNING SIMULATION · PHASE 0${phase}/04`}
        </div>
      )}
    </div>
  );
}

// ---------- Animated counter ----------
function Counter({ value }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    let raf;
    const start = display, end = value, t0 = performance.now(), dur = 1200;
    function tick() {
      const t = Math.min((performance.now()-t0)/dur, 1);
      const eased = 1-Math.pow(1-t,3);
      setDisplay(start+(end-start)*eased);
      if (t<1) raf=requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{Math.round(display).toLocaleString()}</span>;
}

// ---------- Live counter for simulation phases ----------
function LiveCounter({ from, to, duration, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    function tick() {
      const t = Math.min((performance.now()-t0)/duration, 1);
      const eased = 1-Math.pow(1-t,2);
      setVal(Math.round(from+(to-from)*eased));
      if (t<1) raf=requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration]);
  return <span className="tabular-nums mono">{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ---------- Left panel ----------
function LeftPanel({ timeframe, overrideAgents }) {
  const numbers = useMemo(() => {
    if (timeframe==='past') return { agents:1129, skills:7344, sims:2680 };
    if (timeframe==='this') return { agents:1763, skills:11890, sims:5102 };
    return { agents:2847, skills:19422, sims:8210 };
  }, [timeframe]);

  const display = overrideAgents != null
    ? { agents: overrideAgents, skills: Math.round(overrideAgents * 6.8), sims: Math.round(overrideAgents * 2.88) }
    : numbers;

  return (
    <motion.div
      initial={{ opacity:0, x:-16 }}
      animate={{ opacity:1, x:0 }}
      transition={{ duration:1.0, delay:1.6, ease:[0.22,1,0.36,1] }}
      className="absolute left-10 top-1/2 -translate-y-1/2 z-20 pointer-events-auto"
      style={{ width:280 }}
    >
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">live view</div>
            <div className="mt-1 text-[22px] tracking-tight font-light text-white/95">
              Agentic <span className="agent-grad">Web</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="w-9 h-9 rounded-full relative">
              <span className="absolute inset-0 rounded-full" style={{
                background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)',
                filter: 'blur(2px)', opacity:0.7,
              }} />
              <span className="absolute inset-[3px] rounded-full bg-[#05070A]" />
              <span className="absolute inset-[10px] rounded-full bg-white/90" style={{ boxShadow:'0 0 12px rgba(255,255,255,0.9)' }} />
            </div>
          </div>
        </div>
        <div className="h-px my-5" style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)' }} />
        <div className="space-y-4">
          <StatRow label="Active Agents"    value={display.agents} tint="#4FC3F7" sub="connected"  />
          <StatRow label="Shared Skills"    value={display.skills} tint="#B388FF" sub="threads"    />
          <StatRow label="Simulations Run"  value={display.sims}   tint="#FFD54F" sub="lifetimes"  />
        </div>
        <div className="mt-6 flex items-center gap-2 text-[10px] tracking-[0.22em] text-white/35 uppercase">
          <span className="w-1 h-1 rounded-full bg-white/50" />
          you are <span className="text-[#FFD54F]/85">node #{USER_IDX}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] mono text-white/30">
        <span>◎ updated</span><span className="text-white/50">3s ago</span>
      </div>
    </motion.div>
  );
}

function StatRow({ label, value, tint, sub }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex items-center gap-3">
        <span className="w-1 h-1 rounded-full" style={{ background:tint, boxShadow:`0 0 8px ${tint}` }} />
        <div>
          <div className="text-[11px] text-white/55 tracking-wide">{label}</div>
          <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>
        </div>
      </div>
      <div className="text-[24px] font-light text-white/95 tracking-tight">
        <Counter value={value} />
      </div>
    </div>
  );
}

// ---------- Growth Timeline (replaces plain TimeframePanel) ----------
const TIMELINE_DATA = {
  past: { label:'Past Month', range:'Apr 2026', growth:[820,880,950,1020,1129], agents:1129, skills:7344, delta:'+56%' },
  this: { label:'This Month', range:'May 2026', growth:[1129,1280,1450,1620,1763], agents:1763, skills:11890, delta:'+56%' },
  all:  { label:'All Time',   range:'Jan → May 2026', growth:[12,144,380,820,1129,1763,2847], agents:2847, skills:19422, delta:'+23,608%' },
};

function sparkPath(data, w, h) {
  const min = Math.min(...data), max = Math.max(...data);
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function GrowthTimeline({ value, onChange }) {
  const opts = ['past', 'this', 'all'];
  return (
    <motion.div
      initial={{ opacity:0, x:16 }}
      animate={{ opacity:1, x:0 }}
      transition={{ duration:1.0, delay:1.8, ease:[0.22,1,0.36,1] }}
      className="absolute right-10 top-[14%] z-20 pointer-events-auto"
      style={{ width:220 }}
    >
      <div className="glass-card p-3 flex flex-col gap-1">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase">Network Growth</div>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400" style={{ boxShadow:'0 0 6px #34d399' }} />
            <span className="text-[9px] mono text-emerald-400/80">LIVE</span>
          </div>
        </div>
        {opts.map(id => {
          const d = TIMELINE_DATA[id];
          const sel = value === id;
          const pts = sparkPath(d.growth, 180, 32);
          return (
            <button key={id} onClick={() => onChange(id)}
              className="rounded-xl p-3 transition-all text-left"
              style={{
                background: sel ? 'linear-gradient(135deg,rgba(0,209,255,0.10),rgba(123,97,255,0.14))' : 'transparent',
                border: sel ? '1px solid rgba(123,97,255,0.38)' : '1px solid transparent',
              }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/80">{d.label}</span>
                <span className="text-[9px] mono text-white/35">{d.range}</span>
              </div>
              {sel && (
                <svg width="100%" viewBox="0 0 180 32" className="mb-1.5" style={{ overflow:'visible' }}>
                  <defs>
                    <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00D1FF" />
                      <stop offset="100%" stopColor="#7B61FF" />
                    </linearGradient>
                    <linearGradient id={`sf-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D1FF" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#00D1FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,32 ${pts} 180,32`}
                    fill={`url(#sf-${id})`}
                  />
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={`url(#sg-${id})`}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-light text-white/90 tabular-nums leading-none">
                    {d.agents.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-white/35">agents</span>
                </div>
                <span className="text-[9px] mono" style={{ color: '#4ade80' }}>{d.delta}</span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------- Timeline growth data ----------
const GROWTH_MILESTONES = [
  { day: 0,   nodes: 5,    date: 'Feb 1',  label: 'Genesis' },
  { day: 14,  nodes: 12,   date: 'Feb 15', label: null },
  { day: 28,  nodes: 50,   date: 'Mar 1',  label: '50 agents' },
  { day: 42,  nodes: 144,  date: 'Mar 15', label: null },
  { day: 59,  nodes: 380,  date: 'Apr 1',  label: '380 agents' },
  { day: 73,  nodes: 820,  date: 'Apr 15', label: null },
  { day: 89,  nodes: 1129, date: 'May 1',  label: '1K agents' },
  { day: 95,  nodes: 1763, date: 'May 7',  label: null },
  { day: 102, nodes: 2847, date: 'May 14', label: 'Today' },
];
const TOTAL_DAYS = 102;

function getNodeCountForDay(day) {
  const m = GROWTH_MILESTONES;
  for (let i = 0; i < m.length - 1; i++) {
    if (day >= m[i].day && day <= m[i + 1].day) {
      const t = (day - m[i].day) / (m[i + 1].day - m[i].day);
      return Math.round(m[i].nodes + (m[i + 1].nodes - m[i].nodes) * t);
    }
  }
  return 2847;
}

const MONTH_MARKS = [
  { day: 0, label: 'Feb' },
  { day: 28, label: 'Mar' },
  { day: 59, label: 'Apr' },
  { day: 89, label: 'May' },
];

// ---------- Timeline Scrubber ----------
function TimelineScrubber({ day, onChange, visible }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const nodeCount = getNodeCountForDay(day);

  function getDateLabel(d) {
    const m = GROWTH_MILESTONES;
    for (let i = 0; i < m.length - 1; i++) {
      if (d >= m[i].day && d <= m[i + 1].day) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        // Map day to actual date
        const startDate = new Date(2026, 1, 1); // Feb 1
        const cur = new Date(startDate.getTime() + d * 86400000);
        return `${months[cur.getMonth()]} ${cur.getDate()}`;
      }
    }
    return 'May 14';
  }

  function dayFromEvent(e) {
    if (!trackRef.current) return day;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * TOTAL_DAYS);
  }

  function onPointerDown(e) {
    e.preventDefault();
    setDragging(true);
    onChange(dayFromEvent(e));
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) { onChange(dayFromEvent(e)); }
    function onUp() { setDragging(false); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  const pct = day / TOTAL_DAYS;
  const dateLabel = getDateLabel(day);
  const isToday = day >= TOTAL_DAYS - 1;

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.0, delay: 2.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      style={{ width: 560 }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase">Network Growth Timeline</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] mono" style={{ color: '#4FC3F7' }}>
            {nodeCount.toLocaleString()} agents
          </span>
          <span className="text-[9px] mono text-white/30">·</span>
          <span className="text-[10px] mono text-white/45">{dateLabel}</span>
          {isToday && (
            <span className="text-[8px] mono px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-10 cursor-pointer select-none"
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
      >
        {/* Background track */}
        <div className="absolute inset-y-[17px] inset-x-0 h-[6px] rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />

        {/* Filled portion */}
        <div className="absolute inset-y-[17px] left-0 h-[6px] rounded-full"
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, #00D1FF, #7B61FF, #FF5FB6)',
            boxShadow: '0 0 12px rgba(123,97,255,0.5)',
          }} />

        {/* Month markers */}
        {MONTH_MARKS.map(m => (
          <div key={m.label}
            className="absolute flex flex-col items-center"
            style={{ left: `${(m.day / TOTAL_DAYS) * 100}%`, top: 0 }}>
            <div className="w-px h-2 mt-[14px]" style={{ background: 'rgba(255,255,255,0.18)' }} />
            <span className="text-[8px] mono text-white/25 mt-1">{m.label}</span>
          </div>
        ))}

        {/* Milestone dots */}
        {GROWTH_MILESTONES.filter(m => m.label).map(m => (
          <div key={m.day}
            className="absolute flex flex-col items-center"
            style={{ left: `${(m.day / TOTAL_DAYS) * 100}%`, top: '17px', transform: 'translate(-50%, 0)' }}>
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: day >= m.day ? '#7B61FF' : 'rgba(255,255,255,0.15)',
                boxShadow: day >= m.day ? '0 0 8px rgba(123,97,255,0.8)' : 'none',
                border: '1px solid rgba(255,255,255,0.25)',
                marginTop: '-1px',
                zIndex: 10,
              }}
            />
          </div>
        ))}

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
          style={{ left: `${pct * 100}%` }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #00D1FF, #7B61FF)',
              boxShadow: `0 0 ${dragging ? 20 : 12}px rgba(123,97,255,0.8), 0 0 4px rgba(0,209,255,0.6)`,
              border: '2px solid rgba(255,255,255,0.9)',
              transform: dragging ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Bottom date labels */}
      <div className="flex justify-between mt-1 px-0">
        <span className="text-[8px] mono text-white/25">Feb 1, 2026</span>
        <span className="text-[8px] mono text-white/25">May 14, 2026</span>
      </div>
    </motion.div>
  );
}

// ---------- Node Filter Panel ----------
const FILTER_OPTIONS = [
  { kind: 2, label: 'Expert',    color: '#B388FF' },
  { kind: 1, label: 'Community', color: '#4FC3F7' },
  { kind: 0, label: 'New',       color: '#E3F2FD' },
  { kind: 3, label: 'You',       color: '#FFD54F' },
];

function NodeFilterPanel({ filters, onChange }) {
  return (
    <motion.div
      initial={{ opacity:0, x:16 }}
      animate={{ opacity:1, x:0 }}
      transition={{ duration:1.0, delay:2.0, ease:[0.22,1,0.36,1] }}
      className="absolute right-10 z-20 pointer-events-auto"
      style={{ width:220, top:'calc(14% + 310px)' }}
    >
      <div className="glass-card p-3 flex flex-col gap-0.5">
        <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase px-1 pb-1.5">Filters</div>
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.kind}
            onClick={() => onChange(opt.kind, !filters[opt.kind])}
            className="flex items-center gap-2.5 px-3 py-2 rounded-full transition-all"
            style={{
              opacity: filters[opt.kind] ? 1 : 0.32,
              background: filters[opt.kind] ? 'rgba(255,255,255,0.05)' : 'transparent',
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
              background: opt.color,
              boxShadow: filters[opt.kind] ? `0 0 8px ${opt.color}88` : 'none',
            }} />
            <span className="text-[11px] text-white/70">{opt.label}</span>
            <span className="ml-auto text-[9px] mono text-white/25">{filters[opt.kind] ? 'ON' : 'OFF'}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ---------- Search Bar ----------
function SearchBar({ onSelect, onClear, value, onChange, visible }) {
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    return AGENTS
      .filter(a => a.name && (
        a.name.toLowerCase().includes(q) ||
        (a.fullName && a.fullName.toLowerCase().includes(q))
      ))
      .slice(0, 6);
  }, [value]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity:0, y:-8 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.8, delay:2.2, ease:[0.22,1,0.36,1] }}
      className="absolute top-[72px] left-1/2 -translate-x-1/2 z-[25] pointer-events-auto"
      style={{ width: 360 }}
    >
      <div className="glass-card flex items-center gap-2.5 px-4 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 opacity-40">
          <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
          <path d="m21 21-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search agents, names, or node #..."
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          className="bg-transparent text-white/85 text-[13px] flex-1 outline-none placeholder:text-white/30 tracking-tight"
        />
        {value && (
          <button onClick={() => { onChange(''); onClear(); }} className="text-white/35 hover:text-white/70 text-[16px] leading-none transition-colors">×</button>
        )}
      </div>

      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
            transition={{ duration:0.2 }}
            className="mt-1 glass-card overflow-hidden"
          >
            {results.map(agent => {
              const kindColor = agent.type === 2 ? '#B388FF' : agent.type === 1 ? '#4FC3F7' : agent.type === 3 ? '#FFD54F' : '#E3F2FD';
              return (
                <button
                  key={agent.idx}
                  onMouseDown={() => { onSelect(agent); setFocused(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <span className="text-base flex-shrink-0">{agent.icon || '◈'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-white/90 truncate">{agent.fullName || agent.name}</div>
                    <div className="text-[10px] text-white/38 mono">{agent.bio?.slice(0, 40) || ''}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: kindColor }} />
                    <span className="text-[9px] mono text-white/28">#{agent.idx}</span>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Node Labels overlay (top 30 notable agents) ----------
const NodeLabels = memo(function NodeLabels({ scene, visible }) {
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    if (!scene || !visible) { setLabels([]); return; }
    const timer = setInterval(() => {
      const out = [];
      for (let i = 0; i < 30; i++) {
        const p = scene.projectNodeToScreen(i);
        if (!p) continue;
        // Don't show labels that are off-screen
        if (p.x < 40 || p.x > window.innerWidth - 40) continue;
        if (p.y < 60 || p.y > window.innerHeight - 40) continue;
        const agent = AGENTS[i];
        out.push({ idx: i, x: p.x, y: p.y, agent });
      }
      setLabels(out);
    }, 150);
    return () => clearInterval(timer);
  }, [scene, visible]);

  return (
    <div className="absolute inset-0 z-[15] pointer-events-none">
      {labels.map(l => (
        <div
          key={l.idx}
          className="absolute flex flex-col items-center gap-0.5"
          style={{
            left: l.x,
            top: l.y,
            transform: 'translate(-50%, -130%)',
          }}
        >
          <span className="text-[13px] leading-none">{l.agent?.icon || '◈'}</span>
          <span
            className="text-[8px] tracking-wide mono"
            style={{ color: 'rgba(255,255,255,0.5)', textShadow: '0 0 8px rgba(0,0,0,0.9)' }}
          >
            {l.agent?.name || `#${l.idx}`}
          </span>
        </div>
      ))}
    </div>
  );
});

// ---------- Node detail tooltip ----------
function NodeDetailTooltip({ selectedNode, scene, onClose }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!selectedNode || !scene) { setPos(null); return; }
    const update = () => {
      const p = scene.projectNodeToScreen(selectedNode.idx);
      if (p) setPos(p);
    };
    update();
    const t = setInterval(update, 200);
    return () => clearInterval(t);
  }, [selectedNode, scene]);

  if (!selectedNode || !pos) return null;

  const { agent, path } = selectedNode;
  const kindColor = agent?.type === 2 ? '#B388FF' : agent?.type === 1 ? '#4FC3F7' : agent?.type === 3 ? '#FFD54F' : '#E3F2FD';
  const kindLabel = agent?.type === 2 ? 'Expert' : agent?.type === 1 ? 'Community' : agent?.type === 3 ? 'You' : 'New';

  // Position tooltip to the right of the node, or left if near right edge
  const side = pos.x > window.innerWidth * 0.65 ? -220 : 20;

  return (
    <motion.div
      key={selectedNode.idx}
      initial={{ opacity:0, scale:0.92 }}
      animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0 }}
      transition={{ duration:0.3 }}
      className="absolute z-[26] pointer-events-auto"
      style={{ left: pos.x + side, top: Math.min(pos.y - 40, window.innerHeight - 200), width: 200 }}
    >
      <div className="glass-card p-4 relative">
        <button
          onClick={onClose}
          className="absolute top-2.5 right-3 text-white/35 hover:text-white/70 text-[15px] transition-colors leading-none"
        >×</button>
        <div className="text-2xl mb-2">{agent?.icon || '◈'}</div>
        <div className="text-[14px] text-white/92 font-medium tracking-tight">{agent?.name || `Node #${selectedNode.idx}`}</div>
        <div className="flex items-center gap-1.5 mt-0.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: kindColor }} />
          <span className="text-[10px] mono text-white/40">{kindLabel}</span>
        </div>
        {agent?.bio && (
          <div className="text-[11px] text-white/55 leading-relaxed mb-2">{agent.bio}</div>
        )}
        {agent?.score && (
          <div className="flex items-center justify-between text-[10px] mono mb-2">
            <span className="text-white/35">Score</span>
            <span className="text-white/65">{agent.score.toLocaleString()}</span>
          </div>
        )}
        {path && (
          <div className="text-[10px] mono text-white/35 pt-2 border-t border-white/[0.07]">
            {path.length <= 1
              ? "This is you"
              : path.length === 2
              ? "Directly connected to you"
              : `${path.length - 1} hops from you`}
          </div>
        )}
        {!path && (
          <div className="text-[10px] mono text-white/25 pt-2 border-t border-white/[0.07]">
            No path found
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------- Leaderboard button ----------
function LeaderboardButton({ onOpen }) {
  return (
    <motion.button
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.9, delay:2.0 }}
      onClick={onOpen}
      whileHover={{ scale:1.05 }}
      whileTap={{ scale:0.96 }}
      className="absolute right-10 bottom-10 z-20 pointer-events-auto"
      title="Open leaderboard"
    >
      <div className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{
        background:'rgba(255,255,255,0.04)', backdropFilter:'blur(14px)',
        border:'1px solid rgba(255,255,255,0.12)',
        boxShadow:'0 10px 30px rgba(0,0,0,0.45),inset 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 1 1-12 0V4z" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow:'0 0 22px rgba(255,213,79,0.18)' }} />
      </div>
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-medium"
        style={{ background:'linear-gradient(135deg,#00D1FF,#7B61FF)', color:'white' }}>
        7
      </span>
    </motion.button>
  );
}

// ---------- Leaderboard modal ----------
function LeaderboardModal({ open, onClose }) {
  const rows = [
    { rank:1, name:'Sudeep Aryan · Founder',  score:14280, color:'#FFD54F', you:true },
    { rank:2, name:'Ramya · AI Explorer',     score:12500, color:'#FF5FB6' },
    { rank:3, name:'Saju · Builder',          score:11800, color:'#FF5FB6' },
    { rank:4, name:'Vinay · Student',         score:11200, color:'#FF5FB6' },
    { rank:5, name:'Masthan · Student',       score:10600, color:'#FF5FB6' },
    { rank:6, name:'Geethika · Rising Star',  score:10100, color:'#FF5FB6' },
    { rank:7, name:'ARIA · Career Switch',    score:9842,  color:'#B388FF' },
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="lb-bg"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
          style={{ background:'rgba(2,3,10,0.55)', backdropFilter:'blur(6px)' }}
          onClick={onClose}>
          <motion.div key="lb"
            initial={{ scale:0.94, opacity:0, y:12 }}
            animate={{ scale:1, opacity:1, y:0 }}
            exit={{ scale:0.96, opacity:0 }}
            transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
            className="glass-card p-7 w-[460px]"
            onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">Leaderboard</div>
                <div className="text-[22px] text-white/95 tracking-tight font-light mt-1">
                  Top <span className="agent-grad">agents</span> this month
                </div>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white text-[18px] leading-none">×</button>
            </div>
            <div className="h-px my-5" style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)' }} />
            <div className="space-y-2.5">
              {rows.map((r,idx)=>(
                <div key={idx} className="flex items-center justify-between text-[13px] py-1.5"
                  style={{
                    opacity: r.muted?0.4:1,
                    background: r.you?'linear-gradient(90deg,rgba(255,213,79,0.10),transparent)':'transparent',
                    borderRadius:8,
                    paddingLeft: r.you?10:0,
                    paddingRight: r.you?10:0,
                  }}>
                  <div className="flex items-center gap-4">
                    <span className="mono tabular-nums text-[12px] text-white/40 w-10 text-right">
                      {typeof r.rank==='number'?'#'+String(r.rank).padStart(2,'0'):r.rank}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background:r.color, boxShadow:`0 0 8px ${r.color}` }} />
                    <span style={{ color:r.you?'#FFD54F':'rgba(255,255,255,0.85)' }}>{r.name}</span>
                  </div>
                  <span className="mono tabular-nums text-white/60">
                    {r.score!==null?r.score.toLocaleString():''}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 text-[11px] text-white/40">
              Score reflects skills shared, lifetimes simulated, and clarity contributed back to the web.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Core hover tooltip ----------
function CoreHover({ hovered, scenePos, mousePos }) {
  return (
    <AnimatePresence>
      {hovered && (
        <>
          <motion.div key="cursor"
            initial={{ opacity:0, scale:0.6 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.25 }}
            className="absolute pointer-events-none z-30"
            style={{ left:mousePos.x, top:mousePos.y, transform:'translate(-50%,-50%)' }}>
            <div className="relative" style={{ width:64, height:64 }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1" strokeDasharray="2 6">
                  <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="6s" repeatCount="indefinite"/>
                </circle>
                <circle cx="32" cy="32" r="20" fill="none" stroke="rgba(123,97,255,0.6)" strokeWidth="1">
                  <animateTransform attributeName="transform" type="rotate" from="360 32 32" to="0 32 32" dur="4s" repeatCount="indefinite"/>
                </circle>
                <circle cx="32" cy="32" r="2" fill="white"/>
              </svg>
            </div>
          </motion.div>
          <motion.div key="tip"
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            transition={{ duration:0.4 }}
            className="absolute z-20 pointer-events-none"
            style={{ left:scenePos.x, top:scenePos.y+110, transform:'translate(-50%,0)' }}>
            <div className="px-5 py-3 glass-card flex items-center gap-3" style={{ borderRadius:999 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow:'0 0 10px white' }} />
              <span className="text-[13px] text-white/95 tracking-tight">Run Life Simulation</span>
              <span className="text-[10px] mono text-white/45">CLICK</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------- Core label ----------
function CoreLabel({ scenePos, dim, hidden }) {
  return (
    <motion.div
      animate={{ opacity: hidden ? 0 : (dim ? 0.3 : 1) }}
      transition={{ duration:0.6 }}
      className="absolute z-10 pointer-events-none"
      style={{ left:scenePos.x, top:scenePos.y+78, transform:'translate(-50%,0)', textAlign:'center' }}>
      <div className="text-[10px] tracking-[0.36em] text-white/55 uppercase">UniFund Core</div>
      <div className="text-[12px] mt-1 text-white/40 tracking-wide">Collective Intelligence Engine</div>
    </motion.div>
  );
}

// ---------- Navigation hint ----------
function NavHint({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="navhint"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:1.2, delay:0.5 }}
          className="absolute z-20 pointer-events-none"
          style={{ left:'50%', bottom:'12%', transform:'translateX(-50%)', textAlign:'center' }}
        >
          <div className="flex items-center gap-4 text-[10px] mono text-white/30 tracking-[0.25em] uppercase">
            <span>drag to orbit</span>
            <span className="opacity-40">·</span>
            <span>scroll to zoom</span>
            <span className="opacity-40">·</span>
            <span>click nodes to inspect</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Simulation HUD ----------
const PHASE_INFO = {
  1: {
    tag: 'PHASE 01', title: 'Signal broadcast',
    counter: { from:0, to:2847, duration:1400, suffix:' signals propagating…' },
  },
  2: {
    tag: 'PHASE 02', title: 'Collective processing',
    counter: { from:2, to:128, duration:1200, prefix:'Computing ', suffix:' possible timelines…' },
  },
  3: {
    tag: 'PHASE 03', title: 'Data convergence',
    counter: { from:128, to:3, duration:1000, prefix:'Converging to ', suffix:' optimal paths…' },
  },
  4: {
    tag: 'PHASE 04', title: 'Portal',
    sub: 'stepping into your timeline…',
  },
};

function SimulationHUD({ phase }) {
  const info = PHASE_INFO[phase];
  if (!info) return null;
  return (
    <motion.div
      key={phase}
      initial={{ opacity:0, y:14 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0 }}
      transition={{ duration:0.65 }}
      className="absolute z-30 pointer-events-none"
      style={{ left:'50%', bottom:'12%', transform:'translateX(-50%)', textAlign:'center' }}>
      <div className="text-[10px] mono tracking-[0.4em] uppercase text-white/45">{info.tag}</div>
      <div className="mt-2 text-[30px] tracking-tight font-light text-white/95"
        style={{ textShadow:'0 0 28px rgba(123,97,255,0.45),0 0 60px rgba(0,209,255,0.25)' }}>
        {info.title}
      </div>
      <div className="mt-1 text-[13px] text-white/55 h-5">
        {info.counter
          ? <LiveCounter key={phase} {...info.counter} />
          : info.sub
        }
      </div>
      <div className="mt-5 flex gap-2.5 justify-center">
        {[1,2,3,4].map((p) => (
          <span key={p} className="rounded-full transition-all duration-500"
            style={{
              width: p===phase?24:6, height:6,
              background: p<=phase
                ? 'linear-gradient(90deg,#00D1FF,#7B61FF,#FF5FB6)'
                : 'rgba(255,255,255,0.12)',
              boxShadow: p===phase?'0 0 12px rgba(123,97,255,0.6)':'none',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ---------- Hint banner ----------
function HintBanner({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="hint"
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
          transition={{ duration:0.8, delay:2.4 }}
          className="absolute z-20 pointer-events-none"
          style={{ left:'50%', bottom:'8%', transform:'translateX(-50%)', textAlign:'center' }}>
          <div className="text-[11px] tracking-[0.32em] uppercase text-white/40">
            click the core to run your life simulation
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Entry overlay ----------
function EntryOverlay({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="enter"
          initial={{ opacity:1 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:1.4 }}
          className="absolute z-40 inset-0 pointer-events-none flex items-center justify-center">
          <motion.div
            initial={{ opacity:0, scale:0.9 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:1.0 }}
            className="text-center">
            <motion.div
              initial={{ letterSpacing:'0.5em', opacity:0 }}
              animate={{ letterSpacing:'0.32em', opacity:1 }}
              transition={{ duration:1.6 }}
              className="text-[11px] uppercase text-white/50">
              entering unifund
            </motion.div>
            <motion.div
              initial={{ opacity:0, y:8 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:1.4, delay:0.6 }}
              className="mt-3 text-[42px] tracking-tight font-light text-white"
              style={{ textShadow:'0 0 28px rgba(123,97,255,0.45)' }}>
              The web is <span className="agent-grad">alive</span>.
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Portal whiteout ----------
function PortalOverlay({ t }) {
  if (t <= 0) return null;
  return (
    <div className="absolute inset-0 z-50 pointer-events-none" style={{
      background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${t}) 0%, rgba(255,255,255,${t*0.85}) 30%, rgba(255,255,255,${t*0.4}) 60%, rgba(255,255,255,0) 90%)`,
    }} />
  );
}

// ---------- Cinematic portal next screen ----------
function PortalNext({ visible, onReset, onTimeline, isAsk }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="next"
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          transition={{ duration:2.2, delay:0.2 }}
          className="absolute inset-0 z-[60] flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse 80% 65% at 50% 50%, rgba(8,10,20,0.0) 0%, rgba(5,7,15,0.98) 65%)',
          }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div style={{
              width:480, height:480,
              background: 'radial-gradient(circle, rgba(123,97,255,0.22) 0%, rgba(0,209,255,0.08) 45%, transparent 70%)',
              filter: 'blur(48px)',
            }} />
          </div>

          <div className="relative text-center max-w-xl px-8">
            <motion.div
              initial={{ opacity:0, letterSpacing:'0.55em' }}
              animate={{ opacity:0.6, letterSpacing:'0.38em' }}
              transition={{ duration:1.4, delay:0.5 }}
              className="text-[10px] uppercase mono text-white/60">
              {isAsk ? 'UniFund · Query Resolved' : 'UniFund · Processing Complete'}
            </motion.div>

            <motion.div
              initial={{ opacity:0, scale:0.91 }}
              animate={{ opacity:1, scale:1 }}
              transition={{ duration:1.7, delay:0.9, ease:[0.22,1,0.36,1] }}
              className="mt-5 text-[50px] leading-[1.05] tracking-tight font-light text-white"
              style={{ textShadow:'0 0 40px rgba(123,97,255,0.55),0 0 80px rgba(0,209,255,0.22)' }}>
              {isAsk
                ? <>Your <span className="agent-grad">answer</span><br/>is ready.</>
                : <>Your <span className="agent-grad">timeline</span><br/>is forming.</>}
            </motion.div>

            <motion.div
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:0.6, y:0 }}
              transition={{ duration:1.2, delay:1.6 }}
              className="mt-5 text-[14px] text-white/60 leading-relaxed">
              {isAsk
                ? <>2,847 lifetimes analyzed. Your personalised answer is ready.<br/>The collective has spoken.</>
                : <>2,847 lifetimes analyzed. 3 optimal paths identified.<br/>The collective has spoken.</>}
            </motion.div>

            <motion.div
              initial={{ scaleX:0 }}
              animate={{ scaleX:1 }}
              transition={{ duration:1.1, delay:2.0, ease:[0.22,1,0.36,1] }}
              className="mt-8 h-px origin-center"
              style={{ background:'linear-gradient(90deg,transparent,rgba(123,97,255,0.55),rgba(0,209,255,0.55),transparent)' }}
            />

            <motion.div
              initial={{ opacity:0, y:12 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.95, delay:2.4 }}
              className="mt-8 flex flex-col items-center gap-4">
              <motion.button
                whileHover={{ scale:1.04, boxShadow:'0 24px 60px rgba(0,209,255,0.32)' }}
                whileTap={{ scale:0.97 }}
                onClick={onTimeline}
                className="px-11 py-4 rounded-full text-[15px] font-semibold tracking-tight pointer-events-auto"
                style={{
                  background: 'linear-gradient(90deg,#00D1FF 0%,#7B61FF 50%,#FF5FB6 100%)',
                  color: '#060810',
                  boxShadow: '0 10px 40px rgba(123,97,255,0.38)',
                }}>
                {isAsk ? 'View Your Results →' : 'Continue to Your Timeline →'}
              </motion.button>
              <button
                onClick={onReset}
                className="text-[12px] text-white/35 hover:text-white/65 transition-colors pointer-events-auto tracking-wide">
                Return to the web
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Ask results page (shown after the core animation, not in the sidebar) ----------
function AskResultsPage({ query, result, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-[90] overflow-y-auto"
      style={{ background: '#02030A' }}
    >
      <div className="pointer-events-none fixed inset-0" style={{
        background:
          'radial-gradient(55% 40% at 20% 10%, rgba(123,97,255,0.09) 0%, transparent 65%),' +
          'radial-gradient(45% 35% at 80% 80%, rgba(0,209,255,0.06) 0%, transparent 60%)',
      }} />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-10 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-6 h-6 rounded-md" style={{ background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)', filter: 'blur(0.2px)' }} />
            <div className="absolute inset-0 rounded-md" style={{ boxShadow: '0 0 24px rgba(123,97,255,0.55)' }} />
          </div>
          <span className="text-[14px] tracking-[0.18em] font-medium text-white">UNIFUND</span>
          <span className="text-white/30 text-[12px] tracking-[0.18em]">/</span>
          <span className="text-[12px] tracking-[0.22em]" style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ASK RESULTS
          </span>
        </div>
        <button
          onClick={onBack}
          className="text-xs tracking-wider transition-colors flex items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
        >
          ← Return to the Web
        </button>
      </div>

      <div className="relative max-w-2xl mx-auto px-8 py-10">
        {/* Query echo */}
        <div className="text-center mb-8">
          <div className="text-[9px] tracking-[0.45em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            UniFund · Query Resolved · 2,847 Lifetimes Analyzed
          </div>
          <h1 className="text-[26px] leading-snug tracking-tight font-light" style={{ color: 'rgba(255,255,255,0.9)' }}>
            “{query}”
          </h1>
        </div>

        {/* Citation bar */}
        <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(0,209,255,0.06)', border: '1px solid rgba(0,209,255,0.18)' }}>
          <span className="text-[13px]">🌐</span>
          <span className="text-[11px] text-white/55">Based on</span>
          <span className="text-[11px] font-mono font-bold" style={{ color: '#00D1FF' }}>{result.basedOn}</span>
          <span className="text-[11px] text-white/35">· {result.confidence}% confidence</span>
        </div>

        {/* Main answer */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] tracking-[0.3em] text-white/28 uppercase mb-2">Simulation Result</div>
          <p className="text-[14px] text-white/80 leading-relaxed">{result.insight}</p>
        </div>

        {/* Paths */}
        {result.paths && result.paths.map((path, i) => (
          <motion.div key={path.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 + 0.15 }}
            className="rounded-2xl p-5 mb-4"
            style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${path.color || '#7B61FF'}25` }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{path.icon}</span>
                <span className="text-[14px] font-semibold text-white/85">{path.title}</span>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-mono font-bold" style={{ color: path.color || '#00D1FF' }}>{path.probability}%</div>
                <div className="text-[8px] text-white/25 font-mono">probability</div>
              </div>
            </div>
            <div className="h-1.5 rounded-full mb-2.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${path.probability}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 + 0.35 }}
                className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${path.color || '#7B61FF'}, #00D1FF)` }} />
            </div>
            <p className="text-[12px] text-white/55 mb-2.5">{path.description}</p>
            {path.companies && path.companies.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[8px] text-white/22 font-mono">COMPANIES:</span>
                {path.companies.map(c => (
                  <span key={c} className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
                    {c}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {/* Timing */}
        {result.timing && (
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(255,213,79,0.06)', border: '1px solid rgba(255,213,79,0.2)' }}>
            <div className="text-[8px] tracking-[0.3em] text-[#FFD54F]/60 uppercase mb-1.5">Optimal Timing</div>
            <div className="text-[12px] text-white/65">{result.timing}</div>
          </div>
        )}

        {/* DEMO: Company cards */}
        {result.isDemoResult && result.companyCards && (
          <div className="mb-5">
            <div className="text-[8px] tracking-[0.3em] text-white/25 uppercase mb-3">🏢 Top Companies Hiring AI/ML Interns</div>
            <div className="grid grid-cols-2 gap-3">
              {result.companyCards.map((co, i) => (
                <motion.div key={co.name}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 + 0.2 }}
                  className="rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[12px] font-semibold text-white/85">{co.name}</span>
                      <span className="text-[10px] text-white/35 ml-1.5">{co.city}</span>
                    </div>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)' }}>
                      {co.count} hired
                    </span>
                  </div>
                  <div className="h-1 rounded-full mb-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${co.bar}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06 + 0.4 }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #00D1FF, #7B61FF)' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {co.skills.map(s => (
                        <span key={s} className="text-[7px] px-1.5 py-0.5 rounded-full font-mono"
                          style={{ background: 'rgba(123,97,255,0.12)', color: '#B388FF', border: '1px solid rgba(123,97,255,0.22)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="text-[8px] font-mono text-white/25 flex-shrink-0 ml-2">~{co.response}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* DEMO: Top skills */}
        {result.isDemoResult && result.topSkills && (
          <div className="rounded-2xl p-5 mb-5"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-[8px] tracking-[0.3em] text-white/25 uppercase mb-3">🎯 Skills to Focus On</div>
            <div className="space-y-2.5">
              {result.topSkills.map((sk, i) => (
                <div key={sk.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono w-3 text-white/25">{i + 1}</span>
                  <span className="text-[11px] text-white/70 w-40 flex-shrink-0">{sk.name}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${sk.pct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.06 + 0.3 }}
                      className="h-full rounded-full" style={{ background: sk.color }} />
                  </div>
                  <span className="text-[9px] font-mono flex-shrink-0" style={{ color: sk.color }}>{sk.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar profiles */}
        {result.similarProfiles && result.similarProfiles.length > 0 && (
          <div className="rounded-2xl p-5 mb-5"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-[8px] tracking-[0.3em] text-white/25 uppercase mb-3">
              {result.isDemoResult ? '👥 Similar Student Paths' : 'Similar Profiles'}
            </div>
            <div className="space-y-3">
              {result.similarProfiles.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px]"
                    style={{ background: `rgba(${i===0?'0,209,255':i===1?'123,97,255':'255,95,182'},0.15)`, border: `1px solid rgba(${i===0?'0,209,255':i===1?'123,97,255':'255,95,182'},0.35)` }}>
                    {(p.name||'?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    {result.isDemoResult ? (
                      <>
                        <div className="text-[12px] text-white/80 font-medium">{p.name}</div>
                        <div className="text-[10px] text-white/35">{p.uni} · {p.company}</div>
                        <div className="text-[9px] font-mono text-white/25 mt-0.5">{p.key}</div>
                      </>
                    ) : (
                      <>
                        <span className="text-[12px] text-white/70">{p.name}</span>
                        <span className="text-[10px] text-white/30 ml-2">{p.path}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-mono flex-shrink-0" style={{ color: '#4ADE80' }}>
                    {result.isDemoResult ? `${p.match}% match` : p.outcome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEMO: Agent insight */}
        {result.isDemoResult && result.agentInsight && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-5 mb-6"
            style={{ background: 'rgba(255,213,79,0.06)', border: '1px solid rgba(255,213,79,0.22)' }}>
            <div className="text-[8px] tracking-[0.3em] text-[#FFD54F]/60 uppercase mb-2">⚡ Your Agent's Insight</div>
            <p className="text-[12px] text-white/65 leading-relaxed">{result.agentInsight}</p>
          </motion.div>
        )}

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 mt-8 mb-12">
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }} />
          <button onClick={onBack}
            className="px-6 py-3 rounded-full text-sm font-semibold tracking-tight transition-all"
            style={{ background: 'linear-gradient(90deg, #00D1FF, #7B61FF)', color: '#060810', boxShadow: '0 8px 32px rgba(123,97,255,0.28)' }}>
            Return to the Web →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Dust overlay ----------
function DustOverlay() {
  const dots = useMemo(() => {
    const out = [];
    for (let i=0; i<22; i++) {
      out.push({
        left:Math.random()*100, top:Math.random()*100,
        size:1+Math.random()*2, dur:18+Math.random()*22,
        delay:-Math.random()*22, opacity:0.12+Math.random()*0.25,
      });
    }
    return out;
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[5]">
      {dots.map((d,i)=>(
        <span key={i} className="absolute rounded-full" style={{
          left:`${d.left}%`, top:`${d.top}%`,
          width:d.size, height:d.size,
          background:'white', opacity:d.opacity, filter:'blur(0.3px)',
          animation:`drift ${d.dur}s ease-in-out ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ---------- Demo query & hardcoded result ----------

const DEMO_QUERY = "I am planning to apply for AI/ML internships in Ireland from next month onwards. When is the best time, which companies should I target, and what skills should I focus on?";

const DEMO_RESULT = {
  isDemoResult: true,
  basedOn: '312 student experiences',
  dataPoints: '1,847',
  confidence: 94,
  insight: 'Best months to apply: September–October (Jan start) and January–February (Summer start). Peak hiring: companies open roles 3–4 months before start. Avoid December and July–August.',
  timing: 'Apply window opens in ~6 weeks. Google and Microsoft recommended first — highest match for your profile.',
  paths: [
    {
      title: 'Early Bird (Sept–Oct)',
      probability: 78,
      color: '#00D1FF',
      icon: '📅',
      description: 'Apply Sept–Oct for January internship starts. Highest acceptance rates in this window.',
      companies: ['Google', 'Stripe', 'Microsoft'],
    },
    {
      title: 'Spring Window (Jan–Feb)',
      probability: 65,
      color: '#7B61FF',
      icon: '🌱',
      description: 'January–February window for Summer internships. Large headcount, high competition.',
      companies: ['Workday', 'Accenture AI', 'HubSpot'],
    },
  ],
  companyCards: [
    { name: 'Google Ireland',   city: 'Dublin', count: 23, response: '2 weeks',  skills: ['Python', 'TensorFlow', 'LLMs'],    bar: 100 },
    { name: 'Microsoft',        city: 'Dublin', count: 31, response: '3 weeks',  skills: ['Azure ML', 'Python', 'PyTorch'],   bar: 95  },
    { name: 'Accenture AI Hub', city: 'Dublin', count: 27, response: '1 week',   skills: ['NLP', 'Computer Vision'],          bar: 88  },
    { name: 'Stripe',           city: 'Dublin', count: 14, response: '10 days',  skills: ['Python', 'Statistical Modelling'], bar: 72  },
    { name: 'Workday',          city: 'Dublin', count: 18, response: '3 weeks',  skills: ['ML Pipelines', 'Data Eng'],        bar: 65  },
    { name: 'HubSpot',          city: 'Dublin', count: 9,  response: '2 weeks',  skills: ['Data Science', 'Python'],          bar: 42  },
  ],
  topSkills: [
    { name: 'Python',                pct: 94, color: '#00D1FF' },
    { name: 'ML Fundamentals',       pct: 87, color: '#7B61FF' },
    { name: 'LLMs / Prompt Eng.',    pct: 79, color: '#FF5FB6' },
    { name: 'SQL & Data Wrangling',  pct: 71, color: '#4ADE80' },
    { name: 'Git & Version Control', pct: 68, color: '#FFD54F' },
    { name: 'NLP / CV / MLOps',      pct: 55, color: '#B388FF' },
  ],
  similarProfiles: [
    { name: 'Aoife Murphy',  uni: 'NCI, 2024',  company: 'Google',    match: 89, key: 'offer in 12 days' },
    { name: 'Rahul Sharma',  uni: 'UCD, 2024',  company: 'Workday',   match: 76, key: 'top-10% Kaggle project' },
    { name: 'Sarah Chen',    uni: 'TCD, 2023',  company: 'Microsoft', match: 72, key: 'Azure certified' },
  ],
  agentInsight: "Based on your current profile (Agent Level: MAX), your skills in Python and ML already match 4 of the 6 top companies. Your strongest application window opens in 6 weeks. Recommend applying to Google and Microsoft first — highest match rate for your profile.",
};

// ---------- Simulator Panel ----------

// Builds the same result shape the panel used to render inline — now handed
// off to the parent so it can be shown on a dedicated page after the core animation.
function buildAskResult(queryText, isDemo) {
  if (isDemo || queryText.trim() === DEMO_QUERY.trim()) return DEMO_RESULT;

  const lower = queryText.toLowerCase();
  let scenario = SIMULATION_SCENARIOS.find(s =>
    s.query.toLowerCase().split(' ').some(w => lower.includes(w) && w.length > 4)
  ) || SIMULATION_SCENARIOS[Math.floor(Math.random() * SIMULATION_SCENARIOS.length)];
  const pathColors = ['#00D1FF', '#7B61FF', '#FF5FB6', '#4ADE80'];
  const pathIcons  = ['🏢', '🚀', '🌱', '🎓'];
  const r = scenario.result || {};
  return {
    basedOn: `${r.basedOn || '200'} agents`,
    confidence: Math.floor(72 + Math.random() * 20),
    insight: r.keyInsight || r.summary || 'The agentic web has identified key patterns in your query.',
    paths: (r.topPaths || []).map((p, i) => ({
      title: p.title,
      probability: Math.round((typeof p.probability === 'number' ? p.probability : 0.5) * 100),
      description: p.timeline || '',
      companies: p.companies || [],
      color: pathColors[i % pathColors.length],
      icon: pathIcons[i % pathIcons.length],
    })),
    timing: r.optimalTiming || null,
    similarProfiles: (r.similarProfiles || []).map(name => ({
      name: `Agent of ${name}`,
      path: 'Similar trajectory',
      outcome: `+${Math.floor(Math.random() * 50 + 20)}% match`,
    })),
  };
}

function SimulatorPanel({ open, onClose, userName, onAskComplete }) {
  const [input, setInput] = useState('');

  function handleDemoClick() {
    setInput(DEMO_QUERY);
  }

  function handleRun() {
    handleRunWithInput(input, false);
  }

  function handleRunWithInput(queryText, isDemo) {
    if (!queryText.trim()) return;
    const resultData = buildAskResult(queryText, isDemo);
    onAskComplete(resultData, queryText);
    setInput('');
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div key="sim-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 pointer-events-auto"
            style={{ background: 'rgba(2,3,10,0.55)', backdropFilter: 'blur(2px)' }} />

          {/* Panel */}
          <motion.div key="sim-panel"
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 z-50 pointer-events-auto flex flex-col"
            style={{ width: 420, background: 'rgba(5,8,18,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(28px)', overflowY: 'auto', scrollbarWidth: 'none' }}>

            {/* Header */}
            <div className="px-7 pt-8 pb-5 flex items-start justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] tracking-[0.35em] font-mono text-white/30 uppercase">Simulation Studio</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(0,209,255,0.12)', color: '#00D1FF', border: '1px solid rgba(0,209,255,0.25)' }}>BETA</span>
                </div>
                <div className="text-[18px] font-semibold text-white/90">Ask the Agentic Web</div>
                <div className="text-[11px] text-white/35 mt-1">Query {(PLATFORM_STATS.totalStudents).toLocaleString()} real agent experiences</div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/35 hover:text-white/65 hover:bg-white/06 transition-all mt-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-7 py-6 space-y-5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

              {/* Input area */}
              <div>
                {/* Demo CTA */}
                <motion.button
                  onClick={handleDemoClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full mb-4 py-3 px-4 rounded-xl text-left flex items-center gap-3"
                  animate={{ boxShadow: ['0 0 0px rgba(255,213,79,0)', '0 0 16px rgba(255,213,79,0.22)', '0 0 0px rgba(255,213,79,0)'] }}
                  transition={{ duration: 2.8, repeat: Infinity }}
                  style={{ background: 'rgba(255,213,79,0.08)', border: '1px solid rgba(255,213,79,0.28)', cursor: 'pointer' }}>
                  <span className="text-xl flex-shrink-0">🎯</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold" style={{ color: '#FFD54F' }}>Try a Sample Query</div>
                    <div className="text-[9px] text-white/40 mt-0.5 truncate">AI/ML internships in Ireland — instant results</div>
                  </div>
                  <span className="ml-auto text-[9px] font-mono text-white/30 flex-shrink-0">→</span>
                </motion.button>

                <label className="block text-[9px] tracking-[0.3em] uppercase text-white/30 mb-2">Describe your situation</label>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  placeholder="e.g. I'm a CS student graduating next year, considering ML research vs startup. Which path do most agents take?"
                  rows={4}
                  className="w-full text-[13px] text-white/80 resize-none outline-none placeholder:text-white/20 leading-relaxed rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box' }} />

                {/* Quick prompts */}
                <div className="mt-3">
                  <div className="text-[8px] tracking-[0.3em] text-white/22 uppercase mb-2">Quick scenarios</div>
                  <div className="flex flex-col gap-1.5">
                    {SIMULATION_SCENARIOS.map(s => (
                      <button key={s.id} onClick={() => setInput(s.query)}
                        className="text-left text-[10px] text-white/45 hover:text-white/70 px-3 py-2 rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        ↗ {s.query}
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button onClick={handleRun} disabled={!input.trim()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full mt-5 py-3 rounded-xl text-[13px] font-medium tracking-wide transition-all"
                  style={{
                    background: input.trim() ? 'linear-gradient(135deg, #00D1FF, #7B61FF)' : 'rgba(255,255,255,0.06)',
                    color: input.trim() ? '#020818' : 'rgba(255,255,255,0.22)',
                    cursor: input.trim() ? 'pointer' : 'default',
                  }}>
                  ⚡ Run Simulation
                </motion.button>
              </div>
            </div>

            {/* Stats footer */}
            <div className="px-7 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Agents', value: (PLATFORM_STATS.totalStudents || 2847).toLocaleString() },
                { label: 'Interactions', value: (PLATFORM_STATS.totalAgentInteractions || 184920).toLocaleString() },
                { label: 'A2A Links', value: (PLATFORM_STATS.activeA2ALinks || 892).toLocaleString() },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-[12px] font-mono text-white/55">{stat.value}</div>
                  <div className="text-[7px] text-white/20 tracking-widest uppercase mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------- Simulator toggle button ----------
function SimulatorButton({ onClick }) {
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
      className="absolute right-8 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-4 py-2.5 rounded-2xl pointer-events-auto"
      style={{
        background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.28)',
        backdropFilter: 'blur(16px)',
      }}
      animate={{ boxShadow: ['0 0 0px rgba(0,209,255,0)', '0 0 18px rgba(0,209,255,0.22)', '0 0 0px rgba(0,209,255,0)'] }}
      transition={{ duration: 3, repeat: Infinity }}>
      <span className="text-base">⚡</span>
      <span className="text-[11px] tracking-wide text-white/75">Simulate</span>
    </motion.button>
  );
}

// ---------- Main ----------
export default function AgenticWebPage({ userName = '', onNavigateCommunity, onNavigateChatbot, onNavigateTimeline, onNavigateRunway, onNavigateDeveloper }) {
  const [scene, setScene] = useState(null);
  const [timeframe, setTimeframe] = useState('all');
  const [lbOpen, setLbOpen] = useState(false);
  const [coreHovered, setCoreHovered] = useState(false);
  const [phase, setPhase] = useState(0);
  const [portalT, setPortalT] = useState(0);
  const [coreScreen, setCoreScreen] = useState({ x:0, y:0 });
  const [mousePos, setMousePos] = useState({ x:0, y:0 });
  const [entryVisible, setEntryVisible] = useState(true);
  const [hintVisible, setHintVisible] = useState(false);
  const [navHintVisible, setNavHintVisible] = useState(false);

  // Simulation result fetched concurrently during visual animation
  const [simData, setSimData] = useState(null);
  const [simKnowledgeCount, setSimKnowledgeCount] = useState(null);

  // Simulator panel
  const [simPanelOpen, setSimPanelOpen] = useState(false);
  // "Ask the Agentic Web" result — shown on its own page after the core animation
  const [askResult, setAskResult] = useState(null); // { query, data }
  const [showAskResults, setShowAskResults] = useState(false);

  // New state for interactive features
  const [graphData, setGraphData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [filters, setFilters] = useState({ 0:true, 1:true, 2:true, 3:true });

  // Timeline scrubber state
  const [timelineDay, setTimelineDay] = useState(TOTAL_DAYS);
  const timelineNodeCount = getNodeCountForDay(timelineDay);
  const isTimelineLive = timelineDay >= TOTAL_DAYS - 1;

  const simRunning = phase>0 && phase<=4;

  // Set user name in agent data
  useEffect(() => {
    setUserName(userName);
  }, [userName]);

  // Wire scene callbacks
  useEffect(() => {
    if (!scene) return;
    scene.onCoreHover((h) => setCoreHovered(h));
    scene.onCoreClick(() => {
      setHintVisible(false);
      setNavHintVisible(false);
      setSelectedNode(null);
      setAskResult(null);
      scene.clearHighlight();
      scene.runSimulation();
      // Kick off backend call concurrently with the visual animation (~5s)
      setSimData(null);
      setSimKnowledgeCount(null);
      runSimulate()
        .then(res => {
          setSimData(res.simulation);
          setSimKnowledgeCount(res.knowledge_count ?? null);
        })
        .catch(() => setSimData(null));
    });
    scene.onPhase((p) => setPhase(p));
    scene.onPortal((t) => setPortalT(t));
    scene.onNodeClick((idx) => handleNodeSelectFromScene(idx));
  }, [scene]);

  // Load graph data after scene ready
  useEffect(() => {
    if (!scene) return;
    const data = scene.getGraphData();
    hydrateAgents(data.nodeKinds);
    setGraphData(data);
    // Show nav hint briefly after entry
    const t = setTimeout(() => setNavHintVisible(true), 4500);
    const t2 = setTimeout(() => setNavHintVisible(false), 9000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [scene]);

  // Entry/hint timers
  useEffect(() => {
    const t1 = setTimeout(() => setEntryVisible(false), 2600);
    const t2 = setTimeout(() => setHintVisible(true), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Sync timeline day → scene node visibility
  useEffect(() => {
    if (!scene) return;
    scene.setVisibleNodeCount(timelineNodeCount);
  }, [scene, timelineNodeCount]);

  // Core screen position polling
  useEffect(() => {
    if (!scene) return;
    let raf;
    function tick() { setCoreScreen(scene.getCoreScreenPos()); raf = requestAnimationFrame(tick); }
    tick();
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  const onMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });

  function handleTimeframeChange(id) {
    setTimeframe(id);
    if (scene) scene.setTimeframe(id);
  }

  function handleFilterChange(kind, visible) {
    const next = { ...filters, [kind]: visible };
    setFilters(next);
    if (scene) scene.setFilters(next);
  }

  function handleNodeSelectFromScene(idx) {
    if (!graphData) return;
    const path = bfsPath(graphData.adjacency, USER_IDX, idx);
    const edgeIdxs = path ? pathToEdgeIndices(path, graphData.connEdgeMap) : [];
    scene.highlightNode(idx, edgeIdxs);
    scene.flyToNode(graphData.basePositions[idx]);
    setSelectedNode({ idx, agent: AGENTS[idx], path });
    setHintVisible(false);
  }

  function handleSearchSelect(agent) {
    if (!scene || !graphData) return;
    setSearchQuery(agent.name);
    handleNodeSelectFromScene(agent.idx);
  }

  function handleSearchClear() {
    setSearchQuery('');
    setSelectedNode(null);
    if (scene) scene.clearHighlight();
  }

  function resetAll() {
    if (!scene) return;
    scene.resetSimulation();
    scene.clearHighlight();
    setPhase(0); setPortalT(0); setHintVisible(true);
    setSelectedNode(null);
    setSimData(null);
    setSimKnowledgeCount(null);
    setAskResult(null);
    setShowAskResults(false);
  }

  // "Run Simulation" inside the Simulator Panel: close the panel, play the same
  // core-glow animation as a direct core click, and stash the answer for the
  // results page instead of rendering it inline in the sidebar.
  function handleAskComplete(resultData, queryText) {
    setSimPanelOpen(false);
    setHintVisible(false);
    setNavHintVisible(false);
    setSelectedNode(null);
    setAskResult({ query: queryText, data: resultData });
    if (scene) {
      scene.clearHighlight();
      scene.runSimulation();
    }
  }

  const showPortalCue  = portalT >= 0.95;
  const coreLabelDim   = coreHovered || simRunning;
  const coreLabelHidden= portalT > 0.5;
  const showUI         = !simRunning && portalT < 0.1;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#02030A] text-white"
      onMouseMove={onMouseMove}
      data-screen-label="01 Agentic Web">

      {/* Background tint */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background:
          'radial-gradient(60% 50% at 18% 20%, rgba(11,18,32,0.85), transparent 70%),' +
          'radial-gradient(55% 45% at 82% 82%, rgba(20,10,30,0.75), transparent 70%),' +
          '#02030A',
      }} />

      <WebSceneHost onReady={setScene} />
      <DustOverlay />

      <TopBar phase={phase} simRunning={simRunning} />

      <CoreLabel scenePos={coreScreen} dim={coreLabelDim} hidden={coreLabelHidden} />
      <CoreHover hovered={coreHovered && !simRunning} scenePos={coreScreen} mousePos={mousePos} />

      {/* Node labels overlay */}
      {scene && showUI && (
        <NodeLabels scene={scene} visible />
      )}

      {/* Main UI panels */}
      {showUI && (
        <>
          <LeftPanel timeframe={timeframe} overrideAgents={isTimelineLive ? null : timelineNodeCount} />
          <GrowthTimeline value={timeframe} onChange={handleTimeframeChange} />
          {graphData && (
            <NodeFilterPanel filters={filters} onChange={handleFilterChange} />
          )}
          <LeaderboardButton onOpen={() => setLbOpen(true)} />
          <TimelineScrubber day={timelineDay} onChange={setTimelineDay} visible />
        </>
      )}

      {/* Simulator panel + toggle */}
      {showUI && !simPanelOpen && (
        <SimulatorButton onClick={() => setSimPanelOpen(true)} />
      )}
      <SimulatorPanel open={simPanelOpen} onClose={() => setSimPanelOpen(false)} userName={userName} onAskComplete={handleAskComplete} />

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSelect={handleSearchSelect}
        onClear={handleSearchClear}
        visible={showUI && !!graphData}
      />

      {/* Node detail tooltip */}
      <AnimatePresence>
        {selectedNode && showUI && (
          <NodeDetailTooltip
            key={selectedNode.idx}
            selectedNode={selectedNode}
            scene={scene}
            onClose={() => {
              setSelectedNode(null);
              if (scene) scene.clearHighlight();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {simRunning && <SimulationHUD phase={phase} />}
      </AnimatePresence>

      <HintBanner visible={hintVisible && !simRunning && portalT < 0.1} />
      <NavHint visible={navHintVisible && !simRunning && portalT < 0.1} />

      <EntryOverlay visible={entryVisible} />
      <PortalOverlay t={portalT} />
      <PortalNext
        visible={showPortalCue && !showAskResults}
        onReset={resetAll}
        isAsk={!!askResult}
        onTimeline={() => {
          if (askResult) setShowAskResults(true);
          else onNavigateTimeline(simData, simKnowledgeCount);
        }}
      />

      <AnimatePresence>
        {showAskResults && askResult && (
          <AskResultsPage
            key="ask-results"
            query={askResult.query}
            result={askResult.data}
            onBack={resetAll}
          />
        )}
      </AnimatePresence>

      <LeaderboardModal open={lbOpen} onClose={() => setLbOpen(false)} />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-[6]" style={{
        background: 'radial-gradient(circle at 50% 55%, transparent 55%, rgba(2,3,10,0.55) 95%)',
      }} />

      {/* Noise grain */}
      <div className="pointer-events-none absolute inset-0 z-[7] opacity-[0.04]" style={{
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
      }} />

      {/* Bottom mono caption */}
      <div className="absolute left-10 bottom-8 z-20 flex items-center gap-3 text-[10px] mono text-white/30 tracking-[0.25em] uppercase pointer-events-none">
        <span>◎ webgl · 60fps</span>
        <span className="opacity-50">|</span>
        <span>{timelineNodeCount.toLocaleString()} nodes</span>
        <span className="opacity-50">|</span>
        <span>{Math.round(timelineNodeCount * 6.8).toLocaleString()} threads</span>
      </div>
    </div>
  );
}
