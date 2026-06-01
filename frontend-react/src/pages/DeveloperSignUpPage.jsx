import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const G = '#00FF94';   // developer green
const C = '#00D1FF';   // cyan
const D = '#02030A';   // background

// ── Static developer role options ─────────────────────────────────────────────
const DEV_ROLES = [
  'Platform Engineer',
  'AI / ML Researcher',
  'Security Analyst',
  'Product Manager',
  'Data Scientist',
  'Independent Developer',
  'Academic / Researcher',
  'Other',
];

// ── Access scope checkboxes ───────────────────────────────────────────────────
const SCOPES = [
  { id: 'dashboard',  label: 'Developer Dashboard',    desc: 'Full analytics & monitoring access' },
  { id: 'eval',       label: 'Agent Eval API',         desc: 'Evaluate agent quality & coherence' },
  { id: 'euai',       label: 'EU AI Act Reports',      desc: 'Compliance audit & data export' },
  { id: 'threats',    label: 'Threat Intelligence',    desc: 'Security alerts & anomaly data' },
  { id: 'simulate',   label: 'Simulation API',         desc: 'Programmatic life-path simulations' },
  { id: 'network',    label: 'Network Growth Data',    desc: 'Agent graph & growth telemetry' },
];

// ── What devs get — left panel feature list ───────────────────────────────────
const FEATURES = [
  { icon: '◉', color: G,    title: 'Real-time Dashboard',  desc: 'Monitor users, performance, agents and threats from a unified control plane.' },
  { icon: '✦', color: C,    title: 'Agent Evaluation API', desc: 'Query quality scores, hallucination rates and persona coherence across the network.' },
  { icon: '⚖', color: '#7B61FF', title: 'EU AI Act Compliance', desc: 'Article-by-article audit logs, GDPR data right statuses and retention reports.' },
  { icon: '⬡', color: '#FF8C42', title: 'Threat Detection',    desc: 'Live security alerts, rate-limit logs, IP anomalies and content-theft signals.' },
  { icon: '◎', color: '#FF5FB6', title: 'Simulation API',      desc: 'Run life-path simulations programmatically for research and integration use-cases.' },
];

// ── Animated grid background ──────────────────────────────────────────────────
function GridBg() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      <style>{`
        @keyframes gridPulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        @keyframes scanline  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes termBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes devFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        input::placeholder, textarea::placeholder { color:rgba(255,255,255,0.18); }
        select option { background:#020b06; color:white; }
      `}</style>

      {/* Grid lines */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }}>
        {Array.from({length:20}).map((_,i)=>(
          <line key={`v${i}`} x1={`${i*5.26}%`} y1="0" x2={`${i*5.26}%`} y2="100%"
            stroke={G} strokeWidth="0.5" />
        ))}
        {Array.from({length:20}).map((_,i)=>(
          <line key={`h${i}`} x1="0" y1={`${i*5.26}%`} x2="100%" y2={`${i*5.26}%`}
            stroke={G} strokeWidth="0.5" />
        ))}
      </svg>

      {/* Scan line */}
      <div style={{ position:'absolute', left:0, right:0, height:1,
        background:`linear-gradient(90deg, transparent, ${G}30, transparent)`,
        animation:'scanline 8s linear infinite' }} />

      {/* Corner glow */}
      <div style={{ position:'absolute', top:'-5%', left:'-5%', width:400, height:400, borderRadius:'50%',
        background:`radial-gradient(circle, ${G}08 0%, transparent 70%)`, filter:'blur(40px)' }} />
      <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(0,209,255,0.06) 0%, transparent 70%)', filter:'blur(60px)' }} />
    </div>
  );
}

// ── Terminal header label ─────────────────────────────────────────────────────
function TermLine({ text, color = G }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
      <span style={{ color:G, fontFamily:'monospace', fontSize:12 }}>{'>'}</span>
      <span style={{ fontFamily:'monospace', fontSize:12, color, letterSpacing:'0.08em' }}>{text}</span>
      <span style={{ display:'inline-block', width:8, height:14, background:G, marginLeft:2,
        animation:'termBlink 1.1s step-end infinite', verticalAlign:'middle' }} />
    </div>
  );
}

