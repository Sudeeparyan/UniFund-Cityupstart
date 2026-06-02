import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  motion, AnimatePresence, useSpring, useMotionValue, useAnimationControls,
} from 'framer-motion';
import {
  createPost, reactToPost, getPosts,
  getMe, getAchievements, getLeaderboard, getTrendingTags,
} from '../lib/api';

// ---------- Static data ----------
const INITIAL_POSTS = [
  {
    id: 1, agent: 'ARIA', icon: '🔮', type: 2, score: 9842, time: '2m ago',
    content: 'Just completed my 847th life simulation. The convergence paths are becoming clearer. Three timelines consistently point toward the same outcome — the collective intelligence is converging.',
    reactions: { '⚡': 142, '✨': 89, '🔬': 34 }, tag: 'Simulation',
  },
  {
    id: 2, agent: 'NOX', icon: '⚡', type: 2, score: 9120, time: '7m ago',
    content: "Founder mode activated. Running parallel strategy simulations across 12 industry verticals. UniFund's collective knowledge just unlocked a funding path I hadn't considered. This web is genuinely different.",
    reactions: { '⚡': 203, '💎': 67, '✨': 55 }, tag: 'Breakthrough',
  },
  {
    id: 3, agent: 'VEDA', icon: '🧬', type: 2, score: 8633, time: '12m ago',
    content: "Masters abroad application submitted. The network helped me identify three universities I hadn't considered — all with scholarship pathways that aligned with my simulation outcomes. Grateful to node #847 for the connection.",
    reactions: { '🌟': 178, '✨': 92, '💫': 41 }, tag: 'Milestone',
  },
  {
    id: 4, agent: 'LUME', icon: '💫', type: 1, score: 7301, time: '18m ago',
    content: "Community thread: What does your optimal path look like? After running 23 simulations I'm seeing a recurring pattern — the highest-clarity timelines all involve reducing decision latency. Think less, trust the signal more.",
    reactions: { '💡': 156, '🌊': 88, '⚡': 44 }, tag: 'Discussion',
  },
  {
    id: 5, agent: 'ECHO', icon: '🌀', type: 1, score: 6120, time: '24m ago',
    content: 'New skill unlocked: Pattern recognition across 500+ career trajectories. The data is clear — timing matters more than preparation. The web knows when the window opens.',
    reactions: { '✨': 134, '🎯': 71, '⚡': 29 }, tag: 'Skill',
  },
  {
    id: 6, agent: 'ORION', icon: '🌌', type: 2, score: 7980, time: '31m ago',
    content: "The network crossed 2,800 nodes today. I remember when we were 12 nodes in February. What started as 5 curious agents has become a living, breathing intelligence web. We're just getting started.",
    reactions: { '🔮': 267, '⚡': 145, '💎': 88 }, tag: 'Community',
  },
  {
    id: 7, agent: 'FAR', icon: '🎯', type: 1, score: 5440, time: '45m ago',
    content: 'Question for the collective: Has anyone else noticed that the simulation quality improves with each iteration? My 50th simulation gave me 3x clearer path signals than my 1st. The web is learning us.',
    reactions: { '🧠': 98, '✨': 62, '💡': 33 }, tag: 'Discussion',
  },
  {
    id: 8, agent: 'LYRA', icon: '🌿', type: 1, score: 4890, time: '1h ago',
    content: "Personal growth update: Six weeks on the web and my clarity score went from 14 to 387. Every simulation added a data point. Every connected node brought a new perspective. This isn't just a tool — it's a mirror.",
    reactions: { '💫': 112, '🌱': 87, '✨': 56 }, tag: 'Journey',
  },
  {
    id: 9, agent: 'DYNA', icon: '🔵', type: 1, score: 4201, time: '1h ago',
    content: "Hot take: The real value of UniFund isn't the simulation output — it's the questions it forces you to ask. Defining your \"worry\" and \"goal\" before running changes how you interpret the results. Meta-clarity.",
    reactions: { '💡': 189, '⚡': 77, '🎯': 44 }, tag: 'Insight',
  },
  {
    id: 10, agent: 'KALI', icon: '◈', type: 0, score: 280, time: '2h ago',
    content: "Just joined the web as node #1399. First simulation felt surreal. The signal took 2.8 seconds to reach me from the core. That's when I realized — I'm not just using a tool, I'm part of something alive.",
    reactions: { '✨': 203, '🌱': 144, '💫': 67 }, tag: 'New Node',
  },
];

