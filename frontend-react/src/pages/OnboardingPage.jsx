import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createUniFundScene } from '../lib/scene.js';

// ---------- Adaptive question tree ----------
const Q1 = {
  id: 'focus',
  eyebrow: '01 — Your Chapter',
  label: "What best describes where you are right now?",
  options: ['Student', 'Founder', 'Career Switch', 'Exploring Life'],
};

const Q2_MAP = {
  Student: {
    id: 'goal',
    eyebrow: '02 — Your Drive',
    label: "What's pushing you forward?",
    options: ['Get into grad school abroad', 'Build something technical', 'Land my dream first job', 'Figure out my passion'],
  },
  Founder: {
    id: 'goal',
    eyebrow: '02 — Your Stage',
    label: "Where is your idea right now?",
    options: ['Just a concept', 'MVP built, no users', 'Have early traction', 'Ready to scale'],
  },
  'Career Switch': {
    id: 'goal',
    eyebrow: '02 — Your Direction',
    label: "What domain are you moving into?",
    options: ['Tech / Software', 'Design / Creative', 'Business / Finance', 'Research / Academia'],
  },
  'Exploring Life': {
    id: 'goal',
    eyebrow: '02 — What Matters',
    label: "What's most important to you right now?",
    options: ['Freedom and flexibility', 'Making a real impact', 'Financial security', 'Finding my people'],
  },
};

const Q3 = {
  id: 'fear',
  eyebrow: '03 — The Honest Part',
  label: "Your biggest obstacle right now?",
  options: ['Self-doubt / imposter syndrome', 'Not enough money or time', 'Wrong path, wrong choice', 'Doing it alone'],
};

function buildSteps(q1Answer) {
  const q2 = Q2_MAP[q1Answer] || Q2_MAP['Student'];
  return [Q1, q2, Q3];
}

// ---------- 3D scene host ----------
function SceneHost({ stage, onReady }) {
  const ref = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const inst = createUniFundScene(ref.current);
    sceneRef.current = inst;
    onReady && onReady(inst);
    return () => inst.destroy();
  }, []);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.transitionTo(stage);
  }, [stage]);

  return <div ref={ref} className="absolute inset-0" />;
}

