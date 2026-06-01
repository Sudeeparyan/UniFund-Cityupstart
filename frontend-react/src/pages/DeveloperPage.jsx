import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, BarChart3, Users, Sparkles, SlidersHorizontal,
  MessageSquare, FlaskConical, LogOut, Bell, Search,
} from 'lucide-react';
import {
  getDevLLMStats, getDevLLMRecent, getDevLLMHourly,
  getDevFunnel,
  getDevUsers, clearDevUser, suspendDevUser,
  deleteDevPost, broadcastMessage,
  getDevFlags, updateDevFlags,
  getDevSimStats, getDevSimRecent, getDevSimDaily,
  getDevCommunity,
  getChunkEvalStats, getChunkWorst, getChunkBest, getChunkAll, getChunksByUser,
  evalOneChunk, evalAllPending,
  getSimEvalStats, getSimEvalRecent, getEnhanceStats, getEnhanceLogs,
} from '../lib/api';

// ─── Design tokens (dark theme) ──────────────────────────────────────────────
const T = {
  bg:      '#0F0F0F',
  sidebar: '#161616',
  card:    '#1A1A1A',
  shadow:  '0 0 0 1px rgba(255,255,255,0.06)',
  border:  'rgba(255,255,255,0.08)',
  text:    'rgba(255,255,255,0.92)',
  sub:     'rgba(255,255,255,0.4)',
  muted:   'rgba(255,255,255,0.22)',
  green:   '#30D158',
  red:     '#FF453A',
  orange:  '#FF9F0A',
  blue:    '#0A84FF',
  purple:  '#BF5AF2',
  pink:    '#FF375F',
};
const ease = [0.22, 1, 0.36, 1];

// ─── Primitives ───────────────────────────────────────────────────────────────
function Card({ children, style = {}, dark = false }) {
  return (
    <div style={{
      background: dark ? T.sidebar : T.card,
      borderRadius: 18,
      padding: 20,
      boxShadow: T.shadow,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : T.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children, color }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: color ?? T.sub, marginBottom: 6, fontWeight: 500 }}>
      {children}
    </div>
  );
}

function Val({ children, color, size = 28 }) {
  return (
    <div style={{ fontSize: size, fontWeight: 600, color: color ?? T.text,
      letterSpacing: '-0.02em', lineHeight: 1 }}>
      {children}
    </div>
  );
}

function Spinner({ dark: isDark = false }) {
  const c = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
  const tc = isDark ? 'white' : T.blue;
  return (
    <div style={{ width: 16, height: 16, borderRadius: '50%',
      border: `2px solid ${c}`, borderTopColor: tc,
      animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
  );
}

function Badge({ ok, label }) {
  const c = ok ? T.green : T.red;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 99, background: `${c}15`, fontSize: 10, color: c,
      fontWeight: 500, letterSpacing: '0.04em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block' }} />
      {label}
    </span>
  );
}

function SectionTitle({ icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 14, color: color ?? T.blue }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.text, letterSpacing: '0.04em' }}>{title}</span>
    </div>
  );
}

// ── Smooth line / area chart ──────────────────────────────────────────────────
function LineChart({ data = [], color = T.blue, height = 80, labelKey = 'l', valKey = 'v' }) {
  const containerRef            = useRef(null);
  const [width, setWidth]       = useState(600);
  const [tooltip, setTooltip]   = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const vals    = data.map(d => d[valKey] ?? d.count ?? 0);
  const max     = Math.max(...vals, 1);
  const hasData = vals.some(v => v > 0);

  if (!hasData || data.length < 2) {
    return (
      <div ref={containerRef} style={{ height, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: T.muted, fontSize: 12 }}>
        No data yet
      </div>
    );
  }

  const PT = 12; const PR = 8; const PB = 22; const PL = 8;
  const W  = width;
  const H  = height;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  // Add 8% headroom so the peak never touches the top edge
  const scale = (v) => PT + plotH - (v / (max * 1.08)) * plotH;
  const gradId = `lc${color.replace(/[^a-z]/gi, '')}`;

  const pts = vals.map((v, i) => ({
    x: PL + (vals.length === 1 ? plotW / 2 : (i / (vals.length - 1)) * plotW),
    y: scale(v),
    v,
    l: data[i][labelKey] ?? data[i].hour ?? data[i].day ?? '',
  }));

  function catmullRom(ps) {
    if (ps.length < 2) return '';
    let d = `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}`;
    for (let i = 0; i < ps.length - 1; i++) {
      const p0 = ps[Math.max(0, i - 1)];
      const p1 = ps[i];
      const p2 = ps[i + 1];
      const p3 = ps[Math.min(ps.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const linePath = catmullRom(pts);
  const baseY    = scale(0);
  const areaPath = `${linePath} L ${pts.at(-1).x.toFixed(1)} ${baseY.toFixed(1)} L ${pts[0].x.toFixed(1)} ${baseY.toFixed(1)} Z`;
  const step     = Math.max(1, Math.ceil(pts.length / 8));

  return (
    <div ref={containerRef} style={{ position: 'relative', userSelect: 'none' }}>
      {width > 0 && (
        <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
              <stop offset="85%"  stopColor={color} stopOpacity="0.03" />
              <stop offset="100%" stopColor={color} stopOpacity="0"    />
            </linearGradient>
            <clipPath id={`clip-${gradId}`}>
              <rect x={PL} y={PT} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Horizontal grid */}
          {[0.33, 0.66, 1].map(pct => (
            <line key={pct}
              x1={PL} y1={scale(max * 1.08 * (1 - pct))}
              x2={W - PR} y2={scale(max * 1.08 * (1 - pct))}
              stroke={T.border} strokeWidth="0.5" />
          ))}

          {/* Baseline */}
          <line x1={PL} y1={baseY} x2={W - PR} y2={baseY}
            stroke={T.border} strokeWidth="1" />

          {/* Area fill — clipped */}
          <g clipPath={`url(#clip-${gradId})`}>
            <motion.path d={areaPath} fill={`url(#${gradId})`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }} />
          </g>

          {/* Line */}
          <motion.path d={linePath} fill="none" stroke={color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }} />

          {/* Tooltip vertical rule */}
          {tooltip && (
            <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={baseY}
              stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
          )}

          {/* Data dots — small, filled, only on non-zero */}
          {pts.map((p, i) => p.v > 0 && (
            <circle key={i} cx={p.x} cy={p.y} r="3.5"
              fill={color} opacity="0.9"
              style={{ cursor: 'crosshair', transition: 'r 0.1s' }}
              onMouseEnter={e => { e.target.setAttribute('r', 5); setTooltip(p); }}
              onMouseLeave={e => { e.target.setAttribute('r', 3.5); setTooltip(null); }} />
          ))}

          {/* X-axis labels */}
          {pts.map((p, i) => i % step === 0 && (
            <text key={i} x={p.x} y={H - 5} textAnchor="middle"
              fontSize="9.5" fill={T.muted} fontFamily="Inter, sans-serif">
              {p.l}
            </text>
          ))}
        </svg>
      )}

      {/* Floating tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.1 }}
            style={{ position: 'absolute', pointerEvents: 'none', zIndex: 20,
              left: Math.min(tooltip.x + 10, W - 100),
              top: Math.max(tooltip.y - 48, PT),
              background: '#242424', border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '7px 12px', whiteSpace: 'nowrap',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <div style={{ fontWeight: 700, color, fontSize: 14, lineHeight: 1.2 }}>
              {tooltip.v > 999 ? `${(tooltip.v / 1000).toFixed(1)}k` : tooltip.v}
            </div>
            <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{tooltip.l}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bar chart — kept for categorical data (score distribution etc.) ────────────
function Bars({ data = [], color = T.blue, height = 56, labelKey = 'l', valKey = 'v' }) {
  const vals = data.map(d => d[valKey] ?? d.count ?? 0);
  const max  = Math.max(...vals, 1);
  const hasData = vals.some(v => v > 0);
  if (!hasData) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: T.muted, fontSize: 12 }}>No data yet</div>
  );
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height }}>
        {data.map((d, i) => {
          const v = d[valKey] ?? d.count ?? 0;
          const l = d[labelKey] ?? d.hour ?? d.day ?? '';
          const barH = v === 0 ? 2 : Math.max(6, (v / max) * (height - 18));
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {v > 0 && barH >= 18 && (
                  <span style={{ fontSize: 9, color, fontWeight: 600, marginBottom: 2, lineHeight: 1 }}>
                    {v > 999 ? `${(v/1000).toFixed(0)}k` : v}
                  </span>
                )}
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ duration: 0.45, delay: i * 0.03, ease }}
                  style={{ width: '100%', originY: 1, borderRadius: v === 0 ? 2 : 5,
                    background: v === 0 ? T.border : color,
                    opacity: v === 0 ? 1 : 0.4 + (v / max) * 0.6, height: barH }} />
              </div>
              <span style={{ fontSize: 9, color: T.muted }}>{l}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, height: 1,
        background: T.border, pointerEvents: 'none' }} />
    </div>
  );
}

function relativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CALL_LABELS = {
  simulation: 'Simulation', chatbot: 'Chatbot', enhance: 'Enhance',
  chunk_eval: 'Chunk Eval', sim_eval:  'Sim Eval',
};
function callLabel(t) { return CALL_LABELS[t] ?? t; }

function scoreColor(s) {
  if (!s) return T.muted;
  if (s >= 8) return T.green;
  if (s >= 5) return T.blue;
  if (s >= 3) return T.orange;
  return T.red;
}

function statusColor(s) {
  return s === 'llm' ? T.green : s === 'fallback' ? T.orange : T.red;
}

function THead({ cols }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols,
      fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
      paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
      {cols.split(' ').map((_, i, arr) => <span key={i} />)}
    </div>
  );
}

function actionBtn(danger = false) {
  return {
    padding: '5px 12px', borderRadius: 8, border: `1px solid ${danger ? T.red + '40' : T.border}`,
    background: danger ? `${T.red}0D` : 'rgba(0,0,0,0.04)',
    color: danger ? T.red : T.sub, fontSize: 11, cursor: 'pointer', fontWeight: 500,
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          style={{ position: 'fixed', top: 20, right: 28, zIndex: 9999, padding: '10px 18px',
            borderRadius: 12, background: T.card, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: `1px solid ${toast.ok ? T.green + '40' : T.red + '40'}`,
            color: toast.ok ? T.green : T.red, fontSize: 13, fontWeight: 500 }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── TABS definition ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'llm',       Icon: Zap,               label: 'LLM Health',        color: T.green  },
  { id: 'funnel',    Icon: BarChart3,          label: 'Onboarding Funnel', color: T.blue   },
  { id: 'users',     Icon: Users,              label: 'User List',         color: T.purple },
  { id: 'sims',      Icon: Sparkles,           label: 'Simulations',       color: T.orange },
  { id: 'controls',  Icon: SlidersHorizontal,  label: 'Controls',          color: T.red    },
  { id: 'community', Icon: MessageSquare,      label: 'Community',         color: T.pink   },
  { id: 'eval',      Icon: FlaskConical,       label: 'AI Evaluation',     color: T.purple },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, onSignOut }) {
  const [hovered, setHovered] = useState(null);
  return (
    /* Outer wrapper gives the floating gap */
    <div style={{ padding: '14px 0 14px 14px', flexShrink: 0 }}>
      <div style={{ width: 68, height: '100%', background: T.sidebar, borderRadius: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 0', gap: 4, position: 'relative', zIndex: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>

        {/* Logo */}
        <div style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 20,
          background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)',
          boxShadow: '0 0 20px rgba(123,97,255,0.5)', flexShrink: 0 }} />

        {/* Nav icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {TABS.map(t => {
            const isActive = active === t.id;
            const isHov = hovered === t.id;
            return (
              <div key={t.id} style={{ position: 'relative' }}>
                <button onClick={() => setActive(t.id)}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  title={t.label}
                  style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    background: isActive ? `${t.color}22` : isHov ? 'rgba(255,255,255,0.07)' : 'transparent',
                    color: isActive ? t.color : 'rgba(255,255,255,0.38)',
                    transition: 'all 0.18s' }}>
                  {isActive && (
                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 20, borderRadius: '0 2px 2px 0', background: t.color }} />
                  )}
                  <t.Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
                </button>
                {isHov && (
                  <div style={{ position: 'absolute', left: 58, top: '50%', transform: 'translateY(-50%)',
                    background: T.text, color: 'white', fontSize: 12, fontWeight: 500, padding: '6px 12px',
                    borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 100,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                    {t.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sign out */}
        <button onClick={onSignOut} title="Sign Out"
          style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'rgba(255,255,255,0.3)', transition: 'all 0.18s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.15)'; e.currentTarget.style.color = T.red; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

// ─── Inner top bar (greeting + search) ───────────────────────────────────────
function InnerTop({ tab }) {
  const current = TABS.find(t => t.id === tab) ?? TABS[0];
  const descriptions = {
    llm:       'Monitor Azure OpenAI usage, cost and call health.',
    funnel:    'Track where users drop off in the onboarding flow.',
    users:     'Inspect every agent, their quality and activity.',
    sims:      'Review simulation runs and fallback rates.',
    controls:  'Toggle features, clear data and broadcast messages.',
    community: 'Monitor post engagement and community health.',
    eval:      'AI-powered quality scoring across all three pipelines.',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 28, flexShrink: 0,
      paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${current.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: current.color, flexShrink: 0 }}>
          <current.Icon size={20} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {current.label}
          </div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
            {descriptions[tab]}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 10, padding: '8px 14px', border: `1px solid ${T.border}` }}>
          <Search size={14} color={T.sub} />
          <input placeholder="Search…" style={{ border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: T.text, width: 130 }} />
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.sub, cursor: 'pointer' }}>
          <Bell size={16} strokeWidth={1.8} />
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg, #7B61FF, #00D1FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          D
        </div>
      </div>
    </div>
  );
}

