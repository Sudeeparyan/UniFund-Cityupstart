import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ── Voxel Agent Character ──────────────────────────────────────────────────
// A blocky/geometric "game character" representing an agent (user's own, or
// any STUDIO_AGENT in the Agent Arena village). Escalates visually across
// AGENT_LEVELS. Supports a `walking` gait (legs/arms swing, faster bob) and a
// `facing` flip (1 = right, -1 = left) so it can be reused as a walking
// village sprite, not just a static portrait.

export const VOXEL_LEVEL_CONFIG = {
  BABY:   { primary: '#4a4a68', secondary: '#2c2c42', accent: '#5a5a7a', tie: '#3a3a52', core: null,      shoulders: false, cape: false, crown: false, particles: 0, auraOpacity: 0.08, tag: 'Dormant' },
  SMALL:  { primary: '#16527a', secondary: '#0d3550', accent: '#2a8fd1', tie: '#1f7fb8', core: '#80DEFF', shoulders: false, cape: false, crown: false, particles: 0, auraOpacity: 0.14, tag: 'Awakening' },
  MIDDLE: { primary: '#4f2f96', secondary: '#341d66', accent: '#8a64df', tie: '#6c46c9', core: '#D9AEFF', shoulders: true,  cape: false, crown: false, particles: 0, auraOpacity: 0.20, tag: 'Aware' },
  HIGH:   { primary: '#006f88', secondary: '#004552', accent: '#3fd6f5', tie: '#00a3c4', core: '#BFFFFF', shoulders: true,  cape: true,  crown: false, particles: 2, auraOpacity: 0.28, tag: 'Advanced' },
  MAX:    { primary: '#a8780f', secondary: '#6e4d09', accent: '#ffd866', tie: '#e0ab2e', core: '#FFFBE6', shoulders: true,  cape: true,  crown: true,  particles: 3, auraOpacity: 0.40, tag: 'Ascended' },
};
const VOXEL_PARTICLE_COLORS = ['#80DEEA', '#FF5FB6', '#7B61FF'];
const VOXEL_SKIN = '#D9A876';
const VOXEL_SKIN_SHADE = '#B8875E';
const VOXEL_HAIR = '#241910';

