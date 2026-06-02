import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runSimulate } from '../lib/api';

// ── Top bar ────────────────────────────────────────────────────────────────────
function TopBar({ onBack, onChatbot }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-10 py-5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-6 h-6 rounded-md"
            style={{ background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)', filter: 'blur(0.2px)' }}
          />
          <div className="absolute inset-0 rounded-md" style={{ boxShadow: '0 0 24px rgba(123,97,255,0.55)' }} />
        </div>
        <span className="text-[14px] tracking-[0.18em] font-medium text-white">UNIFUND</span>
        <span className="text-white/30 text-[12px] tracking-[0.18em]">/</span>
        <span
          className="text-[12px] tracking-[0.22em]"
          style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          YOUR TIMELINE
        </span>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          onClick={onChatbot}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] tracking-[0.2em] uppercase font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(123,97,255,0.15), rgba(255,95,182,0.12))',
            border: '1px solid rgba(123,97,255,0.35)',
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <span style={{ fontSize: 13 }}>✦</span>
          <span>Enrich Agent</span>
        </motion.button>

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
    </div>
  );
}

// ── Loading state ──────────────────────────────────────────────────────────────
function LoadingState() {
  const steps = [
    'Broadcasting your signal across 2,847 agents…',
    'Processing 128 possible timelines…',
    'Converging to 3 optimal paths…',
    'Rendering your timeline…',
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => Math.min(i + 1, steps.length - 1)), 1100);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)',
            filter: 'blur(2px)',
            animation: 'spin 2s linear infinite',
          }}
        />
        <div className="absolute inset-[3px] rounded-full" style={{ background: '#02030A' }} />
        <div
          className="absolute inset-[28px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(180,160,255,0.6) 60%, transparent 85%)' }}
        />
      </div>
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm tracking-wide"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {steps[stepIdx]}
          </motion.div>
        </AnimatePresence>
        <div className="mt-4 flex gap-2 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === stepIdx ? 24 : 6,
                height: 6,
                background: i <= stepIdx
                  ? 'linear-gradient(90deg, #00D1FF, #7B61FF)'
                  : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────
function ErrorState({ onRetry }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
      <div className="text-4xl">⚠️</div>
      <div className="text-lg font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>Simulation failed</div>
      <p className="text-sm max-w-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        The collective intelligence engine couldn't reach the network. Make sure the backend is running.
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-xl text-sm font-medium tracking-wider transition-all"
        style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF)', color: '#fff' }}
      >
        Try again
      </button>
    </div>
  );
}

// ── Context quality banner ─────────────────────────────────────────────────────
const QUALITY_LEVELS = [
  { max: 2,  label: 'Minimal',  color: '#FF5FB6', tip: 'Your agent barely knows you yet. Talk to it to unlock real predictions.' },
  { max: 5,  label: 'Basic',    color: '#FFD54F', tip: 'A little context goes a long way. Share more to sharpen your paths.' },
  { max: 10, label: 'Moderate', color: '#4FC3F7', tip: 'Good start. Every extra detail makes your simulation more personal.' },
  { max: 18, label: 'Strong',   color: '#B388FF', tip: 'Your agent has a solid picture of you. Keep sharing to reach peak accuracy.' },
  { max: Infinity, label: 'Deep Signal', color: '#00D1FF', tip: 'Maximum context — your simulation reflects your actual trajectory.' },
];