// ─── Input style ──────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10, outline: 'none',
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
  color: T.text, fontSize: 13, boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit',
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — LLM HEALTH
// ══════════════════════════════════════════════════════════════════════════════
function LLMTab() {
  const [stats,  setStats]  = useState(null);
  const [recent, setRecent] = useState([]);
  const [hourly, setHourly] = useState([]);

  useEffect(() => {
    getDevLLMStats().then(setStats).catch(console.error);
    getDevLLMRecent().then(setRecent).catch(console.error);
    getDevLLMHourly().then(setHourly).catch(console.error);
  }, []);

  const sLabel = s => s === 'llm' ? '✓ OK' : s === 'fallback' ? '! Fallback' : '✗ Error';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Tokens Today',    value: stats?.tokens_today?.toLocaleString() ?? '—',
            sub: stats ? `${stats.total_calls_today} calls` : '', color: T.green },
          { label: 'Est. Cost Today', value: stats ? `$${stats.cost_today_usd.toFixed(4)}` : '—',
            sub: '~$0.03 per 1k tokens', color: T.blue },
          { label: 'Fallback Rate',   value: stats ? `${stats.fallback_rate}%` : '—',
            sub: stats ? (stats.fallback_rate > 20 ? '⚠ High' : 'Healthy') : '',
            color: stats?.fallback_rate > 20 ? T.red : T.orange },
          { label: 'Avg Response',    value: stats ? `${(stats.avg_duration_ms/1000).toFixed(1)}s` : '—',
            sub: 'P50 latency', color: T.text },
        ].map((k, i) => (
          <Card key={i}>
            <Label>{k.label}</Label>
            <Val color={k.color} size={26}>{stats ? k.value : <Spinner />}</Val>
            {k.sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Token chart */}
      <Card>
        <SectionTitle icon="◎" title="Token Usage — Last 24h" color={T.green} />
        {hourly.length
          ? <LineChart data={hourly} color={T.green} height={96} labelKey="hour" valKey="tokens" />
          : <div style={{ fontSize: 12, color: T.muted }}>No LLM calls yet today.</div>}
      </Card>

      {/* Recent calls */}
      <Card>
        <SectionTitle icon="◈" title="Recent LLM Calls" color={T.blue} />
        {recent.length === 0 ? (
          <div style={{ fontSize: 12, color: T.muted }}>No calls logged yet.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 90px 1fr 70px 70px 90px',
              fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
              {['Time','Type','User','Tokens','Latency','Status'].map(h => <span key={h}>{h}</span>)}
            </div>
            {recent.slice(0, 15).map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 90px 1fr 70px 70px 90px',
                padding: '10px 0', borderBottom: `1px solid ${T.border}`,
                fontSize: 12, color: T.text, alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: T.sub, fontSize: 11 }}>{relativeTime(r.created_at)}</span>
                <span style={{ color: r.call_type === 'simulation' ? T.blue : T.sub }}>{callLabel(r.call_type)}</span>
                <span style={{ fontWeight: 500 }}>{r.user_name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(r.tokens_in + r.tokens_out).toLocaleString()}</span>
                <span style={{ color: r.duration_ms > 3000 ? T.orange : T.sub }}>{(r.duration_ms / 1000).toFixed(1)}s</span>
                <span style={{ fontSize: 11, color: statusColor(r.status), fontWeight: 600 }}>{sLabel(r.status)}</span>
              </div>
            ))}
            {stats?.fallback_rate > 15 && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10,
                background: `${T.orange}12`, border: `1px solid ${T.orange}30` }}>
                <span style={{ fontSize: 12, color: T.orange }}>
                  ⚠ Fallback rate {stats.fallback_rate}% is high — check your simulation prompt or Azure quota.
                </span>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — ONBOARDING FUNNEL