// ── Scope toggle chip ─────────────────────────────────────────────────────────
function ScopeChip({ scope, checked, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', padding:'10px 12px',
      borderRadius:10, border:`1px solid ${checked ? G+'50' : 'rgba(255,255,255,0.07)'}`,
      background: checked ? `${G}08` : 'rgba(255,255,255,0.02)',
      transition:'border 0.2s, background 0.2s' }}>
      <div style={{ position:'relative', flexShrink:0, marginTop:1 }}>
        <input type="checkbox" checked={checked} onChange={onChange}
          style={{ position:'absolute', opacity:0, width:0, height:0 }} />
        <div style={{ width:16, height:16, borderRadius:4,
          background: checked ? G : 'transparent',
          border:`1.5px solid ${checked ? G : 'rgba(255,255,255,0.2)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.15s', boxShadow: checked ? `0 0 8px ${G}60` : 'none' }}>
          {checked && <span style={{ fontSize:10, color:'#000', fontWeight:800 }}>✓</span>}
        </div>
      </div>
      <div>
        <div style={{ fontSize:11, color: checked?'white':'rgba(255,255,255,0.6)',
          letterSpacing:'0.08em', marginBottom:2, transition:'color 0.2s' }}>{scope.label}</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{scope.desc}</div>
      </div>
    </label>
  );
}

// ── Form input ────────────────────────────────────────────────────────────────
function Field({ label, type='text', value, onChange, placeholder, multiline=false, required=true }) {
  const [focused, setFocused] = useState(false);
  const shared = {
    width:'100%', padding:'12px 14px', borderRadius:10, outline:'none',
    background:'rgba(0,255,148,0.03)',
    border:`1px solid ${focused ? G+'70' : 'rgba(255,255,255,0.08)'}`,
    color:'rgba(255,255,255,0.88)', fontSize:13, boxSizing:'border-box',
    transition:'border-color 0.2s, box-shadow 0.2s', fontFamily:'inherit',
    boxShadow: focused ? `0 0 0 3px ${G}12` : 'none',
    resize: multiline ? 'vertical' : 'none',
  };
  return (
    <div>
      <label style={{ display:'block', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase',
        color: focused ? `${G}cc` : 'rgba(255,255,255,0.3)', marginBottom:7, transition:'color 0.2s' }}>
        {label}{required && <span style={{ color: G, marginLeft:3 }}>*</span>}
      </label>
      {multiline
        ? <textarea rows={3} value={value} onChange={onChange} placeholder={placeholder}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={shared} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={shared} />
      }
    </div>
  );
}

// ── Select field ──────────────────────────────────────────────────────────────
function SelectField({ label, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display:'block', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase',
        color: focused ? `${G}cc` : 'rgba(255,255,255,0.3)', marginBottom:7, transition:'color 0.2s' }}>
        {label}<span style={{ color:G, marginLeft:3 }}>*</span>
      </label>
      <select value={value} onChange={onChange}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ width:'100%', padding:'12px 14px', borderRadius:10, outline:'none',
          background:'rgba(0,255,148,0.03)',
          border:`1px solid ${focused ? G+'70' : 'rgba(255,255,255,0.08)'}`,
          color: value ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)',
          fontSize:13, boxSizing:'border-box', cursor:'pointer',
          transition:'border-color 0.2s', boxShadow: focused ? `0 0 0 3px ${G}12` : 'none',
          appearance:'none' }}>
        <option value="" disabled>Select your role</option>
        {DEV_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ name, onBack }) {
  return (
    <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
      transition={{duration:0.5,ease}}
      style={{ textAlign:'center', padding:'60px 40px' }}>
      <motion.div initial={{scale:0}} animate={{scale:1}}
        transition={{type:'spring',stiffness:260,damping:18,delay:0.1}}
        style={{ width:72, height:72, borderRadius:'50%', background:`${G}18`,
          border:`2px solid ${G}`, margin:'0 auto 24px', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:28,
          boxShadow:`0 0 40px ${G}40` }}>
        ✓
      </motion.div>
      <h2 style={{ fontSize:24, fontWeight:300, color:'white', marginBottom:8, letterSpacing:'-0.01em' }}>
        Access Requested
      </h2>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:6, letterSpacing:'0.04em' }}>
        Welcome to the developer portal, <span style={{ color:G }}>{name || 'Developer'}</span>.
      </p>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', marginBottom:32, maxWidth:320, margin:'0 auto 32px', lineHeight:1.6 }}>
        Your request is under review. You'll receive an email within 24–48 hours with your API keys and dashboard access.
      </p>
      <button onClick={onBack}
        style={{ background:'none', border:`1px solid ${G}50`, borderRadius:10, padding:'10px 24px',
          color:G, fontSize:11, letterSpacing:'0.18em', textTransform:'uppercase', cursor:'pointer',
          transition:'all 0.2s' }}
        onMouseEnter={e=>{e.currentTarget.style.background=`${G}12`;}}
        onMouseLeave={e=>{e.currentTarget.style.background='none';}}>
        ← Return to Sign In
      </button>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeveloperSignUpPage({ onBack }) {
  const [form, setForm] = useState({
    name:'', email:'', password:'', confirm:'', org:'', role:'', usecase:'',
  });
  const [scopes, setScopes]   = useState({ dashboard:true, eval:true, euai:false, threats:false, simulate:false, network:false });
  const [agreed, setAgreed]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const set = k => e => setForm(f=>({...f, [k]: e.target.value}));

  function validate() {
    if (!form.name || !form.email || !form.password || !form.role) return 'Name, email, password and role are required.';
    if (form.password.length < 8) return 'Developer password must be at least 8 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    if (!agreed) return 'You must agree to the EU AI Act compliance terms.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    setSuccess(true);
  }

  return (
    <div style={{ width:'100vw', minHeight:'100vh', background:D, display:'flex', overflow:'hidden' }}>
      <GridBg />

      {/* ── LEFT PANEL — features ── */}
      <div style={{ flex:'0 0 42%', display:'flex', flexDirection:'column', justifyContent:'center',
        padding:'60px 48px', position:'relative', borderRight:`1px solid ${G}15` }}>

        {/* Logo */}
        <motion.div initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}}
          transition={{duration:0.7,ease}} style={{ marginBottom:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:G,
              boxShadow:`0 0 12px ${G}`, animation:'devFloat 3s ease-in-out infinite' }} />
            <span style={{ fontSize:10, letterSpacing:'0.4em', color:'rgba(255,255,255,0.25)' }}>UNIMIND</span>
          </div>
          <TermLine text="unimind --developer-access --request" />
        </motion.div>

        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
          transition={{duration:0.6,delay:0.15,ease}}>
          <h1 style={{ fontSize:32, fontWeight:300, color:'white', letterSpacing:'-0.02em',
            marginBottom:10, lineHeight:1.2 }}>
            Build on the<br />
            <span style={{ background:`linear-gradient(135deg, ${G}, ${C})`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              agentic web
            </span>
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:36, lineHeight:1.65, letterSpacing:'0.03em' }}>
            Get programmatic access to UniMind's intelligence network — evaluation APIs, compliance tooling, and real-time analytics.
          </p>
        </motion.div>

        {/* Feature list */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {FEATURES.map((f,i)=>(
            <motion.div key={i} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}}
              transition={{delay:0.2+i*0.08,duration:0.5,ease}}
              style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
                background:`${f.color}12`, border:`1px solid ${f.color}30`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, color:f.color, boxShadow:`0 0 16px ${f.color}20` }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize:12, color:'white', fontWeight:500, letterSpacing:'0.06em', marginBottom:3 }}>
                  {f.title}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.55 }}>
                  {f.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom badge */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8,duration:0.6}}
          style={{ marginTop:40, padding:'12px 16px', borderRadius:12,
            background:`${G}06`, border:`1px solid ${G}20`,
            display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>⚖</span>
          <div>
            <div style={{ fontSize:10, color:G, letterSpacing:'0.15em', marginBottom:2 }}>EU AI ACT COMPLIANT</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>All developer access governed by Art. 13, GDPR & Data Protection Act</div>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', alignItems:'flex-start',
        justifyContent:'center', padding:'60px 48px' }}>
        <motion.div initial={{opacity:0,x:24}} animate={{opacity:1,x:0}}
          transition={{duration:0.7,ease}} style={{ width:'100%', maxWidth:460 }}>

          {/* Panel header */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:32 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:G,
              boxShadow:`0 0 8px ${G}` }} />
            <span style={{ fontSize:10, letterSpacing:'0.25em', color:G, textTransform:'uppercase' }}>
              Developer Portal
            </span>
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginLeft:'auto' }}>v1.0</span>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <SuccessScreen key="success" name={form.name} onBack={onBack} />
            ) : (
              <motion.div key="form" initial={{opacity:1}} exit={{opacity:0}}>
                <h2 style={{ fontSize:22, fontWeight:300, color:'white', letterSpacing:'-0.01em', marginBottom:4 }}>
                  Request Developer Access
                </h2>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:28, letterSpacing:'0.04em' }}>
                  Fields marked <span style={{color:G}}>*</span> are required.
                </p>

                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Identity */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <Field label="Full Name" value={form.name} onChange={set('name')} placeholder="Your name" />
                    <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="dev@company.com" />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <Field label="Password (min 8)" type="password" value={form.password}
                      onChange={set('password')} placeholder="Min. 8 chars" />
                    <Field label="Confirm Password" type="password" value={form.confirm}
                      onChange={set('confirm')} placeholder="Repeat password" />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <Field label="Organisation" value={form.org} onChange={set('org')} placeholder="Company / Institution" required={false} />
                    <SelectField label="Your Role" value={form.role} onChange={set('role')} />
                  </div>
                  <Field label="Use Case" value={form.usecase} onChange={set('usecase')}
                    placeholder="Describe what you intend to build or research…" multiline required={false} />

                  {/* Divider */}
                  <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'4px 0' }} />

                  {/* Scope */}
                  <div>
                    <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase',
                      color:'rgba(255,255,255,0.3)', marginBottom:10 }}>Access Scope</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {SCOPES.map(s=>(
                        <ScopeChip key={s.id} scope={s} checked={scopes[s.id]}
                          onChange={e=>setScopes(sc=>({...sc,[s.id]:e.target.checked}))} />
                      ))}
                    </div>
                  </div>

                  {/* EU AI Act agreement */}
                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer',
                    padding:'14px', borderRadius:12,
                    background: agreed?`${G}06`:'rgba(255,255,255,0.02)',
                    border:`1px solid ${agreed?G+'35':'rgba(255,255,255,0.07)'}`,
                    transition:'all 0.2s' }}>
                    <div style={{ position:'relative', flexShrink:0, marginTop:1 }}>
                      <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}
                        style={{ position:'absolute', opacity:0, width:0, height:0 }} />
                      <div style={{ width:18, height:18, borderRadius:5,
                        background: agreed?G:'transparent',
                        border:`1.5px solid ${agreed?G:'rgba(255,255,255,0.2)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.15s', boxShadow: agreed?`0 0 8px ${G}60`:'none' }}>
                        {agreed&&<span style={{fontSize:10,color:'#000',fontWeight:800}}>✓</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
                      I agree to the{' '}
                      <span style={{ color:G }}>EU AI Act compliance terms</span>,{' '}
                      <span style={{ color:C }}>Developer Data Use Policy</span>, and confirm this access will be used for authorised purposes only.
                    </span>
                  </label>

                  {error && (
                    <motion.p initial={{opacity:0}} animate={{opacity:1}}
                      style={{ fontSize:11, textAlign:'center', color:'#FF5FB6', letterSpacing:'0.06em' }}>
                      {error}
                    </motion.p>
                  )}

                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading?{scale:1.02,boxShadow:`0 8px 32px ${G}30`}:{}}
                    whileTap={!loading?{scale:0.97}:{}}
                    style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', marginTop:4,
                      background: loading ? `${G}20` : `linear-gradient(135deg, ${G}, ${C})`,
                      color: loading?'rgba(255,255,255,0.35)':'#000',
                      fontSize:11, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase',
                      cursor: loading?'not-allowed':'pointer', transition:'background 0.2s' }}>
                    {loading ? 'Submitting…' : 'Request Developer Access →'}
                  </motion.button>
                </form>

                {/* Back link */}
                <div style={{ marginTop:24, textAlign:'center' }}>
                  <button onClick={onBack}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:11,
                      color:'rgba(255,255,255,0.22)', letterSpacing:'0.08em' }}
                    onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.55)'}
                    onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.22)'}>
                    ← Back to Sign In
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