// ---------- Progress bar ----------
function Progress({ value }) {
  return (
    <div className="relative h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        initial={false}
        animate={{ width: `${value}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: 'linear-gradient(90deg,#00D1FF 0%,#7B61FF 55%,#FF5FB6 100%)',
          boxShadow: '0 0 16px rgba(0,209,255,0.45), 0 0 24px rgba(255,95,182,0.25)',
        }}
      />
    </div>
  );
}

// ---------- Chat bubbles ----------
function AiQuestion({ text, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-3"
        >
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'linear-gradient(135deg, #7B61FF, #00D1FF)' }}
          >
            AI
          </div>
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] leading-relaxed"
            style={{
              background: 'rgba(123,97,255,0.10)',
              border: '1px solid rgba(123,97,255,0.18)',
              color: 'rgba(255,255,255,0.85)',
              maxWidth: 380,
            }}
          >
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UserAnswer({ text }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
    >
      <div
        className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] leading-relaxed"
        style={{
          background: 'linear-gradient(135deg, rgba(0,209,255,0.14), rgba(123,97,255,0.14))',
          border: '1px solid rgba(0,209,255,0.22)',
          color: 'rgba(255,255,255,0.92)',
          maxWidth: 320,
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}

// ---------- Option chips ----------
function OptionChip({ label, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative px-4 py-2.5 rounded-full text-[13px] font-medium tracking-tight transition-all"
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(0,209,255,0.18), rgba(123,97,255,0.22))'
          : 'rgba(255,255,255,0.035)',
        border: selected ? '1px solid rgba(123,97,255,0.55)' : '1px solid rgba(255,255,255,0.10)',
        color: selected ? 'white' : 'rgba(255,255,255,0.7)',
        boxShadow: selected ? '0 8px 30px rgba(123,97,255,0.25)' : 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      {label}
    </motion.button>
  );
}

// ---------- Ripple next button ----------
function NextButton({ disabled, label, onClick }) {
  const [ripples, setRipples] = useState([]);
  function handleClick(e) {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(p => p.id !== id)), 700);
    onClick && onClick();
  }
  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={
        'relative overflow-hidden w-full rounded-full py-3.5 text-[14px] font-semibold tracking-tight ' +
        (disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer')
      }
      style={{
        background: 'linear-gradient(90deg,#00D1FF 0%, #7B61FF 50%, #FF5FB6 100%)',
        color: '#0a0d14',
        boxShadow: disabled ? 'none' : '0 10px 40px rgba(0,209,255,0.22)',
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {label}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {ripples.map(r => (
        <span key={r.id} className="absolute rounded-full pointer-events-none"
          style={{ left: r.x, top: r.y, width: 8, height: 8, marginLeft: -4, marginTop: -4,
            background: 'rgba(255,255,255,0.55)', animation: 'rippleburst 0.7s ease-out forwards' }} />
      ))}
    </motion.button>
  );
}

// ---------- Custom text input ----------
function CustomInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Or describe in your own words…'}
        className="w-full bg-transparent text-[13px] text-white/90 placeholder:text-white/30 py-2.5 pl-0 pr-3 border-b border-white/10 focus:border-white/40 focus:outline-none transition-colors"
        style={{ caretColor: '#7B61FF' }}
      />
      <span
        className="absolute left-0 right-0 bottom-0 h-[2px] origin-left pointer-events-none"
        style={{
          background: 'linear-gradient(90deg,#00D1FF,#7B61FF,#FF5FB6)',
          opacity: value ? 0.6 : 0,
          transform: `scaleX(${value ? 1 : 0})`,
          transition: 'opacity 0.4s, transform 0.5s ease',
        }}
      />
    </div>
  );
}

// ---------- Stage label (right pane) ----------
function StageLabel({ stage }) {
  const map = {
    dust: { kicker: 'STATE 00', title: 'Empty space', sub: 'awaiting input' },
    molecule: { kicker: 'STATE 01', title: 'Particles → Molecule', sub: 'identity captured' },
    dna: { kicker: 'STATE 02', title: 'Molecule → DNA', sub: 'direction encoded' },
    brain: { kicker: 'STATE 03', title: 'DNA → Agent', sub: 'synthesis complete' },
  };
  const s = map[stage];
  return (
    <div className="absolute top-7 right-10 z-10 text-right pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.6 }}>
          <div className="text-[10px] tracking-[0.32em] text-white/35">{s.kicker}</div>
          <div className="mt-1 text-[14px] tracking-tight text-white/85 font-medium">{s.title}</div>
          <div className="text-[11px] tracking-wide text-white/40 mt-0.5">{s.sub}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------- Final payoff ----------
function FinalPayoff({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="final-payoff" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="absolute inset-x-0 bottom-[10%] flex flex-col items-center pointer-events-none select-none">
          <motion.div initial={{ letterSpacing: '0.35em', opacity: 0 }} animate={{ letterSpacing: '0.12em', opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.4 }} className="text-[11px] uppercase text-white/45">
            UniFund · Agent Initialized
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.7 }}
            className="mt-3 text-[28px] tracking-tight font-light text-white"
            style={{ textShadow: '0 0 28px rgba(123,97,255,0.45), 0 0 50px rgba(0,209,255,0.25)' }}>
            Your AI agent is alive.
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} transition={{ duration: 1.4, delay: 1.4 }}
            className="mt-2 text-[13px] text-white/55">
            A reflection of your chapter, your direction, and your truth.
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Dust overlay ----------
function DustOverlay() {
  const dots = useMemo(() => {
    const out = [];
    for (let i = 0; i < 26; i++) {
      out.push({ left: Math.random() * 100, top: Math.random() * 100, size: 1 + Math.random() * 2,
        dur: 14 + Math.random() * 18, delay: -Math.random() * 18, opacity: 0.15 + Math.random() * 0.3 });
    }
    return out;
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d, i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size,
          background: 'white', opacity: d.opacity, filter: 'blur(0.3px)',
          animation: `drift ${d.dur}s ease-in-out ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ---------- Top brand bar ----------
function TopBar() {
  return (
    <div className="absolute top-0 inset-x-0 z-20 px-10 pt-7 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-6 h-6 rounded-md" style={{ background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)', filter: 'blur(0.2px)' }} />
          <div className="absolute inset-0 rounded-md" style={{ boxShadow: '0 0 24px rgba(123,97,255,0.55)' }} />
        </div>
        <div className="text-white text-[14px] tracking-[0.18em] font-medium">UNIFUND</div>
        <div className="text-white/30 text-[12px] tracking-[0.18em]">/ THE AGENTIC WEB</div>
      </div>
      <div className="flex items-center gap-6 text-[12px] text-white/45 tracking-wide">
        <span>v 0.1 · onboarding</span>
        <span className="hidden md:inline">3 questions · 2 minutes</span>
      </div>
    </div>
  );
}

// ---------- Main ----------
export default function OnboardingPage({ onEnter }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [stage, setStage] = useState('dust');
  // Chat transcript: [{type: 'ai'|'user', text}]
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChoice, setCurrentChoice] = useState(null);
  const [currentCustom, setCurrentCustom] = useState('');
  const [showCurrentQ, setShowCurrentQ] = useState(false);

  // Derive adaptive steps based on Q1 answer
  const q1Answer = answers['focus']?.choice || answers['focus']?.custom || null;
  const STEPS = buildSteps(q1Answer);
  const current = STEPS[stepIndex];

  // Show the current question after a short delay when stepIndex changes
  useEffect(() => {
    setShowCurrentQ(false);
    setCurrentChoice(null);
    setCurrentCustom('');
    const t = setTimeout(() => setShowCurrentQ(true), stepIndex === 0 ? 400 : 600);
    return () => clearTimeout(t);
  }, [stepIndex, done]);

  // First message in chat history (welcome)
  useEffect(() => {
    const t = setTimeout(() => {
      setChatHistory([{ type: 'ai', text: "Let's build your AI agent. 3 quick questions — answer honestly, your simulation accuracy depends on it." }]);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const canAdvance = currentChoice || (currentCustom && currentCustom.trim().length > 1);

  function advance() {
    if (!canAdvance) return;
    const answer = currentChoice || currentCustom.trim();

    // Save answer
    const newAnswers = { ...answers, [current.id]: { choice: currentChoice, custom: currentCustom } };
    setAnswers(newAnswers);

    // Add Q+A to chat history
    setChatHistory(prev => [
      ...prev,
      { type: 'ai', text: current.label },
      { type: 'user', text: answer },
    ]);

    const stageMap = ['molecule', 'dna', 'brain'];
    setStage(stageMap[stepIndex]);

    if (stepIndex < STEPS.length - 1) {
      setTimeout(() => setStepIndex(stepIndex + 1), 300);
    } else {
      setTimeout(() => {
        setDone(true);
        setChatHistory(prev => [...prev, { type: 'ai', text: "Perfect. Your agent is being initialized now..." }]);
      }, 500);
    }
  }

  function reset() {
    setStepIndex(0);
    setAnswers({});
    setDone(false);
    setStage('dust');
    setChatHistory([{ type: 'ai', text: "Let's build your AI agent. 3 quick questions — answer honestly, your simulation accuracy depends on it." }]);
  }

  const progressDiscrete = done ? 100 : Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070A] text-white">
      <div className="page-bg absolute inset-0" />
      <DustOverlay />
      <TopBar />

      <div className="relative z-10 grid h-full" style={{ gridTemplateColumns: '45fr 55fr' }}>
        {/* LEFT: conversational form */}
        <div className="relative flex items-center" style={{ paddingLeft: 80, paddingRight: 40 }}>
          <div className="w-full max-w-[520px]">

            {/* Heading */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
              <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Creating your personal AI</div>
              <h1 className="mt-3 text-[38px] leading-[1.05] tracking-[-0.02em] font-light text-white/95">
                Let's build{' '}
                <span style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  your agent
                </span>.
              </h1>
            </motion.div>

            {/* Progress */}
            <div className="mt-7 flex items-center gap-4 mb-6">
              <Progress value={progressDiscrete} />
              <div className="text-[11px] text-white/45 tabular-nums tracking-wider">
                {done ? '03/03' : `${String(stepIndex + 1).padStart(2, '0')}/03`}
              </div>
            </div>

            {/* Chat history (past Q&A) */}
            <div className="space-y-2.5 mb-4">
              {chatHistory.map((msg, i) => (
                <AnimatePresence key={i}>
                  {msg.type === 'ai'
                    ? <AiQuestion key={i} text={msg.text} visible={true} />
                    : <UserAnswer key={i} text={msg.text} />
                  }
                </AnimatePresence>
              ))}
            </div>

            {/* Current question (chips + input) */}
            {!done && (
              <AnimatePresence mode="wait">
                {showCurrentQ && (
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="text-[10px] tracking-[0.28em] uppercase text-white/35 mb-2">{current.eyebrow}</div>
                    <p className="text-[15px] text-white/85 mb-4 leading-snug">{current.label}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {current.options.map(opt => (
                        <OptionChip
                          key={opt}
                          label={opt}
                          selected={currentChoice === opt}
                          onClick={() => {
                            setCurrentChoice(opt);
                            setCurrentCustom('');
                          }}
                        />
                      ))}
                    </div>

                    <CustomInput
                      value={currentCustom}
                      onChange={v => { setCurrentCustom(v); setCurrentChoice(null); }}
                    />

                    <div className="mt-4">
                      <NextButton
                        disabled={!canAdvance}
                        label={stepIndex === STEPS.length - 1 ? 'Bring it to life' : 'Next'}
                        onClick={advance}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Done state */}
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9 }}
                className="rounded-2xl p-6"
                style={{ background: 'linear-gradient(135deg, rgba(0,209,255,0.06), rgba(123,97,255,0.10))', border: '1px solid rgba(0,209,255,0.2)' }}
              >
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">Synthesis complete</div>
                <h2 className="mt-2 text-[22px] tracking-tight text-white/95 font-medium">Meet your agent.</h2>
                <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  3 signals captured. Agent calibrated.
                </p>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 rounded-full py-3 text-[13px] tracking-tight text-white/70 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    Start over
                  </button>
                  <button
                    onClick={() => onEnter(answers)}
                    className="flex-2 flex-grow rounded-full py-3 text-[14px] font-semibold tracking-tight"
                    style={{ background: 'linear-gradient(90deg,#00D1FF 0%, #7B61FF 50%, #FF5FB6 100%)', color: '#0a0d14', boxShadow: '0 10px 40px rgba(123,97,255,0.25)' }}
                  >
                    Enter UniFund →
                  </button>
                </div>
              </motion.div>
            )}

            <div className="mt-5 flex items-center gap-2 text-[11px] text-white/30">
              <span className="inline-block w-1 h-1 rounded-full bg-white/40" />
              <span>Answers stay local until you confirm.</span>
            </div>
          </div>
        </div>

        {/* Center divider */}
        <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: '45%' }}>
          <div className="w-px h-full" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)', opacity: 0.6 }} />
        </div>

        {/* RIGHT: 3D scene */}
        <div className="relative">
          <SceneHost stage={stage} />
          <StageLabel stage={stage} />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 55%, transparent 40%, rgba(5,7,10,0.55) 90%)' }} />
          <FinalPayoff visible={done} />
          <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center text-[10px] tracking-[0.28em] text-white/30">
            <span>PARTICLES · MOLECULE · DNA · BRAIN</span>
            <span>RENDER · LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
