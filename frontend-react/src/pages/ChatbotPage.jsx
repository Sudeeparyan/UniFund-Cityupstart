import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  sendChatMessage, getChatHistory, getMe, getChatChunks,
  clearChatHistory, deleteChatMessage, enhanceContent, uploadFile,
  runStudioPipeline,
} from '../lib/api';

// ── Constants ──────────────────────────────────────────────────────────────────

const COMPLETION_PHRASES = ['profile is ready', 'agent profile is ready', 'the web now knows you'];

const XP_PER_CHUNK = 50;
const MILESTONES = [
  { chunks: 3, xp: 150, label: 'First tier unlocked', icon: '⚡' },
  { chunks: 7, xp: 350, label: 'Expert profile forming', icon: '🔮' },
  { chunks: 12, xp: 600, label: 'Full agent profile!', icon: '✨' },
];

const ACCEPT_TYPES = '.pdf,.docx,.txt,image/png,image/jpeg,image/webp,image/gif';

const STAGES = [
  { id: 0, label: 'Identity',   desc: 'Who are you?',         icon: '◎' },
  { id: 1, label: 'Background', desc: 'Your story so far',    icon: '◈' },
  { id: 2, label: 'Skills',     desc: 'What you can do',      icon: '⚡' },
  { id: 3, label: 'Goals',      desc: "Where you're headed",  icon: '🎯' },
  { id: 4, label: 'Fears',      desc: 'What holds you back',  icon: '🔮' },
  { id: 5, label: 'Complete',   desc: 'Agent ready',          icon: '✨' },
];

const STAGE_LABELS = [
  'Building: Your Identity',
  'Building: Your Background',
  'Building: Your Skills',
  'Building: Your Goals',
  'Building: Your Fears',
  'Agent Complete',
];

const BUILD_STAGE_CHIPS = {
  0: [
    { label: "I'm a student figuring life out 🎓" },
    { label: 'Building a startup 🚀' },
    { label: 'Switching careers ⚡' },
    { label: "Exploring what's possible 🌱" },
  ],
  1: [
    { label: 'I studied computer science 💻' },
    { label: "I've been working in tech for 2 years" },
    { label: 'Self-taught developer here 🔧' },
    { label: 'Fresh graduate, first job' },
  ],
  2: [
    { label: "I'm good at building products 🏗" },
    { label: 'Strong at research and writing 📚' },
    { label: 'I understand systems and data 📊' },
    { label: 'People skills are my strength 👥' },
  ],
  3: [
    { label: 'Launch my own product in 6 months 🎯' },
    { label: 'Get into a top grad program ✈️' },
    { label: 'Financial independence by 30 💎' },
    { label: 'Make a real impact in AI 🌍' },
  ],
  4: [
    { label: 'Afraid of failing publicly 😰' },
    { label: "Worried I'm on the wrong path 🔱" },
    { label: 'Financial pressure is real 🛡' },
    { label: 'Feeling alone in this journey 🧭' },
  ],
  5: [
    { label: 'What can my agent do now?' },
    { label: 'Show me my knowledge map' },
    { label: 'Help me prep for interviews' },
    { label: "What's my next step?" },
  ],
};

const CATEGORY_CONFIG = {
  skill:      { label: 'Skills',     color: '#00D1FF', bg: 'rgba(0,209,255,0.1)',                icon: '⚡' },
  experience: { label: 'Experience', color: '#7B61FF', bg: 'rgba(123,97,255,0.1)',                icon: '◈' },
  goal:       { label: 'Goals',      color: '#FF5FB6', bg: 'rgba(255,95,182,0.1)',                icon: '🎯' },
  fear:       { label: 'Fears',      color: '#FFD54F', bg: 'rgba(255,213,79,0.1)',                icon: '🔮' },
  general:    { label: 'General',    color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', icon: '◎' },
};

const SOCIAL_PLATFORMS = [
  {
    id: 'linkedin', label: 'LinkedIn', icon: '🔗', color: '#0A66C2',
    glowColor: 'rgba(10,102,194,0.25)', tagline: 'Import your professional history',
    mockPayload: (p) => `[LinkedIn Import]\nProfessional background: Technology professional with focus on ${p.skills.length > 0 ? p.skills.slice(0, 2).join(' and ') : 'software development'}. Experience: 2 years in product development, shipped 3 major features. Education: B.Tech Engineering. Goal: transition into AI and founder roles.`,
  },
  {
    id: 'x', label: 'X / Twitter', icon: '✕', color: '#E7E7E7',
    glowColor: 'rgba(231,231,231,0.12)', tagline: 'Your public voice and interests',
    mockPayload: () => '[X/Twitter Import]\nActive in: tech, AI tools, startup ecosystem. Frequently engages with founder content, productivity threads, AI research. Top interests: building in public, personal growth, learning systems.',
  },
  {
    id: 'instagram', label: 'Instagram', icon: '◉', color: '#E1306C',
    glowColor: 'rgba(225,48,108,0.2)', tagline: 'Your visual story and passions',
    mockPayload: () => '[Instagram Import]\nVisual themes: workspace setups, travel, food, study sessions. Saved posts: minimal design, productivity systems. Stories suggest balanced social/deep-work lifestyle.',
  },
  {
    id: 'youtube', label: 'YouTube', icon: '▶', color: '#FF0000',
    glowColor: 'rgba(255,0,0,0.18)', tagline: 'Videos and interests you follow',
    mockPayload: () => '[YouTube Import]\nWatch history: programming tutorials, startup founder interviews, financial literacy, AI demos. Most rewatched: "how I built X" series. Subscriptions: 12 tech, 4 finance, 2 philosophy channels.',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function inferCategory(text) {
  const t = (text || '').toLowerCase();
  if (/afraid|fear|scare|worry|nervous|anxious/.test(t)) return 'fear';
  if (/goal|want|plan|aim|hope|dream|intend|achieve/.test(t)) return 'goal';
  if (/worked|built|led|managed|created|shipped|developed|founded/.test(t)) return 'experience';
  if (/skill|good at|know how|expert|speciali|proficient/.test(t)) return 'skill';
  return 'general';
}

function dedupeAndAppend(prev, profileUpdate, lastUserMsg) {
  const newItems = [];
  (profileUpdate.skills || []).forEach(s => {
    if (!prev.some(p => p.content === s && p.category === 'skill')) {
      newItems.push({ id: `skill-${s}`, content: s, category: 'skill', addedAt: Date.now() });
    }
  });
  if (lastUserMsg) {
    const cat = inferCategory(lastUserMsg);
    const content = lastUserMsg.length > 80 ? lastUserMsg.slice(0, 78) + '…' : lastUserMsg;
    const nonSkillCount = prev.filter(p => p.category !== 'skill').length;
    if (!prev.some(p => p.content === content) && (profileUpdate.chunks_saved || 0) > nonSkillCount) {
      newItems.push({ id: `msg-${Date.now()}`, content, category: cat, addedAt: Date.now() });
    }
  }
  return [...prev, ...newItems];
}

function recalcBuildStage(profileUpdate, setBuildStage) {
  const c = profileUpdate.chunks_saved || 0;
  const s = (profileUpdate.skills || []).length;
  if (c === 0) setBuildStage(0);
  else if (s === 0) setBuildStage(1);
  else if (s < 3) setBuildStage(2);
  else if (c < 7) setBuildStage(3);
  else if (c < 12) setBuildStage(4);
  else setBuildStage(5);
}

// ── Small UI atoms ─────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.18 }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#7B61FF' }}
        />
      ))}
    </div>
  );
}

