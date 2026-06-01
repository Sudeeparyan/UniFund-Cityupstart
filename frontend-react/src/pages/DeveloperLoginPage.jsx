import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, BarChart3, Users, Sparkles, FlaskConical,
  ShieldCheck, ArrowRight, Eye, EyeOff,
} from 'lucide-react';
import { devLogin } from '../lib/api';

const ease = [0.22, 1, 0.36, 1];

// Matches the dashboard dark theme exactly
const D = {
  bg:     '#0F0F0F',
  panel:  '#161616',
  card:   '#1A1A1A',
  border: 'rgba(255,255,255,0.08)',
  text:   'rgba(255,255,255,0.92)',
  sub:    'rgba(255,255,255,0.4)',
  muted:  'rgba(255,255,255,0.2)',
  green:  '#30D158',
  blue:   '#0A84FF',
  purple: '#BF5AF2',
};

// ── Boot sequence ─────────────────────────────────────────────────────────────
const BOOT = [
  { text: 'Initialising UniMind Control Plane…', ok: false },
  { text: 'Backend connection established',       ok: true  },
  { text: 'Agent network: 1,401 nodes online',    ok: true  },
  { text: 'EU AI Act compliance modules loaded',  ok: true  },
  { text: 'Authentication gateway ready',         ok: true  },
];