// ══════════════════════════════════════════════════════════════════════════════
function FunnelTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getDevFunnel().then(setData).catch(console.error); }, []);
  if (!data) return <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: T.sub }}><Spinner /> Loading funnel…</div>;

  const steps = [
    { label: 'Signed Up',           n: data.signed_up,       color: T.blue   },
    { label: 'Chatbot Complete',    n: data.chatbot_complete, color: T.purple },
    { label: 'Ran Simulation',      n: data.ran_simulation,   color: T.green  },
    { label: 'Posted to Community', n: data.posted,           color: T.pink   },
  ];

  const biggestDrop = steps.reduce((w, s, i) => {
    if (i === 0) return w;
    const drop = steps[i-1].n - s.n;
    return drop > w.drop ? { drop, from: steps[i-1].label, to: s.label } : w;
  }, { drop: 0, from: '', to: '' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="⟁" title="Conversion Funnel — All Time" color={T.blue} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map((s, i) => {
            const pct = Math.round((s.n / steps[0].n) * 100);
            const drop = i > 0 ? steps[i-1].n - s.n : 0;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: T.muted, width: 16 }}>{i+1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {i > 0 && <span style={{ fontSize: 11, color: T.red }}>−{drop.toLocaleString()} dropped</span>}
                    <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.n.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: T.muted, width: 34, textAlign: 'right' }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease }}
                    style={{ height: '100%', borderRadius: 99, background: s.color }} />
                </div>
                {i < steps.length - 1 && (
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4, paddingLeft: 26 }}>
                    → {steps[i+1].n > 0 ? Math.round((steps[i+1].n / s.n) * 100) : 0}% proceed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card style={{ background: `${T.orange}0D`, border: `1px solid ${T.orange}30`, boxShadow: 'none' }}>
          <div style={{ fontSize: 11, color: T.orange, fontWeight: 600, marginBottom: 8 }}>⚠ Biggest Drop</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>
            {biggestDrop.from} → {biggestDrop.to}
          </div>
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
            {biggestDrop.drop.toLocaleString()} users dropped here. Highest-priority engagement gap.
          </div>
        </Card>
        <Card style={{ background: `${T.green}0D`, border: `1px solid ${T.green}30`, boxShadow: 'none' }}>
          <div style={{ fontSize: 11, color: T.green, fontWeight: 600, marginBottom: 8 }}>Overall Conversion</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: T.text, marginBottom: 6 }}>
            {steps[0].n > 0 ? Math.round((steps[3].n / steps[0].n) * 100) : 0}%
          </div>
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
            of signups reach the community feed.
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="◉" title="Recent Signups — Funnel Position" color={T.purple} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 110px 120px',
          fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
          paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
          {['User','Joined','Chatbot','Simulation','Community'].map(h => <span key={h}>{h}</span>)}
        </div>
        {(data.recent_signups || []).map((u, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 110px 120px',
            padding: '10px 0', borderBottom: `1px solid ${T.border}`,
            fontSize: 12, color: T.text, alignItems: 'center',
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
            <span style={{ fontWeight: 600 }}>{u.name}</span>
            <span style={{ color: T.sub, fontSize: 11 }}>{u.joined}</span>
            <span style={{ color: u.chatbot ? T.green : T.muted, fontWeight: 500 }}>{u.chatbot ? '✓ Done' : '○ Pending'}</span>
            <span style={{ color: u.simulation ? T.green : T.muted, fontWeight: 500 }}>{u.simulation ? '✓ Done' : '○ Pending'}</span>
            <span style={{ color: u.community ? T.green : T.muted, fontWeight: 500 }}>{u.community ? '✓ Posted' : '○ Pending'}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — USER LIST
// ══════════════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const { toast, show }       = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getDevUsers().then(d => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleClear(id) {
    try { await clearDevUser(id); show('Data cleared'); load(); } catch (e) { show(e.message, false); }
    setConfirm(null);
  }
  async function handleSuspend(id) {
    try { const r = await suspendDevUser(id); show(r.message); load(); } catch (e) { show(e.message, false); }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const qColor = q => q === 'Strong' ? T.green : q === 'Moderate' ? T.orange : T.muted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toast toast={toast} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Total Users',   v: users.length,                                                                 color: T.blue   },
          { label: 'Active Agents', v: users.filter(u => ['Strong','Moderate'].includes(u.agent_quality)).length,   color: T.green  },
          { label: 'Thin / Empty',  v: users.filter(u => ['Thin','Empty'].includes(u.agent_quality)).length,        color: T.orange },
          { label: 'Suspended',     v: users.filter(u => u.suspended).length,                                       color: T.red    },
        ].map((s, i) => (
          <Card key={i}>
            <Label>{s.label}</Label>
            <Val color={s.color} size={26}>{loading ? <Spinner /> : s.v}</Val>
          </Card>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
        style={{ ...inputStyle, marginBottom: 0 }} />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${T.border}`,
          display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 110px 90px 140px',
          fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {['User','Joined','Chunks','Sims','Last Active','Quality','Actions'].map(h => <span key={h}>{h}</span>)}
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {loading
            ? <div style={{ padding: 20, display: 'flex', gap: 8, alignItems: 'center', color: T.sub }}><Spinner /> Loading…</div>
            : filtered.map((u, i) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 110px 90px 140px',
              padding: '10px 20px', borderBottom: `1px solid ${T.border}`, alignItems: 'center',
              fontSize: 12, color: T.text, opacity: u.suspended ? 0.45 : 1,
              background: confirm === u.id ? `${T.red}08` : i % 2 === 0 ? T.card : 'rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 1 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{u.email}</div>
              </div>
              <span style={{ color: T.sub, fontSize: 11 }}>{u.joined}</span>
              <span style={{ color: u.chunks > 0 ? T.text : T.muted, fontWeight: u.chunks > 0 ? 600 : 400 }}>{u.chunks}</span>
              <span style={{ color: u.sims > 0 ? T.blue : T.muted, fontWeight: u.sims > 0 ? 600 : 400 }}>{u.sims}</span>
              <span style={{ fontSize: 11, color: T.sub }}>{relativeTime(u.last_active)}</span>
              <span style={{ fontSize: 11, color: qColor(u.agent_quality), fontWeight: 600 }}>{u.agent_quality}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {confirm === u.id ? (
                  <>
                    <button onClick={() => setConfirm(null)} style={actionBtn(false)}>Cancel</button>
                    <button onClick={() => handleClear(u.id)} style={actionBtn(true)}>Confirm</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirm(u.id)} style={actionBtn(false)}>Clear</button>
                    <button onClick={() => handleSuspend(u.id)}
                      style={{ ...actionBtn(u.suspended ? false : true),
                        color: u.suspended ? T.green : T.red,
                        borderColor: u.suspended ? `${T.green}40` : `${T.red}40`,
                        background: u.suspended ? `${T.green}0D` : `${T.red}0D` }}>
                      {u.suspended ? 'Restore' : 'Suspend'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — SIMULATIONS
// ══════════════════════════════════════════════════════════════════════════════
function SimulationsTab() {
  const [stats,  setStats]  = useState(null);
  const [recent, setRecent] = useState([]);
  const [daily,  setDaily]  = useState([]);

  useEffect(() => {
    getDevSimStats().then(setStats).catch(console.error);
    getDevSimRecent().then(setRecent).catch(console.error);
    getDevSimDaily().then(setDaily).catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Total Simulations', value: stats?.total?.toLocaleString() ?? '—',  color: T.blue   },
          { label: 'Today',             value: stats?.today ?? '—',                     color: T.text   },
          { label: 'Fallback Rate',     value: stats ? `${stats.fallback_rate}%` : '—',
            color: stats?.fallback_rate > 20 ? T.red : T.orange },
          { label: 'Avg Chunks Used',   value: stats ? `${stats.avg_chunks}` : '—',
            color: stats && stats.avg_chunks < 5 ? T.orange : T.green },
        ].map((k, i) => (
          <Card key={i}>
            <Label>{k.label}</Label>
            <Val color={k.color} size={26}>{stats ? k.value : <Spinner />}</Val>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Card>
          <SectionTitle icon="◎" title="Simulations Per Day — Last 7 Days" color={T.blue} />
          {daily.length
            ? <LineChart data={daily} color={T.blue} height={88} labelKey="day" valKey="count" />
            : <div style={{ fontSize: 12, color: T.muted }}>No simulation data yet.</div>}
        </Card>
        <Card style={{ background: stats?.fallback_rate > 20 ? `${T.red}0D` : `${T.orange}0D`,
          border: `1px solid ${stats?.fallback_rate > 20 ? T.red : T.orange}30`, boxShadow: 'none' }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10,
            color: stats?.fallback_rate > 20 ? T.red : T.orange }}>
            {stats?.fallback_rate > 20 ? '⚠ High Fallback' : '! Watch This'}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            {stats ? `${stats.fallback_rate}%` : <Spinner />}
          </div>
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
            Users running simulations before adding enough knowledge chunks.
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="✦" title="Recent Simulations" color={T.orange} />
        {recent.length === 0 ? (
          <div style={{ fontSize: 12, color: T.muted }}>No simulations logged yet.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 70px 80px 110px',
              fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
              {['Time','User','Chunks','Duration','Output'].map(h => <span key={h}>{h}</span>)}
            </div>
            {recent.slice(0, 15).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 70px 80px 110px',
                padding: '10px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.text, alignItems: 'center',
                background: s.output_type === 'fallback' ? `${T.orange}08` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: T.sub, fontSize: 11 }}>{relativeTime(s.created_at)}</span>
                <span style={{ fontWeight: 600 }}>{s.user_name}</span>
                <span style={{ color: s.chunks_used < 3 ? T.orange : s.chunks_used > 10 ? T.green : T.text,
                  fontWeight: 600 }}>{s.chunks_used}</span>
                <span style={{ color: T.sub }}>{(s.duration_ms / 1000).toFixed(1)}s</span>
                <span style={{ fontSize: 11, color: s.output_type === 'llm' ? T.green : T.orange, fontWeight: 600 }}>
                  {s.output_type === 'llm' ? '✓ LLM' : '! Fallback'}
                </span>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — CONTROLS
// ══════════════════════════════════════════════════════════════════════════════
function ControlsTab() {
  const [flags,     setFlags]     = useState(null);
  const [userInput, setUserInput] = useState('');
  const [postInput, setPostInput] = useState('');
  const [msgInput,  setMsgInput]  = useState('');
  const { toast, show }           = useToast();

  useEffect(() => { getDevFlags().then(setFlags).catch(console.error); }, []);

  async function toggleFlag(key) {
    if (!flags) return;
    const next = { ...flags, [key]: !flags[key] };
    try { const u = await updateDevFlags({ [key]: next[key] }); setFlags(u); show(`${key} ${next[key] ? 'enabled' : 'disabled'}`); }
    catch (e) { show(e.message, false); }
  }
  async function handleClear() {
    if (!userInput.trim()) return;
    try { await clearDevUser(userInput.trim()); show(`Cleared data for ${userInput}`); setUserInput(''); } catch (e) { show(e.message, false); }
  }
  async function handleDeletePost() {
    if (!postInput.trim()) return;
    try { await deleteDevPost(postInput.trim()); show(`Post ${postInput} deleted`); setPostInput(''); } catch (e) { show(e.message, false); }
  }
  async function handleBroadcast() {
    if (!msgInput.trim()) return;
    try { await broadcastMessage(msgInput.trim()); show('Broadcast sent'); setMsgInput(''); } catch (e) { show(e.message, false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toast toast={toast} />

      <Card>
        <SectionTitle icon="⬡" title="Feature Flags — Toggle Live" color={T.red} />
        {!flags ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: T.sub }}><Spinner /> Loading…</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.entries(flags).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 12,
                background: val ? `${T.green}08` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${val ? T.green + '30' : T.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2, textTransform: 'capitalize' }}>{key}</div>
                  <div style={{ fontSize: 11, color: T.sub }}>
                    {key === 'simulations' && 'Azure OpenAI simulation calls'}
                    {key === 'community'   && 'Community post & reaction API'}
                    {key === 'chatbot'     && 'Chatbot message processing'}
                    {key === 'enhance'     && 'Content enhancement feature'}
                  </div>
                </div>
                <button onClick={() => toggleFlag(key)}
                  style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                    background: val ? T.green : T.muted, position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s', left: val ? 23 : 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 11, color: T.muted }}>
          Disabling simulations or chatbot immediately affects all active users.
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <SectionTitle icon="◉" title="Clear User Data" color={T.red} />
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 12, lineHeight: 1.6 }}>
            Wipes all knowledge chunks and chat history. Account stays intact.
          </div>
          <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="User ID or email" style={inputStyle} />
          <button onClick={handleClear} style={{ width: '100%', padding: '10px', borderRadius: 10,
            border: `1px solid ${T.red}40`, background: `${T.red}0D`, color: T.red,
            fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Clear User Data
          </button>
        </Card>
        <Card>
          <SectionTitle icon="◈" title="Delete Post" color={T.red} />
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 12, lineHeight: 1.6 }}>
            Permanently removes a community post and all its reactions.
          </div>
          <input value={postInput} onChange={e => setPostInput(e.target.value)} placeholder="Post ID" style={inputStyle} />
          <button onClick={handleDeletePost} style={{ width: '100%', padding: '10px', borderRadius: 10,
            border: `1px solid ${T.red}40`, background: `${T.red}0D`, color: T.red,
            fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Delete Post
          </button>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="⟁" title="Broadcast System Message" color={T.blue} />
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 12, lineHeight: 1.6 }}>
          Posts a pinned announcement to the community feed visible to all users.
        </div>
        <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} rows={3}
          placeholder="Write your announcement…" style={{ ...inputStyle, resize: 'vertical' }} />
        <button onClick={handleBroadcast} style={{ padding: '10px 24px', borderRadius: 10,
          border: `1px solid ${T.blue}40`, background: `${T.blue}0D`, color: T.blue,
          fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          Send Broadcast →
        </button>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 6 — COMMUNITY
// ══════════════════════════════════════════════════════════════════════════════
function CommunityTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getDevCommunity().then(setData).catch(console.error); }, []);
  if (!data) return <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: T.sub }}><Spinner /> Loading…</div>;

  const isAlive = data.total_posts > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ background: isAlive ? `${T.green}0D` : `${T.red}0D`,
        border: `1px solid ${isAlive ? T.green : T.red}30`, boxShadow: 'none',
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%',
          background: isAlive ? T.green : T.red,
          boxShadow: `0 0 10px ${isAlive ? T.green : T.red}`, flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
            {isAlive ? 'Community is active.' : 'Community is quiet.'}
          </span>
          <span style={{ fontSize: 12, color: T.sub, marginLeft: 10 }}>
            {data.total_posts} posts · {data.total_reactions} reactions
          </span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <SectionTitle icon="◈" title="Posts Per Day" color={T.purple} />
          {data.posts_per_day?.length
            ? <LineChart data={data.posts_per_day} color={T.purple} height={80} labelKey="day" valKey="count" />
            : <div style={{ fontSize: 12, color: T.muted }}>No data.</div>}
        </Card>
        <Card>
          <SectionTitle icon="⟁" title="Reactions Per Day" color={T.pink} />
          {data.reactions_per_day?.length
            ? <LineChart data={data.reactions_per_day} color={T.pink} height={80} labelKey="day" valKey="count" />
            : <div style={{ fontSize: 12, color: T.muted }}>No data.</div>}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Total Posts',          v: data.total_posts,           color: T.text   },
          { label: 'Total Reactions',      v: data.total_reactions,       color: T.pink   },
          { label: 'Avg Reactions/Post',   v: data.avg_reactions,         color: T.blue   },
          { label: 'Zero-engagement',      v: data.zero_engagement_posts, color: T.muted  },
        ].map((s, i) => (
          <Card key={i}><Label>{s.label}</Label><Val color={s.color} size={22}>{s.v}</Val></Card>
        ))}
      </div>

      <Card>
        <SectionTitle icon="◎" title="Top Posts by Reactions" color={T.pink} />
        {(data.top_posts || []).length === 0
          ? <div style={{ fontSize: 12, color: T.muted }}>No posts yet.</div>
          : (data.top_posts || []).map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 12, color: T.muted, width: 18, marginTop: 1, fontWeight: 700 }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.content}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{p.agent_name} · {p.tag}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 16, color: T.pink, fontWeight: 700 }}>{p.total_reactions}</div>
              <div style={{ fontSize: 10, color: T.muted }}>reactions</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 7 — AI EVALUATION  (LangSmith-style trace viewer)
// ══════════════════════════════════════════════════════════════════════════════
// ─── Shared eval primitives ───────────────────────────────────────────────────
function sColor(s) {
  if (!s && s !== 0) return T.muted;
  if (s >= 8) return T.green;
  if (s >= 5) return T.blue;
  if (s >= 3) return T.orange;
  return T.red;
}

function ScoreBadge({ score }) {
  const c = sColor(score);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 8, background: `${c}18`,
      border: `1px solid ${c}40`, fontSize: 12, fontWeight: 700, color: c }}>
      {score ?? '—'}
    </span>
  );
}

function ScoreBar({ score, max = 10 }) {
  const c = sColor(score);
  const pct = ((score ?? 0) / max) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: c,
          transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: c, minWidth: 28 }}>{score ?? '—'}</span>
    </div>
  );
}

function FlagChip({ flag }) {
  const pos = flag.includes('good') || flag.includes('real') || flag.includes('actionable');
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 500,
      background: pos ? `${T.green}14` : 'rgba(255,255,255,0.06)',
      border: `1px solid ${pos ? T.green + '30' : 'rgba(255,255,255,0.08)'}`,
      color: pos ? T.green : T.sub }}>
      {flag.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Code block (raw LLM response viewer) ────────────────────────────────────
function CodeBlock({ content, label, accent = T.blue }) {
  const [expanded, setExpanded] = useState(false);
  if (!content) return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontStyle: 'italic' }}>
      Not available — run a new eval to capture trace data
    </div>
  );
  const lines = content.split('\n');
  const preview = lines.slice(0, 4).join('\n');
  const needsExpand = lines.length > 4;
  return (
    <div style={{ borderRadius: 8, border: `1px solid ${accent}25`, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', background: `${accent}10`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: accent, fontWeight: 600, letterSpacing: '0.06em' }}>{label}</span>
        {needsExpand && (
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, color: T.sub }}>
            {expanded ? 'Collapse ↑' : `Show all (${lines.length} lines) ↓`}
          </button>
        )}
      </div>
      <pre style={{ margin: 0, padding: '12px', fontSize: 11.5, lineHeight: 1.65,
        color: 'rgba(255,255,255,0.75)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        background: 'rgba(0,0,0,0.3)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        maxHeight: expanded ? 'none' : undefined }}>
        {expanded ? content : preview}
        {!expanded && needsExpand && <span style={{ color: T.muted }}>{'\n…'}</span>}
      </pre>
    </div>
  );
}

// ─── Trace panel (expandable row detail) ────────────────────────────────────
function TracePanel({ type, run }) {
  const CHUNK_SYSTEM = `You are a quality evaluator for an AI agent knowledge base.

A knowledge chunk is a piece of personal information extracted from a user's interview.
It will be used to predict their future life paths — so quality matters.

Rate the chunk on a scale of 1 to 10:

1–3  Vague / useless
     Examples: "I want to grow", "I like tech", "I'm a student"
     These could apply to anyone. They add no signal.

4–6  Somewhat specific but incomplete
     Examples: "I studied computer science", "I worked at a startup"
     Real but lacks concrete detail (when? what happened? what was the outcome?)

7–10 Concrete, specific, genuine
     Examples: "I dropped out of my CS degree in 2023 to build a food delivery app
     that failed after 4 months due to poor unit economics"
     These are rich, personal, and actually useful for prediction.

Return ONLY valid JSON — no markdown, no explanation, nothing else:
{"score": integer, "reason": "one sentence max", "flags": ["flag1", "flag2"]}`;

  const SIM_SYSTEM = `You are evaluating the quality of an AI life simulation.
The simulation should be deeply personalised to the user's actual data.

Score on TWO dimensions (1–10 each):

PERSONALISATION — does the output use this specific user's data?
  10: every milestone references the user's actual experiences/goals/fears
   1: could be for anyone — no connection to user context

GROUNDEDNESS — are all claims supported by the user's known chunks?
  10: every specific claim is traceable to user context
   1: contains invented facts not present in user's data

Also list any HALLUCINATIONS: specific claims about the user
that are NOT supported by their knowledge chunks.

Return ONLY valid JSON:
{"personalisation": int, "groundedness": int, "hallucinations": ["claim1"]}`;

  const GUARD_SYSTEM = `You are checking if an AI-expanded message contains invented facts.

The user wrote a brief message. An AI expanded it into a longer version.
Your job: find any specific facts in the expanded version that are NOT in the original message
and NOT in the user's known context.

Focus on invented: dates, numbers, company names, outcomes, durations, specific events.
Ignore: tone changes, rephrasing, general elaboration.

Return ONLY valid JSON:
{"flagged": true/false, "hallucinations": ["specific invented fact 1"]}`;

  const panelBg = 'rgba(0,0,0,0.25)';
  const panelBorder = T.border;

  if (type === 'chunk') {
    const chunks = run.content ? [{ category: run.category, content: run.content }] : [];
    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
        style={{ overflow: 'hidden' }}>
        <div style={{ padding: '0 0 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

          {/* Input */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.blue}20` }}>
            <div style={{ fontSize: 10, color: T.blue, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>Input</div>
            <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>Category</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 12,
              padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, display: 'inline-block' }}>
              {run.category}
            </div>
            <div style={{ fontSize: 11, color: T.sub, marginBottom: 6 }}>Chunk content</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, fontStyle: 'italic',
              padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8,
              border: `1px solid ${T.border}` }}>
              "{run.content}"
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11, color: T.muted }}>
              <span>User: <span style={{ color: T.text }}>{run.user_name}</span></span>
              <span>Status: <span style={{ color: run.eval_status === 'done' ? T.green : T.orange }}>
                {run.eval_status}
              </span></span>
            </div>
          </div>

          {/* Prompt sent to LLM */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.purple}20` }}>
            <div style={{ fontSize: 10, color: T.purple, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>Evaluator Prompt</div>
            <CodeBlock content={CHUNK_SYSTEM} label="SYSTEM" accent={T.purple} />
            <div style={{ marginTop: 8 }}>
              <CodeBlock content={run.eval_user_message || `Category: ${run.category}\nChunk: "${run.content}"`}
                label="USER" accent={T.purple} />
            </div>
          </div>

          {/* Raw response + parsed result */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.orange}20` }}>
            <div style={{ fontSize: 10, color: T.orange, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>LLM Response + Result</div>
            <CodeBlock content={run.eval_raw_response} label="RAW OUTPUT" accent={T.orange} />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: T.green, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 10 }}>Parsed Result</div>
              <ScoreBar score={run.eval_score} />
              {run.eval_reason && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>
                  {run.eval_reason}
                </div>
              )}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {(run.eval_flags || []).map(f => <FlagChip key={f} flag={f} />)}
              </div>
            </div>
            {(run.eval_tokens_in > 0 || run.eval_tokens_out > 0) && (
              <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`,
                display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: T.muted }}>
                  IN <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{run.eval_tokens_in ?? 0}</span>
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  OUT <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{run.eval_tokens_out ?? 0}</span>
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  TOTAL <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{(run.eval_tokens_in ?? 0) + (run.eval_tokens_out ?? 0)}</span>
                </span>
                {run.eval_duration_ms > 0 && (
                  <span style={{ fontSize: 10, color: T.muted }}>
                    LATENCY <span style={{ color: run.eval_duration_ms > 3000 ? T.orange : T.sub }}>
                      {(run.eval_duration_ms / 1000).toFixed(2)}s
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'sim') {
    let chunks = [];
    try { chunks = JSON.parse(run.chunks_context || '[]'); } catch {}
    let simOutput = {};
    try { simOutput = JSON.parse(run.simulation_output || '{}'); } catch {}

    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
        style={{ overflow: 'hidden' }}>
        <div style={{ padding: '0 0 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

          {/* Context */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.blue}20` }}>
            <div style={{ fontSize: 10, color: T.blue, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>
              Context Used ({chunks.length} chunks)
            </div>
            {chunks.length === 0
              ? <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>No chunks available — simulation ran without context</div>
              : chunks.map((c, i) => (
              <div key={i} style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 9, color: T.sub, marginBottom: 3, textTransform: 'uppercase',
                  letterSpacing: '0.08em' }}>{c.category}</div>
                <div style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>{c.content}</div>
              </div>
            ))}
            {run.simulation_output && (
              <div style={{ marginTop: 12 }}>
                <CodeBlock content={run.simulation_output} label="SIMULATION OUTPUT (evaluated)" accent={T.blue} />
              </div>
            )}
          </div>

          {/* Evaluator prompt */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.purple}20` }}>
            <div style={{ fontSize: 10, color: T.purple, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>Evaluator Prompt</div>
            <CodeBlock content={SIM_SYSTEM} label="SYSTEM" accent={T.purple} />
            <div style={{ marginTop: 8 }}>
              <CodeBlock
                content={run.user_prompt || (chunks.length > 0
                  ? `User's knowledge chunks:\n${chunks.map(c => `- [${c.category || 'general'}] ${c.content}`).join('\n')}\n\nSimulation output:\n${run.simulation_output || '(not captured)'}`
                  : null)}
                label="USER MESSAGE (sent to evaluator)"
                accent={T.purple}
              />
            </div>
          </div>

          {/* Raw response + scores */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.orange}20` }}>
            <div style={{ fontSize: 10, color: T.orange, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>LLM Response + Result</div>
            <CodeBlock content={run.raw_response} label="RAW OUTPUT" accent={T.orange} />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: T.green, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 10 }}>Scores</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Personalisation', v: run.personalisation },
                  { label: 'Groundedness',    v: run.groundedness    },
                  { label: 'Overall',         v: run.overall         },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: T.sub, marginBottom: 3 }}>{s.label}</div>
                    <ScoreBar score={s.v} />
                  </div>
                ))}
              </div>
              {run.hallucinations?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: T.orange, fontWeight: 600, marginBottom: 6 }}>
                    ⚠ Hallucinations detected
                  </div>
                  {run.hallucinations.map((h, i) => (
                    <div key={i} style={{ fontSize: 11, color: T.orange, padding: '4px 8px',
                      borderRadius: 6, background: `${T.orange}10`, marginBottom: 4, lineHeight: 1.5 }}>
                      · {h}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {(run.tokens_in > 0 || run.tokens_out > 0) && (
              <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`,
                display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: T.muted }}>
                  IN <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{run.tokens_in ?? 0}</span>
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  OUT <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{run.tokens_out ?? 0}</span>
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  TOTAL <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{(run.tokens_in ?? 0) + (run.tokens_out ?? 0)}</span>
                </span>
                {run.duration_ms > 0 && (
                  <span style={{ fontSize: 10, color: T.muted }}>
                    LATENCY <span style={{ color: run.duration_ms > 3000 ? T.orange : T.sub }}>
                      {(run.duration_ms / 1000).toFixed(2)}s
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'enhance') {
    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
        style={{ overflow: 'hidden' }}>
        <div style={{ padding: '0 0 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

          {/* Input */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.blue}20` }}>
            <div style={{ fontSize: 10, color: T.blue, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>Input</div>
            <div style={{ fontSize: 10, color: T.sub, marginBottom: 6 }}>Original (user wrote)</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, fontStyle: 'italic',
              padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8,
              border: `1px solid ${T.border}`, marginBottom: 12 }}>
              "{run.original}"
            </div>
            <div style={{ fontSize: 10, color: T.sub, marginBottom: 6 }}>Enhanced (AI generated)</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6,
              padding: '10px 12px', background: `${T.blue}08`, borderRadius: 8,
              border: `1px solid ${T.blue}20` }}>
              {run.enhanced_text || <span style={{ color: T.muted, fontStyle: 'italic' }}>Not captured (run again to see)</span>}
            </div>
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                background: run.flagged ? `${T.orange}15` : `${T.green}15`,
                color: run.flagged ? T.orange : T.green,
                border: `1px solid ${run.flagged ? T.orange : T.green}30` }}>
                {run.flagged ? '⚠ Hallucinations detected' : '✓ Clean — no hallucinations'}
              </span>
            </div>
          </div>

          {/* Guard prompt */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.purple}20` }}>
            <div style={{ fontSize: 10, color: T.purple, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>Guard Prompt</div>
            <CodeBlock content={GUARD_SYSTEM} label="SYSTEM" accent={T.purple} />
            <div style={{ marginTop: 8 }}>
              <CodeBlock
                content={run.user_prompt || (run.original
                  ? `Original (user wrote):\n"${run.original}"\n\nExpanded (AI generated):\n"${run.enhanced_text || '(not captured)'}"\n\nKnown context about this user:\n(captured from knowledge chunks)`
                  : null)}
                label="USER MESSAGE (sent to guard)"
                accent={T.purple}
              />
            </div>
          </div>

          {/* Raw response + result */}
          <div style={{ background: panelBg, borderRadius: 12, padding: 16, border: `1px solid ${T.orange}20` }}>
            <div style={{ fontSize: 10, color: T.orange, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 12 }}>LLM Response + Result</div>
            <CodeBlock content={run.raw_guard_response} label="RAW OUTPUT" accent={T.orange} />
            {run.hallucinations?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: T.orange, fontWeight: 600, marginBottom: 6 }}>
                  Invented facts found
                </div>
                {run.hallucinations.map((h, i) => (
                  <div key={i} style={{ fontSize: 11, color: T.orange, padding: '4px 8px',
                    borderRadius: 6, background: `${T.orange}10`, marginBottom: 4 }}>
                    · {h}
                  </div>
                ))}
              </div>
            )}
            {(run.tokens_in > 0 || run.tokens_out > 0) && (
              <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`,
                display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: T.muted }}>
                  IN <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{run.tokens_in ?? 0}</span>
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  OUT <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{run.tokens_out ?? 0}</span>
                </span>
                <span style={{ fontSize: 10, color: T.muted }}>
                  TOTAL <span style={{ color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{(run.tokens_in ?? 0) + (run.tokens_out ?? 0)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

// ─── Run row (collapsible trace) ─────────────────────────────────────────────
function RunRow({ run, type, index }) {
  const [open, setOpen] = useState(false);

  const statusBadge = () => {
    if (type === 'chunk') {
      const c = sColor(run.eval_score);
      return <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{run.eval_score ?? '?'}/10</span>;
    }
    if (type === 'sim') {
      const c = sColor(run.overall);
      return <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{run.overall ?? '?'}/10</span>;
    }
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
        background: run.flagged ? `${T.orange}15` : `${T.green}15`,
        color: run.flagged ? T.orange : T.green }}>
        {run.flagged ? '⚠ Flagged' : '✓ Clean'}
      </span>
    );
  };

  const metaText = () => {
    if (type === 'chunk') return `${run.category} · ${run.content?.slice(0, 55)}…`;
    if (type === 'sim')   return `P:${run.personalisation}/10  G:${run.groundedness}/10  ${run.hallucinations?.length > 0 ? `⚠ ${run.hallucinations.length} hallucination(s)` : '✓ No hallucinations'}`;
    return run.original?.slice(0, 70) + (run.original?.length > 70 ? '…' : '');
  };

  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
          cursor: 'pointer', transition: 'background 0.15s',
          background: open ? 'rgba(255,255,255,0.03)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}>

        {/* Run number */}
        <span style={{ fontSize: 11, color: T.muted, minWidth: 24, fontVariantNumeric: 'tabular-nums' }}>
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Expand toggle */}
        <span style={{ fontSize: 11, color: open ? T.blue : T.muted, transition: 'color 0.15s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s, color 0.15s',
          display: 'inline-block' }}>›</span>

        {/* User */}
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text, minWidth: 80 }}>
          {run.user_name || '—'}
        </span>

        {/* Meta text */}
        <span style={{ flex: 1, fontSize: 11, color: T.sub, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {metaText()}
        </span>

        {/* Score / status */}
        {statusBadge()}

        {/* Timestamp */}
        <span style={{ fontSize: 10, color: T.muted, minWidth: 60, textAlign: 'right' }}>
          {relativeTime(run.created_at)}
        </span>
      </div>

      {/* Trace panel */}
      <AnimatePresence>
        {open && (
          <div style={{ padding: '0 16px' }}>
            <TracePanel type={type} run={run} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main AIEvalTab ───────────────────────────────────────────────────────────
function AIEvalTab() {
  const [pipeline,     setPipeline]     = useState('chunks');
  const [chunkStats,   setChunkStats]   = useState(null);
  const [chunks,       setChunks]       = useState([]);
  const [byUser,       setByUser]       = useState([]);
  const [evaling,      setEvaling]      = useState(false);
  const [simStats,     setSimStats]     = useState(null);
  const [simRuns,      setSimRuns]      = useState([]);
  const [enhStats,     setEnhStats]     = useState(null);
  const [enhLogs,      setEnhLogs]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const { toast, show } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getChunkEvalStats().then(setChunkStats),
      getChunkAll().then(setChunks),
      getChunksByUser().then(setByUser),
      getSimEvalStats().then(setSimStats),
      getSimEvalRecent().then(setSimRuns),
      getEnhanceStats().then(setEnhStats),
      getEnhanceLogs().then(setEnhLogs),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleEvalAll() {
    setEvaling(true);
    try { const r = await evalAllPending(); show(r.message); setTimeout(() => { load(); setEvaling(false); }, 3000); }
    catch (e) { show(e.message, false); setEvaling(false); }
  }

  const PIPELINES = [
    { id: 'chunks',  label: 'Pipeline 1 — Chunk Quality',      color: T.purple },
    { id: 'sims',    label: 'Pipeline 2 — Simulation Quality',  color: T.blue   },
    { id: 'enhance', label: 'Pipeline 3 — Enhance Guard',       color: T.orange },
  ];

  const current = PIPELINES.find(p => p.id === pipeline);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toast toast={toast} />

      {/* Pipeline selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PIPELINES.map(p => (
          <button key={p.id} onClick={() => setPipeline(p.id)}
            style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${pipeline === p.id ? p.color + '50' : T.border}`,
              background: pipeline === p.id ? `${p.color}12` : 'transparent',
              color: pipeline === p.id ? p.color : T.sub,
              fontSize: 12, fontWeight: pipeline === p.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Pipeline 1: Chunk Quality ── */}
      {pipeline === 'chunks' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[
              { label: 'Avg Score',       value: chunkStats ? `${chunkStats.avg_score}/10` : '—',
                color: sColor(chunkStats?.avg_score) },
              { label: 'Total Chunks',    value: chunkStats?.total_chunks ?? '—', color: T.text },
              { label: 'Evaluated',       value: chunkStats?.total_evaluated ?? '—', color: T.blue },
              { label: 'Below Threshold', value: chunkStats?.below_threshold ?? '—',
                color: (chunkStats?.below_threshold ?? 0) > 0 ? T.orange : T.green },
            ].map((k, i) => (
              <Card key={i}>
                <Label>{k.label}</Label>
                <Val color={k.color} size={24}>{loading ? <Spinner /> : k.value}</Val>
              </Card>
            ))}
          </div>

          {/* Score distribution + eval button */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <SectionTitle icon="◆" title="Score Distribution" color={T.purple} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(chunkStats?.total_pending ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: T.orange }}>{chunkStats.total_pending} pending</span>
                )}
                <motion.button onClick={handleEvalAll} disabled={evaling}
                  whileHover={!evaling ? { scale: 1.03 } : {}}
                  style={{ padding: '7px 16px', borderRadius: 8,
                    border: `1px solid ${T.purple}40`, background: `${T.purple}12`,
                    color: T.purple, fontSize: 11, cursor: evaling ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  {evaling ? 'Evaluating…' : '◆ Eval All Pending'}
                </motion.button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 72 }}>
              {Object.entries(chunkStats?.distribution ?? {}).map(([l, v], i) => {
                const maxV = Math.max(...Object.values(chunkStats?.distribution ?? {}), 1);
                const c = [T.red, T.orange, T.blue, T.green, T.green][i];
                return (
                  <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: c, fontWeight: 600 }}>{v}</span>
                    <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.07, ease }}
                      style={{ width: '100%', originY: 1, borderRadius: 6, background: c,
                        opacity: 0.75, height: Math.max(4, (v / maxV) * 52) }} />
                    <span style={{ fontSize: 10, color: T.muted }}>{l}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Eval runs list */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionTitle icon="◉" title={`Eval Runs (${chunks.length})`} color={T.purple} />
              <span style={{ fontSize: 11, color: T.muted }}>Click any row to inspect full trace</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '24px 16px 80px 1fr 50px 60px',
              gap: 0, padding: '8px 16px', fontSize: 9, color: T.muted, letterSpacing: '0.1em',
              textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>
              {['#','','User','Content Preview','Score','Time'].map(h=><span key={h}>{h}</span>)}
            </div>
            {loading
              ? <div style={{ padding: 20, display: 'flex', gap: 8, alignItems: 'center', color: T.sub }}><Spinner /> Loading…</div>
              : chunks.length === 0
              ? <div style={{ padding: 20, fontSize: 12, color: T.muted, textAlign: 'center' }}>No evaluated chunks yet — click "Eval All Pending"</div>
              : chunks.map((r, i) => <RunRow key={r.id} run={r} type="chunk" index={i} />)
            }
          </Card>
        </>
      )}

      {/* ── Pipeline 2: Simulation Quality ── */}
      {pipeline === 'sims' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[
              { label: 'Evals Run',           value: simStats?.total_evals ?? '—',  color: T.text },
              { label: 'Avg Personalisation', value: simStats ? `${simStats.avg_personalisation}/10` : '—',
                color: sColor(simStats?.avg_personalisation) },
              { label: 'Avg Groundedness',    value: simStats ? `${simStats.avg_groundedness}/10` : '—',
                color: sColor(simStats?.avg_groundedness) },
              { label: 'Hallucination Rate',  value: simStats ? `${simStats.hallucination_rate}%` : '—',
                color: simStats?.hallucination_rate > 20 ? T.red : simStats?.hallucination_rate > 10 ? T.orange : T.green },
            ].map((k, i) => (
              <Card key={i}><Label>{k.label}</Label><Val color={k.color} size={24}>{simStats !== null ? k.value : <Spinner />}</Val></Card>
            ))}
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionTitle icon="◎" title={`Simulation Evals (${simRuns.length})`} color={T.blue} />
              <span style={{ fontSize: 11, color: T.muted }}>Click any row to inspect full trace</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '24px 16px 80px 1fr 50px 60px',
              gap: 0, padding: '8px 16px', fontSize: 9, color: T.muted, letterSpacing: '0.1em',
              textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>
              {['#','','User','Scores + Hallucinations','Overall','Time'].map(h=><span key={h}>{h}</span>)}
            </div>
            {loading
              ? <div style={{ padding: 20, display: 'flex', gap: 8, color: T.sub }}><Spinner /> Loading…</div>
              : simRuns.length === 0
              ? <div style={{ padding: 20, fontSize: 12, color: T.muted, textAlign: 'center' }}>No simulation evals yet — run a simulation to trigger Pipeline 2</div>
              : simRuns.map((r, i) => <RunRow key={r.id} run={r} type="sim" index={i} />)
            }
          </Card>
        </>
      )}

      {/* ── Pipeline 3: Enhance Guard ── */}
      {pipeline === 'enhance' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              { label: 'Total Enhancements', value: enhStats?.total_enhancements ?? '—', color: T.text },
              { label: 'Flagged',            value: enhStats?.total_flagged ?? '—',
                color: (enhStats?.total_flagged ?? 0) > 0 ? T.orange : T.green },
              { label: 'Hallucination Rate', value: enhStats ? `${enhStats.hallucination_rate}%` : '—',
                color: enhStats?.hallucination_rate > 30 ? T.red : enhStats?.hallucination_rate > 10 ? T.orange : T.green },
            ].map((k, i) => (
              <Card key={i}><Label>{k.label}</Label><Val color={k.color} size={24}>{enhStats !== null ? k.value : <Spinner />}</Val></Card>
            ))}
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionTitle icon="⚠" title={`Enhancement Guard Logs (${enhLogs.length})`} color={T.orange} />
              <span style={{ fontSize: 11, color: T.muted }}>Click any row to inspect full trace</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '24px 16px 80px 1fr 90px 60px',
              gap: 0, padding: '8px 16px', fontSize: 9, color: T.muted, letterSpacing: '0.1em',
              textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>
              {['#','','User','Original Brief','Status','Time'].map(h=><span key={h}>{h}</span>)}
            </div>
            {loading
              ? <div style={{ padding: 20, display: 'flex', gap: 8, color: T.sub }}><Spinner /> Loading…</div>
              : enhLogs.length === 0
              ? <div style={{ padding: 20, fontSize: 12, color: T.muted, textAlign: 'center' }}>No enhance logs yet — use the ✦ enhancer in the chatbot</div>
              : enhLogs.map((r, i) => <RunRow key={r.id} run={r} type="enhance" index={i} />)
            }
          </Card>
        </>
      )}
    </div>
  );
}