function FileChip({ name, type, onRemove }) {
  const icon = type === 'image' ? '🖼' : type === 'pdf' ? '📄' : type === 'docx' ? '📝' : '📎';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{ background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.25)', color: 'rgba(255,255,255,0.75)' }}
    >
      <span>{icon}</span>
      <span className="max-w-[120px] truncate">{name}</span>
      <button onClick={onRemove} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" style={{ lineHeight: 1 }}>×</button>
    </motion.div>
  );
}

function EnhancePanel({ original, enhanced, loading, flagged, hallucinations, onConfirm, onCancel, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(10,8,30,0.95)', border: '1px solid rgba(123,97,255,0.35)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(123,97,255,0.15)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: '#7B61FF', fontSize: 16 }}>✦</span>
          <span className="text-xs tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)' }}>AI EXPANDED YOUR MESSAGE</span>
        </div>
        <button onClick={onCancel} className="text-xs px-2 py-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}>Cancel</button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="text-[10px] tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>YOUR BRIEF INPUT</div>
          <p className="text-xs leading-relaxed px-3 py-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}>{original}</p>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] mb-1.5 flex items-center gap-2" style={{ color: '#7B61FF' }}>
            <span>AI EXPANDED VERSION</span>
            {loading && <TypingDots />}
          </div>
          {loading ? (
            <div className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(123,97,255,0.06)' }} />
          ) : (
            <textarea value={enhanced} onChange={e => onChange(e.target.value)} rows={4}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none leading-relaxed"
              style={{ background: 'rgba(123,97,255,0.06)', border: '1px solid rgba(123,97,255,0.25)', color: 'rgba(255,255,255,0.88)' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(123,97,255,0.55)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(123,97,255,0.25)'; }}
            />
          )}
        </div>
        {flagged && hallucinations?.length > 0 && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.3)' }}>
            <div className="text-[10px] tracking-[0.18em] mb-1.5" style={{ color: '#FF8C42' }}>⚠ AI ADDED UNVERIFIED DETAILS</div>
            <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              The expanded version may contain facts you didn't mention. Review before sending:
            </div>
            <ul className="mt-1.5 space-y-1">
              {hallucinations.map((h, i) => (
                <li key={i} className="text-[11px]" style={{ color: '#FF8C42' }}>· {h}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => onConfirm(enhanced)} disabled={loading || !enhanced}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium tracking-wider"
            style={{ background: loading ? 'rgba(123,97,255,0.15)' : 'linear-gradient(135deg, #7B61FF, #00D1FF)', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
            Send Enhanced ↑
          </button>
          <button onClick={() => onConfirm(original)}
            className="px-5 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>
            Send Original
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AiBubble({ content, id, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 max-w-[85%]"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, #7B61FF, #00D1FF)' }}>AI</div>
      <div className="relative">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: 'rgba(123,97,255,0.18)', border: '1px solid rgba(123,97,255,0.35)', color: 'rgba(255,255,255,0.95)' }}>
          {content}
        </div>
        {id && (
          <AnimatePresence>
            {hovered && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onDelete(id)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: 'rgba(255,60,60,0.7)', color: '#fff', border: '1px solid rgba(255,60,60,0.4)' }}>×</motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function UserBubble({ content, id, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="relative">
        <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed max-w-[75%]"
          style={{ background: 'linear-gradient(135deg, rgba(0,209,255,0.22), rgba(123,97,255,0.22))', border: '1px solid rgba(0,209,255,0.4)', color: 'rgba(255,255,255,0.97)' }}>
          {content}
        </div>
        {id && (
          <AnimatePresence>
            {hovered && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onDelete(id)}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: 'rgba(255,60,60,0.7)', color: '#fff', border: '1px solid rgba(255,60,60,0.4)' }}>×</motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function XpToast({ xp, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key={xp} initial={{ opacity: 0, y: 8, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: 'linear-gradient(135deg, rgba(0,209,255,0.15), rgba(123,97,255,0.2))', border: '1px solid rgba(0,209,255,0.3)', color: '#00D1FF' }}>
          <span>🧠</span>
          <span>+{XP_PER_CHUNK} XP · Insight captured</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MilestoneToast({ milestone }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 px-5 py-3 rounded-2xl text-sm"
      style={{ background: 'linear-gradient(135deg, rgba(123,97,255,0.18), rgba(255,95,182,0.15))', border: '1px solid rgba(123,97,255,0.35)', color: 'rgba(255,255,255,0.9)' }}>
      <span className="text-xl">{milestone.icon}</span>
      <div>
        <div className="font-medium" style={{ color: '#7B61FF' }}>{milestone.label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{milestone.xp} XP reached · Profile unlocking</div>
      </div>
    </motion.div>
  );
}

// ── Agent Studio Components ────────────────────────────────────────────────────

function StudioHeader({ buildStage, profile, onBack, onHome }) {
  const xp = (profile.chunks_saved || 0) * XP_PER_CHUNK;
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-6 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,10,24,0.92)', backdropFilter: 'blur(16px)' }}>
      {/* Logo + branding — clickable to go home */}
      <button onClick={onHome} className="flex items-center gap-3 group" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #7B61FF, #00D1FF)', filter: 'blur(1px)' }} />
          <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(180,160,255,0.6) 60%, transparent 100%)' }} />
        </div>
        <span className="text-xs tracking-[0.3em] group-hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.65)' }}>UNIFUND</span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
        <span className="text-xs tracking-[0.22em]"
          style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF, #FF5FB6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AGENT STUDIO
        </span>
      </button>

      {/* Stage progress trail */}
      <div className="hidden md:flex items-center gap-1.5">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <motion.div
              animate={i === buildStage ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              title={s.label}
              className="flex items-center justify-center rounded-full text-[9px]"
              style={{
                width: i === buildStage ? 28 : 22,
                height: i === buildStage ? 28 : 22,
                background: i < buildStage
                  ? 'linear-gradient(135deg, #00D1FF, #7B61FF)'
                  : i === buildStage
                    ? 'rgba(123,97,255,0.35)'
                    : 'rgba(255,255,255,0.06)',
                border: i === buildStage
                  ? '1px solid rgba(123,97,255,0.7)'
                  : i < buildStage
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.14)',
                color: i < buildStage ? '#fff' : i === buildStage ? '#a08cff' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.4s ease',
              }}>
              {i < buildStage ? '✓' : s.icon}
            </motion.div>
            {i < STAGES.length - 1 && (
              <div style={{ width: 12, height: 1, background: i < buildStage ? 'rgba(123,97,255,0.5)' : 'rgba(255,255,255,0.12)' }} />
            )}
          </div>
        ))}
      </div>

      {/* XP + Back to Web */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] tracking-[0.18em]"
          style={{ background: 'rgba(123,97,255,0.14)', border: '1px solid rgba(123,97,255,0.35)', color: '#a08cff' }}>
          <span>⚡</span>
          <span>{xp} XP</span>
        </div>
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] tracking-[0.22em] uppercase"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)' }}>
          ← Back to Web
        </motion.button>
      </div>
    </div>
  );
}

// ── 20 Student Agents ─────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'ARIA',   role: 'Orchestrator',       icon: '◎',  color: '#00D1FF', desc: 'Routes tasks & coordinates agents' },
  { id: 'SCOUT',  role: 'JD Analyzer',        icon: '🔍', color: '#7B61FF', desc: 'Extracts requirements from JDs' },
  { id: 'NEXUS',  role: 'Deep Researcher',    icon: '🧠', color: '#FF5FB6', desc: 'Company & industry intelligence' },
  { id: 'LENS',   role: 'Skill Matcher',      icon: '⚡', color: '#FBBF24', desc: 'Scores your profile vs requirements' },
  { id: 'RESUME', role: 'Resume Builder',     icon: '📄', color: '#4ADE80', desc: 'Crafts tailored ATS resumes' },
  { id: 'QUILL',  role: 'Cover Letter',       icon: '✍️', color: '#F472B6', desc: 'Personalized cover letters' },
  { id: 'PREP',   role: 'Interview Coach',    icon: '🎯', color: '#A78BFA', desc: 'Likely Q&As for your target role' },
  { id: 'LINX',   role: 'LinkedIn Optimizer', icon: '🔗', color: '#38BDF8', desc: 'Headline & summary optimization' },
  { id: 'PATH',   role: 'Learning Planner',   icon: '🗺️', color: '#34D399', desc: 'Roadmaps to close skill gaps' },
  { id: 'SIGMA',  role: 'Study Scheduler',    icon: '📅', color: '#FB923C', desc: 'Deadline tracking & study plans' },
  { id: 'BUILD',  role: 'Project Ideator',    icon: '🏗️', color: '#E879F9', desc: 'Portfolio-worthy project ideas' },
  { id: 'FOLIO',  role: 'Portfolio Coach',    icon: '🖼️', color: '#2DD4BF', desc: 'Curates what to show employers' },
  { id: 'CITE',   role: 'Citation Agent',     icon: '📚', color: '#FACC15', desc: 'APA, MLA, Chicago in seconds' },
  { id: 'DRAFT',  role: 'Email Drafter',      icon: '✉️', color: '#60A5FA', desc: 'Cold emails to recruiters' },
  { id: 'FUND',   role: 'Scholarship Finder', icon: '💰', color: '#86EFAC', desc: 'Matched scholarship opportunities' },
  { id: 'MATCH',  role: 'Internship Matcher', icon: '🎪', color: '#F87171', desc: 'Best-fit internship discovery' },
  { id: 'PAY',    role: 'Salary Intel',       icon: '📊', color: '#A3E635', desc: 'Market rates & negotiation' },
  { id: 'NET',    role: 'Network Strategist', icon: '🌐', color: '#C084FC', desc: 'Who to contact & how' },
  { id: 'BRIEF',  role: 'Summarizer',         icon: '⚡', color: '#67E8F9', desc: 'Condenses papers & articles' },
  { id: 'ESSAY',  role: 'Academic Writer',    icon: '🎓', color: '#FB7185', desc: 'SOPs, essays & academic writing' },
];

const PIPELINE_AGENTS = ['ARIA', 'SCOUT', 'NEXUS', 'LENS', 'RESUME'];

const TABS = [
  { id: 'profile',   label: 'Profile',   icon: '◎' },
  { id: 'agents',    label: 'Agents',    icon: '🤖' },
  { id: 'social',    label: 'Social',    icon: '◈' },
  { id: 'knowledge', label: 'Knowledge', icon: '🧠' },
  { id: 'tools',     label: 'Tools',     icon: '📤' },
];

function LeftPanelTabs({ activeTab, setActiveTab }) {
  return (
    <div className="flex items-center gap-0 px-3 pt-3 pb-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)}
          className="relative flex items-center gap-1.5 px-3 py-2.5 text-[10px] tracking-[0.18em] uppercase transition-colors"
          style={{ color: activeTab === t.id ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }}>
          <span>{t.icon}</span>
          <span className="hidden sm:inline">{t.label}</span>
          {activeTab === t.id && (
            <motion.div layoutId="studio-tab-pill"
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
              style={{ background: 'linear-gradient(90deg, #00D1FF, #7B61FF)' }} />
          )}
        </button>
      ))}
    </div>
  );
}

