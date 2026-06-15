import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createUniFundScene } from '../lib/scene.js';

const STAGES = ['dust', 'molecule', 'dna', 'brain'];
const STAGE_DURATIONS = [2000, 2000, 2000, 2400]; // ms per stage

const STAGE_LABELS = {
  dust:     { kicker: 'INITIALIZING',   title: 'Gathering signals…',     sub: 'building the foundation' },
  molecule: { kicker: 'CONNECTING',     title: 'Forming connections…',   sub: 'structure emerging' },
  dna:      { kicker: 'ENCODING',       title: 'Encoding your path…',    sub: 'identity taking shape' },
  brain:    { kicker: 'SYNTHESIZING',   title: 'Agent awakened.',        sub: 'ready to explore your future' },
};

function SceneHost({ onReady }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const inst = createUniFundScene(ref.current);
    onReady(inst);
    return () => inst.destroy();
  }, []);
  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />;
}

export default function SplashPage({ onDone }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const sceneRef = useRef(null);
  const timerRef = useRef(null);

  function handleReady(inst) {
    sceneRef.current = inst;
  }

  useEffect(() => {
    if (stageIndex >= STAGES.length) return;
    timerRef.current = setTimeout(() => {
      const next = stageIndex + 1;
      if (next < STAGES.length) {
        sceneRef.current?.transitionTo(STAGES[next]);
        setStageIndex(next);
      } else {
        // finished — wait a beat then exit
        setTimeout(exit, 900);
      }
    }, STAGE_DURATIONS[stageIndex]);
    return () => clearTimeout(timerRef.current);
  }, [stageIndex]);

  function exit() {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(onDone, 700);
  }

  const label = STAGE_LABELS[STAGES[stageIndex]] || STAGE_LABELS.dust;
  const progress = ((stageIndex + 1) / STAGES.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      style={{
        position: 'absolute', inset: 0,
        background: '#02030A',
        overflow: 'hidden',
      }}
    >
      {/* 3D Particle Scene */}
      <SceneHost onReady={handleReady} />

      {/* Radial vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(2,3,10,0.65) 100%)',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '28px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)',
            boxShadow: '0 0 20px rgba(123,97,255,0.5)',
          }} />
          <span style={{ color: 'white', fontSize: 14, letterSpacing: '0.18em', fontWeight: 500 }}>UNIFUND</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: '0.15em' }}>/ THE AGENTIC WEB</span>
        </div>
        <button
          onClick={exit}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.45)',
            borderRadius: 100,
            padding: '6px 18px',
            fontSize: 12,
            cursor: 'pointer',
            letterSpacing: '0.08em',
          }}
        >
          Skip
        </button>
      </div>

      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stageIndex}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: 'center' }}
          >
            <div style={{
              fontSize: 10, letterSpacing: '0.35em',
              color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10,
            }}>
              {label.kicker}
            </div>
            <h1 style={{
              fontSize: 32, fontWeight: 300, color: 'white',
              letterSpacing: '-0.02em', margin: 0,
              textShadow: '0 0 40px rgba(123,97,255,0.4), 0 0 80px rgba(0,209,255,0.2)',
            }}>
              {label.title}
            </h1>
            <p style={{
              marginTop: 10, fontSize: 13,
              color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em',
            }}>
              {label.sub}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom progress */}
      <div style={{
        position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        width: 200, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i <= stageIndex
                ? 'linear-gradient(135deg, #00D1FF, #7B61FF)'
                : 'rgba(255,255,255,0.12)',
              transition: 'background 0.4s',
              boxShadow: i === stageIndex ? '0 0 8px rgba(0,209,255,0.6)' : 'none',
            }} />
          ))}
        </div>
        <div style={{ height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #00D1FF 0%, #7B61FF 55%, #FF5FB6 100%)',
              boxShadow: '0 0 10px rgba(0,209,255,0.5)',
            }}
          />
        </div>
        <div style={{
          marginTop: 10, textAlign: 'center',
          fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em',
        }}>
          PARTICLES · MOLECULE · DNA · BRAIN
        </div>
      </div>
    </motion.div>
  );
}