function _AIEvalTabLegacy_DISABLED() {
  const [stats,         setStats]         = useState(null);
  const [worst,         setWorst]         = useState([]);
  const [best,          setBest]          = useState([]);
  const [byUser,        setByUser]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [evaling,       setEvaling]       = useState(false);
  const [view,          setView]          = useState('worst');
  const [simEvalStats,  setSimEvalStats]  = useState(null);
  const [simEvalRecent, setSimEvalRecent] = useState([]);
  const [enhStats,      setEnhStats]      = useState(null);
  const { toast, show } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getChunkEvalStats().then(setStats),
      getChunkWorst().then(setWorst),
      getChunkBest().then(setBest),
      getChunksByUser().then(setByUser),
      getSimEvalStats().then(setSimEvalStats),
      getSimEvalRecent().then(setSimEvalRecent),
      getEnhanceStats().then(setEnhStats),
    ]).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleEvalAll() {
    setEvaling(true);
    try { const r = await evalAllPending(); show(r.message); setTimeout(() => { load(); setEvaling(false); }, 3000); }
    catch (e) { show(e.message, false); setEvaling(false); }
  }
  async function handleEvalOne(id) {
    try { await evalOneChunk(id); show('Re-evaluation queued'); setTimeout(load, 2500); }
    catch (e) { show(e.message, false); }
  }

  const dist = stats?.distribution ?? {};
  const distBars = Object.entries(dist).map(([l, v]) => ({ l, v }));
  const chunks = view === 'worst' ? worst : best;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toast toast={toast} />

      {/* ── Pipeline 1 header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: T.purple }}>◆</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Pipeline 1 — Knowledge Chunk Quality</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Network Avg Score', value: stats ? `${stats.avg_score}/10` : '—',
            color: stats?.avg_score >= 6 ? T.green : stats?.avg_score >= 4 ? T.orange : T.red },
          { label: 'Total Chunks',      value: stats?.total_chunks ?? '—', color: T.text },
          { label: 'Evaluated',         value: stats?.total_evaluated ?? '—', color: T.blue },
          { label: 'Below Threshold',   value: stats?.below_threshold ?? '—',
            color: (stats?.below_threshold ?? 0) > 0 ? T.orange : T.green },
        ].map((k, i) => (
          <Card key={i}>
            <Label>{k.label}</Label>
            <Val color={k.color} size={24}>{loading ? <Spinner /> : k.value}</Val>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle icon="◆" title="Score Distribution" color={T.purple} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(stats?.total_pending ?? 0) > 0 && (
              <span style={{ fontSize: 11, color: T.orange }}>{stats.total_pending} pending</span>
            )}
            <motion.button onClick={handleEvalAll} disabled={evaling}
              whileHover={!evaling ? { scale: 1.03 } : {}} whileTap={!evaling ? { scale: 0.97 } : {}}
              style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.purple}40`,
                background: evaling ? `${T.purple}08` : `${T.purple}12`, color: T.purple,
                fontSize: 11, cursor: evaling ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              {evaling ? 'Evaluating…' : '◆ Eval All Pending'}
            </motion.button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 80 }}>
          {distBars.map((d, i) => {
            const max = Math.max(...distBars.map(x => x.v), 1);
            const c = [T.red, T.orange, T.blue, T.green, T.green][i];
            return (
              <div key={d.l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, color: c, fontWeight: 600 }}>{d.v}</span>
                <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease }}
                  style={{ width: '100%', originY: 1, borderRadius: 6, background: c,
                    opacity: 0.75, height: Math.max(4, (d.v / max) * 56) }} />
                <span style={{ fontSize: 10, color: T.muted }}>{d.l}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle icon="◉" title="Agent Quality by User" color={T.purple} />
        {byUser.length === 0
          ? <div style={{ fontSize: 12, color: T.muted }}>No evaluated chunks yet. Click "Eval All Pending".</div>
          : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px 80px',
              fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
              {['User','Chunks','Evaluated','Avg Score','Low (<4)'].map(h => <span key={h}>{h}</span>)}
            </div>
            {byUser.map((u, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px 80px',
                padding: '10px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.text, alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontWeight: 600 }}>{u.user_name}</span>
                <span>{u.total_chunks}</span>
                <span style={{ color: T.sub }}>{u.evaluated}</span>
                <span style={{ color: sColor(u.avg_score), fontWeight: 700 }}>
                  {u.evaluated > 0 ? `${u.avg_score}/10` : '—'}
                </span>
                <span style={{ color: u.below_threshold > 0 ? T.orange : T.muted, fontWeight: u.below_threshold > 0 ? 600 : 400 }}>
                  {u.below_threshold > 0 ? u.below_threshold : '—'}
                </span>
              </div>
            ))}
          </>
        )}
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle icon="◈" title={view === 'worst' ? 'Lowest Scored Chunks' : 'Highest Scored Chunks'} color={T.blue} />
          <div style={{ display: 'flex', gap: 6 }}>
            {['worst','best'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '6px 14px', borderRadius: 8,
                  border: `1px solid ${view===v ? T.blue+'40' : T.border}`,
                  background: view===v ? `${T.blue}0D` : 'transparent',
                  color: view===v ? T.blue : T.sub, fontSize: 11, cursor: 'pointer', fontWeight: 500,
                  textTransform: 'capitalize' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        {chunks.length === 0
          ? <div style={{ fontSize: 12, color: T.muted }}>No evaluated chunks yet.</div>
          : chunks.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, ease }}
            style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}`,
              display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <ScoreBadge score={c.eval_score} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: T.sub, background: 'rgba(255,255,255,0.08)',
                  padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>{c.category}</span>
                <span style={{ fontSize: 11, color: T.muted }}>{c.user_name}</span>
              </div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55, marginBottom: 6, fontStyle: 'italic' }}>
                "{c.content}"
              </div>
              {c.eval_reason && <div style={{ fontSize: 12, color: T.sub, marginBottom: 6 }}>{c.eval_reason}</div>}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(c.eval_flags || []).map(f => <FlagChip key={f} flag={f} />)}
              </div>
            </div>
            <button onClick={() => handleEvalOne(c.id)}
              style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
                background: 'transparent', color: T.sub, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.blue; e.currentTarget.style.color = T.blue; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub; }}>
              Re-eval
            </button>
          </motion.div>
        ))}
      </Card>

      {/* ── Pipeline 2 ── */}
      <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: T.blue }}>◎</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Pipeline 2 — Simulation Personalisation</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Evals Run',           value: simEvalStats?.total_evals ?? '—',  color: T.text },
          { label: 'Avg Personalisation', value: simEvalStats ? `${simEvalStats.avg_personalisation}/10` : '—',
            color: simEvalStats?.avg_personalisation >= 7 ? T.green : simEvalStats?.avg_personalisation >= 5 ? T.orange : T.red },
          { label: 'Avg Groundedness',    value: simEvalStats ? `${simEvalStats.avg_groundedness}/10` : '—',
            color: simEvalStats?.avg_groundedness >= 7 ? T.green : simEvalStats?.avg_groundedness >= 5 ? T.orange : T.red },
          { label: 'Hallucination Rate',  value: simEvalStats ? `${simEvalStats.hallucination_rate}%` : '—',
            color: simEvalStats?.hallucination_rate > 20 ? T.red : simEvalStats?.hallucination_rate > 10 ? T.orange : T.green },
        ].map((k, i) => (
          <Card key={i}><Label>{k.label}</Label><Val color={k.color} size={22}>{simEvalStats !== null ? k.value : <Spinner />}</Val></Card>
        ))}
      </div>

      {simEvalRecent.length > 0 && (
        <Card>
          <SectionTitle icon="◆" title="Recent Simulation Scores" color={T.blue} />
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 80px 1fr',
            fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
            paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
            {['Time','User','Personal.','Grounded.','Overall','Hallucinations'].map(h => <span key={h}>{h}</span>)}
          </div>
          {simEvalRecent.map((e, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 80px 1fr',
              padding: '10px 0', borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.text, alignItems: 'center',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
              <span style={{ color: T.sub, fontSize: 11 }}>{relativeTime(e.created_at)}</span>
              <span style={{ fontWeight: 600 }}>{e.user_name}</span>
              <span style={{ color: sColor(e.personalisation), fontWeight: 700 }}>{e.personalisation}/10</span>
              <span style={{ color: sColor(e.groundedness), fontWeight: 700 }}>{e.groundedness}/10</span>
              <span style={{ color: sColor(e.overall), fontWeight: 700 }}>{e.overall}/10</span>
              <span style={{ fontSize: 11, color: e.hallucinations?.length > 0 ? T.orange : T.muted }}>
                {e.hallucinations?.length > 0 ? `⚠ ${e.hallucinations[0]}` : '—'}
              </span>
            </div>
          ))}
        </Card>
      )}

      {simEvalRecent.length === 0 && simEvalStats !== null && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: `${T.blue}08`,
          border: `1px solid ${T.blue}20`, fontSize: 12, color: T.sub, textAlign: 'center' }}>
          No simulation evals yet — run a simulation to trigger Pipeline 2.
        </div>
      )}

      {/* ── Pipeline 3 ── */}
      <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: T.orange }}>⚠</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Pipeline 3 — Enhancer Hallucination Guard</span>
      </div>

      <Card style={{ border: enhStats?.hallucination_rate > 30 ? `1px solid ${T.orange}30` : `1px solid ${T.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
          {[
            { label: 'Total Enhancements', value: enhStats?.total_enhancements ?? '—', color: T.text },
            { label: 'Flagged',            value: enhStats?.total_flagged ?? '—',
              color: (enhStats?.total_flagged ?? 0) > 0 ? T.orange : T.green },
            { label: 'Hallucination Rate', value: enhStats ? `${enhStats.hallucination_rate}%` : '—',
              color: enhStats?.hallucination_rate > 30 ? T.red : enhStats?.hallucination_rate > 10 ? T.orange : T.green },
          ].map((k, i) => (
            <div key={i} style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}` }}>
              <Label>{k.label}</Label>
              <Val color={k.color} size={22}>{enhStats !== null ? k.value : <Spinner />}</Val>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.65 }}>
          The ✦ enhancer expands user messages. A hallucination is when it adds specific facts not in the original message or known context.
          Users see an inline warning in the chatbot when this is detected.
          {enhStats?.hallucination_rate > 30 && (
            <span style={{ color: T.orange, display: 'block', marginTop: 6, fontWeight: 500 }}>
              ⚠ Rate above 30% — tighten the enhance prompt in chatbot_service.py
            </span>
          )}
        </div>
      </Card>

      <RawDataInspector worst={worst} best={best} simEvalRecent={simEvalRecent} />
    </div>
  );
}