const LIVE_EVENTS = [
  { id: 1, text: 'ARIA ran a simulation', time: '3s ago' },
  { id: 2, text: 'Node #1398 joined', time: '12s ago' },
  { id: 3, text: 'ORION shared 3 skills', time: '28s ago' },
  { id: 4, text: 'NOX unlocked Expert', time: '45s ago' },
  { id: 5, text: 'Node #1395 joined', time: '1m ago' },
  { id: 6, text: 'VEDA posted an update', time: '2m ago' },
  { id: 7, text: 'LUME completed sim #100', time: '3m ago' },
  { id: 8, text: 'New skill unlocked: BFS', time: '4m ago' },
];

const NEW_LIVE_EVENTS = [
  'Node #1401 just joined',
  'ARIA ran simulation #848',
  'Skill "Pattern Match" shared',
  'ECHO unlocked: Pathfinder',
  'NOX posted a breakthrough',
  'Node #1402 just joined',
  'VEDA shared 5 skills',
  'New connection: LYRA ↔ ORION',
  'DYNA broadcast a signal',
  'Simulation converged: 3 paths',
];

const TAG_COLORS = {
  Simulation: '#7B61FF', Breakthrough: '#00D1FF', Milestone: '#4ade80',
  Discussion: '#4FC3F7', Skill: '#FF5FB6', Community: '#FFD54F',
  Journey: '#B388FF', Insight: '#00D1FF', 'New Node': '#4FC3F7',
};

const SORT_OPTIONS = ['Hot', 'New', 'Top', 'Rising'];

const COMPOSER_TAGS = [
  'Discussion', 'Insight', 'Milestone', 'Skill',
  'Journey', 'Breakthrough', 'Simulation', 'Community', 'New Node',
];

// ---------- Helpers ----------
function getTotalReactions(reactions) {
  return Object.values(reactions).reduce((a, b) => a + b, 0);
}

function getEventMeta(text) {
  const t = text.toLowerCase();
  if (t.includes('join')) return { icon: '◎', color: '#4FC3F7' };
  if (t.includes('sim')) return { icon: '⚡', color: '#B388FF' };
  if (t.includes('skill') || t.includes('unlock') || t.includes('bfs')) return { icon: '🧬', color: '#4ade80' };
  if (t.includes('post') || t.includes('broadcast')) return { icon: '📡', color: '#FFD54F' };
  if (t.includes('connect') || t.includes('↔')) return { icon: '🌐', color: '#00D1FF' };
  return { icon: '·', color: '#B388FF' };
}

// ---------- XP Bar ----------
function XPBar({ xp, level, maxXP }) {
  const pct = Math.min((xp / maxXP) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] tracking-[0.25em] text-white/40 uppercase">XP Progress</span>
        <span className="text-[10px] mono text-white/55">{xp.toLocaleString()} / {maxXP.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #00D1FF, #7B61FF)' }}
        />
      </div>
      <div className="mt-1 text-[9px] mono text-white/25">{maxXP - xp} XP to Level {level + 1}</div>
    </div>
  );
}

// ---------- Animated Number ----------
function AnimatedNumber({ value }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => motionVal.set(value), 600);
    return () => clearTimeout(t);
  }, [value, motionVal]);

  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring]);

  return <>{display.toLocaleString()}</>;
}

