import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  sendChatMessage, getChatHistory, getMe, deleteChatMessage, clearChatHistory, uploadFile,
} from '../lib/api';
import {
  AGENT_LEVELS, getAgentLevel, getXPFromChunks,
  MCP_TOOLS, MCP_TOTAL_CHUNKS, chunksFromTools,
  STUDIO_AGENTS, RESUME_PIPELINE_AGENTS,
  SUDEEP_PROFILE, buildTailoredResume, resumeToText, resumeToDocHtml,
} from '../data/knowledgeBase';
import { VoxelCharacter, VOXEL_LEVEL_CONFIG } from '../components/VoxelCharacter';
import { SpaceArena, ArenaFullscreenOverlay } from '../components/SpaceArena';

// ── Agent Level SVG Icons ─────────────────────────────────────────────────────

function BabyOrb({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="baby-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9090CC" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#4a4a8a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1a1a3a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="rgba(100,100,180,0.06)" />
      <circle cx="60" cy="60" r="28" fill="url(#baby-core)">
        <animate attributeName="r" values="26;30;26" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.5;0.8" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="52" cy="52" r="7" fill="rgba(180,180,255,0.1)" />
      <circle cx="60" cy="60" r="40" stroke="rgba(100,100,200,0.12)" strokeWidth="1" fill="none" strokeDasharray="4 6">
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="20s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function SmallOrb({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="small-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#80D8FF" stopOpacity="1" />
          <stop offset="50%" stopColor="#29B6F6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0288D1" stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id="small-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4FC3F7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="url(#small-glow)" />
      <circle cx="60" cy="60" r="38" stroke="rgba(79,195,247,0.2)" strokeWidth="1" fill="none" strokeDasharray="3 5">
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="12s" repeatCount="indefinite" />
      </circle>
      <circle r="4" fill="#4FC3F7" opacity="0.8">
        <animateMotion dur="6s" repeatCount="indefinite" path="M 60 22 A 38 38 0 1 1 59.99 22" />
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="3" fill="#80DEEA" opacity="0.6">
        <animateMotion dur="9s" repeatCount="indefinite" begin="3s" path="M 98 60 A 38 38 0 1 1 97.99 60" />
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="22" fill="url(#small-core)">
        <animate attributeName="r" values="20;24;20" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="54" cy="54" r="7" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

function MiddleHumanoid({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mid-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#CE93D8" />
          <stop offset="60%" stopColor="#7B61FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4a2080" stopOpacity="0.1" />
        </radialGradient>
        <linearGradient id="mid-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9C6FFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4a2080" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="rgba(123,97,255,0.07)" />
      <ellipse cx="60" cy="74" rx="16" ry="22" fill="url(#mid-body)" opacity="0.7" />
      <circle cx="60" cy="44" r="16" fill="url(#mid-body)" opacity="0.85" />
      <circle cx="60" cy="67" r="8" fill="url(#mid-core)">
        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
      </circle>
      <line x1="44" y1="67" x2="22" y2="56" stroke="#7B61FF" strokeWidth="1.5" strokeDasharray="3 4">
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.8s" repeatCount="indefinite" />
      </line>
      <line x1="76" y1="67" x2="98" y2="56" stroke="#7B61FF" strokeWidth="1.5" strokeDasharray="3 4">
        <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.8s" repeatCount="indefinite" begin="0.9s" />
      </line>
      <circle cx="54" cy="42" r="3" fill="#CE93D8" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="66" cy="42" r="3" fill="#CE93D8" opacity="0.9">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="48" stroke="rgba(123,97,255,0.14)" strokeWidth="1" fill="none" strokeDasharray="2 8">
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="-360 60 60" dur="16s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function HighAvatar({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="hi-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#80FFFF" />
          <stop offset="80%" stopColor="#00D1FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0090B0" stopOpacity="0.1" />
        </radialGradient>
        <linearGradient id="hi-head" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#80DEEA" />
          <stop offset="100%" stopColor="#00B8D4" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" stroke="rgba(0,209,255,0.12)" strokeWidth="1" fill="none">
        <animate attributeName="r" values="50;54;50" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.04;0.12" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="42" stroke="rgba(0,209,255,0.18)" strokeWidth="1" fill="none">
        <animate attributeName="r" values="40;44;40" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      <polygon points="60,22 82,34 82,58 60,70 38,58 38,34" fill="url(#hi-head)" opacity="0.9" />
      <rect x="46" y="70" width="28" height="26" rx="6" fill="rgba(0,180,220,0.35)" />
      <circle cx="60" cy="83" r="9" fill="url(#hi-core)">
        <animate attributeName="r" values="7;11;7" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <rect x="46" y="36" width="28" height="8" rx="4" fill="rgba(0,209,255,0.7)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
      </rect>
      <circle r="4" fill="#00D1FF" opacity="0.8">
        <animateMotion dur="8s" repeatCount="indefinite" path="M 60 14 A 46 46 0 1 1 59.99 14" />
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle r="3" fill="#80DEEA" opacity="0.6">
        <animateMotion dur="11s" repeatCount="indefinite" begin="2.5s" path="M 60 14 A 46 46 0 1 1 59.99 14" />
      </circle>
    </svg>
  );
}

function MaxEntity({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="max-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" />
          <stop offset="30%" stopColor="#FFE082" />
          <stop offset="70%" stopColor="#FFD54F" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F9A825" stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id="max-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD54F" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#FF5FB6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="max-hex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD54F" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF8F00" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#max-aura)" />
      <circle cx="60" cy="60" r="50" stroke="rgba(255,213,79,0.22)" strokeWidth="1.5" fill="none" strokeDasharray="6 3">
        <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="8s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="44" stroke="rgba(255,95,182,0.18)" strokeWidth="1" fill="none" strokeDasharray="3 6">
        <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="12s" repeatCount="indefinite" />
      </circle>
      <polygon points="60,26 84,39 84,65 60,78 36,65 36,39" fill="url(#max-hex)" opacity="0.85" />
      <polygon points="60,36 72,43 72,57 60,64 48,57 48,43" fill="rgba(255,240,150,0.12)" stroke="rgba(255,213,79,0.35)" strokeWidth="1" />
      <circle cx="60" cy="52" r="15" fill="url(#max-core)">
        <animate attributeName="r" values="13;17;13" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;1;0.9" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <line x1="60" y1="52" x2="60" y2="14" stroke="#FFD54F" strokeWidth="0.8" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.2s" repeatCount="indefinite" />
      </line>
      <line x1="60" y1="52" x2="98" y2="74" stroke="#FF5FB6" strokeWidth="0.8" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
      </line>
      <circle r="4" fill="#FFD54F" opacity="0.9">
        <animateMotion dur="8s" repeatCount="indefinite" path="M 60 10 A 50 50 0 1 1 59.99 10" />
        <animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle r="3.5" fill="#FF5FB6" opacity="0.8">
        <animateMotion dur="10s" repeatCount="indefinite" begin="3s" path="M 60 10 A 50 50 0 1 1 59.99 10" />
      </circle>
      <circle r="3" fill="#7B61FF" opacity="0.7">
        <animateMotion dur="12s" repeatCount="indefinite" begin="6s" path="M 60 10 A 50 50 0 1 1 59.99 10" />
      </circle>
      <circle cx="60" cy="20" r="3.5" fill="#FFD54F" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite" />
        <animate attributeName="r" values="3.5;5;3.5" dur="1.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function AgentIcon({ level = 'BABY', size = 120 }) {
  switch (level) {
    case 'MAX':    return <MaxEntity size={size} />;
    case 'HIGH':   return <HighAvatar size={size} />;
    case 'MIDDLE': return <MiddleHumanoid size={size} />;
    case 'SMALL':  return <SmallOrb size={size} />;
    default:       return <BabyOrb size={size} />;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useAutoScroll(ref, dep) {
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [dep]); // eslint-disable-line
}

// ── Multi-agent thinking pipeline (chat reasoning) ────────────────────────────

// Stage routes reference real STUDIO_AGENTS ids so the chat-bubble pipeline and the
// right-side Agent Arena always show the same agent identities (icon/color/role).
const PIPELINE_AGENT_ROUTES = {
  job: [
    { agent: 'ARIA', status: 'Analysing your request…' },
    { agent: 'SCOUT', status: 'Scanning knowledge base & web…' },
    { agent: 'LENS', status: 'Matching your profile to the role…' },
    { agent: 'RESUME', status: 'Tailoring your materials…' },
    { agent: 'ARIA', status: 'Synthesising final response…' },
  ],
  finance: [
    { agent: 'ARIA', status: 'Analysing your request…' },
    { agent: 'PAY', status: 'Pulling market & salary intel…' },
    { agent: 'NEXUS', status: 'Cross-referencing financial context…' },
    { agent: 'ARIA', status: 'Synthesising recommendations…' },
  ],
  skill: [
    { agent: 'ARIA', status: 'Analysing your profile…' },
    { agent: 'PATH', status: 'Mapping skill trajectory…' },
    { agent: 'LENS', status: 'Scoring your current skill gaps…' },
    { agent: 'ARIA', status: 'Building your roadmap…' },
  ],
  default: [
    { agent: 'ARIA', status: 'Analysing your request…' },
    { agent: 'SCOUT', status: 'Scanning knowledge base…' },
    { agent: 'NEXUS', status: 'Cross-referencing context…' },
    { agent: 'ARIA', status: 'Synthesising final response…' },
  ],
};

function getPipelineStages(query = '') {
  const q = (query || '').toLowerCase();
  const isJob = /job|resume|career|intern|hire|apply|role/.test(q);
  const isFinance = /spend|money|finance|budget|salary|cost/.test(q);
  const isSkill = /skill|learn|course|study|roadmap/.test(q);
  const route = isJob ? 'job' : isFinance ? 'finance' : isSkill ? 'skill' : 'default';
  return PIPELINE_AGENT_ROUTES[route];
}

const STAGE_TIMINGS = [0, 650, 1400, 2200, 3000];

function AgentThinkingPipeline({ query = '', stages: stagesProp }) {
  const stages = useMemo(() => stagesProp || getPipelineStages(query), [stagesProp, query]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [completedSet, setCompletedSet] = useState(new Set());

  useEffect(() => {
    setActiveIdx(0);
    setCompletedSet(new Set());
    const timers = stages.map((_, i) => {
      if (i === 0) return null;
      return setTimeout(() => {
        setCompletedSet(prev => new Set([...prev, i - 1]));
        setActiveIdx(i);
      }, STAGE_TIMINGS[i] || i * 750);
    }).filter(Boolean);
    return () => timers.forEach(clearTimeout);
  }, [stages]);

  return (
    <div style={{ padding: '6px 0 4px' }}>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 12 }}>Multi-Agent Pipeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stages.map((stage, i) => {
          const meta = STUDIO_AGENTS.find(a => a.id === stage.agent) || { icon: '🧠', color: '#7B61FF', id: stage.agent };
          const isDone = completedSet.has(i);
          const isActive = i === activeIdx;
          return (
            <motion.div key={`${stage.agent}-${i}`} initial={{ opacity: 0.15 }}
              animate={{ opacity: isDone ? 0.48 : isActive ? 1 : 0.15 }} transition={{ duration: 0.35 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  background: isDone ? 'rgba(74,222,128,0.12)' : isActive ? `${meta.color}1A` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isDone ? 'rgba(74,222,128,0.4)' : isActive ? meta.color + '60' : 'rgba(255,255,255,0.09)'}`,
                  boxShadow: isActive ? `0 0 14px ${meta.color}30` : 'none', transition: 'all 0.4s ease',
                }}>{isDone ? '✓' : meta.icon}</div>
                {isActive && (
                  <motion.div animate={{ scale: [1, 1.55, 1], opacity: [0.55, 0, 0.55] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1.5px solid ${meta.color}`, pointerEvents: 'none' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isDone ? 'rgba(255,255,255,0.38)' : isActive ? '#fff' : 'rgba(255,255,255,0.22)' }}>
                  {meta.id}{isDone && <span style={{ color: '#4ADE80', marginLeft: 6, fontSize: 9 }}>done</span>}
                </div>
                <AnimatePresence>
                  {isActive && (
                    <motion.div initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{stage.status}</motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Level header pieces ───────────────────────────────────────────────────────

function XPBar({ xp, level, maxXP }) {
  const pct = maxXP ? Math.min((xp / maxXP) * 100, 100) : 100;
  const cfg = AGENT_LEVELS[level];
  const next = { BABY: 'SMALL', SMALL: 'MIDDLE', MIDDLE: 'HIGH', HIGH: 'MAX' }[level];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>XP PROGRESS</span>
        <span style={{ fontSize: 9, color: cfg.color, fontFamily: 'monospace' }}>{xp} / {maxXP ?? '∞'}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${cfg.color}, ${level === 'MAX' ? '#FF5FB6' : '#7B61FF'})`, boxShadow: `0 0 8px ${cfg.color}60` }} />
      </div>
      {maxXP && next && (
        <div style={{ marginTop: 3, fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{Math.max(0, maxXP - xp)} XP to unlock {next}</div>
      )}
    </div>
  );
}

function LevelBadge({ level }) {
  const cfg = AGENT_LEVELS[level];
  return (
    <motion.div animate={level === 'MAX' ? { boxShadow: [`0 0 8px ${cfg.glow}`, `0 0 20px ${cfg.glow}`, `0 0 8px ${cfg.glow}`] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20,
        background: cfg.badge.bg, border: `1px solid ${cfg.badge.border}`, color: cfg.badge.text, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'monospace' }}>
      {level === 'MAX' && '⭐ '}{level} LEVEL
    </motion.div>
  );
}

function LevelHeader({ userName, level, effectiveChunks }) {
  const cfg = AGENT_LEVELS[level];
  const xp = getXPFromChunks(effectiveChunks);
  return (
    <div style={{
      padding: '20px 18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      borderBottom: '1px solid rgba(255,255,255,0.06)', background: `radial-gradient(circle at 50% 10%, ${cfg.glow}, transparent 65%)`, flexShrink: 0,
    }}>
      <motion.div key={level} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <AgentIcon level={level} size={104} />
      </motion.div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>Agent of {userName || 'Sudeep'}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, lineHeight: 1.5 }}>{cfg.description}</div>
        <LevelBadge level={level} />
      </div>
      <div style={{ width: '100%' }}><XPBar xp={xp} level={level} maxXP={cfg.xpToNext} /></div>
    </div>
  );
}

// ── Tab strip ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'agent',     label: 'Agent',     icon: '◎' },
  { id: 'tools',     label: 'Tools',     icon: '🔌' },
  { id: 'knowledge', label: 'Knowledge', icon: '🧠' },
];

function TabStrip({ active, onChange }) {
  return (
    <div style={{ display: 'flex', padding: '0 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer',
            color: active === t.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.32)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Manrope, sans-serif' }}>
          <span style={{ fontSize: 11 }}>{t.icon}</span>
          <span>{t.label}</span>
          {active === t.id && <motion.div layoutId="studio-tab-underline" style={{ position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 2, background: 'linear-gradient(90deg, #00D1FF, #7B61FF)' }} />}
        </button>
      ))}
    </div>
  );
}

// ── Interactive Tools panel (drives the level) ────────────────────────────────

function ToolToggle({ tool, connected, onToggle }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11,
        background: connected ? `${tool.color}12` : 'rgba(255,255,255,0.025)',
        border: `1px solid ${connected ? tool.color + '40' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.25s' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, background: connected ? `${tool.color}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${connected ? tool.color + '50' : 'rgba(255,255,255,0.08)'}` }}>
        {tool.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: connected ? '#fff' : 'rgba(255,255,255,0.55)' }}>{tool.label}</span>
          <span style={{ fontSize: 8.5, color: connected ? tool.color : 'rgba(255,255,255,0.3)', fontFamily: 'monospace', background: connected ? `${tool.color}18` : 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 5 }}>+{tool.chunks}</span>
        </div>
        <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.32)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.tagline}</div>
      </div>
      <button onClick={() => onToggle(tool.id)}
        style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 13, cursor: 'pointer', position: 'relative',
          background: connected ? tool.color : 'rgba(255,255,255,0.1)', border: 'none', transition: 'background 0.25s' }}
        title={connected ? `Disconnect ${tool.label}` : `Connect ${tool.label}`}>
        <motion.div animate={{ x: connected ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ position: 'absolute', top: 2, left: 0, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </button>
    </motion.div>
  );
}

function ToolsPanel({ connectedTools, onToggle, onConnectAll, onDisconnectAll, effectiveChunks, level }) {
  const cfg = AGENT_LEVELS[level];
  const count = connectedTools.length;
  const total = MCP_TOOLS.length;
  const allOn = count === total;
  return (
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      <div style={{ padding: '12px 14px', borderRadius: 12, background: `${cfg.color}0C`, border: `1px solid ${cfg.color}28` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>MCP Connections</span>
          <span style={{ fontSize: 11, color: cfg.color, fontFamily: 'monospace', fontWeight: 700 }}>{count}/{total} · {effectiveChunks} chunks</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <motion.div animate={{ width: `${(chunksFromTools(connectedTools) / MCP_TOTAL_CHUNKS) * 100}%` }} transition={{ duration: 0.5 }}
            style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, #00D1FF, #7B61FF, ${cfg.color})` }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          {allOn
            ? <>Everything connected — your agent is at <b style={{ color: cfg.color }}>MAX</b>. It knows your routines, skills, goals & work history.</>
            : <>Connect more sources to level up. <b style={{ color: cfg.color }}>Connect all → MAX.</b> Disconnect any to lower the level.</>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={onConnectAll} disabled={allOn}
            style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10.5, cursor: allOn ? 'default' : 'pointer', fontFamily: 'Manrope, sans-serif',
              background: allOn ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #00D1FF22, #7B61FF22)', border: `1px solid ${allOn ? 'rgba(255,255,255,0.07)' : 'rgba(0,209,255,0.35)'}`, color: allOn ? 'rgba(255,255,255,0.25)' : '#00D1FF' }}>
            Connect all
          </button>
          <button onClick={onDisconnectAll} disabled={count === 0}
            style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10.5, cursor: count === 0 ? 'default' : 'pointer', fontFamily: 'Manrope, sans-serif',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: count === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)' }}>
            Disconnect all
          </button>
        </div>
      </div>
      {/* Tool list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {MCP_TOOLS.map(t => (
          <ToolToggle key={t.id} tool={t} connected={connectedTools.includes(t.id)} onToggle={onToggle} />
        ))}
      </div>
      <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>🔒 Local simulation — no real OAuth is performed</p>
    </div>
  );
}

// ── Right sidebar: Voxel Agent Character + Live Agent Arena ──────────────────
// The character renderer itself (VoxelCharacter / VOXEL_LEVEL_CONFIG) lives in
// ../components/VoxelCharacter — shared with the Agent Arena village, which
// reuses it (with `walking`/`facing`) as the sprite for every STUDIO_AGENT.

function CharacterCard({ level, effectiveChunks, userName }) {
  const cfg = AGENT_LEVELS[level];
  const vcfg = VOXEL_LEVEL_CONFIG[level];
  return (
    <div style={{ padding: '22px 18px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      borderBottom: '1px solid rgba(255,255,255,0.06)', background: `radial-gradient(circle at 50% 0%, ${cfg.glow}, transparent 65%)`, flexShrink: 0 }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Agent of {userName || 'You'}</div>
      <VoxelCharacter level={level} size={164} />
      <div style={{ fontSize: 11, fontStyle: 'italic', color: cfg.color, letterSpacing: '0.04em' }}>{vcfg.tag}</div>
      <LevelBadge level={level} />
      <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.5, margin: '2px 0 0' }}>{cfg.description}</p>
      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', marginTop: 2 }}>{effectiveChunks} knowledge chunks</div>
    </div>
  );
}

// ── Knowledge panel (what the connected tools fed the agent) ───────────────────

function KnowledgePanel({ connectedTools }) {
  const active = MCP_TOOLS.filter(t => connectedTools.includes(t.id));
  return (
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {active.reduce((s, t) => s + t.knowledge.length, 0)} knowledge nodes · {active.length} sources
      </div>
      {active.length === 0 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No sources connected. Connect tools in the Tools tab to feed your agent.</p>}
      {active.map(t => (
        <div key={t.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: t.color }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: t.color }}>{t.label.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {t.knowledge.map((k, i) => (
              <div key={i} style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: 7, background: `${t.color}0A`, border: `1px solid ${t.color}1E`, lineHeight: 1.4 }}>{k}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Agent (identity) panel — bio, goals, routines, hobbies, experience ────────

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 7 }}>{title}</div>
      {children}
    </div>
  );
}

function Chips({ items, color }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {items.map((s, i) => (
        <span key={i} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 14, background: `${color}12`, border: `1px solid ${color}2A`, color }}>{s}</span>
      ))}
    </div>
  );
}

function AgentPanel({ level }) {
  const cfg = AGENT_LEVELS[level];
  const p = SUDEEP_PROFILE;
  return (
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Capabilities">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {cfg.capabilities.map(c => (
            <span key={c} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 14, background: `${cfg.color}14`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>{c}</span>
          ))}
        </div>
      </Section>
      <Section title="Bio"><p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, margin: 0 }}>{p.bio}</p></Section>
      <Section title="Goals">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {p.goals.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.58)', lineHeight: 1.45 }}>
              <span style={{ color: '#FF5FB6', flexShrink: 0 }}>🎯</span><span>{g}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Daily Routine">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {p.routines.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>
              <span style={{ color: '#00D1FF', flexShrink: 0 }}>◷</span><span>{r}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Hobbies"><Chips items={p.hobbies} color="#4ADE80" /></Section>
      <Section title="Top Skills"><Chips items={p.skillsTechnical.slice(0, 12)} color="#00D1FF" /></Section>
      <Section title="Experience">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {p.experience.map((e, i) => (
            <div key={i} style={{ paddingLeft: 10, borderLeft: '2px solid rgba(123,97,255,0.35)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#fff' }}>{e.title}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{e.company} · {e.period}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Awards">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {p.awards.map((a, i) => (
            <div key={i} style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>🏆 {a}</div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────

// Pasted job posts / scraped text often carry runs of blank lines between short
// fragments ("Apply\n\nSave\n\nShow more options…") that look broken in a chat
// bubble. Collapse those down to normal paragraph spacing.
function formatMessageText(text) {
  if (!text) return text;
  return text
    .split('\n').map(line => line.replace(/[ \t]+$/, '')).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const LONG_MESSAGE_CHARS = 360;
const PREVIEW_CHARS = 280;

function UserMessage({ text, onDelete }) {
  const [hov, setHov] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const formatted = formatMessageText(text);
  const isLong = formatted.length > LONG_MESSAGE_CHARS;
  const collapsed = isLong && !expanded;
  const shown = collapsed ? formatted.slice(0, PREVIEW_CHARS).trimEnd() + '…' : formatted;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18, gap: 6 }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <AnimatePresence>
        {hov && onDelete && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={onDelete}
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, color: '#F87171', fontSize: 12, cursor: 'pointer', padding: '2px 6px', alignSelf: 'center', flexShrink: 0 }}>×</motion.button>
        )}
      </AnimatePresence>
      <div style={{ maxWidth: 'min(620px, 88%)', minWidth: 0 }}>
        {isLong && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.32)', fontFamily: 'monospace', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              📋 Pasted · {formatted.length.toLocaleString()} chars
            </span>
          </div>
        )}
        <div style={{ background: 'rgba(123,97,255,0.14)', border: '1px solid rgba(123,97,255,0.32)', borderRadius: '16px 4px 16px 16px',
          padding: '12px 16px', fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{shown}</div>
        {isLong && (
          <button onClick={() => setExpanded(e => !e)}
            style={{ display: 'block', marginLeft: 'auto', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer',
              color: '#9C8CFF', fontSize: 11, fontWeight: 700, fontFamily: 'Manrope, sans-serif', letterSpacing: '0.02em' }}>
            {expanded ? 'Show less ↑' : 'Show full text ↓'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function AgentMessage({ text, isLoading, agentLevel = 'BABY', confidence, thinkingQuery, stages, onDelete }) {
  const cfg = AGENT_LEVELS[agentLevel];
  const [hov, setHov] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'flex-start' }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ flexShrink: 0, marginTop: 2 }}><AgentIcon level={agentLevel} size={30} /></div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: 'min(620px, 88%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.1em' }}>AGENT</span>
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: cfg.badge.bg, color: cfg.badge.text, border: `1px solid ${cfg.badge.border}`, fontFamily: 'monospace' }}>{agentLevel}</span>
          {confidence && !isLoading && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{confidence}% confidence</span>}
          {isLoading && <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ fontSize: 9, color: cfg.color, fontFamily: 'monospace' }}>thinking…</motion.span>}
          <AnimatePresence>
            {hov && onDelete && !isLoading && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={onDelete}
                style={{ marginLeft: 'auto', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, color: '#F87171', fontSize: 12, cursor: 'pointer', padding: '1px 6px' }}>×</motion.button>
            )}
          </AnimatePresence>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isLoading ? cfg.color + '28' : 'rgba(255,255,255,0.08)'}`, borderRadius: '4px 16px 16px 16px', padding: '13px 17px', fontSize: 14, color: 'rgba(255,255,255,0.84)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {isLoading ? <AgentThinkingPipeline query={thinkingQuery} stages={stages} /> : formatMessageText(text)}
        </div>
      </div>
    </motion.div>
  );
}

function PipelineLoadingMessage() {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}><AgentIcon level="MAX" size={30} /></div>
      <div style={{ background: 'rgba(0,209,255,0.07)', border: '1px solid rgba(0,209,255,0.2)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,209,255,0.25)', borderTopColor: '#00D1FF', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>Agents collaborating — building your tailored resume… <span style={{ color: '#00D1FF' }}>(watch the Agent Arena →)</span></span>
      </div>
    </div>
  );
}

// ── Resume card (Copy + Download .doc) ────────────────────────────────────────

function ResumeChip({ label, color }) {
  return <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 14, border: `1px solid ${color}40`, color, background: `${color}10` }}>{label}</span>;
}

function ResumeCard({ data }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const r = data.resume || {};
  const jd = data.jd_analysis || {};
  const match = data.match_analysis || {};
  const score = match.match_score;
  const ats = score ? Math.min(score + 3, 98) : null;

  function handleCopy() {
    navigator.clipboard.writeText(resumeToText(data)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }
  function handleDownload() {
    try {
      const html = resumeToDocHtml(data);
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeRole = (jd.role || 'Resume').replace(/[^a-z0-9]+/gi, '_');
      a.href = url; a.download = `${(data.user_name || 'Resume').replace(/\s+/g, '_')}_${safeRole}.doc`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true); setTimeout(() => setDownloaded(false), 2200);
    } catch (e) { console.warn('download failed', e); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '18px 20px', maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{data.user_name}</p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            Tailored for <span style={{ color: '#00D1FF' }}>{jd.role}</span>
            {jd.company && jd.company !== 'the company' && <> at <span style={{ color: '#7B61FF' }}>{jd.company}</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {score && (
            <div style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${score >= 80 ? '#4ADE80' : '#FBBF24'}40`, background: `${score >= 80 ? '#4ADE80' : '#FBBF24'}10`, display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 9, color: score >= 80 ? '#4ADE80' : '#FBBF24', fontWeight: 700 }}>MATCH</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: score >= 80 ? '#4ADE80' : '#FBBF24' }}>{score}%</span>
            </div>
          )}
          {ats && (
            <div style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(0,209,255,0.3)', background: 'rgba(0,209,255,0.07)', display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 9, color: '#00D1FF', fontWeight: 700 }}>ATS</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#00D1FF' }}>~{ats}%</span>
            </div>
          )}
        </div>
      </div>

      {r.summary && <><Divider label="SUMMARY" /><p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, margin: '8px 0 14px' }}>{r.summary}</p></>}

      {r.skills_technical?.length > 0 && (
        <><Divider label="TECHNICAL SKILLS" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 12px' }}>
            {r.skills_technical.map((s, i) => <ResumeChip key={i} label={s} color="#00D1FF" />)}
            {(r.skills_soft || []).map((s, i) => <ResumeChip key={`s${i}`} label={s} color="#7B61FF" />)}
          </div></>
      )}

      {r.experience?.length > 0 && (
        <><Divider label="EXPERIENCE" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '8px 0 14px' }}>
            {r.experience.map((exp, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div><span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{exp.title}</span><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 7 }}>@ {exp.company}</span></div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{exp.period}</span>
                </div>
                <ul style={{ margin: '5px 0 0 14px', padding: 0 }}>
                  {(exp.bullets || []).map((b, j) => <li key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,0.57)', lineHeight: 1.55, marginBottom: 2 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div></>
      )}

      {r.projects?.length > 0 && (
        <><Divider label="PROJECTS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0 14px' }}>
            {r.projects.map((proj, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{proj.name}</span>
                  {(proj.tech || []).map((t, j) => <ResumeChip key={j} label={t} color="#FF5FB6" />)}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', lineHeight: 1.55 }}>{proj.description}</p>
              </div>
            ))}
          </div></>
      )}

      {r.education?.length > 0 && (
        <><Divider label="EDUCATION" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 14px' }}>
            {r.education.map((edu, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span><span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{edu.degree}</span><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 7 }}>{edu.school}</span></span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{edu.year}</span>
              </div>
            ))}
          </div></>
      )}

      {match.missing_skills?.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <p style={{ fontSize: 10, color: '#FBBF24', fontWeight: 700, margin: '0 0 5px', letterSpacing: '0.08em' }}>SKILL GAPS THE AGENT FLAGGED</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{match.missing_skills.map((s, i) => <ResumeChip key={i} label={s} color="#FBBF24" />)}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDownload}
          style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', fontSize: 12.5, fontWeight: 600,
            background: downloaded ? 'rgba(74,222,128,0.18)' : 'linear-gradient(135deg, #4ADE80, #00D1FF)', color: downloaded ? '#4ADE80' : '#04140a' }}>
          {downloaded ? '✓ Downloaded' : '⬇ Download Resume (.doc)'}
        </motion.button>
        <button onClick={handleCopy}
          style={{ padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', fontSize: 12,
            background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? '#4ADE80' : 'rgba(255,255,255,0.1)'}`, color: copied ? '#4ADE80' : 'rgba(255,255,255,0.6)' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </motion.div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 0' }}>
      <span style={{ fontSize: 9, letterSpacing: '0.12em', fontWeight: 700, color: 'rgba(255,255,255,0.28)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

// ── Welcome + quick chips ─────────────────────────────────────────────────────

const CONFIDENCE_BY_LEVEL = { BABY: 25, SMALL: 42, MIDDLE: 61, HIGH: 78, MAX: 94 };

const QUICK_CHIPS = [
  '📄 Tailor my resume to a job post',
  'What can you do with my context?',
  'Find my skill gaps for an ML role',
  'Summarize what you know about me',
  'Build my career roadmap',
];

function WelcomeScreen({ level, onChip }) {
  const cfg = AGENT_LEVELS[level];
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ maxWidth: 600, margin: '0 auto', padding: '30px 24px', textAlign: 'center' }}>
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.6 }} style={{ marginBottom: 14 }}><AgentIcon level={level} size={84} /></motion.div>
      <h2 style={{ fontSize: 21, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
        {level === 'MAX' ? 'Your agent knows you inside out' : `Agent Level: ${level}`}
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: '0 0 18px' }}>
        {level === 'MAX'
          ? "This is the brain of UniMind. It's read your LinkedIn, GitHub, resume, papers and more — so its answers are personal to you. Try pasting a job post and ask for a tailored resume; watch the agents collaborate in the Agent Arena on the right."
          : 'Feed your agent by connecting tools (Tools tab) — the more it knows, the stronger it gets. Connect everything to reach MAX.'}
      </p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>Try asking</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {QUICK_CHIPS.map(c => (
          <motion.button key={c} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => onChip(c)}
            style={{ background: 'rgba(123,97,255,0.08)', border: '1px solid rgba(123,97,255,0.22)', borderRadius: 20, padding: '6px 13px', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>{c}</motion.button>
        ))}
      </div>
    </motion.div>
  );
}
// ── File upload button ────────────────────────────────────────────────────────

function FileUploadButton({ onUpload }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try { const res = await uploadFile(file); onUpload?.(res.extracted_text || res.text || '', file.name); }
    catch { onUpload?.('', file.name); }
    finally { setLoading(false); e.target.value = ''; }
  }
  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,image/*" style={{ display: 'none' }} onChange={handleChange} />
      <button onClick={() => inputRef.current?.click()} disabled={loading} title="Upload a job post / file"
        style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.38)', fontSize: 14 }}>
        {loading ? '⏳' : '📎'}
      </button>
    </>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  const color = toast.color || '#7B61FF';
  return (
    <motion.div key={toast.key} initial={{ opacity: 0, y: 50, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.85 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '12px 22px', borderRadius: 14,
        background: `linear-gradient(135deg, ${color}22, rgba(0,0,0,0.85))`, border: `1px solid ${color}50`, backdropFilter: 'blur(20px)', boxShadow: `0 8px 40px ${color}30`,
        display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 20 }}>{toast.icon}</span>
      <div>
        <div style={{ fontSize: 10.5, color, fontWeight: 700, letterSpacing: '0.1em' }}>{toast.title}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>{toast.body}</div>
      </div>
    </motion.div>
  );
}

// ── JD detection ──────────────────────────────────────────────────────────────

function looksLikeJD(text) {
  const t = (text || '').toLowerCase();
  return t.length > 200 && /(responsibilit|requirement|qualification|we are looking|you will|experience (in|with)|job description|about the role|who you are|what you'll do|nice to have)/.test(t);
}
function wantsResume(text) {
  return /\b(resume|cv|tailor|apply for|application)\b/i.test(text || '');
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ALL_TOOL_IDS = MCP_TOOLS.map(t => t.id);

export default function AgentStudioPage({ userName = 'Sudeep', onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedName, setResolvedName] = useState(userName);

  // Tools / level
  const [connectedTools, setConnectedTools] = useState(ALL_TOOL_IDS);   // Sudeep = all connected (MAX)
  const [chatChunks, setChatChunks] = useState(0);
  const [activeTab, setActiveTab] = useState('agent');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [arenaFullscreen, setArenaFullscreen] = useState(false);
  const [resumeMode, setResumeMode] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [clearArmed, setClearArmed] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Pipeline / A2A
  const [statuses, setStatuses] = useState({});
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  const chatRef = useRef(null);
  const textareaRef = useRef(null);
  const initRef = useRef(false);
  const prevLevelRef = useRef(null);
  const toastTimer = useRef(null);
  useAutoScroll(chatRef, messages.length);

  const effectiveChunks = chunksFromTools(connectedTools) + chatChunks;
  const level = getAgentLevel(effectiveChunks);
  const cfg = AGENT_LEVELS[level];

  function fireToast(t) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ ...t, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  // Level change → toast (up or down) when driven by tools
  useEffect(() => {
    const prev = prevLevelRef.current;
    if (prev && prev !== level) {
      const order = ['BABY', 'SMALL', 'MIDDLE', 'HIGH', 'MAX'];
      const up = order.indexOf(level) > order.indexOf(prev);
      fireToast({
        icon: up ? '🎉' : '⬇',
        title: up ? 'LEVEL UP!' : 'LEVEL DOWN',
        body: up ? `Your agent reached ${level}` : `Agent dropped to ${level}`,
        color: AGENT_LEVELS[level].color,
      });
    }
    prevLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try { const u = await getMe(); if (u?.name) setResolvedName(u.name); } catch {}
      try {
        const hist = await getChatHistory();
        if (Array.isArray(hist) && hist.length > 0) {
          setMessages(hist.map(h => ({ id: h.id, role: h.role, content: h.content })));
          return;
        }
      } catch {}
      setMessages([{ id: 'welcome', role: 'assistant', content: '__welcome__' }]);
    })();
  }, []);

  // Reset textarea height when input is cleared after send
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Clear-confirm auto-resets if the user doesn't follow through
  useEffect(() => {
    if (!clearArmed) return;
    const t = setTimeout(() => setClearArmed(false), 3500);
    return () => clearTimeout(t);
  }, [clearArmed]);

  const handleClearHistory = useCallback(async () => {
    if (!clearArmed) { setClearArmed(true); return; }
    setClearArmed(false);
    setClearing(true);
    try { await clearChatHistory(); } catch {}
    setClearing(false);
    setMessages([{ id: 'welcome', role: 'assistant', content: '__welcome__' }]);
    setLogs([]);
    setStatuses({});
    fireToast({ icon: '🗑', title: 'CLEARED', body: 'Chat history wiped', color: '#F87171' });
  }, [clearArmed]);

  // ── Tools ────────────────────────────────────────────────────────────────────
  const toggleTool = useCallback((id) => {
    setConnectedTools(prev => {
      const on = prev.includes(id);
      const tool = MCP_TOOLS.find(t => t.id === id);
      if (on) {
        fireToast({ icon: tool.icon, title: 'DISCONNECTED', body: `${tool.label} · −${tool.chunks} chunks`, color: '#F87171' });
        return prev.filter(x => x !== id);
      }
      fireToast({ icon: tool.icon, title: 'CONNECTED', body: `${tool.label} · +${tool.chunks} chunks imported`, color: tool.color });
      return [...prev, id];
    });
  }, []);

  const connectAll = useCallback(() => { setConnectedTools(ALL_TOOL_IDS); }, []);
  const disconnectAll = useCallback(() => { setConnectedTools([]); }, []);

  // ── Resume pipeline (A2A) ────────────────────────────────────────────────────
  const replayLogs = useCallback((agentLogs) => {
    agentLogs.forEach(log => {
      setTimeout(() => {
        setLogs(prev => [...prev, log]);
        if (log.from_agent && log.from_agent !== 'USER') setStatuses(p => ({ ...p, [log.from_agent]: 'active' }));
        if (log.to_agent && log.to_agent !== 'USER') setStatuses(p => ({ ...p, [log.to_agent]: 'active' }));
      }, log.delay_ms);
    });
    const doneMap = { ARIA: 500, SCOUT: 1000, NEXUS: 2600, LENS: 4000, RESUME: 6600 };
    Object.entries(doneMap).forEach(([id, d]) => setTimeout(() => setStatuses(p => ({ ...p, [id]: 'done' })), d));
  }, []);

  // Drives the Agent Arena for ORDINARY chat questions too (not just the resume
  // pipeline) — generic over any { agent, status } stage list from getPipelineStages.
  const runArenaForStages = useCallback((stages) => {
    setLogs([]);
    if (!stages.length) { setStatuses({}); return; }
    setStatuses({ [stages[0].agent]: 'active' });
    stages.forEach((stage, i) => {
      if (i === 0) return;
      const delay = STAGE_TIMINGS[i] || i * 750;
      setTimeout(() => {
        setStatuses(prev => ({ ...prev, [stages[i - 1].agent]: 'done', [stage.agent]: 'active' }));
        setLogs(prev => [...prev, { from_agent: stages[i - 1].agent, to_agent: stage.agent, message: stage.status }]);
      }, delay);
    });
    const lastIdx = stages.length - 1;
    const lastDelay = STAGE_TIMINGS[lastIdx] || lastIdx * 750;
    setTimeout(() => setStatuses(prev => ({ ...prev, [stages[lastIdx].agent]: 'done' })), lastDelay + 500);
  }, []);

  const runResumePipeline = useCallback((jdText) => {
    const jd = (jdText || '').trim();
    if (!jd || running) return;
    const data = buildTailoredResume(jd);
    setRunning(true);
    setLogs([]);
    setStatuses({ ARIA: 'active' });
    setRightSidebarOpen(true);
    setInput('');
    setPendingFile(null);
    setResumeMode(false);

    const loadId = `pl-${Date.now()}`;
    setMessages(prev => [...prev,
      { id: `u-${Date.now()}`, role: 'user', content: jd.length > 600 ? jd.slice(0, 600) + ' …' : jd },
      { id: loadId, role: 'assistant', msgType: 'pipeline-loading' },
    ]);

    replayLogs(data.agent_logs);
    const maxDelay = Math.max(...data.agent_logs.map(l => l.delay_ms));
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === loadId ? { id: loadId, role: 'assistant', msgType: 'resume', pipelineData: data } : m));
    }, maxDelay - 400);
    setTimeout(() => {
      setRunning(false);
      fireToast({ icon: '📄', title: 'RESUME READY', body: `${data.match_analysis.match_score}% match · download it`, color: '#4ADE80' });
    }, maxDelay + 600);
  }, [running, replayLogs]);

  // ── Normal chat ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading || running) return;

    // Route resume-style requests to the A2A pipeline
    if (looksLikeJD(text) || (wantsResume(text) && (pendingFile || text.length > 120))) {
      const jd = pendingFile ? `${pendingFile.content}\n\n${text}` : text;
      runResumePipeline(jd);
      return;
    }
    if (wantsResume(text) && resumeMode) { runResumePipeline(pendingFile ? pendingFile.content : text); return; }

    const stages = getPipelineStages(text);
    runArenaForStages(stages);
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
    const loadMsg = { id: `a-${Date.now()}`, role: 'assistant', content: '', loading: true, agentLevel: level, confidence: CONFIDENCE_BY_LEVEL[level], thinkingQuery: text, stages };
    setMessages(prev => [...prev, userMsg, loadMsg]);
    setInput('');
    setPendingFile(null);
    setIsLoading(true);
    try {
      const res = await sendChatMessage(text);
      const reply = res?.response || res?.message?.content || res?.message || 'Got it — I’ve folded that into what I know about you.';
      const asstRealId = res?.message?.id;
      if (typeof res?.knowledge_count === 'number') setChatChunks(c => Math.max(c, res.knowledge_count - chunksFromTools(connectedTools)));
      else setChatChunks(c => c + 1);
      setMessages(prev => prev.map(m => m.id === loadMsg.id ? { ...m, id: asstRealId || m.id, loading: false, content: reply } : m));
      // The backend only returns the assistant message's real id — resync the
      // user message's real id in the background so per-message delete works.
      getChatHistory().then(hist => {
        if (!Array.isArray(hist) || !hist.length) return;
        const lastUser = [...hist].reverse().find(h => h.role === 'user');
        if (lastUser) setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, id: lastUser.id } : m));
      }).catch(() => {});
    } catch {
      setMessages(prev => prev.map(m => m.id === loadMsg.id ? { ...m, loading: false, content: 'I noted that and saved it locally — I\'ll sync it once the connection is back.' } : m));
      setChatChunks(c => c + 1);
    } finally { setIsLoading(false); }
  }, [isLoading, running, level, pendingFile, resumeMode, connectedTools, runResumePipeline, runArenaForStages]);

  const handleSend = useCallback(() => {
    if (resumeMode) {
      const jd = pendingFile ? `${pendingFile.content}\n\n${input}`.trim() : input.trim();
      if (jd) runResumePipeline(jd);
      return;
    }
    const text = pendingFile ? `${input}`.trim() || `Tailor my resume to this:\n${pendingFile.content}` : input.trim();
    if (text) sendMessage(pendingFile && !input.trim() ? `Tailor my resume to this job post:\n${pendingFile.content}` : (pendingFile ? `${input}\n\n[Job post]\n${pendingFile.content}` : text));
  }, [resumeMode, pendingFile, input, sendMessage, runResumePipeline]);

  const handleKeyDown = useCallback((e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }, [handleSend]);
  const handleDelete = useCallback(async (id) => { setMessages(prev => prev.filter(m => m.id !== id)); try { await deleteChatMessage(id); } catch {} }, []);
  const handleFileUpload = useCallback((content, name) => { setPendingFile({ content, name }); if (looksLikeJD(content)) setResumeMode(true); }, []);

  const visibleMessages = messages.filter(m => m.id !== 'welcome');
  const showWelcome = visibleMessages.length === 0;

  return (
    <div className="w-screen h-screen overflow-hidden text-white flex" style={{ background: '#02030A', fontFamily: 'Manrope, sans-serif', paddingBottom: 110, boxSizing: 'border-box' }}>
      {/* ── Left brain panel ── */}
      {sidebarOpen && (
        <div style={{ width: 320, flexShrink: 0, height: '100%', background: '#06060e', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>
          <LevelHeader userName={resolvedName} level={level} effectiveChunks={effectiveChunks} />
          <TabStrip active={activeTab} onChange={setActiveTab} />
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.18 }} style={{ height: '100%' }}>
                {activeTab === 'agent' && <AgentPanel level={level} />}
                {activeTab === 'tools' && (
                  <ToolsPanel connectedTools={connectedTools} onToggle={toggleTool} onConnectAll={connectAll} onDisconnectAll={disconnectAll} effectiveChunks={effectiveChunks} level={level} />
                )}
                {activeTab === 'knowledge' && <KnowledgePanel connectedTools={connectedTools} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Top bar ── */}
        <div style={{ padding: '0 20px', height: 56, borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'rgba(255,255,255,0.012)' }}>
          {/* Left cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <button onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar"
              style={{ width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.15s', }}
              onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}>☰</button>
            {onBack && (
              <button onClick={onBack} title="Back"
                style={{ width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
            )}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.09)', flexShrink: 0, margin: '0 4px' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Agent Studio</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap' }}>The brain of your agent</span>
              </div>
            </div>
          </div>

          {/* Right cluster */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Stats pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 13px', borderRadius: 20, background: `${cfg.color}10`, border: `1px solid ${cfg.color}28` }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: cfg.color }}>{level}</span>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.14)' }} />
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', fontFamily: 'monospace' }}>{effectiveChunks} chunks</span>
              <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.14)' }} />
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', fontFamily: 'monospace' }}>{connectedTools.length}/{MCP_TOOLS.length} tools</span>
            </div>

            {/* Clear button */}
            <button onClick={handleClearHistory} disabled={clearing || showWelcome} title="Clear chat history"
              style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 11px', borderRadius: 8, cursor: (clearing || showWelcome) ? 'default' : 'pointer',
                background: clearArmed ? 'rgba(248,113,113,0.14)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${clearArmed ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.09)'}`,
                color: clearArmed ? '#F87171' : 'rgba(255,255,255,0.38)', fontSize: 11, opacity: showWelcome ? 0.4 : 1, fontFamily: 'Manrope, sans-serif', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              🗑 <span>{clearArmed ? 'Confirm?' : 'Clear'}</span>
            </button>

            {/* Arena toggle */}
            <button onClick={() => setRightSidebarOpen(o => !o)} title="Toggle agent arena"
              style={{ width: 32, height: 32, borderRadius: 8, background: rightSidebarOpen ? 'rgba(0,209,255,0.1)' : 'none', border: rightSidebarOpen ? '1px solid rgba(0,209,255,0.3)' : 'none', cursor: 'pointer', color: rightSidebarOpen ? '#00D1FF' : 'rgba(255,255,255,0.38)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>▥</button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div ref={chatRef} className="form-scroll" style={{ flex: 1, overflowY: 'auto', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 20px)', maskImage: 'linear-gradient(to bottom, transparent 0px, black 20px)' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '28px 28px 12px', width: '100%', boxSizing: 'border-box' }}>
            <AnimatePresence>{showWelcome && <WelcomeScreen level={level} onChip={(c) => { if (c.startsWith('📄')) { setResumeMode(true); setRightSidebarOpen(true); textareaRef.current?.focus(); } else { setInput(c); textareaRef.current?.focus(); } }} />}</AnimatePresence>

            {visibleMessages.map((msg) => {
              if (msg.msgType === 'pipeline-loading') return <PipelineLoadingMessage key={msg.id} />;
              if (msg.msgType === 'resume') return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(74,222,128,0.2)' }} />
                    <span style={{ fontSize: 10.5, color: '#4ADE80', fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>✓ {RESUME_PIPELINE_AGENTS.length} agents collaborated · resume ready</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(74,222,128,0.2)' }} />
                  </div>
                  <ResumeCard data={msg.pipelineData} />
                </motion.div>
              );
              const deletable = !msg.loading ? () => handleDelete(msg.id) : undefined;
              return msg.role === 'user'
                ? <UserMessage key={msg.id} text={msg.content} onDelete={deletable} />
                : <AgentMessage key={msg.id} text={msg.content} isLoading={msg.loading} agentLevel={msg.agentLevel || level} confidence={msg.confidence} thinkingQuery={msg.thinkingQuery} stages={msg.stages} onDelete={deletable} />;
            })}
          </div>
        </div>

        {/* ── Input ── */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: 'rgba(255,255,255,0.008)' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

            {/* Resume mode banner */}
            <AnimatePresence>
              {resumeMode && (
                <motion.div initial={{ opacity: 0, y: 6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 4, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ marginBottom: 10, padding: '9px 14px', borderRadius: 11, background: 'rgba(0,209,255,0.06)', border: '1px solid rgba(0,209,255,0.22)', display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 13 }}>📄</span>
                    <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                      <b style={{ color: '#00D1FF' }}>Resume mode</b> — paste a LinkedIn job post, hit <b>Tailor Resume</b>. Agents collaborate live.
                    </span>
                    <button onClick={() => setResumeMode(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending file chip */}
            <AnimatePresence>
              {pendingFile && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, padding: '7px 13px', borderRadius: 9, background: 'rgba(0,209,255,0.07)', border: '1px solid rgba(0,209,255,0.22)' }}>
                  <span style={{ fontSize: 13 }}>📄</span>
                  <span style={{ fontSize: 12, color: '#00D1FF', fontWeight: 600 }}>{pendingFile.name}</span>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{pendingFile.content.length.toLocaleString()} chars</span>
                  <button onClick={() => setPendingFile(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea bar */}
            <div className="chat-input-bar" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'rgba(255,255,255,0.04)', border: `1px solid ${resumeMode ? 'rgba(0,209,255,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 18, padding: '12px 12px 12px 14px', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
              <FileUploadButton onUpload={handleFileUpload} />
              <button onClick={() => setResumeMode(m => !m)} title="Toggle resume mode"
                style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, cursor: 'pointer', background: resumeMode ? 'rgba(0,209,255,0.16)' : 'rgba(255,255,255,0.04)', border: `1px solid ${resumeMode ? 'rgba(0,209,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: resumeMode ? '#00D1FF' : 'rgba(255,255,255,0.38)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>📄</button>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isLoading || running}
                placeholder={resumeMode ? 'Paste a job description / LinkedIn post here…' : 'Ask your agent, share context, or paste a job post…'}
                rows={resumeMode ? 3 : 1}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none', fontFamily: 'Manrope, sans-serif', fontSize: 14.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, minHeight: 22, maxHeight: 180, overflowY: 'auto', caretColor: '#00D1FF' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'; }} />
              <motion.button
                whileHover={{ scale: (isLoading || running) ? 1 : 1.06 }}
                whileTap={{ scale: (isLoading || running) ? 1 : 0.94 }}
                onClick={handleSend}
                disabled={isLoading || running || (!input.trim() && !pendingFile)}
                style={{ height: 38, borderRadius: 12, flexShrink: 0, padding: resumeMode ? '0 18px' : 0, width: resumeMode ? 'auto' : 38, whiteSpace: 'nowrap',
                  background: (isLoading || running || (!input.trim() && !pendingFile)) ? 'rgba(255,255,255,0.06)' : resumeMode ? 'linear-gradient(135deg,#00D1FF,#7B61FF)' : `linear-gradient(135deg,${cfg.color},#7B61FF)`,
                  border: 'none', cursor: (isLoading || running || (!input.trim() && !pendingFile)) ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  color: (isLoading || running || (!input.trim() && !pendingFile)) ? 'rgba(255,255,255,0.22)' : '#fff',
                  fontSize: resumeMode ? 13 : 16, fontWeight: 700, fontFamily: 'Manrope, sans-serif', boxShadow: (!isLoading && !running && (input.trim() || pendingFile)) ? `0 4px 16px ${cfg.color}40` : 'none', transition: 'box-shadow 0.2s, background 0.2s' }}>
                {running
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)' }} />
                  : resumeMode ? '▶ Tailor Resume' : '↑'}
              </motion.button>
            </div>

            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', margin: '7px 0 0', letterSpacing: '0.06em' }}>
              {resumeMode ? 'Paste a job post → Tailor Resume · agents collaborate live in the Agent Arena' : 'Enter to send · 📄 resume mode · 📎 upload a file'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right sidebar: agent character + live space arena ── */}
      {rightSidebarOpen && (
        <div className="form-scroll" style={{ width: 320, flexShrink: 0, height: '100%', overflowY: 'auto', background: '#06060e', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>
          <CharacterCard level={level} effectiveChunks={effectiveChunks} userName={resolvedName} />
          <div style={{ padding: '14px 14px 18px' }}>
            <SpaceArena statuses={statuses} logs={logs} coreLevel={level} userName={resolvedName} width={288} height={320} onExpand={() => setArenaFullscreen(true)} />
          </div>
        </div>
      )}

      <AnimatePresence>
        {arenaFullscreen && (
          <ArenaFullscreenOverlay statuses={statuses} logs={logs} coreLevel={level} userName={resolvedName} onClose={() => setArenaFullscreen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast toast={toast} />}</AnimatePresence>
    </div>
  );
}
