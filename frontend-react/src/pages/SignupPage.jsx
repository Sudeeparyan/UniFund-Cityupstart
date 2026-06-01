import { useState } from 'react';
import { motion } from 'framer-motion';
import { signup } from '../lib/api';

export default function SignupPage({ onSignupSuccess, onGoLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await signup(email, password, name);
      localStorage.setItem('unimind_token', data.access_token);
      localStorage.setItem('unimind_name', data.name);
      localStorage.setItem('unimind_user_id', data.user_id);
      onSignupSuccess({ id: data.user_id, name: data.name });
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #02030A 0%, #05070A 50%, #0a0515 100%)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,209,255,0.06) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="text-center mb-10">
          <div
            className="inline-block text-xs tracking-[0.4em] mb-3 font-medium"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            UNIMIND
          </div>
          <h1
            className="text-3xl font-light tracking-wider mb-2"
            style={{
              background: 'linear-gradient(135deg, #00D1FF, #7B61FF, #FF5FB6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Create Your Agent
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Join 2,847 agents already in the web.
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                YOUR NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,209,255,0.5)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,209,255,0.5)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,209,255,0.5)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: '#FF5FB6' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-medium tracking-widest transition-all"
              style={{
                background: loading
                  ? 'rgba(0,209,255,0.2)'
                  : 'linear-gradient(135deg, #00D1FF, #7B61FF)',
                color: loading ? 'rgba(255,255,255,0.4)' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'CREATING AGENT...' : 'JOIN THE WEB'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Already have an agent?{' '}
          <button
            onClick={onGoLogin}
            style={{ color: 'rgba(123,97,255,0.8)' }}
            onMouseEnter={e => { e.target.style.color = '#7B61FF'; }}
            onMouseLeave={e => { e.target.style.color = 'rgba(123,97,255,0.8)'; }}
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