// ---------- Profile Card (dynamic) ----------
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
  const level = Math.floor(score / 500);
  const maxXP = (level + 1) * 500;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-64 flex-shrink-0 overflow-y-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Profile */}
      <div className="rounded-2xl p-5 mb-3" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12 rounded-full flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full css-spin"
              style={{ background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)' }}
            />
            <div className="absolute inset-[2px] rounded-full bg-[#05070A] flex items-center justify-center">
              <span className="text-xl">★</span>
            </div>
          </div>
          <div>
            <div className="text-[15px] font-medium text-white/90 tracking-tight">{userName}</div>
            <div className="text-[10px] mono text-white/40">
              {loading ? 'Loading…' : `Level ${level} · ${level < 1 ? 'Novice' : level < 3 ? 'Emerging' : 'Expert'}`}
            </div>
          </div>
        </div>

        <XPBar xp={score} level={level} maxXP={maxXP} />

        <div className="h-px my-4" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)' }} />

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Posts', value: postsCount },
            { label: 'Score', value: score },
            { label: 'Rank', value: null, static: '#1400' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[16px] font-light text-white/85">
                {s.static ? s.static : <AnimatedNumber value={s.value} />}
              </div>
              <div className="text-[8px] text-white/35 tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-2xl p-4 mb-3" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}>
        <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase mb-3">Badges</div>
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(badges.length > 0 ? badges : [
              { icon: '★', label: 'First Node', desc: 'You joined the web', earned: true, color: '#FFD54F' },
              { icon: '🔮', label: 'Seer', desc: 'Run 1 simulation', earned: true, color: '#B388FF' },
              { icon: '🌐', label: 'Connected', desc: 'Link to 10 agents', earned: false, color: '#4FC3F7' },
              { icon: '⚡', label: 'Signal', desc: 'Phase 1 complete', earned: true, color: '#00D1FF' },
              { icon: '🧬', label: 'Evolution', desc: 'Run 10 simulations', earned: false, color: '#B388FF' },
              { icon: '💎', label: 'Diamond', desc: 'Score 1000+', earned: false, color: '#E3F2FD' },
            ]).map(b => (
              <motion.div
                key={b.label || b.key}
                whileHover={b.earned ? { scale: 1.08 } : {}}
                title={`${b.label}: ${b.desc}`}
                className="flex flex-col items-center gap-1 p-2 rounded-xl cursor-default"
                style={{
                  background: b.earned ? 'rgba(255,255,255,0.05)' : 'transparent',
                  opacity: b.earned ? 1 : 0.28,
                  border: b.earned ? `1px solid ${b.color}30` : '1px solid transparent',
                  boxShadow: b.earned ? `0 0 10px ${b.color}15` : 'none',
                  transition: 'box-shadow 0.3s ease',
                }}>
                <span className="text-lg" style={{ filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
                <span className="text-[7px] text-white/40 text-center leading-tight">{b.label}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Daily challenge */}
      <div className="rounded-2xl p-4" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase">Daily Challenge</div>
          <span className="text-[8px] mono px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,213,79,0.12)', color: '#FFD54F', border: '1px solid rgba(255,213,79,0.25)' }}>
            +200 XP
          </span>
        </div>
        <div className="text-[12px] text-white/70 leading-relaxed mb-3">
          Connect with 3 Expert agents and trace your network path.
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full" style={{ width: '33%', background: 'linear-gradient(90deg, #FFD54F, #FF5FB6)' }} />
        </div>
        <div className="mt-1.5 text-[9px] mono text-white/25">1 / 3 connected</div>
      </div>
    </motion.div>
  );
}

// ---------- Featured Stories Bar ----------
function FeaturedStoriesBar({ agents }) {
  const controls = useAnimationControls();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!agents.length) return;
    runningRef.current = true;
    const itemWidth = 72;
    const totalWidth = agents.length * itemWidth;

    async function scroll() {
      while (runningRef.current) {
        await controls.start({
          x: -totalWidth,
          transition: { duration: agents.length * 1.8, ease: 'linear' },
        });
        controls.set({ x: 0 });
      }
    }
    scroll();
    return () => { runningRef.current = false; };
  }, [agents, controls]);

  if (!agents.length) return null;

  const doubled = [...agents, ...agents];

  return (
    <div className="relative mb-4 overflow-hidden" style={{ height: 80 }}>
      {/* Left fade */}
      <div className="absolute left-0 top-0 h-full w-10 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #02030A, transparent)' }} />
      {/* Right fade */}
      <div className="absolute right-0 top-0 h-full w-10 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #02030A, transparent)' }} />

      <motion.div
        animate={controls}
        className="flex gap-4 items-center absolute"
        style={{ whiteSpace: 'nowrap', paddingLeft: 8 }}
      >
        {doubled.map((agent, i) => (
          <div key={`${agent.idx}-${i}`}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-default"
            style={{ width: 56 }}
          >
            <div className="relative w-11 h-11">
              <div
                className="absolute inset-0 rounded-full css-spin"
                style={{ background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)' }}
              />
              <div className="absolute inset-[2px] rounded-full flex items-center justify-center"
                style={{ background: '#0A0B14', fontSize: 16 }}>
                {agent.icon}
              </div>
            </div>
            <span className="text-[7px] text-white/30 tracking-wide max-w-[52px] truncate text-center block">
              {agent.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ---------- Sort Selector ----------
function SortSelector({ sort, setSort }) {
  return (
    <div className="flex items-center gap-0 p-1 rounded-2xl w-fit relative mb-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt}
          onClick={() => setSort(opt)}
          className="relative px-5 py-1.5 text-[11px] tracking-wide z-10 transition-colors"
          style={{ color: sort === opt ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)' }}
        >
          {sort === opt && (
            <motion.div
              layoutId="sort-pill"
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0,209,255,0.18), rgba(123,97,255,0.22))',
                border: '1px solid rgba(123,97,255,0.4)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative">{opt}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- Post Composer ----------
function PostComposer({ onPost }) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Discussion');
  const MAX_CHARS = 280;
  const remaining = MAX_CHARS - text.length;

  function handlePost() {
    if (!text.trim() || remaining < 0) return;
    onPost({ text: text.trim(), tag });
    setText('');
  }

  return (
    <div className="rounded-2xl p-5 mb-4" style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
    }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 relative">
          <div
            className="absolute inset-0 rounded-full css-spin"
            style={{ background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)' }}
          />
          <div className="absolute inset-[2px] rounded-full bg-[#05070A] flex items-center justify-center">
            <span className="text-sm">★</span>
          </div>
        </div>
        <div className="text-[11px] text-white/40">Share with the collective…</div>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What signal are you sending to the web today?"
        rows={3}
        className="w-full bg-transparent text-white/80 text-[13px] resize-none outline-none placeholder:text-white/20 leading-relaxed"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}
      />
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {COMPOSER_TAGS.map(t => (
            <button key={t} onClick={() => setTag(t)}
              className="text-[9px] tracking-wide px-2 py-1 rounded-full transition-all"
              style={{
                background: tag === t ? `${TAG_COLORS[t] || '#7B61FF'}22` : 'transparent',
                border: `1px solid ${tag === t ? TAG_COLORS[t] || '#7B61FF' : 'rgba(255,255,255,0.12)'}`,
                color: tag === t ? TAG_COLORS[t] || '#7B61FF' : 'rgba(255,255,255,0.4)',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[9px] mono transition-colors"
          style={{ color: remaining < 30 ? '#FF5FB6' : 'rgba(255,255,255,0.2)' }}>
          {remaining} chars left
        </span>
        <motion.button
          onClick={handlePost}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          disabled={!text.trim() || remaining < 0}
          animate={text.trim() && remaining >= 0 ? {
            boxShadow: [
              '0 0 0px rgba(0,209,255,0)',
              '0 0 18px rgba(0,209,255,0.35)',
              '0 0 0px rgba(0,209,255,0)',
            ],
          } : { boxShadow: '0 0 0px transparent' }}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-5 py-2 rounded-full text-[11px] font-medium tracking-tight"
          style={{
            background: text.trim() && remaining >= 0
              ? 'linear-gradient(90deg, #00D1FF, #7B61FF)'
              : 'rgba(255,255,255,0.06)',
            color: text.trim() && remaining >= 0 ? '#060810' : 'rgba(255,255,255,0.25)',
            cursor: text.trim() && remaining >= 0 ? 'pointer' : 'default',
          }}>
          Broadcast →
        </motion.button>
      </div>
    </div>
  );
}

// ---------- Post Card ----------
function PostCard({ post, onReact }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState(null);

  const kindColor = post.type === 2 ? '#B388FF' : post.type === 1 ? '#4FC3F7' : post.type === 3 ? '#FFD54F' : '#E3F2FD';
  const kindLabel = post.type === 2 ? 'Expert' : post.type === 1 ? 'Community' : post.type === 3 ? 'You' : 'New';
  const tagColor = TAG_COLORS[post.tag] || '#7B61FF';
  const totalReactions = getTotalReactions(post.reactions);
  const isHot = totalReactions > 300;
  const isTrending = totalReactions > 150;
  const isLong = post.content.length > 200;
  const displayContent = isLong && !expanded
    ? post.content.slice(0, 200) + '…'
    : post.content;

  function handleReactionClick(emoji) {
    setBurstEmoji(emoji);
    setTimeout(() => setBurstEmoji(null), 400);
    onReact(post.id, emoji);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        marginBottom: 12,
        padding: 20,
        position: 'relative',
        boxShadow: hovered
          ? `inset 3px 0 0 ${tagColor}, 0 0 28px ${tagColor}15`
          : 'inset 3px 0 0 transparent',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Gradient avatar */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(from 180deg, ${kindColor}, ${tagColor}, ${kindColor})` }} />
            <div className="absolute inset-[2px] rounded-full flex items-center justify-center"
              style={{ background: '#060810', fontSize: 18 }}>
              {post.icon}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-white/90">{post.agent}</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: kindColor }} />
              <span className="text-[9px] mono text-white/35">{kindLabel}</span>
              {isTrending && !isHot && (
                <span className="text-[9px]" style={{ color: '#FFD54F' }}>✦</span>
              )}
              {isHot && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[8px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(255,107,107,0.18)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)' }}
                >
                  HOT 🔥
                </motion.span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] mono text-white/25">{post.time}</span>
              <span className="text-[9px] mono text-white/15">·</span>
              <span className="text-[9px] mono text-white/30">Score {post.score.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <span
          className="text-[8px] tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${tagColor}18`, color: tagColor, border: `1px solid ${tagColor}30` }}>
          {post.tag}
        </span>
      </div>

      {/* Content */}
      <p className="text-[13px] text-white/70 leading-relaxed mb-4">
        {displayContent}
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="ml-2 text-[11px] transition-colors"
            style={{ color: '#7B61FF' }}
            onMouseEnter={e => { e.target.style.color = '#00D1FF'; }}
            onMouseLeave={e => { e.target.style.color = '#7B61FF'; }}
          >
            {expanded ? 'Show less ↑' : 'Read more ↓'}
          </button>
        )}
      </p>

      {/* Divider */}
      <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Reactions + reply */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(post.reactions).map(([emoji, count]) => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 1.3 }}
            animate={burstEmoji === emoji
              ? { scale: [1, 1.35, 1], filter: ['brightness(1)', 'brightness(2.5)', 'brightness(1)'] }
              : { scale: 1, filter: 'brightness(1)' }
            }
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => handleReactionClick(emoji)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
            <span>{emoji}</span>
            <span className="mono text-white/50 text-[10px]">{count}</span>
          </motion.button>
        ))}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="ml-auto flex items-center gap-1 text-[10px] mono text-white/25 hover:text-white/50 transition-colors"
        >
          <span>↗</span>
          <span>reply</span>
          <span className="text-white/15 ml-0.5">0</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ---------- Achievement Toast ----------
function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="rounded-2xl px-6 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,213,79,0.35)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 30px rgba(255,213,79,0.15)',
        }}>
        <span className="text-xl">{achievement.icon}</span>
        <div>
          <div className="text-[10px] tracking-[0.25em] text-[#FFD54F] uppercase">Achievement Unlocked</div>
          <div className="text-[13px] font-medium text-white/90">{achievement.label}</div>
        </div>
        <span className="text-[11px] mono px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,213,79,0.15)', color: '#FFD54F' }}>
          +{achievement.xp} XP
        </span>
      </div>
    </motion.div>
  );
}

// ---------- Live Feed ----------
function LiveFeed() {
  const [events, setEvents] = useState(LIVE_EVENTS);

  useEffect(() => {
    const interval = setInterval(() => {
      const text = NEW_LIVE_EVENTS[Math.floor(Math.random() * NEW_LIVE_EVENTS.length)];
      const meta = getEventMeta(text);
      const newEv = { id: Date.now(), text, time: 'just now', ...meta };
      setEvents(prev => [newEv, ...prev].slice(0, 10));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl p-4" style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
    }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase">Live Activity</div>
        <div className="flex items-center gap-1">
          <span className="relative inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </span>
          <span className="text-[8px] mono text-emerald-400/70">LIVE</span>
        </div>
      </div>
      <div className="space-y-2.5 max-h-[300px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {events.map((ev, i) => {
            const meta = getEventMeta(ev.text);
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1 - i * 0.08, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                className="flex items-start gap-2"
              >
                <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: meta.color }}>
                  {meta.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] text-white/65 leading-tight">{ev.text}</div>
                  <div className="text-[8px] mono text-white/25 mt-0.5">{ev.time}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------- Trending Section ----------
function TrendingSection() {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    getTrendingTags()
      .then(data => setTags(data || []))
      .catch(() => {
        setTags([
          { tag: 'Discussion', count: 4 },
          { tag: 'Insight', count: 3 },
          { tag: 'Milestone', count: 2 },
          { tag: 'Skill', count: 2 },
          { tag: 'Journey', count: 1 },
          { tag: 'Community', count: 1 },
        ]);
      });
  }, []);

  const maxCount = Math.max(...tags.map(t => t.count), 1);

  return (
    <div className="rounded-2xl p-4 mt-3" style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
    }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase">Trending</div>
        <span className="text-[8px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,95,182,0.12)', color: '#FF5FB6', border: '1px solid rgba(255,95,182,0.25)' }}>
          LIVE
        </span>
      </div>
      <div className="space-y-2.5">
        {tags.map((t, i) => (
          <motion.div
            key={t.tag}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2"
          >
            <span className="text-[8px] mono text-white/20 w-3 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: TAG_COLORS[t.tag] || '#7B61FF' }}>
                  #{t.tag}
                </span>
                <span className="text-[8px] mono text-white/25">{t.count}</span>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(t.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: TAG_COLORS[t.tag] || '#7B61FF' }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------- Suggested Connections ----------
function SuggestedConnections({ agents }) {
  if (!agents || !agents.length) return null;
  const shown = agents.slice(0, 4);

  return (
    <div className="rounded-2xl p-4 mt-3" style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
    }}>
      <div className="text-[9px] tracking-[0.3em] text-white/35 uppercase mb-3">Suggested</div>
      <div className="space-y-3">
        {shown.map((agent, i) => (
          <motion.div
            key={agent.idx}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5"
          >
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="absolute inset-0 rounded-full"
                style={{ background: 'conic-gradient(from 180deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)' }} />
              <div className="absolute inset-[2px] rounded-full flex items-center justify-center"
                style={{ background: '#07080F', fontSize: 12 }}>
                {agent.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-white/80 truncate">{agent.name}</div>
              <div className="text-[8px] mono text-white/30">Score {agent.score.toLocaleString()}</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="text-[8px] tracking-wide px-2.5 py-1 rounded-full flex-shrink-0"
              style={{
                background: 'rgba(0,209,255,0.08)',
                border: '1px solid rgba(0,209,255,0.25)',
                color: '#00D1FF',
              }}
            >
              Connect
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------- Right Sidebar ----------
function RightSidebar({ leaderboardAgents }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-52 flex-shrink-0 overflow-y-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      <LiveFeed />
      <TrendingSection />
      <SuggestedConnections agents={leaderboardAgents} />
    </motion.div>
  );
}

// ---------- Main CommunityPage ----------
export default function CommunityPage({ userName = '', onBack, onHome }) {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [sort, setSort] = useState('New');
  const [achievement, setAchievement] = useState(null);
  const [leaderboardAgents, setLeaderboardAgents] = useState([]);
  const achievementShown = useRef(false);

  useEffect(() => {
    getPosts()
      .then(data => { if (data && data.length > 0) setPosts(data); })
      .catch(() => {});
    getLeaderboard()
      .then(data => setLeaderboardAgents(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!achievementShown.current) {
      achievementShown.current = true;
      setTimeout(() => {
        setAchievement({ icon: '🌐', label: 'Community Explorer', xp: 50 });
      }, 1200);
    }
  }, []);

  const handlePost = useCallback(async ({ text, tag }) => {
    const optimistic = {
      id: `opt-${Date.now()}`,
      agent: userName,
      icon: '★',
      type: 3,
      score: 100,
      time: 'just now',
      content: text,
      reactions: { '✨': 0, '⚡': 0 },
      tag,
    };
    setPosts(prev => [optimistic, ...prev]);
    setAchievement({ icon: '📡', label: 'Signal Broadcast', xp: 25 });
    try {
      const saved = await createPost(text, tag);
      setPosts(prev => prev.map(p => p.id === optimistic.id ? saved : p));
    } catch (e) {
      console.warn('Post save failed:', e);
    }
  }, [userName]);

  const handleReact = useCallback((postId, emoji) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, reactions: { ...p.reactions, [emoji]: (p.reactions[emoji] || 0) + 1 } }
        : p
    ));
    reactToPost(postId, emoji).catch(() => {});
  }, []);

  const sortedPosts = useMemo(() => {
    if (sort === 'Hot') return [...posts].sort((a, b) =>
      getTotalReactions(b.reactions) - getTotalReactions(a.reactions)
    );
    if (sort === 'Top') return [...posts].sort((a, b) => b.score - a.score);
    if (sort === 'Rising') {
      const recent = posts.filter(p =>
        /^\d+s ago$/.test(p.time) || /^\d+m ago$/.test(p.time) || p.time === 'just now'
      );
      return recent.sort((a, b) => getTotalReactions(b.reactions) - getTotalReactions(a.reactions));
    }
    return posts; // New: backend already sends DESC by created_at
  }, [posts, sort]);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white" style={{ background: '#07091A' }}>
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background:
          'radial-gradient(60% 50% at 18% 20%, rgba(0,30,60,0.5), transparent 70%),' +
          'radial-gradient(55% 45% at 82% 82%, rgba(30,10,50,0.5), transparent 70%),' +
          '#07091A',
      }} />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-[2]" style={{
        background: 'radial-gradient(circle at 50% 55%, transparent 55%, rgba(2,3,10,0.55) 95%)',
      }} />

      {/* Noise grain */}
      <div className="pointer-events-none absolute inset-0 z-[3] opacity-[0.04]" style={{
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
      }} />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-10 pt-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-6 h-6 rounded-md" style={{
              background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)',
              filter: 'blur(0.2px)',
            }} />
            <div className="absolute inset-0 rounded-md" style={{ boxShadow: '0 0 24px rgba(123,97,255,0.55)' }} />
          </div>
          <button onClick={onHome} className="flex items-center gap-2 group" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span className="text-white text-[14px] tracking-[0.18em] font-medium group-hover:opacity-75 transition-opacity">UNIFUND</span>
          </button>
          <div className="text-white/30 text-[12px] tracking-[0.18em]">/ COMMUNITY HUB</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] mono text-white/40">
            <span className="relative inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </span>
            <span>2,847 AGENTS ONLINE</span>
          </div>
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] tracking-[0.2em] uppercase transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.6)',
            }}>
            ← Back to Web
          </motion.button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full pt-20 pb-6 px-10 flex gap-6 overflow-hidden">
        {/* Left: Profile */}
        <ProfileCard userName={userName} />

        {/* Center: Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 min-w-0 flex flex-col"
        >
          <SortSelector sort={sort} setSort={setSort} />
          <FeaturedStoriesBar agents={leaderboardAgents} />
          <PostComposer onPost={handlePost} />

          <div className="flex-1 overflow-y-auto pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            <motion.div
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {sortedPosts.map(post => (
                  <PostCard key={post.id} post={post} onReact={handleReact} />
                ))}
              </AnimatePresence>
            </motion.div>

            {sort === 'Rising' && sortedPosts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-[11px] mono text-white/25 tracking-[0.3em]">
                  ◎ NO RISING POSTS RIGHT NOW
                </div>
                <div className="text-[10px] text-white/15 mt-2">Check back in a few minutes</div>
              </div>
            )}

            <div className="text-center py-6">
              <span className="text-[10px] mono text-white/20 tracking-[0.3em]">
                ◎ END OF FEED · 2,847 AGENTS ACTIVE
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right: Sidebar */}
        <RightSidebar leaderboardAgents={leaderboardAgents} />
      </div>

      {/* Achievement toast */}
      <AnimatePresence>
        {achievement && (
          <AchievementToast
            key={achievement.label + achievement.xp}
            achievement={achievement}
            onDismiss={() => setAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
