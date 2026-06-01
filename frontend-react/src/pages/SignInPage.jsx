import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { login } from '../lib/api';

// ── Animated node network (left panel) ────────────────────────────────────────
function NodeNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const nodes = Array.from({ length: 28 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      pulse: Math.random() * Math.PI * 2,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.02;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            const alpha = (1 - d / 130) * 0.18;
            ctx.strokeStyle = `rgba(123,97,255,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Nodes
      nodes.forEach(n => {
        const pulse = 0.6 + Math.sin(n.pulse) * 0.4;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,209,255,${0.5 + Math.sin(n.pulse) * 0.3})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

// ── Floating stat chips ───────────────────────────────────────────────────────
function StatChip({ value, label, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 18px' }}
    >
      <span style={{ fontSize: 20, fontWeight: 300, color: 'white', letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>{label}</span>
    </motion.div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, type, value, onChange, placeholder, accent = '#7B61FF' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12, outline: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${focused ? accent + '80' : 'rgba(255,255,255,0.08)'}`,
            color: 'rgba(255,255,255,0.9)', fontSize: 14,
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
        />
        {focused && (
          <div style={{ position: 'absolute', inset: -1, borderRadius: 12, pointerEvents: 'none',
            boxShadow: `0 0 0 3px ${accent}18` }} />
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SignInPage({ onLoginSuccess, onGoSignup, onGoDeveloper }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      const data = await login(email, password);
      localStorage.setItem('unimind_token', data.access_token);
      localStorage.setItem('unimind_name', data.name);
      localStorage.setItem('unimind_user_id', data.user_id);
      onLoginSuccess({ id: data.user_id, name: data.name });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#02030A', overflow: 'hidden' }}>
      <style>{`
        @keyframes orbit { from { transform: rotate(0deg) translateX(120px); } to { transform: rotate(360deg) translateX(120px); } }
        @keyframes orbitR { from { transform: rotate(180deg) translateX(80px); } to { transform: rotate(540deg) translateX(80px); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.08); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div style={{ flex: '0 0 55%', position: 'relative', overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <NodeNetwork />

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(2,3,10,0.3) 0%, rgba(10,5,25,0.5) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(to top, #02030A, transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '25%',
          background: 'linear-gradient(to bottom, #02030A, transparent)', pointerEvents: 'none' }} />

        {/* Core orb */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div style={{ width: 200, height: 200, borderRadius: '50%', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -60, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(123,97,255,0.2) 0%, rgba(0,209,255,0.08) 50%, transparent 70%)',
              animation: 'pulseGlow 4s ease-in-out infinite', filter: 'blur(20px)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #7B61FF, #00D1FF)',
              filter: 'blur(1px)', opacity: 0.9 }} />
            <div style={{ position: 'absolute', inset: 8, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(180,160,255,0.6) 50%, transparent 80%)' }} />
            {/* Orbiting dots */}
            <div style={{ position: 'absolute', inset: 0, animation: 'orbit 6s linear infinite' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D1FF',
                boxShadow: '0 0 12px #00D1FF', marginTop: -4 }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, animation: 'orbitR 9s linear infinite' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF5FB6',
                boxShadow: '0 0 10px #FF5FB6', marginTop: -3 }} />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div style={{ position: 'absolute', top: 48, left: 48 }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div style={{ fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>UNIMIND</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em' }}>AGENTIC WEB v1.0</div>
          </motion.div>
        </div>

        {/* Bottom copy + stats */}
        <div style={{ position: 'absolute', bottom: 48, left: 48, right: 48 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <h2 style={{ fontSize: 28, fontWeight: 300, color: 'white', letterSpacing: '-0.01em', marginBottom: 8, lineHeight: 1.3 }}>
              The first AI that<br />
              <span style={{ background: 'linear-gradient(135deg, #00D1FF, #7B61FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                reasons about your future
              </span>
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24, letterSpacing: '0.04em', lineHeight: 1.6 }}>
              Using your past and the lived experience<br />of thousands of real humans who walked similar paths.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <StatChip value="1,401" label="Active Agents" delay={0.4} />
              <StatChip value="8,340" label="Simulations Run" delay={0.5} />
              <StatChip value="94.2%" label="Accuracy" delay={0.6} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 56px', position: 'relative' }}>
        {/* Subtle right-side glow */}
        <div style={{ position: 'absolute', top: '30%', right: '-20%', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,97,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: 380 }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', marginBottom: 12, textTransform: 'uppercase' }}>
              Welcome back
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 300, color: 'white', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Sign In
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.03em' }}>
              Your agent is waiting.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Email" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" accent="#7B61FF" />
            <Field label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" accent="#7B61FF" />

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ fontSize: 11, textAlign: 'center', color: '#FF5FB6', letterSpacing: '0.06em' }}>
                {error}
              </motion.p>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 32px rgba(123,97,255,0.35)' } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(123,97,255,0.25)' : 'linear-gradient(135deg, #7B61FF, #00D1FF)',
                color: loading ? 'rgba(255,255,255,0.4)' : 'white',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                marginTop: 4,
              }}>
              {loading ? 'Entering the web…' : 'Enter the Web →'}
            </motion.button>
          </form>

          {/* Footer links */}
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              New to UniMind?{' '}
              <button onClick={onGoSignup}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                  color: '#00D1FF', letterSpacing: '0.04em', padding: 0 }}>
                Create your agent
              </button>
            </p>
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.05)' }} />
            <button onClick={onGoDeveloper}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
                color: 'rgba(0,255,148,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = '#00FF94'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,255,148,0.6)'}>
              <span>⬡</span> Developer Portal →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