function BootSequence({ onDone }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= BOOT.length) { setTimeout(onDone, 500); return; }
    const t = setTimeout(() => setShown(s => s + 1), 280);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ padding: '20px 0' }}>
      {BOOT.slice(0, shown).map((l, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 10, fontSize: 12, color: D.sub }}>
          <span style={{ fontSize: 10, color: l.ok ? D.green : D.muted,
            fontVariantNumeric: 'tabular-nums', minWidth: 16 }}>
            {l.ok ? '✓' : '·'}
          </span>
          <span style={{ color: l.ok ? D.text : D.sub }}>{l.text}</span>
        </motion.div>
      ))}
      {shown < BOOT.length && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: D.muted }}>
          <span>·</span>
          <span>
            {BOOT[shown]?.text}
            <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 2 }}>_</span>
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ── Left panel — brand features ───────────────────────────────────────────────
const FEATURES = [
  { Icon: Zap,          label: 'LLM Health Monitor',     desc: 'Real-time token usage, cost and fallback rate' },
  { Icon: BarChart3,    label: 'Onboarding Funnel',       desc: 'Drop-off analysis across all conversion steps' },
  { Icon: Users,        label: 'User & Agent Quality',    desc: 'Per-user knowledge quality scoring' },
  { Icon: Sparkles,     label: 'Simulation Monitor',      desc: 'Personalisation and groundedness scoring' },
  { Icon: FlaskConical, label: 'AI Evaluation Pipelines', desc: 'Three-layer quality eval across all AI outputs' },
  { Icon: ShieldCheck,  label: 'EU AI Act Compliance',    desc: 'Article-level audit and data protection status' },
];

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, type, value, onChange, placeholder, inputRef }) {
  const [focused, setFocused] = useState(false);
  const [show,    setShow]    = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: D.sub,
        marginBottom: 7, letterSpacing: '0.02em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 14px', paddingRight: isPassword ? 42 : 14,
            borderRadius: 10, outline: 'none', boxSizing: 'border-box',
            background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${focused ? 'rgba(255,255,255,0.2)' : D.border}`,
            color: D.text, fontSize: 13, fontFamily: 'Inter, sans-serif',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: D.muted,
              display: 'flex', padding: 0 }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeveloperLoginPage({ onSuccess }) {
  const [booted,   setBooted]   = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const emailRef = useRef(null);

  useEffect(() => {
    if (booted) setTimeout(() => emailRef.current?.focus(), 100);
  }, [booted]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setError(''); setLoading(true);
    try {
      const data = await devLogin(email.trim(), password);
      localStorage.setItem('unimind_dev_token', data.token);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex',
      background: D.bg, overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        input::placeholder { color: ${D.muted}; }
      `}</style>

      {/* ── Left panel ── */}
      <div style={{ flex: '0 0 46%', background: D.panel, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 52px',
        borderRight: `1px solid ${D.border}`, position: 'relative', overflow: 'hidden' }}>

        {/* Subtle background glow */}
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,132,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 350, height: 350,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(191,90,242,0.05) 0%, transparent 70%)',
          pointerEvents: 'none' }} />

        {/* Logo + name */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #00D1FF)',
              boxShadow: '0 0 24px rgba(123,97,255,0.4)' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: D.text, letterSpacing: '0.02em' }}>
                UniMind
              </div>
              <div style={{ fontSize: 11, color: D.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Control Plane
              </div>
            </div>
          </div>

          <div style={{ fontSize: 26, fontWeight: 700, color: D.text, letterSpacing: '-0.02em',
            lineHeight: 1.2, marginBottom: 12 }}>
            Internal developer<br />dashboard
          </div>
          <div style={{ fontSize: 13, color: D.sub, lineHeight: 1.7, maxWidth: 320 }}>
            Monitor, evaluate and control the UniMind platform in real time. Restricted to authorised team members.
          </div>
        </motion.div>

        {/* Feature list */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}>
          <div style={{ fontSize: 10, color: D.muted, letterSpacing: '0.12em', textTransform: 'uppercase',
            fontWeight: 600, marginBottom: 16 }}>
            What's inside
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06, duration: 0.35, ease }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: D.sub, flexShrink: 0, marginTop: 1 }}>
                  <f.Icon size={14} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: D.text, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: D.muted, lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: D.muted }}>
          v1.0 · EU AI Act Art. 14 · Authorised access only
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 52px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          style={{ width: '100%', maxWidth: 380 }}>

          {/* System check / form */}
          <div style={{ background: D.card, borderRadius: 20, border: `1px solid ${D.border}`,
            overflow: 'hidden', marginBottom: 16 }}>

            {/* Card header */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${D.border}`,
              display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%',
                background: booted ? D.green : D.muted,
                boxShadow: booted ? `0 0 8px ${D.green}` : 'none',
                transition: 'all 0.3s', animation: !booted ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
              <span style={{ fontSize: 12, color: D.sub, fontWeight: 500, letterSpacing: '0.04em' }}>
                {booted ? 'System ready — authenticate to continue' : 'Running system checks…'}
              </span>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <AnimatePresence mode="wait">
                {!booted ? (
                  <BootSequence key="boot" onDone={() => setBooted(true)} />
                ) : (
                  <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: D.text,
                      letterSpacing: '-0.01em', marginBottom: 6 }}>
                      Sign in
                    </div>
                    <div style={{ fontSize: 12, color: D.sub, marginBottom: 24 }}>
                      Use your developer account credentials
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <Field label="Email address" type="email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@unimind.dev" inputRef={emailRef} />
                      <Field label="Password" type="password" value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password" />

                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12,
                              background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)',
                              color: D.red }}>
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button type="submit" disabled={loading || !email || !password}
                        whileHover={!loading ? { opacity: 0.92 } : {}}
                        whileTap={!loading ? { scale: 0.99 } : {}}
                        style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                          background: loading || !email || !password
                            ? 'rgba(255,255,255,0.08)'
                            : D.blue,
                          color: loading || !email || !password
                            ? D.muted : 'white',
                          fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                          fontFamily: 'Inter, sans-serif', marginTop: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          transition: 'background 0.2s' }}>
                        {loading ? (
                          <>
                            <div style={{ width: 14, height: 14, borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white',
                              animation: 'spin 0.7s linear infinite' }} />
                            Authenticating…
                          </>
                        ) : (
                          <>Access Control Plane <ArrowRight size={15} /></>
                        )}
                      </motion.button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div style={{ fontSize: 11, color: D.muted, textAlign: 'center', lineHeight: 1.6 }}>
            Access is logged and monitored. Unauthorised use is prohibited.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