function ContextQualityBanner({ knowledgeCount, onChatbot }) {
  const pct = Math.min(100, Math.round((knowledgeCount / 20) * 100));
  const level = QUALITY_LEVELS.find(l => knowledgeCount <= l.max) || QUALITY_LEVELS[QUALITY_LEVELS.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="max-w-2xl mx-auto mb-8"
    >
      <div
        className="rounded-2xl p-5 flex items-center gap-5"
        style={{
          background: 'linear-gradient(135deg, rgba(0,209,255,0.05), rgba(123,97,255,0.08))',
          border: '1px solid rgba(123,97,255,0.22)',
        }}
      >
        {/* Left: quality info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] tracking-[0.35em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Agent Signal Quality
            </span>
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${level.color}18`, color: level.color, border: `1px solid ${level.color}35` }}
            >
              {level.label}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, #00D1FF, ${level.color})` }}
            />
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {knowledgeCount > 0
              ? `${knowledgeCount} knowledge signal${knowledgeCount !== 1 ? 's' : ''} shared · ${level.tip}`
              : level.tip
            }
          </p>
        </div>

        {/* Right: CTA */}
        <motion.button
          onClick={onChatbot}
          whileHover={{ scale: 1.04, boxShadow: '0 8px 28px rgba(123,97,255,0.28)' }}
          whileTap={{ scale: 0.97 }}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-[12px] font-semibold tracking-wide transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(123,97,255,0.22), rgba(255,95,182,0.15))',
            border: '1px solid rgba(123,97,255,0.4)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          <span style={{ fontSize: 14 }}>✦</span>
          <span>Talk to Agent</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Probability bar ────────────────────────────────────────────────────────────
function ProbabilityBar({ value, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.0, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[11px] mono tabular-nums font-semibold" style={{ color, minWidth: 32, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  );
}

// ── Milestone timeline ─────────────────────────────────────────────────────────
function MilestoneTimeline({ milestones, color }) {
  return (
    <div className="relative pl-6 space-y-4 mt-4">
      <div
        className="absolute left-[9px] top-3 bottom-3 w-px"
        style={{ background: `linear-gradient(180deg, ${color}80, ${color}20, transparent)` }}
      />
      {milestones.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.18, duration: 0.5 }}
          className="flex items-start gap-3"
        >
          <div
            className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5"
            style={{ borderColor: color, background: '#02030A' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          </div>
          <div>
            <div className="text-[9px] tracking-[0.3em] mono uppercase mb-1" style={{ color: `${color}80` }}>
              Month {m.month}
            </div>
            <div className="text-[13px] leading-snug font-light" style={{ color: 'rgba(255,255,255,0.80)' }}>
              {m.event}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Path card ──────────────────────────────────────────────────────────────────
const PATH_COLORS = ['#00D1FF', '#B388FF', '#FF5FB6'];
const PATH_RGB    = ['0,209,255', '179,136,255', '255,95,182'];

function PathCard({ path, index, delay }) {
  const color = PATH_COLORS[index % PATH_COLORS.length];
  const rgb   = PATH_RGB[index % PATH_RGB.length];
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: expanded
          ? `linear-gradient(145deg, rgba(${rgb},0.07) 0%, rgba(5,7,15,0.96) 100%)`
          : 'rgba(255,255,255,0.025)',
        border: expanded
          ? `1px solid rgba(${rgb},0.38)`
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: expanded ? `0 0 40px rgba(${rgb},0.08)` : 'none',
        transition: 'all 0.35s ease',
      }}
    >
      {/* Header — always visible */}
      <button className="w-full p-5 text-left" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
              style={{
                background: `rgba(${rgb},0.12)`,
                border: `1px solid rgba(${rgb},0.28)`,
                boxShadow: expanded ? `0 0 20px rgba(${rgb},0.18)` : 'none',
              }}
            >
              {path.icon}
            </div>
            <div>
              <div className="text-[9px] tracking-[0.32em] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                Path {index + 1}
              </div>
              <div
                className="text-[17px] font-semibold tracking-tight leading-tight"
                style={{ color: expanded ? color : 'rgba(255,255,255,0.88)' }}
              >
                {path.title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0 mt-1">
            <div
              className="text-[12px] mono font-bold px-2.5 py-1 rounded-full"
              style={{ background: `rgba(${rgb},0.14)`, color, border: `1px solid rgba(${rgb},0.28)` }}
            >
              {path.probability}%
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            >
              ▼
            </motion.div>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
          {path.tagline}
        </p>

        <div className="mt-3.5">
          <ProbabilityBar value={path.probability} color={color} />
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6">
              <div className="h-px mb-5" style={{ background: `linear-gradient(90deg, rgba(${rgb},0.45), transparent)` }} />

              <div className="text-[9px] tracking-[0.32em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Your Trajectory
              </div>
              <MilestoneTimeline milestones={path.milestones} color={color} />

              {path.agent_match && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.5 }}
                  className="mt-5 rounded-xl px-4 py-3.5 flex items-start gap-3"
                  style={{ background: `rgba(${rgb},0.07)`, border: `1px solid rgba(${rgb},0.18)` }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                      style={{ background: `rgba(${rgb},0.2)`, border: `1px solid rgba(${rgb},0.35)` }}
                    >
                      ◈
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.28em] uppercase mb-1" style={{ color }}>
                      Network Match
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {path.agent_match}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Chatbot CTA section ────────────────────────────────────────────────────────
function ChatbotCTA({ onChatbot }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.7 }}
      className="max-w-2xl mx-auto mt-8 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(123,97,255,0.08), rgba(0,209,255,0.05))',
        border: '1px solid rgba(123,97,255,0.2)',
      }}
    >
      <div className="p-6 flex items-center gap-6">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(123,97,255,0.2), rgba(0,209,255,0.12))',
            border: '1px solid rgba(123,97,255,0.3)',
            boxShadow: '0 0 28px rgba(123,97,255,0.14)',
          }}
        >
          <span style={{ fontSize: 24 }}>✦</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold tracking-tight mb-1" style={{ color: 'rgba(255,255,255,0.88)' }}>
            Sharper predictions start with deeper context
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Your agent learns from everything you share — skills, experiences, goals, fears.
            The more it knows, the more precise your life paths become.
          </p>
        </div>

        <motion.button
          onClick={onChatbot}
          whileHover={{ scale: 1.04, boxShadow: '0 12px 36px rgba(123,97,255,0.32)' }}
          whileTap={{ scale: 0.97 }}
          className="flex-shrink-0 px-5 py-3 rounded-xl text-[12px] font-semibold tracking-wide transition-all"
          style={{
            background: 'linear-gradient(135deg, #7B61FF, #00D1FF)',
            color: '#060810',
            boxShadow: '0 6px 22px rgba(123,97,255,0.25)',
          }}
        >
          Talk to Agent →
        </motion.button>
      </div>

      {/* Knowledge signals list */}
      <div
        className="px-6 pb-5 grid grid-cols-3 gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {[
          { icon: '🎓', label: 'Education & skills' },
          { icon: '🚀', label: 'Goals & ambitions' },
          { icon: '💡', label: 'Experiences & projects' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 pt-4">
            <span className="text-[16px]">{item.icon}</span>
            <span className="text-[10px] tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TimelinePage({ simulationData, knowledgeCount: initialKnowledgeCount, onBack, onChatbot }) {
  const [data, setData] = useState(simulationData || null);
  const [knowledgeCount, setKnowledgeCount] = useState(initialKnowledgeCount ?? null);
  const [loading, setLoading] = useState(!simulationData);
  const [error, setError] = useState(false);

  async function fetchSimulation() {
    setLoading(true);
    setError(false);
    try {
      const res = await runSimulate();
      setData(res.simulation);
      if (res.knowledge_count !== undefined) setKnowledgeCount(res.knowledge_count);
    } catch (e) {
      console.warn('Simulation error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!simulationData) fetchSimulation();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#02030A', color: 'white' }}>

      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0" style={{
        background:
          'radial-gradient(55% 40% at 20% 10%, rgba(123,97,255,0.09) 0%, transparent 65%),' +
          'radial-gradient(45% 35% at 80% 80%, rgba(0,209,255,0.06) 0%, transparent 60%)',
      }} />

      <TopBar onBack={onBack} onChatbot={onChatbot} />

      {loading && <LoadingState />}
      {error && <ErrorState onRetry={fetchSimulation} />}

      {data && !loading && !error && (
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-10"
          >
            <div className="text-[9px] tracking-[0.45em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              UniFund · Simulation Complete · 2,847 Lifetimes Analyzed
            </div>
            <h1
              className="text-[44px] leading-tight tracking-tight font-light"
              style={{ textShadow: '0 0 50px rgba(123,97,255,0.38), 0 0 100px rgba(0,209,255,0.12)' }}
            >
              Your{' '}
              <span style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF, #FF5FB6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                paths ahead
              </span>
            </h1>
            {data.collective_insight && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.5, duration: 0.9 }}
                className="mt-3 text-[14px] tracking-wide max-w-xl mx-auto leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {data.collective_insight}
              </motion.p>
            )}

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.65, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 h-px origin-center max-w-lg mx-auto"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(123,97,255,0.55), rgba(0,209,255,0.55), transparent)' }}
            />
          </motion.div>

          {/* Context quality banner */}
          {knowledgeCount !== null && (
            <ContextQualityBanner knowledgeCount={knowledgeCount} onChatbot={onChatbot} />
          )}

          {/* Path cards */}
          <div className="max-w-2xl mx-auto space-y-4">
            {(data.paths || []).map((path, i) => (
              <PathCard key={i} path={path} index={i} delay={0.25 + i * 0.15} />
            ))}
          </div>

          {/* Chatbot CTA */}
          <ChatbotCTA onChatbot={onChatbot} />

          {/* Footer actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7 }}
            className="max-w-2xl mx-auto mt-8 flex flex-col items-center gap-4"
          >
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }} />
            <p className="text-[10px] text-center tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
              3 optimal paths identified · The collective has spoken
            </p>
            <div className="flex gap-3">
              <button
                onClick={fetchSimulation}
                className="px-5 py-2.5 rounded-full text-sm tracking-tight transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                Re-run simulation
              </button>
              <button
                onClick={onBack}
                className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-tight transition-all"
                style={{
                  background: 'linear-gradient(90deg, #00D1FF, #7B61FF)',
                  color: '#060810',
                  boxShadow: '0 8px 32px rgba(123,97,255,0.28)',
                }}
              >
                Return to the Web →
              </button>
            </div>
          </motion.div>

          <div className="h-16" />
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