export function VoxelCharacter({ level = 'BABY', size = 180, idle = true, compact = false, walking = false, facing = 1 }) {
  const cfg = VOXEL_LEVEL_CONFIG[level] || VOXEL_LEVEL_CONFIG.BABY;
  const s = size / 180;
  const eyeColor = cfg.core || '#2a2430';
  const [blink, setBlink] = useState(false);
  const gaitDur = 0.42;

  useEffect(() => {
    if (compact) return;
    let alive = true;
    let timer;
    const scheduleBlink = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => { if (alive) setBlink(false); }, 140);
        scheduleBlink();
      }, 3200 + Math.random() * 2600);
    };
    scheduleBlink();
    return () => { alive = false; clearTimeout(timer); };
  }, [compact]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, transform: facing < 0 ? 'scaleX(-1)' : 'none' }}>
      {/* Aura */}
      <motion.div animate={{ opacity: [cfg.auraOpacity, cfg.auraOpacity * 1.6, cfg.auraOpacity], scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%',
          background: `radial-gradient(circle, ${cfg.core || cfg.primary}55, transparent 70%)` }} />

      {/* Orbiting particles (HIGH/MAX) */}
      {Array.from({ length: cfg.particles }).map((_, i) => (
        <motion.div key={i} style={{ position: 'absolute', inset: 0 }}
          animate={{ rotate: 360 }} transition={{ duration: 6 + i * 2.5, repeat: Infinity, ease: 'linear' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 5 * s, height: 5 * s, borderRadius: '50%',
            background: VOXEL_PARTICLE_COLORS[i], boxShadow: `0 0 ${6 * s}px ${VOXEL_PARTICLE_COLORS[i]}`,
            transform: `translate(-50%,-50%) translateX(${size * 0.56}px)` }} />
        </motion.div>
      ))}

      {/* Idle breathing / walking-bob wrapper + body */}
      <motion.div animate={walking ? { y: [0, -size * 0.04, 0] } : (idle && !compact ? { y: [0, -size * 0.018, 0] } : {})}
        transition={{ duration: walking ? gaitDur : 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: size * 0.5, height: size * 0.8 }}>

          {cfg.cape && (
            <div style={{ position: 'absolute', top: size * 0.27, left: '50%', width: size * 0.44, height: size * 0.4,
              transform: 'translateX(-50%) rotate(2deg)', borderRadius: '4px 4px 22px 22px',
              background: `linear-gradient(180deg, ${cfg.secondary}, transparent)`, opacity: 0.5, zIndex: 0 }} />
          )}

          {/* Legs (trousers) — swing into a walk cycle when `walking` */}
          <motion.div animate={walking ? { rotate: [-22, 22, -22] } : { rotate: 0 }}
            transition={{ duration: gaitDur, repeat: walking ? Infinity : 0, ease: 'easeInOut' }}
            style={{ position: 'absolute', bottom: 0, left: '30%', width: size * 0.095, height: size * 0.2, borderRadius: '2px 2px 0 0', background: cfg.secondary, transformOrigin: 'top center' }} />
          <motion.div animate={walking ? { rotate: [22, -22, 22] } : { rotate: 0 }}
            transition={{ duration: gaitDur, repeat: walking ? Infinity : 0, ease: 'easeInOut' }}
            style={{ position: 'absolute', bottom: 0, right: '30%', width: size * 0.095, height: size * 0.2, borderRadius: '2px 2px 0 0', background: cfg.secondary, transformOrigin: 'top center' }} />

          {/* Torso (suit jacket) */}
          <div style={{ position: 'absolute', top: size * 0.29, left: '50%', width: size * 0.34, height: size * 0.3,
            transform: 'translateX(-50%)', borderRadius: '10px 10px 7px 7px', background: `linear-gradient(180deg, ${cfg.primary}, ${cfg.secondary})`,
            boxShadow: `0 0 ${12 * s}px ${cfg.primary}35`, zIndex: 1 }}>
            {/* Shirt collar */}
            <div style={{ position: 'absolute', top: 0, left: '50%', width: size * 0.18, height: size * 0.1, transform: 'translateX(-50%)',
              background: '#EDEDF2', clipPath: 'polygon(20% 0%, 80% 0%, 50% 100%)' }} />
            {/* Tie */}
            <div style={{ position: 'absolute', top: size * 0.02, left: '50%', width: size * 0.045, height: size * 0.18, transform: 'translateX(-50%)',
              background: cfg.tie, clipPath: 'polygon(50% 0%, 100% 14%, 65% 100%, 35% 100%, 0% 14%)' }} />
            {/* Tie-pin emblem */}
            {cfg.core && (
              <motion.div animate={{ opacity: [0.6, 1, 0.6], scale: [0.85, 1.05, 0.85] }} transition={{ duration: 1.6, repeat: Infinity }}
                style={{ position: 'absolute', top: size * 0.1, left: '50%', width: size * 0.06, height: size * 0.06,
                  transform: 'translate(-50%,-50%)', borderRadius: '50%', background: cfg.core, boxShadow: `0 0 ${9 * s}px ${cfg.core}` }} />
            )}
          </div>

          {/* Shoulder structure (blazer) */}
          {cfg.shoulders && (<>
            <div style={{ position: 'absolute', top: size * 0.31, left: size * 0.02, width: size * 0.1, height: size * 0.07, borderRadius: '6px 2px 2px 6px', background: cfg.accent, opacity: 0.9 }} />
            <div style={{ position: 'absolute', top: size * 0.31, right: size * 0.02, width: size * 0.1, height: size * 0.07, borderRadius: '2px 6px 6px 2px', background: cfg.accent, opacity: 0.9 }} />
          </>)}

          {/* Arms */}
          <motion.div animate={walking ? { rotate: [22, -22, 22] } : (idle && !compact ? { rotate: [-3, 3, -3] } : {})}
            transition={{ duration: walking ? gaitDur : 3.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: size * 0.34, left: size * 0.03, width: size * 0.08, height: size * 0.22, borderRadius: 4, background: cfg.secondary, transformOrigin: 'top center' }} />
          <motion.div animate={walking ? { rotate: [-22, 22, -22] } : (idle && !compact ? { rotate: [3, -3, 3] } : {})}
            transition={{ duration: walking ? gaitDur : 3.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: size * 0.34, right: size * 0.03, width: size * 0.08, height: size * 0.22, borderRadius: 4, background: cfg.secondary, transformOrigin: 'top center' }} />

          {/* Neck */}
          <div style={{ position: 'absolute', top: size * 0.225, left: '50%', width: size * 0.09, height: size * 0.07, transform: 'translateX(-50%)', background: VOXEL_SKIN_SHADE }} />

          {/* Head */}
          <div style={{ position: 'absolute', top: 0, left: '50%', width: size * 0.25, height: size * 0.26, transform: 'translateX(-50%)',
            borderRadius: '50% 50% 38% 38%', background: `linear-gradient(160deg, ${VOXEL_SKIN}, ${VOXEL_SKIN_SHADE})`, zIndex: 2 }}>
            {/* Hair */}
            <div style={{ position: 'absolute', top: -size * 0.02, left: '50%', width: size * 0.27, height: size * 0.15, transform: 'translateX(-50%)',
              borderRadius: '50% 50% 30% 30%', background: VOXEL_HAIR }} />
            {cfg.crown && (
              <div style={{ position: 'absolute', top: -size * 0.05, left: '50%', width: size * 0.05, height: size * 0.05, zIndex: 1,
                transform: 'translateX(-50%) rotate(45deg)', background: '#FFD54F', boxShadow: `0 0 ${7 * s}px #FFD54F` }} />
            )}
            {/* Eyes */}
            <motion.div animate={{ height: blink ? size * 0.006 : size * 0.034 }} transition={{ duration: 0.08 }}
              style={{ position: 'absolute', top: '54%', left: '27%', width: size * 0.034, borderRadius: '50%', background: eyeColor,
                boxShadow: cfg.core ? `0 0 4px ${eyeColor}` : 'none', zIndex: 1 }} />
            <motion.div animate={{ height: blink ? size * 0.006 : size * 0.034 }} transition={{ duration: 0.08 }}
              style={{ position: 'absolute', top: '54%', right: '27%', width: size * 0.034, borderRadius: '50%', background: eyeColor,
                boxShadow: cfg.core ? `0 0 4px ${eyeColor}` : 'none', zIndex: 1 }} />
            {/* Mouth */}
            <div style={{ position: 'absolute', top: '77%', left: '50%', width: size * 0.07, height: size * 0.012, transform: 'translateX(-50%)',
              borderRadius: 2, background: VOXEL_SKIN_SHADE, opacity: 0.7, zIndex: 1 }} />
          </div>
        </div>
      </motion.div>

      {/* Level-change burst ring */}
      <motion.div key={level} initial={{ opacity: 0.8, scale: 0.6 }} animate={{ opacity: 0, scale: 1.6 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${cfg.core || cfg.primary}`, pointerEvents: 'none' }} />
    </div>
  );
}
