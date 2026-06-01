import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { devLogin } from '../lib/api';

const G = '#00FF94';
const ease = [0.22, 1, 0.36, 1];

// ── Animated terminal lines ───────────────────────────────────────────────────
const BOOT_LINES = [
  { text: 'UniMind Control Plane v1.0', color: G },
  { text: 'Connecting to backend…', color: 'rgba(255,255,255,0.4)' },
  { text: 'Agent network: 1,401 nodes ONLINE', color: G },
  { text: 'Threat monitor: ACTIVE', color: G },
  { text: 'EU AI Act compliance: LOADED', color: 'rgba(0,209,255,0.8)' },
  { text: 'Awaiting developer authentication.', color: 'rgba(255,255,255,0.5)' },
];

function BootSequence({ onDone }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= BOOT_LINES.length) { setTimeout(onDone, 400); return; }
    const t = setTimeout(() => setShown(s => s + 1), 320);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {BOOT_LINES.slice(0, shown).map((l, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontFamily: 'monospace', fontSize: 12, color: l.color, display: 'flex', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>{String(i + 1).padStart(2, '0')}</span>
          <span>{l.text}</span>
        </motion.div>
      ))}
      {shown < BOOT_LINES.length && (
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          {'█'}
        </div>
      )}
    </motion.div>
  );
}

// ── Grid background ───────────────────────────────────────────────────────────
function GridBg() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes scan { 0%{transform:translateY(-4px)} 100%{transform:translateY(100vh)} }
        @keyframes glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        input::placeholder { color: rgba(255,255,255,0.18); font-family: monospace; }
      `}</style>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035 }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <line key={`v${i}`} x1={`${i * 4.35}%`} y1="0" x2={`${i * 4.35}%`} y2="100%"
            stroke={G} strokeWidth="0.5" />
        ))}
        {Array.from({ length: 24 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={`${i * 4.35}%`} x2="100%" y2={`${i * 4.35}%`}
            stroke={G} strokeWidth="0.5" />
        ))}
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${G}25, transparent)`,
        animation: 'scan 10s linear infinite' }} />
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 500, height: 500,
        borderRadius: '50%', background: `radial-gradient(circle, ${G}07 0%, transparent 70%)`,
        filter: 'blur(40px)', animation: 'glow 6s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,209,255,0.05) 0%, transparent 70%)',
        filter: 'blur(60px)' }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeveloperLoginPage({ onSuccess }) {
  const [booted, setBooted]     = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focusedField, setFocus]= useState(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (booted) setTimeout(() => emailRef.current?.focus(), 200);
  }, [booted]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await devLogin(email.trim(), password);
      localStorage.setItem('unimind_dev_token', data.token);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Invalid developer credentials.');
      setLoading(false);
    }
  }

  const fieldStyle = focused => ({
    width: '100%', padding: '12px 14px', borderRadius: 10, outline: 'none',
    background: 'rgba(0,255,148,0.03)',
    border: `1px solid ${focused ? G + '80' : 'rgba(255,255,255,0.09)'}`,
    color: 'rgba(255,255,255,0.9)', fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'monospace', letterSpacing: '0.04em',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focused ? `0 0 0 3px ${G}14` : 'none',
  });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#02030A', display: 'flex',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <GridBg />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        style={{ width: '100%', maxWidth: 420, padding: '0 24px', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: G,
              boxShadow: `0 0 10px ${G}`, animation: 'glow 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: G, letterSpacing: '0.3em' }}>
              UNIMIND / CONTROL PLANE
            </span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.12em', paddingLeft: 15 }}>
            Developer Access — Authorised Personnel Only
          </div>
        </div>

        {/* Terminal boot sequence → then form */}
        <div style={{ background: 'rgba(0,255,148,0.03)', border: `1px solid ${G}20`,
          borderRadius: 16, padding: 28, minHeight: 260 }}>
          <AnimatePresence mode="wait">
            {!booted ? (
              <BootSequence key="boot" onDone={() => setBooted(true)} />
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}>

                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: G }}>{'>'}</span>
                  authenticate --scope developer
                  <span style={{ display: 'inline-block', width: 7, height: 13, background: G,
                    animation: 'blink 1s step-end infinite', marginLeft: 2 }} />
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.2em',
                      textTransform: 'uppercase', fontFamily: 'monospace',
                      color: focusedField === 'email' ? G : 'rgba(255,255,255,0.28)', marginBottom: 7,
                      transition: 'color 0.2s' }}>
                      Email
                    </label>
                    <input ref={emailRef} type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@unimind.dev"
                      onFocus={() => setFocus('email')} onBlur={() => setFocus(null)}
                      style={fieldStyle(focusedField === 'email')} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.2em',
                      textTransform: 'uppercase', fontFamily: 'monospace',
                      color: focusedField === 'password' ? G : 'rgba(255,255,255,0.28)', marginBottom: 7,
                      transition: 'color 0.2s' }}>
                      Password
                    </label>
                    <input type="password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••••"
                      onFocus={() => setFocus('password')} onBlur={() => setFocus(null)}
                      style={fieldStyle(focusedField === 'password')} />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ fontFamily: 'monospace', fontSize: 11, color: '#FF4444',
                          display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✗</span> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.02, boxShadow: `0 6px 28px ${G}30` } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                      background: loading ? `${G}20` : `linear-gradient(135deg, ${G}, #00D1FF)`,
                      color: loading ? 'rgba(255,255,255,0.3)' : '#000',
                      fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s', marginTop: 4 }}>
                    {loading ? 'Authenticating…' : '$ Enter Control Plane →'}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'monospace',
          fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.12em' }}>
          ACCESS RESTRICTED · UNIMIND INTERNAL · EU AI ACT ART. 14
        </div>
      </motion.div>
    </div>
  );
}