// ── Raw Data Inspector (legacy — only used by disabled tab) ──────────────────
function _RawDataInspector_DISABLED({ worst, best, simEvalRecent }) {
  const [open,      setOpen]      = useState(false);
  const [section,   setSection]   = useState('chunks');
  const [enhLogs,   setEnhLogs]   = useState([]);
  const [enhLoaded, setEnhLoaded] = useState(false);

  function toggle() {
    setOpen(o => !o);
    if (!enhLoaded) {
      getEnhanceLogs().then(d => { setEnhLogs(d); setEnhLoaded(true); }).catch(() => {});
    }
  }

  const sections = [
    { id: 'chunks', label: 'Chunk Scores' },
    { id: 'sims',   label: 'Simulation Evals' },
    { id: 'enh',    label: 'Enhance Logs' },
  ];

  const allChunks = [...worst, ...best]
    .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
    .sort((a, b) => (a.eval_score ?? 0) - (b.eval_score ?? 0));

  const tblHead = { fontSize: 10, color: T.sub, fontWeight: 500, letterSpacing: '0.06em',
    textTransform: 'uppercase', paddingBottom: 10, borderBottom: `1px solid ${T.border}` };

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={toggle}
        style={{ width: '100%', padding: '12px 18px', borderRadius: 12, border: `1px solid ${T.border}`,
          background: open ? T.card : 'rgba(255,255,255,0.05)', color: T.sub, fontSize: 12, cursor: 'pointer',
          fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: open ? T.shadow : 'none', transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = T.text}
        onMouseLeave={e => e.currentTarget.style.color = T.sub}>
        <span>⬡ Raw Data Inspector</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease }}>
          <div style={{ display: 'flex', gap: 6, margin: '10px 0 12px' }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                style={{ padding: '7px 16px', borderRadius: 8,
                  border: `1px solid ${section===s.id ? T.blue+'40' : T.border}`,
                  background: section===s.id ? `${T.blue}0D` : 'transparent',
                  color: section===s.id ? T.blue : T.sub, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                {s.label}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted, display: 'flex', alignItems: 'center' }}>
              Read-only · direct from DB
            </span>
          </div>

          {section === 'chunks' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '44px 1fr 80px 80px 70px 1fr', ...tblHead }}>
                {['Score','Content','Category','User','Status','Reason'].map(h => <span key={h}>{h}</span>)}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {allChunks.length === 0
                  ? <div style={{ padding: 16, fontSize: 12, color: T.muted }}>No evaluated chunks yet.</div>
                  : allChunks.map((c, i) => (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 80px 70px 1fr',
                    padding: '9px 18px', borderBottom: `1px solid ${T.border}`,
                    fontSize: 12, color: T.text, alignItems: 'center',
                    background: i % 2 === 0 ? T.card : 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontWeight: 700, color: sColor(c.eval_score) }}>{c.eval_score ?? '—'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      paddingRight: 8, fontStyle: 'italic' }}>"{c.content}"</span>
                    <span style={{ color: T.sub, fontSize: 11 }}>{c.category}</span>
                    <span style={{ color: T.sub, fontSize: 11 }}>{c.user_name}</span>
                    <span style={{ fontSize: 10, color: c.eval_status === 'done' ? T.green : T.orange, fontWeight: 600 }}>
                      {c.eval_status}
                    </span>
                    <span style={{ color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                      {c.eval_reason || '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
                {allChunks.length} chunks · sorted by score ascending
              </div>
            </Card>
          )}

          {section === 'sims' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 70px 1fr', ...tblHead }}>
                {['Time','User','Personal.','Grounded.','Overall','Hallucinations'].map(h => <span key={h}>{h}</span>)}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {simEvalRecent.length === 0
                  ? <div style={{ padding: 16, fontSize: 12, color: T.muted }}>No simulation evals yet.</div>
                  : simEvalRecent.map((e, i) => (
                  <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 70px 1fr',
                    padding: '9px 18px', borderBottom: `1px solid ${T.border}`,
                    fontSize: 12, color: T.text, alignItems: 'center',
                    background: i % 2 === 0 ? T.card : 'rgba(255,255,255,0.03)' }}>
                    <span style={{ color: T.sub, fontSize: 11 }}>{relativeTime(e.created_at)}</span>
                    <span style={{ fontWeight: 600 }}>{e.user_name}</span>
                    <span style={{ color: sColor(e.personalisation), fontWeight: 700 }}>{e.personalisation}/10</span>
                    <span style={{ color: sColor(e.groundedness), fontWeight: 700 }}>{e.groundedness}/10</span>
                    <span style={{ color: sColor(e.overall), fontWeight: 700 }}>{e.overall}/10</span>
                    <span style={{ fontSize: 11, color: e.hallucinations?.length > 0 ? T.orange : T.muted,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.hallucinations?.length > 0 ? e.hallucinations.join(', ') : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
                {simEvalRecent.length} records · most recent first
              </div>
            </Card>
          )}

          {section === 'enh' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '100px 1fr 70px 1fr', ...tblHead }}>
                {['Time','Original Brief','Flagged','Invented Facts'].map(h => <span key={h}>{h}</span>)}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {!enhLoaded
                  ? <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center' }}><Spinner /><span style={{ fontSize: 12, color: T.sub }}>Loading…</span></div>
                  : enhLogs.length === 0
                  ? <div style={{ padding: 16, fontSize: 12, color: T.muted }}>No enhance logs yet.</div>
                  : enhLogs.map((e, i) => (
                  <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 70px 1fr',
                    padding: '9px 18px', borderBottom: `1px solid ${T.border}`,
                    fontSize: 12, color: T.text, alignItems: 'center',
                    background: e.flagged ? `${T.orange}08` : i % 2 === 0 ? T.card : 'rgba(255,255,255,0.03)' }}>
                    <span style={{ color: T.sub, fontSize: 11 }}>{relativeTime(e.created_at)}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      paddingRight: 8, fontStyle: 'italic' }}>"{e.original}"</span>
                    <span style={{ color: e.flagged ? T.orange : T.green, fontWeight: 700, fontSize: 11 }}>
                      {e.flagged ? '⚠ Yes' : '✓ No'}
                    </span>
                    <span style={{ fontSize: 11, color: e.hallucinations?.length > 0 ? T.orange : T.muted,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.hallucinations?.length > 0 ? e.hallucinations.join(' · ') : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 18px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
                {enhLogs.length} records · most recent first
              </div>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function DeveloperPage({ onBack }) {
  const [tab, setTab] = useState('llm');

  function handleSignOut() {
    localStorage.removeItem('unimind_dev_token');
    onBack();
  }

  return (
    <div className="dev-root" style={{ width: '100vw', height: '100vh', display: 'flex', background: T.bg, overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dev-root, .dev-root * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .dev-root input::placeholder { color: ${T.muted}; }
        .dev-root textarea::placeholder { color: ${T.muted}; }
        .dev-root input, .dev-root textarea { font-family: 'Inter', sans-serif; }
      `}</style>

      <Sidebar active={tab} setActive={setTab} onSignOut={handleSignOut} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 32px 20px',
          scrollbarWidth: 'thin', scrollbarColor: `${T.muted} transparent` }}>
          <InnerTop tab={tab} />
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease }}>
              {tab === 'llm'       && <LLMTab />}
              {tab === 'funnel'    && <FunnelTab />}
              {tab === 'users'     && <UsersTab />}
              {tab === 'sims'      && <SimulationsTab />}
              {tab === 'controls'  && <ControlsTab />}
              {tab === 'community' && <CommunityTab />}
              {tab === 'eval'      && <AIEvalTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