function AgentIdentityCard({ profile, buildStage, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const chunks = profile.chunks_saved || 0;
  const xp = chunks * XP_PER_CHUNK;
  const progressPct = Math.min((chunks / 12) * 100, 100);
  const level = chunks >= 12 ? 'AGENT COMPLETE' : chunks >= 7 ? 'LEVEL 3 · EXPERT' : chunks >= 3 ? 'LEVEL 2 · EMERGING' : chunks >= 1 ? 'LEVEL 1 · NOVICE' : 'LEVEL 0 · UNKNOWN';
  const levelColor = chunks >= 12 ? '#FF5FB6' : chunks >= 7 ? '#7B61FF' : chunks >= 3 ? '#00D1FF' : 'rgba(255,255,255,0.3)';
  const glowSize = 8 + chunks * 4;
  const glowAlpha = Math.min(0.15 + chunks * 0.04, 0.6);

  return (
    <div className="p-4 space-y-3">
      {/* Avatar ring */}
      <div className="flex flex-col items-center py-3">
        <div style={{ width: 72, height: 72, position: 'relative' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #7B61FF, #00D1FF)',
              boxShadow: `0 0 ${glowSize}px rgba(123,97,255,${glowAlpha})`,
            }} />
          <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#02030A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22 }}>🤖</span>
          </div>
          {/* Orbit dots */}
          {Array.from({ length: Math.min(chunks, 8) }).map((_, i) => {
            const angle = (i / Math.max(chunks, 1)) * 360;
            return (
              <div key={i} style={{
                position: 'absolute', width: 5, height: 5, borderRadius: '50%',
                background: '#00D1FF', top: '50%', left: '50%',
                transform: `rotate(${angle}deg) translateX(38px) translateY(-50%)`,
                boxShadow: '0 0 4px #00D1FF',
              }} />
            );
          })}
        </div>
        <div className="mt-2 text-[10px] tracking-[0.22em] font-medium" style={{ color: levelColor }}>{level}</div>
      </div>

      {/* XP bar */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>XP</span>
          <span className="text-[11px] font-medium" style={{ color: levelColor }}>{xp}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #00D1FF, #7B61FF, #FF5FB6)' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>0</span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>600 XP</span>
        </div>
      </div>

      {/* Bio */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="text-[10px] tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>BIO</div>
        <p className="text-xs leading-relaxed" style={{ color: profile.bio ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
          {profile.bio || 'Building from your answers...'}
        </p>
      </div>

      {/* Skills */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="text-[10px] tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>SKILLS DETECTED</div>
        {profile.skills.length === 0 ? (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Keep sharing to unlock...</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(0,209,255,0.1)', border: '1px solid rgba(0,209,255,0.2)', color: '#00D1FF' }}>
                {s.length > 24 ? s.slice(0, 22) + '…' : s}
              </motion.span>
            ))}
          </div>
        )}
      </div>

      {/* Clear */}
      <AnimatePresence mode="wait">
        {confirmClear ? (
          <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.2)' }}>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Clear entire chat history?</p>
            <div className="flex gap-2">
              <button onClick={() => { onClear(); setConfirmClear(false); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,60,60,0.25)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)' }}>Clear</button>
              <button onClick={() => setConfirmClear(false)}
                className="flex-1 py-1.5 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
            </div>
          </motion.div>
        ) : (
          <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmClear(true)}
            className="w-full py-2 rounded-xl text-xs transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,80,80,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
            Clear chat history
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function BuildStageIndicator({ buildStage }) {
  return (
    <div className="px-4 pb-4">
      <div className="text-[10px] tracking-[0.22em] mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>BUILD PROGRESS</div>
      <div className="space-y-0">
        {STAGES.map((s, i) => {
          const done = i < buildStage;
          const active = i === buildStage;
          return (
            <div key={s.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <motion.div
                  animate={active ? { boxShadow: ['0 0 0px rgba(123,97,255,0)', '0 0 8px rgba(123,97,255,0.6)', '0 0 0px rgba(123,97,255,0)'] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center justify-center rounded-full text-[10px] font-medium"
                  style={{
                    width: 20, height: 20, flexShrink: 0,
                    background: done ? 'linear-gradient(135deg, #00D1FF, #7B61FF)' : active ? 'rgba(123,97,255,0.25)' : 'rgba(255,255,255,0.04)',
                    border: done ? 'none' : active ? '1px solid rgba(123,97,255,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    color: done ? '#fff' : active ? '#7B61FF' : 'rgba(255,255,255,0.2)',
                  }}>
                  {done ? '✓' : s.icon}
                </motion.div>
                {i < STAGES.length - 1 && (
                  <div style={{ width: 1, height: 20, background: done ? 'rgba(123,97,255,0.4)' : 'rgba(255,255,255,0.07)', marginTop: 2, marginBottom: 2 }} />
                )}
              </div>
              <div className="pb-1" style={{ paddingTop: 1 }}>
                <div className="text-xs font-medium" style={{ color: done ? 'rgba(255,255,255,0.6)' : active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }}>
                  {s.label}
                </div>
                <div className="text-[10px]" style={{ color: done ? 'rgba(255,255,255,0.25)' : active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)' }}>
                  {s.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoicePreview({ bio }) {
  if (!bio) return null;
  const sentences = bio.split(/[.!?]/).filter(s => s.trim().length > 10).slice(0, 2);
  if (sentences.length === 0) return null;
  return (
    <div className="mx-4 mb-4 rounded-xl p-3" style={{ background: 'rgba(123,97,255,0.06)', border: '1px solid rgba(123,97,255,0.15)', borderLeft: '2px solid rgba(123,97,255,0.35)' }}>
      <div className="text-[9px] tracking-[0.22em] mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>YOUR AGENT WRITES LIKE THIS</div>
      {sentences.map((s, i) => (
        <p key={i} className="text-xs leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.5)' }}>"{s.trim()}."</p>
      ))}
    </div>
  );
}

function SocialImportPanel({ onConnect, socialImporting }) {
  return (
    <div className="p-4 space-y-2">
      <div className="text-[10px] tracking-[0.22em] mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>IMPORT YOUR DIGITAL FOOTPRINT</div>
      {SOCIAL_PLATFORMS.map(p => (
        <motion.div key={p.id} className="flex items-center justify-between rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          whileHover={{ borderColor: p.glowColor, background: `${p.glowColor.replace(')', ', 0.06)')}` }}>
          <div className="flex items-center gap-3">
            <span className="text-base" style={{ color: p.color }}>{p.icon}</span>
            <div>
              <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{p.label}</div>
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.tagline}</div>
            </div>
          </div>
          <button onClick={() => onConnect(p.id)}
            disabled={socialImporting}
            className="text-[10px] px-3 py-1.5 rounded-lg tracking-wider transition-all"
            style={{ background: `rgba(${p.id === 'linkedin' ? '10,102,194' : p.id === 'x' ? '231,231,231' : p.id === 'instagram' ? '225,48,108' : '255,0,0'}, 0.12)`, border: `1px solid ${p.color}44`, color: p.color, cursor: socialImporting ? 'not-allowed' : 'pointer' }}>
            {socialImporting ? '⟳' : 'Connect →'}
          </button>
        </motion.div>
      ))}
      <p className="text-[10px] text-center pt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
        🔒 Local simulation — no real OAuth connection is made
      </p>
    </div>
  );
}

function SocialModalOverlay({ platformId, profile, onClose, onImport }) {
  const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
  if (!platform) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1000, background: 'rgba(2,3,10,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-6 w-full max-w-sm mx-4"
        style={{ background: 'rgba(10,8,30,0.98)', border: `1px solid ${platform.glowColor}`, boxShadow: `0 0 40px ${platform.glowColor}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <span style={{ fontSize: 24, color: platform.color }}>{platform.icon}</span>
          <div>
            <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>Connect {platform.label}</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Allow agent data import</div>
          </div>
        </div>
        <div className="rounded-xl p-4 mb-5 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[10px] tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>PERMISSIONS REQUESTED</div>
          {['Public profile', 'Professional history', 'Interest signals'].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span style={{ color: '#00D1FF' }}>✓</span> {item}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
            Cancel
          </button>
          <button onClick={() => onImport(platform)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: `linear-gradient(135deg, ${platform.color}33, ${platform.color}55)`, border: `1px solid ${platform.color}66`, color: '#fff' }}>
            Allow Import →
          </button>
        </div>
        <p className="text-[10px] text-center mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>🔒 Local simulation only — no real connection</p>
      </motion.div>
    </motion.div>
  );
}

function KnowledgeMap({ items }) {
  if (items.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12 text-center">
        <div style={{ fontSize: 32, opacity: 0.3 }}>🧠</div>
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Keep chatting — knowledge is extracted automatically</p>
      </div>
    );
  }
  const grouped = Object.entries(CATEGORY_CONFIG).reduce((acc, [cat]) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});
  return (
    <div className="p-4 space-y-4">
      <div className="text-[10px] tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {items.length} KNOWLEDGE NODES
      </div>
      {Object.entries(grouped).map(([cat, catItems]) => {
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 11, color: cfg.color }}>{cfg.icon}</span>
              <span className="text-[10px] tracking-[0.18em] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>({catItems.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {catItems.map(item => (
                <motion.span key={item.id} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-[10px] px-2.5 py-1 rounded-full"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}33`, color: cfg.color, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={item.content}>
                  {item.content.length > 48 ? item.content.slice(0, 46) + '…' : item.content}
                </motion.span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ToolCard({ title, icon, content, loading: toolLoading }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <span>{icon}</span><span className="tracking-[0.15em]">{title}</span>
        </div>
        <button onClick={handleCopy} className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
          style={{ background: copied ? 'rgba(0,209,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(0,209,255,0.3)' : 'rgba(255,255,255,0.08)'}`, color: copied ? '#00D1FF' : 'rgba(255,255,255,0.35)' }}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      {toolLoading ? (
        <div className="h-16 m-3 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : (
        <pre className="p-3 text-[10px] leading-relaxed overflow-x-auto" style={{ color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content || 'Chat more to generate this export.'}
        </pre>
      )}
    </div>
  );
}

function ToolsPanel({ profile, knowledgeItems }) {
  const resumeContent = profile.bio
    ? `RESUME SNAPSHOT — UniFund Agent\n\nBIO\n${profile.bio}\n\nSKILLS\n${profile.skills.join(', ') || 'Not yet detected'}\n\nKNOWLEDGE INSIGHTS\n${knowledgeItems.length} insights captured`
    : '';
  const bioContent = profile.bio || '';
  const knowledgeContent = Object.entries(CATEGORY_CONFIG).reduce((acc, [cat, cfg]) => {
    const items = knowledgeItems.filter(i => i.category === cat);
    if (items.length > 0) acc += `\n${cfg.icon} ${cfg.label}\n${items.map(i => `  • ${i.content}`).join('\n')}\n`;
    return acc;
  }, '').trim();

  return (
    <div className="p-4 space-y-3">
      <div className="text-[10px] tracking-[0.22em] mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>EXPORT TOOLS</div>
      <ToolCard title="RESUME SNAPSHOT" icon="📄" content={resumeContent} />
      <ToolCard title="BIO EXPORT" icon="◎" content={bioContent} />
      <ToolCard title="KNOWLEDGE EXPORT" icon="🧠" content={knowledgeContent} />
    </div>
  );
}

// ── Agent Network Components ───────────────────────────────────────────────────

function AgentCard({ agent, status }) {
  const isActive = status === 'active';
  const isDone   = status === 'done';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '7px 10px', borderRadius: 8,
      background: isActive ? `${agent.color}10` : 'transparent',
      border: `1px solid ${isActive ? agent.color + '35' : 'transparent'}`,
      transition: 'background 0.25s, border-color 0.25s',
    }}>
      <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
        <span style={{ fontSize: 13 }}>{agent.icon}</span>
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: agent.color, opacity: 0.3 }}
          />
        )}
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 6, height: 6, borderRadius: '50%',
          background: isDone ? '#4ADE80' : isActive ? agent.color : 'rgba(255,255,255,0.12)',
          boxShadow: isActive ? `0 0 5px ${agent.color}` : 'none',
          transition: 'background 0.3s',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: isActive ? agent.color : isDone ? '#4ADE80' : 'rgba(255,255,255,0.7)' }}>
            {agent.id}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: 3, padding: '1px 4px' }}>
            {agent.role}
          </span>
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '1px 0 0', lineHeight: 1.3 }}>{agent.desc}</p>
      </div>
    </div>
  );
}

function CommLogEntry({ entry }) {
  const fromColor = (AGENTS.find(a => a.id === entry.from_agent)?.color) ?? '#7B61FF';
  const toColor   = (AGENTS.find(a => a.id === entry.to_agent)?.color)   ?? '#7B61FF';
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
      style={{ padding: '6px 12px', borderLeft: `2px solid ${fromColor}35` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: fromColor }}>{entry.from_agent}</span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>→</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: toColor }}>{entry.to_agent}</span>
      </div>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.4 }}>{entry.message}</p>
    </motion.div>
  );
}

function AgentNetworkPanel({ agentStatuses, commLogs, isRunning }) {
  const commsRef = useRef(null);
  useEffect(() => {
    if (commsRef.current) commsRef.current.scrollTop = commsRef.current.scrollHeight;
  }, [commLogs.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Status bar */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'linear-gradient(135deg, #00D1FF, #7B61FF)', boxShadow: '0 0 6px #00D1FF' }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>AGENT NETWORK</span>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {PIPELINE_AGENTS.map(id => {
            const st = agentStatuses[id];
            const color = AGENTS.find(a => a.id === id)?.color ?? '#7B61FF';
            return (
              <div key={id} title={id} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: st === 'done' ? '#4ADE80' : st === 'active' ? color : 'rgba(255,255,255,0.12)',
                boxShadow: st === 'active' ? `0 0 5px ${color}` : 'none',
                transition: 'all 0.3s',
              }} />
            );
          })}
        </div>
      </div>

      {/* Pipeline hint */}
      <div style={{ padding: '8px 12px', background: 'rgba(0,209,255,0.04)', borderBottom: '1px solid rgba(0,209,255,0.08)' }}>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
          {isRunning
            ? '⚡ Pipeline running — agents collaborating below'
            : 'Paste a job description in the chat and click ▶ Run Pipeline to generate your resume.'}
        </p>
      </div>

      {/* Agent list */}
      <div style={{ flex: '0 0 52%', overflowY: 'auto', padding: '4px 4px' }}>
        {AGENTS.map(agent => (
          <AgentCard key={agent.id} agent={agent} status={agentStatuses[agent.id] || 'idle'} />
        ))}
      </div>

      {/* Live comms */}
      <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)' }}>LIVE COMMS</span>
          {isRunning && (
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80' }} />
          )}
        </div>
        <div ref={commsRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {commLogs.length === 0 ? (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', padding: '16px 12px' }}>
              Agent communications appear here in real time.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {commLogs.map((log, i) => <CommLogEntry key={i} entry={log} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumeChip({ label, color }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 20,
      border: `1px solid ${color}40`, color, background: `${color}10`,
    }}>{label}</span>
  );
}

function ResumeBubble({ pipelineData }) {
  const [copied, setCopied] = useState(false);
  const resume = pipelineData?.resume ?? {};
  const jd     = pipelineData?.jd_analysis ?? {};
  const match  = pipelineData?.match_analysis ?? {};
  const name   = pipelineData?.user_name ?? '';
  const score  = match.match_score;
  const ats    = score ? Math.min(score + 15, 97) : null;

  function handleCopy() {
    const lines = [name, ''];
    if (resume.summary) lines.push('SUMMARY', resume.summary, '');
    if (resume.skills_technical?.length) lines.push('TECHNICAL SKILLS', resume.skills_technical.join(', '), '');
    if (resume.experience?.length) {
      lines.push('EXPERIENCE');
      resume.experience.forEach(e => {
        lines.push(`${e.title} @ ${e.company} | ${e.period}`);
        (e.bullets || []).forEach(b => lines.push(`  • ${b}`));
        lines.push('');
      });
    }
    if (resume.education?.length) {
      lines.push('EDUCATION');
      resume.education.forEach(e => lines.push(`${e.degree} — ${e.school} (${e.year})`));
      lines.push('');
    }
    if (resume.projects?.length) {
      lines.push('PROJECTS');
      resume.projects.forEach(p => { lines.push(`${p.name} [${(p.tech || []).join(', ')}]`); lines.push(`  ${p.description}`, ''); });
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '18px 20px', maxWidth: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{name}</p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            Tailored for: <span style={{ color: '#00D1FF' }}>{jd.role}</span>
            {jd.company && jd.company !== 'Unknown' && <> at <span style={{ color: '#7B61FF' }}>{jd.company}</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {score && (
            <div style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${score >= 75 ? '#4ADE80' : '#FBBF24'}40`, background: `${score >= 75 ? '#4ADE80' : '#FBBF24'}10`, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: score >= 75 ? '#4ADE80' : '#FBBF24', fontWeight: 700 }}>MATCH</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: score >= 75 ? '#4ADE80' : '#FBBF24' }}>{score}%</span>
            </div>
          )}
          {ats && (
            <div style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(0,209,255,0.3)', background: 'rgba(0,209,255,0.07)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: '#00D1FF', fontWeight: 700 }}>ATS</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#00D1FF' }}>~{ats}%</span>
            </div>
          )}
          <button onClick={handleCopy} style={{
            background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${copied ? '#4ADE80' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 7, padding: '5px 12px', color: copied ? '#4ADE80' : 'rgba(255,255,255,0.6)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', transition: 'all 0.2s',
          }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {resume.summary && (
        <>
          <SectionDivider label="SUMMARY" />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, margin: '8px 0 14px' }}>{resume.summary}</p>
        </>
      )}

      {resume.skills_technical?.length > 0 && (
        <>
          <SectionDivider label="TECHNICAL SKILLS" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 12px' }}>
            {resume.skills_technical.map((s, i) => <ResumeChip key={i} label={s} color="#00D1FF" />)}
            {(resume.skills_soft || []).map((s, i) => <ResumeChip key={`s${i}`} label={s} color="#7B61FF" />)}
          </div>
        </>
      )}

      {resume.experience?.length > 0 && (
        <>
          <SectionDivider label="EXPERIENCE" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '8px 0 14px' }}>
            {resume.experience.map((exp, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{exp.title}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 7 }}>@ {exp.company}</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{exp.period}</span>
                </div>
                <ul style={{ margin: '5px 0 0 14px', padding: 0 }}>
                  {(exp.bullets || []).map((b, j) => (
                    <li key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,0.57)', lineHeight: 1.55, marginBottom: 2 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {resume.education?.length > 0 && (
        <>
          <SectionDivider label="EDUCATION" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 14px' }}>
            {resume.education.map((edu, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{edu.degree}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 7 }}>{edu.school}</span></span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{edu.year}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {resume.projects?.length > 0 && (
        <>
          <SectionDivider label="PROJECTS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0 14px' }}>
            {resume.projects.map((proj, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{proj.name}</span>
                  {(proj.tech || []).map((t, j) => <ResumeChip key={j} label={t} color="#FF5FB6" />)}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', lineHeight: 1.55 }}>{proj.description}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {resume.certifications?.length > 0 && (
        <>
          <SectionDivider label="CERTIFICATIONS" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 6px' }}>
            {resume.certifications.map((c, i) => <ResumeChip key={i} label={c} color="#FBBF24" />)}
          </div>
        </>
      )}

      {match.missing_skills?.length > 0 && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <p style={{ fontSize: 10, color: '#FBBF24', fontWeight: 700, margin: '0 0 5px', letterSpacing: '0.08em' }}>SKILL GAPS TO ADDRESS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {match.missing_skills.map((s, i) => <ResumeChip key={i} label={s} color="#FBBF24" />)}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 0' }}>
      <span style={{ fontSize: 9, letterSpacing: '0.12em', fontWeight: 700, color: 'rgba(255,255,255,0.28)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

function ChatStageLabel({ buildStage }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={buildStage}
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 flex items-center justify-between px-6 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-2">
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full" style={{ background: buildStage === 5 ? '#FF5FB6' : '#7B61FF' }} />
          <span className="text-[10px] tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.65)' }}>{STAGE_LABELS[buildStage]}</span>
        </div>
        <div className="flex items-center gap-1">
          {STAGES.map((_, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < buildStage ? '#7B61FF' : i === buildStage ? '#00D1FF' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function SuggestionChips({ buildStage, onSelect, disabled }) {
  const chips = BUILD_STAGE_CHIPS[buildStage] || BUILD_STAGE_CHIPS[0];
  return (
    <motion.div key={buildStage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.35 }} className="flex flex-wrap gap-2 mb-3">
      <span className="w-full text-[10px] tracking-[0.22em] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>Quick answers →</span>
      {chips.map((s, i) => (
        <motion.button key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
          onClick={() => !disabled && onSelect(s.label)} disabled={disabled}
          whileHover={disabled ? {} : { y: -2, scale: 1.02 }} whileTap={disabled ? {} : { scale: 0.97 }}
          className="px-3 py-1.5 rounded-full text-xs transition-all"
          style={{ background: 'rgba(123,97,255,0.08)', border: '1px solid rgba(123,97,255,0.25)', color: 'rgba(255,255,255,0.7)', cursor: disabled ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'rgba(123,97,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(123,97,255,0.5)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,97,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(123,97,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
          {s.label}
        </motion.button>
      ))}
    </motion.div>
  );
}

function CompletionScreen({ profile, userName, onComplete, onDismiss }) {
  const xp = (profile.chunks_saved || 0) * XP_PER_CHUNK;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 2000, background: 'rgba(2,3,10,0.92)', backdropFilter: 'blur(16px)' }}>
      {/* Glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(123,97,255,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <motion.div initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md mx-4 text-center px-8 py-10 rounded-3xl"
        style={{ background: 'rgba(10,8,30,0.95)', border: '1px solid rgba(123,97,255,0.3)', boxShadow: '0 0 60px rgba(123,97,255,0.2)' }}>

        {/* Spinning avatar */}
        <div className="flex justify-center mb-6">
          <div style={{ width: 80, height: 80, position: 'relative' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #7B61FF, #00D1FF)', boxShadow: '0 0 30px rgba(123,97,255,0.4)' }} />
            <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'rgba(10,8,30,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🤖</div>
          </div>
        </div>

        {/* Text reveal */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-xs tracking-[0.4em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>AGENT COMPLETE</motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="text-2xl font-light tracking-wider mb-1"
          style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF, #FF5FB6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {userName || 'YOUR AGENT'}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>The web now knows you.</motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          className="flex justify-center gap-6 mb-5">
          {[
            { label: 'XP EARNED', value: xp },
            { label: 'INSIGHTS', value: profile.chunks_saved || 0 },
            { label: 'SKILLS', value: (profile.skills || []).length },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-xl font-light" style={{ color: '#00D1FF' }}>{stat.value}</div>
              <div className="text-[9px] tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Bio snippet */}
        {profile.bio && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="text-xs italic mb-6 px-2 py-3 rounded-xl leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.4)', borderLeft: '2px solid rgba(123,97,255,0.35)', background: 'rgba(123,97,255,0.04)', textAlign: 'left' }}>
            "{profile.bio.slice(0, 140)}{profile.bio.length > 140 ? '…' : ''}"
          </motion.p>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
          className="space-y-3">
          <motion.button onClick={onComplete}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl text-sm font-medium tracking-[0.22em] uppercase"
            style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF, #FF5FB6)', color: '#fff', boxShadow: '0 0 24px rgba(123,97,255,0.35)' }}>
            ENTER THE WEB →
          </motion.button>
          <button onClick={onDismiss} className="w-full text-xs py-2 transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { e.target.style.color = 'rgba(255,255,255,0.55)'; }}
            onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.25)'; }}>
            Keep building →
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ChatbotPage({ userName, onComplete, onSkip, onHome }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [profile, setProfile] = useState({ bio: '', skills: [], chunks_saved: 0 });
  const [initialized, setInitialized] = useState(false);
  const [showXpToast, setShowXpToast] = useState(false);
  const [xpToastKey, setXpToastKey] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState(null);

  // File upload
  const [pendingFile, setPendingFile] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Enhance
  const [showEnhance, setShowEnhance] = useState(false);
  const [enhancedText, setEnhancedText] = useState('');
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [enhanceOriginal, setEnhanceOriginal] = useState('');
  const [enhanceFlagged, setEnhanceFlagged] = useState(false);
  const [enhanceHallucinations, setEnhanceHallucinations] = useState([]);

  // Panel + build state
  const [activeTab, setActiveTab] = useState('profile');
  const [buildStage, setBuildStage] = useState(0);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [showCompletionReveal, setShowCompletionReveal] = useState(false);
  const [socialModal, setSocialModal] = useState(null);
  const [socialImporting, setSocialImporting] = useState(false);

  // Agent pipeline state
  const [agentStatuses, setAgentStatuses] = useState({});
  const [commLogs, setCommLogs] = useState([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  const lastUserMsgRef = useRef('');
  const prevChunksRef = useRef(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const initCalledRef = useRef(false);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    async function init() {
      setLoading(true);
      try {
        const history = await getChatHistory();
        if (history.length > 0) {
          setMessages(history.map(m => ({ id: m.id, role: m.role, content: m.content })));
        } else {
          const res = await sendChatMessage('__init__');
          setMessages([{ id: res.message.id, role: 'assistant', content: res.message.content }]);
        }
        const [me, chunks] = await Promise.all([getMe(), getChatChunks().catch(() => [])]);
        const chunkCount = me.chunks_saved || chunks.length || 0;
        const loadedProfile = { bio: me.agent_bio || '', skills: me.agent_skills || [], chunks_saved: chunkCount };
        setProfile(loadedProfile);
        recalcBuildStage(loadedProfile, setBuildStage);
        if (chunks.length > 0) {
          setKnowledgeItems(chunks.map((c, i) => ({
            id: `init-${i}`,
            content: c.content,
            category: c.category || 'general',
            addedAt: new Date(c.created_at).getTime(),
          })));
        }
      } catch (e) {
        console.warn('Chatbot init error:', e);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }
    init();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, showEnhance]);

  // XP / milestone detection
  useEffect(() => {
    const cur = profile.chunks_saved;
    const prev = prevChunksRef.current;
    if (cur > prev) {
      setXpToastKey(k => k + 1);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 2200);
      const milestone = MILESTONES.find(m => m.chunks === cur);
      if (milestone) {
        setActiveMilestone(milestone);
        setTimeout(() => setActiveMilestone(null), 3500);
      }
    }
    prevChunksRef.current = cur;
  }, [profile.chunks_saved]);

  // Completion reveal
  useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => setShowCompletionReveal(true), 600);
      return () => clearTimeout(t);
    }
  }, [isComplete]);

  // ── Send message ─────────────────────────────────────────────────────────────
  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setShowEnhance(false);
    lastUserMsgRef.current = trimmed;
    setMessages(prev => [...prev, { id: null, role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChatMessage(trimmed);
      const reply = res.message.content;
      setMessages(prev => {
        const updated = [...prev];
        const lastUserIdx = [...updated].reverse().findIndex(m => m.role === 'user');
        if (lastUserIdx !== -1) updated[updated.length - 1 - lastUserIdx].id = res.message.id ?? null;
        return [...updated, { id: res.message.id, role: 'assistant', content: reply }];
      });
      if (res.profile_update) {
        setProfileLoading(true);
        const upd = res.profile_update;
        setProfile({ bio: upd.bio || '', skills: upd.skills || [], chunks_saved: upd.chunks_saved || 0 });
        setKnowledgeItems(prev => dedupeAndAppend(prev, upd, lastUserMsgRef.current));
        recalcBuildStage(upd, setBuildStage);
        setProfileLoading(false);
      }
      if (COMPLETION_PHRASES.some(p => reply.toLowerCase().includes(p))) setIsComplete(true);
    } catch {
      setMessages(prev => [...prev, { id: null, role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // ── Delete message ───────────────────────────────────────────────────────────
  async function handleDeleteMessage(id) {
    if (!id) return;
    try {
      await deleteChatMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.warn('Delete failed:', e);
    }
  }

  // ── Clear history ────────────────────────────────────────────────────────────
  async function handleClearHistory() {
    try {
      await clearChatHistory();
      setMessages([]);
      setProfile({ bio: '', skills: [], chunks_saved: 0 });
      setKnowledgeItems([]);
      setBuildStage(0);
      setShowCompletionReveal(false);
      setIsComplete(false);
      setLoading(true);
      const res = await sendChatMessage('__init__');
      setMessages([{ id: res.message.id, role: 'assistant', content: res.message.content }]);
    } catch (e) {
      console.warn('Clear failed:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Agent pipeline ───────────────────────────────────────────────────────────
  function setAgentStatus(id, status) {
    setAgentStatuses(prev => ({ ...prev, [id]: status }));
  }

  function replayAgentLogs(logs) {
    logs.forEach(log => {
      setTimeout(() => {
        setCommLogs(prev => [...prev, log]);
        if (log.from_agent && log.from_agent !== 'USER') setAgentStatus(log.from_agent, 'active');
        if (log.to_agent && log.to_agent !== 'USER') setAgentStatus(log.to_agent, 'active');
      }, log.delay_ms);
    });
    const doneMap = { ARIA: 500, SCOUT: 1000, NEXUS: 2500, LENS: 3800, RESUME: 7000 };
    Object.entries(doneMap).forEach(([id, d]) => setTimeout(() => setAgentStatus(id, 'done'), d));
  }

  async function handlePipelineRun(jdText) {
    const jd = jdText.trim();
    if (!jd || pipelineRunning) return;
    setPipelineRunning(true);
    setCommLogs([]);
    setAgentStatuses({});
    setAgentStatus('ARIA', 'active');
    setInput('');
    setActiveTab('agents');

    setMessages(prev => [...prev,
      { id: null, role: 'user', content: jd, msgType: 'jd' },
      { id: null, role: 'assistant', content: '', msgType: 'pipeline-loading' },
    ]);

    try {
      const data = await runStudioPipeline('resume', jd);
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, msgType: 'resume', pipelineData: data }
          : m
      ));
      replayAgentLogs(data.agent_logs || []);
      const maxDelay = Math.max(...(data.agent_logs || [{ delay_ms: 0 }]).map(l => l.delay_ms));
      setTimeout(() => setPipelineRunning(false), maxDelay + 1000);
    } catch (err) {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, msgType: 'error', content: `Pipeline error: ${err.message}` }
          : m
      ));
      setAgentStatuses({});
      setPipelineRunning(false);
    }
  }

  // ── File upload ──────────────────────────────────────────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setFileUploading(true);
    try {
      const res = await uploadFile(file);
      setPendingFile({ name: res.file_name, type: res.file_type, extractedText: res.extracted_text });
      setInput(prev => prev || `[Uploaded: ${res.file_name}]`);
    } catch (err) {
      setMessages(prev => [...prev, { id: null, role: 'assistant', content: `Could not read file: ${err.message}` }]);
    } finally {
      setFileUploading(false);
    }
  }

  async function handleSendWithFile(text) {
    let fullContent = text.trim();
    if (pendingFile) {
      fullContent = `[File: ${pendingFile.name}]\n${pendingFile.extractedText}\n\n${fullContent}`;
      setPendingFile(null);
    }
    await sendMessage(fullContent);
  }

  // ── Enhance ──────────────────────────────────────────────────────────────────
  async function handleEnhance() {
    const trimmed = input.trim();
    if (!trimmed || loading || enhanceLoading) return;
    setEnhanceOriginal(trimmed);
    setEnhancedText('');
    setShowEnhance(true);
    setEnhanceLoading(true);
    try {
      const res = await enhanceContent(trimmed);
      setEnhancedText(res.enhanced);
      setEnhanceFlagged(res.flagged || false);
      setEnhanceHallucinations(res.hallucinations || []);
    } catch {
      setEnhancedText(trimmed);
    } finally {
      setEnhanceLoading(false);
    }
  }

  function handleEnhanceConfirm(text) {
    setShowEnhance(false);
    setInput('');
    sendMessage(text);
  }

  // ── Social import ─────────────────────────────────────────────────────────────
  function handleConnectSocial(platformId) {
    setSocialModal(platformId);
  }

  async function handleAllowImport(platform) {
    setSocialModal(null);
    setSocialImporting(true);
    await new Promise(r => setTimeout(r, 1200));
    const payload = platform.mockPayload(profile);
    setSocialImporting(false);
    await sendMessage(payload);
    setActiveTab('knowledge');
  }

  const showSuggestions = !isComplete && initialized && !loading && !showEnhance && activeTab !== 'agents';
  const agentMode = activeTab === 'agents';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#060812', color: 'white' }}>

      <StudioHeader buildStage={buildStage} profile={profile} onBack={onSkip} onHome={onHome} />

      <div className="flex-1 flex overflow-hidden">

        {/* Left panel */}
        <div className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{ width: '35%', minWidth: 280, maxWidth: 400, borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.015)' }}>
          <LeftPanelTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                  <AgentIdentityCard profile={profile} buildStage={buildStage} onClear={handleClearHistory} />
                  <BuildStageIndicator buildStage={buildStage} />
                  <VoicePreview bio={profile.bio} />
                </motion.div>
              )}
              {activeTab === 'agents' && (
                <motion.div key="agents" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} style={{ height: '100%' }}>
                  <AgentNetworkPanel agentStatuses={agentStatuses} commLogs={commLogs} isRunning={pipelineRunning} />
                </motion.div>
              )}
              {activeTab === 'social' && (
                <motion.div key="social" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                  <SocialImportPanel onConnect={handleConnectSocial} socialImporting={socialImporting} />
                </motion.div>
              )}
              {activeTab === 'knowledge' && (
                <motion.div key="knowledge" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                  <KnowledgeMap items={knowledgeItems} />
                </motion.div>
              )}
              {activeTab === 'tools' && (
                <motion.div key="tools" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                  <ToolsPanel profile={profile} knowledgeItems={knowledgeItems} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatStageLabel buildStage={buildStage} />

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ scrollBehavior: 'smooth' }}>
            {!initialized && <div className="flex justify-center py-8"><TypingDots /></div>}

            {messages.map((msg, i) => {
              if (msg.msgType === 'pipeline-loading') {
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF)' }}>AI</div>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm" style={{ background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.2)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,209,255,0.25)', borderTopColor: '#00D1FF', flexShrink: 0 }} />
                      <span style={{ fontSize: 12 }}>Agents working — building your resume…</span>
                    </div>
                  </div>
                );
              }
              if (msg.msgType === 'resume') {
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #4ADE80, #00D1FF)' }}>AI</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                        ✓ Pipeline complete · Resume tailored to your profile
                      </p>
                      <ResumeBubble pipelineData={msg.pipelineData} />
                    </div>
                  </div>
                );
              }
              return msg.role === 'assistant'
                ? <AiBubble key={msg.id || i} id={msg.id} content={msg.content} onDelete={handleDeleteMessage} />
                : <UserBubble key={msg.id || i} id={msg.id} content={msg.content} onDelete={handleDeleteMessage} />;
            })}

            {loading && initialized && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #7B61FF, #00D1FF)' }}>AI</div>
                <div className="rounded-2xl rounded-tl-sm" style={{ background: 'rgba(123,97,255,0.10)', border: '1px solid rgba(123,97,255,0.18)' }}>
                  <TypingDots />
                </div>
              </div>
            )}

            <AnimatePresence>
              {activeMilestone && <MilestoneToast key={activeMilestone.label} milestone={activeMilestone} />}
            </AnimatePresence>
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-6 pt-4" style={{ paddingBottom: 110, borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex justify-end mb-2 h-8">
              <XpToast xp={profile.chunks_saved * XP_PER_CHUNK} visible={showXpToast} key={xpToastKey} />
            </div>

            <AnimatePresence>
              {showEnhance && (
                <div className="mb-3">
                  <EnhancePanel
                    original={enhanceOriginal} enhanced={enhancedText} loading={enhanceLoading}
                    flagged={enhanceFlagged} hallucinations={enhanceHallucinations}
                    onConfirm={handleEnhanceConfirm} onCancel={() => { setShowEnhance(false); setEnhancedText(''); setEnhanceFlagged(false); setEnhanceHallucinations([]); }}
                    onChange={setEnhancedText}
                  />
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {pendingFile && (
                <div className="mb-2 flex items-center gap-2">
                  <FileChip name={pendingFile.name} type={pendingFile.type} onRemove={() => { setPendingFile(null); setInput(''); }} />
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>· {pendingFile.extractedText.length} chars extracted</span>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {showSuggestions && (
                <SuggestionChips buildStage={buildStage} onSelect={text => sendMessage(text)} disabled={loading} />
              )}
            </AnimatePresence>

            {/* Agent mode banner */}
            {agentMode && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,209,255,0.06)', border: '1px solid rgba(0,209,255,0.18)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11 }}>🤖</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  <strong style={{ color: '#00D1FF' }}>Agent Mode</strong> — paste a job description below, then click ▶ Run Pipeline
                </span>
              </motion.div>
            )}

            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept={ACCEPT_TYPES} className="hidden" onChange={handleFileChange} />
              {!agentMode && (
                <button onClick={() => fileInputRef.current?.click()} disabled={loading || fileUploading}
                  title="Upload PDF, DOCX, image, or text file"
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: fileUploading ? 'rgba(0,209,255,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: fileUploading ? '#00D1FF' : 'rgba(255,255,255,0.4)', cursor: loading ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (!loading && !fileUploading) { e.currentTarget.style.borderColor = 'rgba(0,209,255,0.35)'; e.currentTarget.style.color = '#00D1FF'; }}}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = fileUploading ? '#00D1FF' : 'rgba(255,255,255,0.4)'; }}>
                  {fileUploading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 rounded-full border-t-2" style={{ borderColor: '#00D1FF transparent transparent' }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                </button>
              )}

              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (agentMode) handlePipelineRun(input);
                    else pendingFile ? handleSendWithFile(input) : sendMessage(input);
                  }
                }}
                placeholder={agentMode ? 'Paste a job description here…' : 'Tell the AI about yourself...'}
                rows={agentMode ? 4 : 2}
                disabled={agentMode ? pipelineRunning : loading}
                className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${agentMode ? 'rgba(0,209,255,0.25)' : 'rgba(255,255,255,0.15)'}`, color: 'rgba(255,255,255,0.95)', lineHeight: '1.5' }}
                onFocus={e => { e.target.style.borderColor = agentMode ? 'rgba(0,209,255,0.55)' : 'rgba(123,97,255,0.6)'; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
                onBlur={e => { e.target.style.borderColor = agentMode ? 'rgba(0,209,255,0.25)' : 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
              />

              {!agentMode && (
                <button onClick={handleEnhance} disabled={loading || !input.trim() || showEnhance}
                  title="Let AI expand your message before sending"
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: !input.trim() || showEnhance ? 'rgba(123,97,255,0.06)' : 'rgba(123,97,255,0.12)', border: `1px solid ${!input.trim() || showEnhance ? 'rgba(123,97,255,0.1)' : 'rgba(123,97,255,0.35)'}`, color: !input.trim() || showEnhance ? 'rgba(123,97,255,0.3)' : '#7B61FF', cursor: loading || !input.trim() || showEnhance ? 'not-allowed' : 'pointer', fontSize: 17 }}
                  onMouseEnter={e => { if (input.trim() && !showEnhance && !loading) e.currentTarget.style.background = 'rgba(123,97,255,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = !input.trim() || showEnhance ? 'rgba(123,97,255,0.06)' : 'rgba(123,97,255,0.12)'; }}>
                  ✦
                </button>
              )}

              {agentMode ? (
                <motion.button
                  whileHover={{ scale: pipelineRunning ? 1 : 1.04 }}
                  whileTap={{ scale: pipelineRunning ? 1 : 0.96 }}
                  onClick={() => handlePipelineRun(input)}
                  disabled={pipelineRunning || !input.trim()}
                  className="flex-shrink-0 rounded-xl flex items-center justify-center gap-2 transition-all"
                  style={{
                    height: 40, padding: '0 16px', whiteSpace: 'nowrap',
                    background: pipelineRunning || !input.trim() ? 'rgba(0,209,255,0.1)' : 'linear-gradient(135deg, #00D1FF, #7B61FF)',
                    border: `1px solid ${pipelineRunning ? 'rgba(0,209,255,0.2)' : 'transparent'}`,
                    color: pipelineRunning || !input.trim() ? 'rgba(0,209,255,0.4)' : '#fff',
                    cursor: pipelineRunning || !input.trim() ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'Manrope, sans-serif',
                  }}>
                  {pipelineRunning ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,209,255,0.2)', borderTopColor: 'rgba(0,209,255,0.6)' }} />
                      Running…
                    </>
                  ) : '▶ Run Pipeline'}
                </motion.button>
              ) : (
                <button onClick={() => pendingFile ? handleSendWithFile(input) : sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: loading || !input.trim() ? 'rgba(123,97,255,0.15)' : 'linear-gradient(135deg, #7B61FF, #00D1FF)', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>

            <p className="mt-2 text-xs text-center" style={{ color: 'rgba(255,255,255,0.18)' }}>
              {agentMode
                ? 'Enter or ▶ Run Pipeline · Switch to other tabs for normal chat'
                : 'Enter to send · Shift+Enter for new line · ✦ to expand · 📎 to upload'}
            </p>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {socialModal && (
          <SocialModalOverlay
            platformId={socialModal}
            profile={profile}
            onClose={() => setSocialModal(null)}
            onImport={handleAllowImport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompletionReveal && (
          <CompletionScreen
            profile={profile}
            userName={userName}
            onComplete={onComplete}
            onDismiss={() => setShowCompletionReveal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
