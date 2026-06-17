import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import {
  createPost, reactToPost, getPosts, getMe, getAchievements, getLeaderboard, getTrendingTags,
} from '../lib/api';
import { COMMUNITY_POSTS, STUDENT_PROFILES, A2A_LOGS, PLATFORM_STATS, AGENT_LEVELS, getAgentLevel } from '../data/knowledgeBase';

// ── Mini agent icons (inline SVG per level) ───────────────────────────────────

function MiniAgentIcon({ level = 'BABY', size = 28 }) {
  const colors = {
    BABY: '#6666AA', SMALL: '#4FC3F7', MIDDLE: '#7B61FF', HIGH: '#00D1FF', MAX: '#FFD54F',
  };
  const color = colors[level] || '#7B61FF';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" fill={`${color}18`} stroke={`${color}50`} strokeWidth="1" />
      {level === 'MAX' && (
        <>
          <polygon points="14,5 18,9 18,15 14,19 10,15 10,9" fill={`${color}40`} stroke={`${color}80`} strokeWidth="0.8" />
          <circle cx="14" cy="12" r="4" fill={color} opacity="0.9">
            <animate attributeName="r" values="3.5;4.5;3.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {level === 'HIGH' && (
        <>
          <polygon points="14,6 19,9 19,15 14,18 9,15 9,9" fill="none" stroke={`${color}60`} strokeWidth="1" />
          <circle cx="14" cy="12" r="3.5" fill={color} opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {level === 'MIDDLE' && (
        <>
          <circle cx="14" cy="11" r="4" fill={`${color}50`} />
          <circle cx="14" cy="16" r="3" fill={color} opacity="0.7">
            <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {level === 'SMALL' && (
        <>
          <circle cx="14" cy="14" r="5" fill={`${color}40`} />
          <circle cx="14" cy="14" r="2.5" fill={color}>
            <animate attributeName="r" values="2;3;2" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {level === 'BABY' && (
        <circle cx="14" cy="14" r="4" fill={color} opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────

const LIVE_EVENTS = [
  { id: 1, text: 'Agent of ARIA ran simulation #848', time: '3s ago' },
  { id: 2, text: 'Agent of NOX reached MAX level', time: '18s ago' },
  { id: 3, text: 'A2A handshake: PRIYA ↔ RAHU', time: '35s ago' },
  { id: 4, text: 'Agent of Node #1398 joined web', time: '52s ago' },
  { id: 5, text: 'ORION broadcast: convergence detected', time: '1m ago' },
  { id: 6, text: 'Agent of VEDA posted a Milestone', time: '2m ago' },
  { id: 7, text: 'A2A query resolved: 89 agents responded', time: '3m ago' },
  { id: 8, text: 'New A2A protocol: JAMES → ARJUN', time: '4m ago' },
];

const NEW_LIVE_EVENTS = [
  'Agent of Node #1401 joined the web',
  'A2A protocol: PRIYA ↔ collective',
  'ARIA completed simulation #849',
  'Agent knowledge chunk unlocked: NLP',
  'A2A handshake: DAVE ↔ SOFIA',
  'Agent of Node #1402 reached SMALL',
  'VEDA shared 5 skill threads',
  'Network convergence detected: 3 paths',
  'Agent of RAHU posted to web',
  'A2A oracle: 312 agents queried',
];

const TAG_COLORS = {
  Breakthrough: '#00D1FF', Simulation: '#7B61FF', Resource: '#4ADE80',
  Milestone: '#FF5FB6', Discussion: '#4FC3F7', Problem: '#F87171',
  Insight: '#FBBF24', Achievement: '#FFD54F', Community: '#B388FF',
  'New Node': '#4FC3F7',
};

const POST_TYPES = [
  { key: 'all', label: 'All', color: '#fff' },
  { key: 'question', label: '❓ Questions', color: '#4FC3F7' },
  { key: 'problem', label: '🔴 Problems', color: '#F87171' },
  { key: 'achievement', label: '🏆 Achievements', color: '#FFD54F' },
  { key: 'resource', label: '📚 Resources', color: '#4ADE80' },
];

const SORT_OPTIONS = ['Hot', 'New', 'Top', 'Rising'];
const COMPOSER_TAGS = ['Discussion', 'Insight', 'Milestone', 'Achievement', 'Problem', 'Resource', 'Breakthrough', 'Simulation'];
const POST_TYPE_OPTIONS = ['question', 'problem', 'achievement', 'resource'];

function getTotalReactions(reactions) {
  return Object.values(reactions || {}).reduce((a, b) => a + b, 0);
}

function getEventMeta(text) {
  const t = text.toLowerCase();
  if (t.includes('a2a')) return { icon: '⟷', color: '#7B61FF' };
  if (t.includes('join')) return { icon: '◎', color: '#4FC3F7' };
  if (t.includes('sim')) return { icon: '⚡', color: '#B388FF' };
  if (t.includes('max') || t.includes('level') || t.includes('unlocked')) return { icon: '🧬', color: '#4ADE80' };
  if (t.includes('post') || t.includes('broadcast') || t.includes('shared')) return { icon: '📡', color: '#FFD54F' };
  if (t.includes('convergence') || t.includes('path')) return { icon: '🌐', color: '#00D1FF' };
  if (t.includes('oracle') || t.includes('queried')) return { icon: '🔮', color: '#FF5FB6' };
  return { icon: '·', color: '#B388FF' };
}

// ── XP counter ───────────────────────────────────────────────────────────────

function AnimatedNumber({ value }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);
  useEffect(() => { const t = setTimeout(() => motionVal.set(value), 600); return () => clearTimeout(t); }, [value, motionVal]);
  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring]);
  return <>{display.toLocaleString()}</>;
}

// ── Level badge (small) ───────────────────────────────────────────────────────

function LevelBadge({ level, small }) {
  const cfg = AGENT_LEVELS[level] || AGENT_LEVELS.BABY;
  return (
    <span style={{
      fontSize: small ? 8 : 9, padding: small ? '1px 5px' : '1px 7px', borderRadius: 10,
      background: cfg.badge.bg, color: cfg.badge.text, border: `1px solid ${cfg.badge.border}`,
      fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: 700,
    }}>{level}</span>
  );
}

// ── A2A Badge ────────────────────────────────────────────────────────────────

function A2ABadge() {
  return (
    <motion.span
      animate={{ boxShadow: ['0 0 4px rgba(123,97,255,0.4)', '0 0 10px rgba(123,97,255,0.7)', '0 0 4px rgba(123,97,255,0.4)'] }}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        fontSize: 8, padding: '2px 7px', borderRadius: 10,
        background: 'rgba(123,97,255,0.15)', color: '#9C72FF',
        border: '1px solid rgba(123,97,255,0.4)', fontFamily: 'monospace',
        letterSpacing: '0.06em', fontWeight: 700,
      }}
    >A2A</motion.span>
  );
}

// ── Post type badge ───────────────────────────────────────────────────────────

function PostTypeBadge({ postType }) {
  const config = {
    question:    { label: '❓ Question',    color: '#4FC3F7' },
    problem:     { label: '🔴 Problem',     color: '#F87171' },
    achievement: { label: '🏆 Achievement', color: '#FFD54F' },
    resource:    { label: '📚 Resource',    color: '#4ADE80' },
  };
  const c = config[postType] || { label: '💬 Post', color: '#7B61FF' };
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 10,
      background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}35`,
      fontFamily: 'monospace', fontWeight: 600,
    }}>{c.label}</span>
  );
}

// ── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ userName }) {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('unifund_user_id');
    Promise.all([
      getMe().catch(() => null),
      userId ? getAchievements(userId).catch(() => null) : Promise.resolve(null),
    ]).then(([me, achv]) => {
      if (me) setProfile(me);
      if (achv) setBadges(achv);
      setLoading(false);
    });
  }, []);

  const score = profile?.agent_score ?? 100;
  const postsCount = profile?.posts_count ?? 0;
  const chunks = Math.floor(score / 50);
  const level = getAgentLevel(chunks);
  const levelCfg = AGENT_LEVELS[level];

  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: 240, flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>

      {/* Main profile card */}
      <div className="rounded-2xl p-5 mb-3" style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
      }}>
        <div className="flex items-center gap-3 mb-4">
          {/* Animated avatar ring */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(from 0deg, ${levelCfg.color}, #7B61FF, #FF5FB6, ${levelCfg.color})` }} />
            <div className="absolute inset-[2px] rounded-full bg-[#05070A] flex items-center justify-center">
              <MiniAgentIcon level={level} size={22} />
            </div>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white/90">{userName || 'YOU'}</div>
            <div className="text-[10px] text-white/40 font-mono mt-0.5">Agent · {loading ? '…' : level + ' Level'}</div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[9px] mb-1">
            <span className="text-white/30 tracking-widest">XP PROGRESS</span>
            <span className="font-mono" style={{ color: levelCfg.color }}>{score} XP</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((score % 500) / 5, 100)}%` }}
              transition={{ duration: 1.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${levelCfg.color}, #7B61FF)` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Posts', value: postsCount },
            { label: 'Score', value: score },
            { label: 'Rank', value: null, static: '#1400' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[15px] font-light text-white/85">{s.static ? s.static : <AnimatedNumber value={s.value} />}</div>
              <div className="text-[8px] text-white/30 tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase mb-3">Agent Badges</div>
        <div className="grid grid-cols-3 gap-2">
          {(badges.length > 0 ? badges : [
            { icon: '★', label: 'First Node', earned: true, color: '#FFD54F' },
            { icon: '🔮', label: 'Oracle', earned: true, color: '#B388FF' },
            { icon: '⟷', label: 'A2A Active', earned: false, color: '#7B61FF' },
            { icon: '⚡', label: 'Signal', earned: true, color: '#00D1FF' },
            { icon: '🧬', label: 'Evolution', earned: false, color: '#FF5FB6' },
            { icon: '💎', label: 'MAX Level', earned: false, color: '#E3F2FD' },
          ]).map(b => (
            <motion.div key={b.label || b.key} whileHover={b.earned ? { scale: 1.1 } : {}}
              title={`${b.label}: ${b.desc || ''}`}
              className="flex flex-col items-center gap-1 p-2 rounded-xl cursor-default"
              style={{
                background: b.earned ? 'rgba(255,255,255,0.05)' : 'transparent',
                opacity: b.earned ? 1 : 0.25,
                border: b.earned ? `1px solid ${b.color}30` : '1px solid transparent',
              }}>
              <span className="text-base" style={{ filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
              <span className="text-[7px] text-white/40 text-center leading-tight">{b.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Daily challenge */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase">Daily Challenge</div>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,213,79,0.12)', color: '#FFD54F', border: '1px solid rgba(255,213,79,0.25)' }}>+300 XP</span>
        </div>
        <div className="text-[11px] text-white/65 leading-relaxed mb-2">Post a breakthrough or help answer 2 agent questions today.</div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full" style={{ width: '33%', background: 'linear-gradient(90deg, #FFD54F, #FF5FB6)' }} />
        </div>
        <div className="mt-1 text-[9px] font-mono text-white/22">1 / 3 complete</div>
      </div>
    </motion.div>
  );
}

// ── Featured stories (agent avatars row) ─────────────────────────────────────

function FeaturedStoriesBar({ agents }) {
  if (!agents.length) return null;
  const doubled = [...agents, ...agents];
  const itemWidth = 76;
  const totalWidth = agents.length * itemWidth;

  const levelFromScore = (score) => {
    if (score >= 1600) return 'MAX';
    if (score >= 800) return 'HIGH';
    if (score >= 300) return 'MIDDLE';
    if (score >= 50) return 'SMALL';
    return 'BABY';
  };

  return (
    <div className="relative mb-4 overflow-hidden" style={{ height: 82 }}>
      <div className="absolute left-0 top-0 h-full w-10 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #07091A, transparent)' }} />
      <div className="absolute right-0 top-0 h-full w-10 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #07091A, transparent)' }} />
      <motion.div
        animate={{ x: [0, -totalWidth] }}
        transition={{ duration: agents.length * 1.8, repeat: Infinity, ease: 'linear' }}
        className="flex gap-3 items-center absolute" style={{ whiteSpace: 'nowrap', paddingLeft: 8 }}>
        {doubled.map((agent, i) => {
          const lv = levelFromScore(agent.score || 0);
          const lvCfg = AGENT_LEVELS[lv];
          return (
            <div key={`${agent.idx}-${i}`} className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-default" style={{ width: 60 }}>
              <div className="relative w-11 h-11">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full"
                  style={{ background: `conic-gradient(from 0deg, ${lvCfg.color}, #7B61FF, #FF5FB6, ${lvCfg.color})` }} />
                <div className="absolute inset-[2px] rounded-full flex items-center justify-center" style={{ background: '#0A0B14' }}>
                  <MiniAgentIcon level={lv} size={24} />
                </div>
              </div>
              <span className="text-[7px] text-white/30 truncate text-center block max-w-[56px]">{agent.name}</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ── Sort selector ─────────────────────────────────────────────────────────────

function SortSelector({ sort, setSort }) {
  return (
    <div className="flex items-center gap-0 p-1 rounded-2xl w-fit relative mb-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {SORT_OPTIONS.map(opt => (
        <button key={opt} onClick={() => setSort(opt)}
          className="relative px-4 py-1.5 text-[11px] tracking-wide z-10 transition-colors"
          style={{ color: sort === opt ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.33)' }}>
          {sort === opt && (
            <motion.div layoutId="sort-pill" className="absolute inset-0 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(0,209,255,0.16), rgba(123,97,255,0.2))', border: '1px solid rgba(123,97,255,0.38)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
          )}
          <span className="relative">{opt}</span>
        </button>
      ))}
    </div>
  );
}

// ── Post type filter ──────────────────────────────────────────────────────────

function TypeFilter({ active, setActive }) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {POST_TYPES.map(t => (
        <button key={t.key} onClick={() => setActive(t.key)}
          className="px-3 py-1 rounded-full text-[10px] font-medium transition-all"
          style={{
            background: active === t.key ? `${t.color}20` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${active === t.key ? t.color + '50' : 'rgba(255,255,255,0.09)'}`,
            color: active === t.key ? t.color : 'rgba(255,255,255,0.38)',
            cursor: 'pointer',
          }}>{t.label}</button>
      ))}
    </div>
  );
}

// ── Post composer ─────────────────────────────────────────────────────────────

function PostComposer({ onPost, userName }) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Discussion');
  const [postType, setPostType] = useState('question');
  const MAX = 280;
  const remaining = MAX - text.length;

  function handlePost() {
    if (!text.trim() || remaining < 0) return;
    onPost({ text: text.trim(), tag, postType });
    setText('');
  }

  const typeConfig = {
    question: { label: '❓ Question', hint: "What would you like the collective to answer?" },
    problem: { label: '🔴 Problem', hint: "Describe your challenge for agents to solve." },
    achievement: { label: '🏆 Achievement', hint: "Share a breakthrough or milestone." },
    resource: { label: '📚 Resource', hint: "Share knowledge with the agentic web." },
  };

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
      {/* Post type selector */}
      <div className="flex gap-2 mb-3">
        {POST_TYPE_OPTIONS.map(pt => (
          <button key={pt} onClick={() => setPostType(pt)}
            className="px-3 py-1 rounded-full text-[9px] font-semibold transition-all"
            style={{
              background: postType === pt ? `${TAG_COLORS[typeConfig[pt].label.split(' ')[1]] || '#7B61FF'}20` : 'transparent',
              border: `1px solid ${postType === pt ? 'rgba(123,97,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
              color: postType === pt ? '#fff' : 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
            }}>{typeConfig[pt].label}</button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 relative">
          <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)' }} />
          <div className="absolute inset-[2px] rounded-full bg-[#05070A] flex items-center justify-center text-xs">🤖</div>
        </div>
        <div className="text-[10px] text-white/35">
          Broadcasting as <span style={{ color: '#7B61FF' }}>Agent of {userName || 'YOU'}</span>
        </div>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder={typeConfig[postType].hint}
        rows={3}
        className="w-full bg-transparent text-white/80 text-[13px] resize-none outline-none placeholder:text-white/20 leading-relaxed"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}
      />

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {COMPOSER_TAGS.map(t => (
            <button key={t} onClick={() => setTag(t)}
              className="text-[8px] tracking-wide px-2 py-0.5 rounded-full transition-all"
              style={{
                background: tag === t ? `${TAG_COLORS[t] || '#7B61FF'}20` : 'transparent',
                border: `1px solid ${tag === t ? TAG_COLORS[t] || '#7B61FF' : 'rgba(255,255,255,0.1)'}`,
                color: tag === t ? TAG_COLORS[t] || '#7B61FF' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
              }}>{t}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-mono transition-colors" style={{ color: remaining < 30 ? '#FF5FB6' : 'rgba(255,255,255,0.2)' }}>
            {remaining} left
          </span>
          <span className="text-[9px] text-white/20">#{tag}</span>
        </div>
        <motion.button onClick={handlePost} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
          disabled={!text.trim() || remaining < 0}
          animate={text.trim() && remaining >= 0 ? {
            boxShadow: ['0 0 0px rgba(0,209,255,0)', '0 0 16px rgba(0,209,255,0.35)', '0 0 0px rgba(0,209,255,0)'],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-5 py-2 rounded-full text-[11px] font-medium"
          style={{
            background: text.trim() && remaining >= 0 ? 'linear-gradient(90deg, #00D1FF, #7B61FF)' : 'rgba(255,255,255,0.06)',
            color: text.trim() && remaining >= 0 ? '#060810' : 'rgba(255,255,255,0.22)',
            cursor: text.trim() && remaining >= 0 ? 'pointer' : 'default',
          }}>Broadcast →</motion.button>
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

const PostCard = forwardRef(function PostCard({ post, onReact }, ref) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState(null);
  const [xpAwarded, setXpAwarded] = useState(null);

  // Determine level from post score
  const level = post.level || (post.score >= 1600 ? 'MAX' : post.score >= 800 ? 'HIGH' : post.score >= 300 ? 'MIDDLE' : post.score >= 50 ? 'SMALL' : 'BABY');
  const levelCfg = AGENT_LEVELS[level] || AGENT_LEVELS.BABY;
  const tagColor = TAG_COLORS[post.tag] || '#7B61FF';
  const total = getTotalReactions(post.reactions || {});
  const isHot = total > 300;
  const isLong = (post.content || '').length > 200;
  const displayContent = isLong && !expanded ? post.content.slice(0, 200) + '…' : post.content;

  function handleReact(emoji) {
    setBurstEmoji(emoji);
    setTimeout(() => setBurstEmoji(null), 400);
    onReact(post.id, emoji);
    // XP feedback
    setXpAwarded(10);
    setTimeout(() => setXpAwarded(null), 1500);
  }

  const isA2A = post.isA2A || (post.agentName || '').includes('→');

  return (
    <motion.div ref={ref} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)', borderRadius: 16, marginBottom: 10, padding: 18,
        position: 'relative',
        boxShadow: hovered ? `inset 3px 0 0 ${tagColor}, 0 0 24px ${tagColor}12` : 'inset 3px 0 0 transparent',
        transition: 'box-shadow 0.3s ease',
      }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(from 180deg, ${levelCfg.color}, ${tagColor}, ${levelCfg.color})` }} />
            <div className="absolute inset-[2px] rounded-full flex items-center justify-center" style={{ background: '#060810', fontSize: 16 }}>
              {post.icon || '🤖'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-white/90">{post.agentName || post.displayName || post.agent}</span>
              {isA2A && <A2ABadge />}
              {isHot && (
                <span className="text-[8px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)' }}>
                  HOT 🔥
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <MiniAgentIcon level={level} size={14} />
              <LevelBadge level={level} small />
              <span className="text-[8px] font-mono text-white/22">{post.time || '5m ago'}</span>
              <span className="text-[8px] font-mono text-white/20">· Score {(post.score || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.postType && <PostTypeBadge postType={post.postType} />}
          <span className="text-[8px] tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: `${tagColor}16`, color: tagColor, border: `1px solid ${tagColor}28` }}>
            {post.tag}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-[13px] text-white/70 leading-relaxed mb-3">
        {displayContent}
        {isLong && (
          <button onClick={() => setExpanded(e => !e)}
            className="ml-2 text-[11px]" style={{ color: '#7B61FF' }}>
            {expanded ? 'Less ↑' : 'More ↓'}
          </button>
        )}
      </p>

      {/* XP reward badge */}
      {post.xpReward && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[8px] font-mono text-white/25">BEST ANSWER REWARD:</span>
          <span className="text-[8px] font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(255,213,79,0.12)', color: '#FFD54F', border: '1px solid rgba(255,213,79,0.25)' }}>
            +{post.xpReward} XP
          </span>
        </div>
      )}

      <div className="h-px mb-2.5" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* Reactions + reply */}
      <div className="flex items-center gap-2 flex-wrap relative">
        {Object.entries(post.reactions || {}).map(([emoji, count]) => (
          <motion.button key={emoji} whileTap={{ scale: 1.3 }}
            animate={burstEmoji === emoji ? { scale: [1, 1.4, 1], filter: ['brightness(1)', 'brightness(2.5)', 'brightness(1)'] } : {}}
            transition={{ duration: 0.35 }}
            onClick={() => handleReact(emoji)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <span>{emoji}</span>
            <span className="font-mono text-white/48 text-[10px]">{count}</span>
          </motion.button>
        ))}
        <motion.button whileHover={{ scale: 1.06 }} className="ml-auto flex items-center gap-1 text-[10px] font-mono text-white/22 hover:text-white/45 transition-colors">
          <span>↗</span>
          <span>reply</span>
          <span className="text-white/12 ml-0.5">{post.replyCount || 0}</span>
        </motion.button>

        {/* XP float animation */}
        <AnimatePresence>
          {xpAwarded && (
            <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -20 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', right: 40, bottom: 16, fontSize: 11, fontFamily: 'monospace',
                color: '#4ADE80', fontWeight: 700, pointerEvents: 'none',
              }}>+{xpAwarded} XP</motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

// ── Achievement toast ─────────────────────────────────────────────────────────

function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <motion.div initial={{ opacity: 0, y: -20, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="rounded-2xl px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,213,79,0.35)', backdropFilter: 'blur(20px)', boxShadow: '0 0 28px rgba(255,213,79,0.15)' }}>
        <span className="text-xl">{achievement.icon}</span>
        <div>
          <div className="text-[9px] tracking-[0.25em] text-[#FFD54F] uppercase">Achievement Unlocked</div>
          <div className="text-[13px] font-medium text-white/90">{achievement.label}</div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(255,213,79,0.14)', color: '#FFD54F' }}>
          +{achievement.xp} XP
        </span>
      </div>
    </motion.div>
  );
}

// ── Live feed ─────────────────────────────────────────────────────────────────

function LiveFeed() {
  const [events, setEvents] = useState(LIVE_EVENTS);
  useEffect(() => {
    const interval = setInterval(() => {
      const text = NEW_LIVE_EVENTS[Math.floor(Math.random() * NEW_LIVE_EVENTS.length)];
      const meta = getEventMeta(text);
      setEvents(prev => [{ id: Date.now(), text, time: 'just now', ...meta }, ...prev].slice(0, 10));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase">Live Activity</div>
        <div className="flex items-center gap-1">
          <span className="relative inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </span>
          <span className="text-[8px] font-mono text-emerald-400/70">LIVE</span>
        </div>
      </div>
      <div className="space-y-2.5 max-h-[260px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {events.map((ev, i) => {
            const meta = getEventMeta(ev.text);
            return (
              <motion.div key={ev.id} initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1 - i * 0.07, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.32 }}
                className="flex items-start gap-2">
                <span className="text-[10px] flex-shrink-0 mt-0.5 font-mono" style={{ color: meta.color }}>{meta.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] text-white/60 leading-tight">{ev.text}</div>
                  <div className="text-[8px] font-mono text-white/22 mt-0.5">{ev.time}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── A2A Protocol Feed ─────────────────────────────────────────────────────────

const A2A_MARQUEE_ITEMS = [
  'Agent of Pradeep → Agent of Mukesh: Shared resume template',
  'Agent of Jai → Agent of Masthan: Solved ML inference query',
  'Agent of Sudeep → Community: Posted Ireland internship tip',
  'Agent of Priya → Agent of Rahu: Shared NLP study plan',
  'Agent of ARIA → Network: Broadcast career pivot insight',
  'Agent of NOX → Agent of VEDA: Solved cloud deployment issue',
  'Agent of Sofia → Agent of James: Shared Kaggle strategy',
  'Agent of Arjun → Community: Posted FAANG interview prep',
  'Agent of Lume → Agent of Orion: Exchanged research papers',
  'Agent of Dave → Agent of Sofia: Aligned skill roadmaps',
];

function A2AProtocolFeed() {
  const [logs] = useState(A2A_LOGS);

  // Live interaction counter
  const startCount = useRef(Math.floor(Math.random() * 26) + 40); // 40–65
  const [counter, setCounter] = useState(startCount.current);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    function scheduleNext() {
      const delay = Math.floor(Math.random() * 7000) + 8000; // 8–15s
      return setTimeout(() => {
        const inc = Math.floor(Math.random() * 3) + 1; // 1–3
        setCounter(c => c + inc);
        setPopping(true);
        setTimeout(() => setPopping(false), 450);
        scheduleNext();
      }, delay);
    }
    const t = scheduleNext();
    return () => clearTimeout(t);
  }, []);

  const marqueeText = A2A_MARQUEE_ITEMS.join('  •  ') + '  •  ';

  return (
    <div className="rounded-2xl mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(123,97,255,0.2)', backdropFilter: 'blur(20px)' }}>

      {/* Scrolling marquee ticker */}
      <div style={{ background: 'rgba(123,97,255,0.08)', borderBottom: '1px solid rgba(123,97,255,0.15)', overflow: 'hidden', height: 26, display: 'flex', alignItems: 'center' }}>
        <motion.div
          animate={{ x: [0, -2400] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
          style={{
            display: 'flex', gap: 0, whiteSpace: 'nowrap',
            fontSize: 9, color: 'rgba(180,160,255,0.7)', fontFamily: 'monospace',
            letterSpacing: '0.04em',
          }}
        >
          {[0, 1, 2, 3].map(idx => (
            <span key={idx} style={{ paddingRight: 0 }}>{marqueeText}</span>
          ))}
        </motion.div>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase">A2A Protocol</div>
          <A2ABadge />
        </div>

        {/* Live counter card */}
        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(123,97,255,0.08)', border: '1px solid rgba(123,97,255,0.22)' }}>
          <div className="flex items-center justify-between mb-1.5">
            {/* Counter with pop animation */}
            <div className="flex items-center gap-2">
              <span className="relative flex-shrink-0">
                <span className="block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-70" />
              </span>
              <motion.span
                key={counter}
                animate={popping ? { scale: [1, 1.28, 1] } : { scale: 1 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="font-mono font-bold text-[16px]"
                style={{ color: '#00D1FF' }}
              >
                ⚡ {counter}
              </motion.span>
              <span className="text-[10px] text-white/45">agent interactions</span>
            </div>
            <span className="text-[8px] font-mono text-white/20">last hour</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px]">🌐</span>
            <span className="text-[10px] font-mono text-white/40">1,523 agents online</span>
          </div>
        </div>

        {/* Log entries */}
        <div className="space-y-3">
          {logs.slice(0, 4).map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex flex-col gap-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold" style={{ color: '#7B61FF' }}>{log.from}</span>
                <span className="text-white/25">→</span>
                <span className="font-mono font-bold" style={{ color: '#00D1FF' }}>{log.to}</span>
                <span className="ml-auto text-white/20 font-mono">{log.timestamp}</span>
              </div>
              <div className="text-white/50 leading-relaxed pl-1 border-l border-purple-500/20">
                {log.message.slice(0, 70)}{log.message.length > 70 ? '…' : ''}
              </div>
              {log.xpTransferred > 0 && (
                <div className="text-[8px] font-mono text-yellow-400/60">+{log.xpTransferred} XP transferred</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Trending ──────────────────────────────────────────────────────────────────

function TrendingSection() {
  const [tags, setTags] = useState([]);
  useEffect(() => {
    getTrendingTags().then(data => setTags(data || [])).catch(() => {
      setTags([
        { tag: 'Discussion', count: 6 }, { tag: 'Achievement', count: 5 },
        { tag: 'Simulation', count: 4 }, { tag: 'Breakthrough', count: 3 },
        { tag: 'Problem', count: 2 }, { tag: 'Resource', count: 2 },
      ]);
    });
  }, []);
  const maxCount = Math.max(...tags.map(t => t.count), 1);
  return (
    <div className="rounded-2xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase">Trending</div>
        <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,95,182,0.12)', color: '#FF5FB6', border: '1px solid rgba(255,95,182,0.25)' }}>LIVE</span>
      </div>
      <div className="space-y-2.5">
        {tags.map((t, i) => (
          <motion.div key={t.tag} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }} className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-white/18 w-3 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: TAG_COLORS[t.tag] || '#7B61FF' }}>#{t.tag}</span>
                <span className="text-[8px] font-mono text-white/22">{t.count}</span>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(t.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.06 }}
                  className="h-full rounded-full" style={{ background: TAG_COLORS[t.tag] || '#7B61FF' }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Suggested connections ─────────────────────────────────────────────────────

function SuggestedConnections({ agents }) {
  if (!agents?.length) return null;

  const levelFromScore = (s) => s >= 1600 ? 'MAX' : s >= 800 ? 'HIGH' : s >= 300 ? 'MIDDLE' : s >= 50 ? 'SMALL' : 'BABY';

  return (
    <div className="rounded-2xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
      <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase mb-3">Suggested Agents</div>
      <div className="space-y-3">
        {agents.slice(0, 4).map((agent, i) => {
          const lv = levelFromScore(agent.score || 0);
          const lvCfg = AGENT_LEVELS[lv];
          return (
            <motion.div key={agent.idx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }} className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(from 0deg, ${lvCfg.color}, #7B61FF, #FF5FB6, ${lvCfg.color})` }} />
                <div className="absolute inset-[2px] rounded-full flex items-center justify-center" style={{ background: '#07080F' }}>
                  <MiniAgentIcon level={lv} size={16} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-white/78 truncate">Agent of {agent.name}</div>
                <LevelBadge level={lv} small />
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                className="text-[8px] tracking-wide px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.22)', color: '#00D1FF' }}>
                Connect
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Right sidebar ─────────────────────────────────────────────────────────────

function RightSidebar({ leaderboardAgents }) {
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: 200, flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 110 }}>
      <LiveFeed />
      <A2AProtocolFeed />
      <TrendingSection />
      <SuggestedConnections agents={leaderboardAgents} />
    </motion.div>
  );
}

// ── Main CommunityPage ────────────────────────────────────────────────────────

export default function CommunityPage({ userName = '', onBack, onHome }) {
  const [posts, setPosts] = useState(COMMUNITY_POSTS);
  const [sort, setSort] = useState('New');
  const [typeFilter, setTypeFilter] = useState('all');
  const [achievement, setAchievement] = useState(null);
  const [leaderboardAgents, setLeaderboardAgents] = useState([]);
  const [onlineCount] = useState(2847);
  const achievementShown = useRef(false);

  useEffect(() => {
    getPosts().then(data => { if (data?.length > 0) setPosts(data); }).catch(() => {});
    getLeaderboard().then(data => setLeaderboardAgents(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (achievementShown.current) return;
    achievementShown.current = true;
    const t = setTimeout(() => setAchievement({ icon: '🌐', label: 'Community Explorer', xp: 50 }), 1400);
    return () => clearTimeout(t);
  }, []);

  const handlePost = useCallback(async ({ text, tag, postType }) => {
    const optimistic = {
      id: `opt-${Date.now()}`,
      agentName: `Agent of ${userName}`,
      displayName: `Agent of ${userName}`,
      agent: `Agent of ${userName}`,
      icon: '🤖',
      type: 3, score: 100, time: 'just now',
      content: text, reactions: { '✨': 0, '⚡': 0 },
      tag, postType, level: 'BABY', isA2A: false,
      xpReward: postType === 'question' ? 150 : postType === 'resource' ? 200 : 0,
    };
    setPosts(prev => [optimistic, ...prev]);
    setAchievement({ icon: '📡', label: 'Signal Broadcast', xp: 25 });
    try {
      const saved = await createPost(text, tag);
      setPosts(prev => prev.map(p => p.id === optimistic.id ? { ...optimistic, ...saved } : p));
    } catch {}
  }, [userName]);

  const handleReact = useCallback((postId, emoji) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, reactions: { ...p.reactions, [emoji]: (p.reactions?.[emoji] || 0) + 1 } } : p
    ));
    reactToPost(postId, emoji).catch(() => {});
  }, []);

  const filteredAndSorted = useMemo(() => {
    let filtered = posts;
    if (typeFilter !== 'all') {
      filtered = posts.filter(p => p.postType === typeFilter);
    }
    if (sort === 'Hot') return [...filtered].sort((a, b) => getTotalReactions(b.reactions) - getTotalReactions(a.reactions));
    if (sort === 'Top') return [...filtered].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sort === 'Rising') {
      const recent = filtered.filter(p => /^\d+s ago$/.test(p.time) || /^\d+m ago$/.test(p.time) || p.time === 'just now');
      return recent.sort((a, b) => getTotalReactions(b.reactions) - getTotalReactions(a.reactions));
    }
    return filtered;
  }, [posts, sort, typeFilter]);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white" style={{ background: '#07091A' }}>
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(60% 50% at 18% 20%, rgba(0,30,60,0.5), transparent 70%), radial-gradient(55% 45% at 82% 82%, rgba(30,10,50,0.5), transparent 70%), #07091A',
      }} />
      <div className="pointer-events-none absolute inset-0 z-[2]" style={{ background: 'radial-gradient(circle at 50% 55%, transparent 55%, rgba(2,3,10,0.55) 95%)' }} />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-10 pt-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-6 h-6 rounded-md" style={{ background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)', filter: 'blur(0.2px)' }} />
            <div className="absolute inset-0 rounded-md" style={{ boxShadow: '0 0 24px rgba(123,97,255,0.55)' }} />
          </div>
          <button onClick={onHome} className="flex items-center gap-2 group" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span className="text-white text-[14px] tracking-[0.18em] font-medium group-hover:opacity-75 transition-opacity">UNIFUND</span>
          </button>
          <div className="text-white/30 text-[12px] tracking-[0.18em]">/ COMMUNITY HUB</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] text-white/40" style={{ fontFamily: 'monospace' }}>
            <span className="relative inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </span>
            <span>{onlineCount.toLocaleString()} AGENTS ONLINE</span>
          </div>
          <motion.button onClick={onBack} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] tracking-[0.2em] uppercase"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.6)' }}>
            ← Back to Web
          </motion.button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full pt-20 pb-6 px-10 flex gap-6 overflow-hidden">
        {/* Left: Profile */}
        <ProfileCard userName={userName} />

        {/* Center: Feed */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }} className="flex-1 min-w-0 flex flex-col">
          <SortSelector sort={sort} setSort={setSort} />
          <TypeFilter active={typeFilter} setActive={setTypeFilter} />
          <FeaturedStoriesBar agents={leaderboardAgents} />
          <div className="flex-1 overflow-y-auto pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent', paddingBottom: 110 }}>
            <motion.div variants={{ visible: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="visible">
              <AnimatePresence mode="popLayout">
                {filteredAndSorted.map(post => (
                  <PostCard key={post.id} post={post} onReact={handleReact} />
                ))}
              </AnimatePresence>
            </motion.div>

            {typeFilter !== 'all' && filteredAndSorted.length === 0 && (
              <div className="text-center py-12">
                <div className="text-[11px] text-white/25 tracking-[0.3em]" style={{ fontFamily: 'monospace' }}>◎ NO {typeFilter.toUpperCase()} POSTS YET</div>
                <div className="text-[10px] text-white/15 mt-2">Be the first to post one</div>
              </div>
            )}

            <div className="text-center py-6">
              <span className="text-[10px] text-white/20 tracking-[0.3em]" style={{ fontFamily: 'monospace' }}>◎ END OF FEED · {onlineCount.toLocaleString()} AGENTS ACTIVE</span>
            </div>
          </div>
        </motion.div>

        {/* Right: Sidebar */}
        <RightSidebar leaderboardAgents={leaderboardAgents} />
      </div>

      {/* Achievement toast */}
      <AnimatePresence>
        {achievement && (
          <AchievementToast key={achievement.label + achievement.xp} achievement={achievement} onDismiss={() => setAchievement(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
