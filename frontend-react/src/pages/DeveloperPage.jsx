import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getDevLLMStats, getDevLLMRecent, getDevLLMHourly,
  getDevFunnel,
  getDevUsers, clearDevUser, suspendDevUser,
  deleteDevPost, broadcastMessage,
  getDevFlags, updateDevFlags,
  getDevSimStats, getDevSimRecent, getDevSimDaily,
  getDevCommunity,
} from '../lib/api';

const G  = '#00FF94';
const C  = '#00D1FF';
const BG = '#02030A';
const ease = [0.22, 1, 0.36, 1];

// ─── shared primitives ────────────────────────────────────────────────────────
const glass = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };

function Card({ children, style = {} }) {
  return <div style={{ ...glass, padding: 20, ...style }}>{children}</div>;
}

function Label({ children, color = 'rgba(255,255,255,0.3)' }) {
  return <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color, marginBottom: 6 }}>{children}</div>;
}

function Val({ children, color = 'white', size = 28 }) {
  return <div style={{ fontSize: size, fontWeight: 300, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{children}</div>;
}

function Pill({ ok, label }) {
  const color = ok ? G : '#FF4444';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99,
      background: `${color}12`, border: `1px solid ${color}35`, fontSize: 10, color, letterSpacing: '0.08em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, display: 'inline-block' }} />
      {label}
    </span>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 13, color: G }}>{icon}</span>
      <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{title}</span>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${G}30`,
    borderTopColor: G, animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function Bars({ data = [], colorKey = G, height = 48, labelKey = 'l', valKey = 'v' }) {
  const max = Math.max(...data.map(d => d[valKey] ?? d.count ?? 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => {
        const v = d[valKey] ?? d.count ?? 0;
        const l = d[labelKey] ?? d.hour ?? d.day ?? '';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: i * 0.04, ease }}
              style={{ width: '100%', originY: 1, borderRadius: 3, background: colorKey,
                opacity: 0.4 + (v / max) * 0.6, height: Math.max(3, (v / max) * (height - 14)) }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>{l}</span>
          </div>
        );
      })}
    </div>
  );
}

function actionBtn(bg, color = 'rgba(255,255,255,0.4)') {
  return { padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}40`,
    background: bg, color, fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em' };
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

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'llm',       icon: '◎', label: 'LLM Health' },
  { id: 'funnel',    icon: '⟁', label: 'Onboarding Funnel' },
  { id: 'users',     icon: '◉', label: 'User List' },
  { id: 'sims',      icon: '✦', label: 'Simulations' },
  { id: 'controls',  icon: '⬡', label: 'Controls' },
  { id: 'community', icon: '◈', label: 'Community' },
];

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
function TopBar({ onBack }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 36px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: G, boxShadow: `0 0 10px ${G}` }} />
        <span style={{ fontSize: 10, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)' }}>UNIMIND</span>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
        <span style={{ fontSize: 10, letterSpacing: '0.25em', color: G }}>CONTROL PLANE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Pill ok={true} label="Backend Live" />
        <Pill ok={true} label="Azure Connected" />
        <button onClick={() => { localStorage.removeItem('unimind_dev_token'); onBack(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
          ← Sign Out
        </button>
      </div>
    </div>
  );
}

function TabNav({ active, setActive }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', gap: 2, padding: '16px 36px 0' }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'none', color: active === t.id ? 'white' : 'rgba(255,255,255,0.3)',
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
          {active === t.id && (
            <motion.div layoutId="tab-bg"
              style={{ position: 'absolute', inset: 0, borderRadius: 10,
                background: `${G}10`, border: `1px solid ${G}30` }}
              transition={{ duration: 0.2, ease }} />
          )}
          <span style={{ position: 'relative', fontSize: 12, color: active === t.id ? G : 'inherit' }}>{t.icon}</span>
          <span style={{ position: 'relative' }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
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
          style={{ position: 'fixed', top: 24, right: 36, zIndex: 9999, padding: '10px 18px', borderRadius: 10,
            background: toast.ok ? `${G}18` : 'rgba(255,68,68,0.15)',
            border: `1px solid ${toast.ok ? G + '40' : 'rgba(255,68,68,0.4)'}`,
            color: toast.ok ? G : '#FF4444', fontSize: 12, letterSpacing: '0.08em' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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

  const statusColor = s => s === 'llm' ? G : s === 'fallback' ? '#FF8C42' : '#FF4444';
  const statusLabel = s => s === 'llm' ? '✓ LLM OK' : s === 'fallback' ? '! FALLBACK' : '✗ ERROR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Tokens Today',    value: stats?.tokens_today?.toLocaleString() ?? '—',     color: G },
          { label: 'Est. Cost Today', value: stats ? `$${stats.cost_today_usd.toFixed(4)}` : '—', color: C },
          { label: 'Fallback Rate',   value: stats ? `${stats.fallback_rate}%` : '—',
            color: stats?.fallback_rate > 20 ? '#FF4444' : '#FF8C42' },
          { label: 'Avg Response',    value: stats ? `${(stats.avg_duration_ms/1000).toFixed(1)}s` : '—', color: 'white' },
        ].map((k, i) => (
          <Card key={i} style={{ borderColor: k.color === G ? `${G}25` : 'rgba(255,255,255,0.07)' }}>
            <Label>{k.label}</Label>
            <Val color={k.color}>{stats ? k.value : <Spinner />}</Val>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
              {i === 0 && stats && `${stats.total_calls_today} calls today`}
              {i === 1 && '~$0.03 per 1k tokens'}
              {i === 2 && stats && `${stats.fallback_rate > 20 ? '⚠ High — check prompts' : 'Healthy'}`}
              {i === 3 && 'P50 across all call types'}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle icon="◎" title="Token Usage — Last 24h" />
        {hourly.length ? <Bars data={hourly} colorKey={G} height={64} labelKey="hour" valKey="tokens" />
          : <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No LLM calls yet today.</div>}
      </Card>

      <Card>
        <SectionTitle icon="◈" title="Recent LLM Calls" />
        {recent.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No calls logged yet.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 90px 1fr 70px 60px 100px',
              fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase',
              paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
              {['Time','Type','User','Tokens','Latency','Status'].map(h => <span key={h}>{h}</span>)}
            </div>
            {recent.slice(0, 15).map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 90px 1fr 70px 60px 100px',
                padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
                fontSize: 12, color: 'rgba(255,255,255,0.65)', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{relativeTime(r.created_at)}</span>
                <span style={{ color: r.call_type === 'simulation' ? C : 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{r.call_type}</span>
                <span>{r.user_name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(r.tokens_in + r.tokens_out).toLocaleString()}</span>
                <span style={{ color: r.duration_ms > 3000 ? '#FF8C42' : 'rgba(255,255,255,0.4)' }}>{(r.duration_ms / 1000).toFixed(1)}s</span>
                <span style={{ color: statusColor(r.status), fontSize: 10 }}>{statusLabel(r.status)}</span>
              </div>
            ))}
            {stats?.fallback_rate > 15 && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,140,66,0.07)', border: '1px solid rgba(255,140,66,0.2)' }}>
                <span style={{ fontSize: 11, color: '#FF8C42' }}>
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

  if (!data) return <div style={{ color: 'rgba(255,255,255,0.3)', padding: 20, display: 'flex', gap: 10 }}><Spinner /> Loading funnel…</div>;

  const steps = [
    { label: 'Signed Up',           n: data.signed_up,       color: C },
    { label: 'Chatbot Complete',    n: data.chatbot_complete, color: '#7B61FF' },
    { label: 'Ran Simulation',      n: data.ran_simulation,   color: G },
    { label: 'Posted to Community', n: data.posted,           color: '#FF5FB6' },
  ];

  const biggestDrop = steps.reduce((worst, s, i) => {
    if (i === 0) return worst;
    const drop = steps[i-1].n - s.n;
    return drop > worst.drop ? { drop, from: steps[i-1].label, to: s.label } : worst;
  }, { drop: 0, from: '', to: '' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle icon="⟁" title="Conversion Funnel — All Time" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map((s, i) => {
            const pct = Math.round((s.n / steps[0].n) * 100);
            const drop = i > 0 ? steps[i-1].n - s.n : 0;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 16 }}>{i+1}</span>
                    <span style={{ fontSize: 13, color: 'white' }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {i > 0 && <span style={{ fontSize: 10, color: '#FF4444' }}>−{drop.toLocaleString()} dropped</span>}
                    <span style={{ fontSize: 18, fontWeight: 300, color: s.color }}>{s.n.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 36, textAlign: 'right' }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease }}
                    style={{ height: '100%', borderRadius: 99, background: s.color, opacity: 0.8 }} />
                </div>
                {i < steps.length - 1 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4, paddingLeft: 26 }}>
                    → {steps[i+1].n > 0 ? Math.round((steps[i+1].n / s.n) * 100) : 0}% proceed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card style={{ borderColor: 'rgba(255,140,66,0.2)', background: 'rgba(255,140,66,0.04)' }}>
          <div style={{ fontSize: 10, color: '#FF8C42', letterSpacing: '0.15em', marginBottom: 8 }}>⚠ BIGGEST DROP</div>
          <div style={{ fontSize: 18, color: 'white', fontWeight: 300, marginBottom: 6 }}>
            {biggestDrop.from} → {biggestDrop.to}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            {biggestDrop.drop.toLocaleString()} users dropped at this step. This is your highest-priority engagement gap.
          </div>
        </Card>
        <Card style={{ borderColor: `${G}20`, background: `${G}04` }}>
          <div style={{ fontSize: 10, color: G, letterSpacing: '0.15em', marginBottom: 8 }}>OVERALL CONVERSION</div>
          <div style={{ fontSize: 32, color: 'white', fontWeight: 300, marginBottom: 6 }}>
            {steps[0].n > 0 ? Math.round((steps[3].n / steps[0].n) * 100) : 0}%
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            of signups reach the community — full top-to-bottom conversion.
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="◉" title="Recent Signups — Funnel Position" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px 120px',
          fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase',
          paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
          {['User','Joined','Chatbot','Simulation','Community'].map(h => <span key={h}>{h}</span>)}
        </div>
        {(data.recent_signups || []).map((u, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px 120px',
            padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
            fontSize: 12, color: 'rgba(255,255,255,0.65)', alignItems: 'center' }}>
            <span style={{ color: C }}>{u.name}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{u.joined}</span>
            <span style={{ color: u.chatbot ? G : 'rgba(255,255,255,0.2)' }}>{u.chatbot ? '✓ Done' : '○ Not yet'}</span>
            <span style={{ color: u.simulation ? G : 'rgba(255,255,255,0.2)' }}>{u.simulation ? '✓ Done' : '○ Not yet'}</span>
            <span style={{ color: u.community ? G : 'rgba(255,255,255,0.2)' }}>{u.community ? '✓ Posted' : '○ Not yet'}</span>
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
  const [users, setUsers]         = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [confirmClear, setConfirm]= useState(null);
  const { toast, show }           = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getDevUsers().then(d => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClear(id) {
    try { await clearDevUser(id); show(`Cleared data for ${id}`); load(); }
    catch (e) { show(e.message, false); }
    setConfirm(null);
  }

  async function handleSuspend(id) {
    try { const r = await suspendDevUser(id); show(r.message); load(); }
    catch (e) { show(e.message, false); }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const qualityColor = q => q === 'Strong' ? G : q === 'Moderate' ? '#FF8C42' : 'rgba(255,255,255,0.3)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toast toast={toast} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Users',   v: users.length, color: C },
          { label: 'Active Agents', v: users.filter(u => u.agent_quality === 'Strong' || u.agent_quality === 'Moderate').length, color: G },
          { label: 'Thin/Empty',    v: users.filter(u => u.agent_quality === 'Thin' || u.agent_quality === 'Empty').length, color: '#FF8C42' },
          { label: 'Suspended',     v: users.filter(u => u.suspended).length, color: '#FF4444' },
        ].map((s, i) => (
          <Card key={i}><Label>{s.label}</Label><Val color={s.color} size={24}>{loading ? <Spinner /> : s.v}</Val></Card>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
        style={{ width: '100%', padding: '11px 16px', borderRadius: 12, outline: 'none', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.8)', fontSize: 13 }} />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 100px 90px 140px',
          fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {['User','Joined','Chunks','Sims','Last Active','Quality','Actions'].map(h => <span key={h}>{h}</span>)}
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading
            ? <div style={{ padding: 20, color: 'rgba(255,255,255,0.3)', display:'flex', gap:8 }}><Spinner /> Loading…</div>
            : filtered.map((u, i) => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 100px 90px 140px',
              padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center',
              fontSize: 12, color: 'rgba(255,255,255,0.65)',
              opacity: u.suspended ? 0.4 : 1,
              background: confirmClear === u.id ? 'rgba(255,68,68,0.05)' : 'transparent' }}>
              <div>
                <div style={{ color: 'white', marginBottom: 1 }}>{u.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{u.email}</div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{u.joined}</span>
              <span style={{ color: u.chunks > 0 ? 'white' : 'rgba(255,255,255,0.2)' }}>{u.chunks}</span>
              <span style={{ color: u.sims > 0 ? C : 'rgba(255,255,255,0.2)' }}>{u.sims}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{relativeTime(u.last_active)}</span>
              <span style={{ fontSize: 10, color: qualityColor(u.agent_quality) }}>{u.agent_quality}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {confirmClear === u.id ? (
                  <>
                    <button onClick={() => setConfirm(null)} style={actionBtn('rgba(255,255,255,0.08)')}>Cancel</button>
                    <button onClick={() => handleClear(u.id)} style={actionBtn('rgba(255,68,68,0.15)', '#FF4444')}>Confirm</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirm(u.id)} style={actionBtn('rgba(255,255,255,0.05)')}>Clear</button>
                    <button onClick={() => handleSuspend(u.id)}
                      style={actionBtn(u.suspended ? `${G}15` : 'rgba(255,68,68,0.08)', u.suspended ? G : '#FF4444')}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Simulations', value: stats?.total?.toLocaleString() ?? '—',     color: C },
          { label: 'Today',             value: stats?.today ?? '—',                        color: 'white' },
          { label: 'Fallback Rate',     value: stats ? `${stats.fallback_rate}%` : '—',
            color: stats?.fallback_rate > 20 ? '#FF4444' : '#FF8C42' },
          { label: 'Avg Chunks Used',   value: stats ? `${stats.avg_chunks}` : '—',
            color: stats && stats.avg_chunks < 5 ? '#FF8C42' : G },
        ].map((k, i) => (
          <Card key={i}><Label>{k.label}</Label><Val color={k.color} size={24}>{stats ? k.value : <Spinner />}</Val></Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Card>
          <SectionTitle icon="◎" title="Simulations Per Day — Last 7 Days" />
          {daily.length ? <Bars data={daily} colorKey={C} height={56} labelKey="day" valKey="count" />
            : <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No simulation data yet.</div>}
        </Card>
        <Card style={{
          borderColor: stats?.fallback_rate > 20 ? 'rgba(255,68,68,0.3)' : 'rgba(255,140,66,0.2)',
          background: stats?.fallback_rate > 20 ? 'rgba(255,68,68,0.05)' : 'rgba(255,140,66,0.04)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 10,
            color: stats?.fallback_rate > 20 ? '#FF4444' : '#FF8C42' }}>
            {stats?.fallback_rate > 20 ? '⚠ HIGH FALLBACK' : '! WATCH THIS'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 300, color: 'white', marginBottom: 8 }}>
            {stats ? `${stats.fallback_rate}%` : <Spinner />}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Primary cause: users running simulations before adding enough knowledge chunks.
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="✦" title="Recent Simulations" />
        {recent.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No simulations logged yet.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px 80px 110px',
              fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase',
              paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
              {['Time','User','Chunks','Duration','Output'].map(h => <span key={h}>{h}</span>)}
            </div>
            {recent.slice(0, 15).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px 80px 110px',
                padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
                fontSize: 12, color: 'rgba(255,255,255,0.65)', alignItems: 'center',
                background: s.output_type === 'fallback' ? 'rgba(255,140,66,0.03)' : 'transparent' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{relativeTime(s.created_at)}</span>
                <span style={{ color: s.chunks_used < 3 ? '#FF8C42' : 'rgba(255,255,255,0.7)' }}>{s.user_name}</span>
                <span style={{ color: s.chunks_used < 3 ? '#FF8C42' : s.chunks_used > 10 ? G : 'white' }}>{s.chunks_used}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{(s.duration_ms / 1000).toFixed(1)}s</span>
                <span style={{ fontSize: 10, color: s.output_type === 'llm' ? G : '#FF8C42' }}>
                  {s.output_type === 'llm' ? '✓ LLM' : '! FALLBACK'}
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
  const [flags, setFlags]           = useState(null);
  const [userInput, setUserInput]   = useState('');
  const [postInput, setPostInput]   = useState('');
  const [msgInput, setMsgInput]     = useState('');
  const { toast, show }             = useToast();

  useEffect(() => { getDevFlags().then(setFlags).catch(console.error); }, []);

  async function toggleFlag(key) {
    if (!flags) return;
    const next = { ...flags, [key]: !flags[key] };
    try {
      const updated = await updateDevFlags({ [key]: next[key] });
      setFlags(updated);
      show(`${key} ${next[key] ? 'enabled' : 'disabled'}`);
    } catch (e) { show(e.message, false); }
  }

  async function handleClear() {
    if (!userInput.trim()) return;
    try { await clearDevUser(userInput.trim()); show(`Cleared data for ${userInput}`); setUserInput(''); }
    catch (e) { show(e.message, false); }
  }

  async function handleDeletePost() {
    if (!postInput.trim()) return;
    try { await deleteDevPost(postInput.trim()); show(`Post ${postInput} deleted`); setPostInput(''); }
    catch (e) { show(e.message, false); }
  }

  async function handleBroadcast() {
    if (!msgInput.trim()) return;
    try { await broadcastMessage(msgInput.trim()); show('Broadcast sent to community feed'); setMsgInput(''); }
    catch (e) { show(e.message, false); }
  }

  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, outline: 'none',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.8)', fontSize: 13, boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toast toast={toast} />

      {/* Feature flags */}
      <Card>
        <SectionTitle icon="⬡" title="Feature Flags — Toggle Live" />
        {!flags ? <div style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 8 }}><Spinner /> Loading…</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.entries(flags).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 12,
                background: val ? `${G}06` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${val ? G + '25' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.2s' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'white', marginBottom: 2, textTransform: 'capitalize' }}>{key}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {key === 'simulations' && 'Azure OpenAI simulation calls'}
                    {key === 'community'   && 'Community post & reaction API'}
                    {key === 'chatbot'     && 'Chatbot message processing'}
                    {key === 'enhance'     && 'Content enhancement feature'}
                  </div>
                </div>
                <button onClick={() => toggleFlag(key)}
                  style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                    background: val ? G : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s', left: val ? 23 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          Disabling simulations or chatbot will immediately affect all active users — use when Azure is down.
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <SectionTitle icon="◉" title="Clear User Data" />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.6 }}>
            Wipes all knowledge chunks and chat history. Account stays intact.
          </div>
          <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="User ID or email" style={inputStyle} />
          <button onClick={handleClear}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,68,68,0.3)',
              background: 'rgba(255,68,68,0.08)', color: '#FF4444', fontSize: 11, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Clear User Data
          </button>
        </Card>

        <Card>
          <SectionTitle icon="◈" title="Delete Post" />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.6 }}>
            Permanently removes a community post and all reactions.
          </div>
          <input value={postInput} onChange={e => setPostInput(e.target.value)} placeholder="Post ID" style={inputStyle} />
          <button onClick={handleDeletePost}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,68,68,0.3)',
              background: 'rgba(255,68,68,0.08)', color: '#FF4444', fontSize: 11, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Delete Post
          </button>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="⟁" title="Broadcast System Message" />
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.6 }}>
          Posts a pinned announcement to the community feed visible to all users.
        </div>
        <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} rows={3}
          placeholder="Write your announcement…" style={{ ...inputStyle, resize: 'vertical' }} />
        <button onClick={handleBroadcast}
          style={{ padding: '10px 24px', borderRadius: 10, border: `1px solid ${G}35`,
            background: `${G}10`, color: G, fontSize: 11, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
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

  if (!data) return <div style={{ color: 'rgba(255,255,255,0.3)', padding: 20, display: 'flex', gap: 10 }}><Spinner /> Loading…</div>;

  const latestPosts = data.posts_per_day?.at(-1)?.count ?? 0;
  const latestReactions = data.reactions_per_day?.at(-1)?.count ?? 0;
  const isAlive = latestPosts > 0 || data.total_posts > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ borderColor: isAlive ? `${G}25` : 'rgba(255,68,68,0.3)',
        background: isAlive ? `${G}04` : 'rgba(255,68,68,0.05)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%',
          background: isAlive ? G : '#FF4444', boxShadow: `0 0 12px ${isAlive ? G : '#FF4444'}`, flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 14, color: 'white' }}>
            {isAlive ? 'Community is active.' : 'Community is quiet.'}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 10 }}>
            {data.total_posts} posts · {data.total_reactions} total reactions
          </span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <SectionTitle icon="◈" title="Posts Per Day" />
          {data.posts_per_day?.length
            ? <Bars data={data.posts_per_day} colorKey="#7B61FF" height={56} labelKey="day" valKey="count" />
            : <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No data.</div>}
        </Card>
        <Card>
          <SectionTitle icon="⟁" title="Reactions Per Day" />
          {data.reactions_per_day?.length
            ? <Bars data={data.reactions_per_day} colorKey="#FF5FB6" height={56} labelKey="day" valKey="count" />
            : <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No data.</div>}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Posts',          v: data.total_posts,           color: 'white' },
          { label: 'Total Reactions',      v: data.total_reactions,       color: '#FF5FB6' },
          { label: 'Avg Reactions/Post',   v: data.avg_reactions,         color: C },
          { label: 'Zero-engagement Posts',v: data.zero_engagement_posts, color: 'rgba(255,255,255,0.3)' },
        ].map((s, i) => (
          <Card key={i}><Label>{s.label}</Label><Val color={s.color} size={22}>{s.v}</Val></Card>
        ))}
      </div>

      <Card>
        <SectionTitle icon="◎" title="Top Posts by Reactions" />
        {(data.top_posts || []).length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No posts yet.</div>
        ) : (
          (data.top_posts || []).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', width: 16, marginTop: 1 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {p.content}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                  {p.agent_name} · {p.tag}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 16, color: '#FF5FB6', fontWeight: 300 }}>{p.total_reactions}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>reactions</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function DeveloperPage({ onBack }) {
  const [tab, setTab] = useState('llm');

  return (
    <div style={{ width: '100vw', height: '100vh', background: BG, color: 'white',
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <TopBar onBack={onBack} />
      <TabNav active={tab} setActive={setTab} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 36px 36px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25, ease }}>
            {tab === 'llm'       && <LLMTab />}
            {tab === 'funnel'    && <FunnelTab />}
            {tab === 'users'     && <UsersTab />}
            {tab === 'sims'      && <SimulationsTab />}
            {tab === 'controls'  && <ControlsTab />}
            {tab === 'community' && <CommunityTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
