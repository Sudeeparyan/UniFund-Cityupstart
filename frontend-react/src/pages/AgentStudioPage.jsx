import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runStudioPipeline, getMe } from '../lib/api';

// ── 20 Student Agents ─────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'ARIA',   role: 'Orchestrator',       icon: '◎',  color: '#00D1FF', desc: 'Routes tasks & coordinates all agents' },
  { id: 'SCOUT',  role: 'JD Analyzer',        icon: '🔍', color: '#7B61FF', desc: 'Extracts requirements from job descriptions' },
  { id: 'NEXUS',  role: 'Deep Researcher',    icon: '🧠', color: '#FF5FB6', desc: 'Company & industry intelligence' },
  { id: 'LENS',   role: 'Skill Matcher',      icon: '⚡', color: '#FBBF24', desc: 'Scores your profile against requirements' },
  { id: 'RESUME', role: 'Resume Builder',     icon: '📄', color: '#4ADE80', desc: 'Crafts tailored ATS-optimized resumes' },
  { id: 'QUILL',  role: 'Cover Letter',       icon: '✍️', color: '#F472B6', desc: 'Personalized, compelling cover letters' },
  { id: 'PREP',   role: 'Interview Coach',    icon: '🎯', color: '#A78BFA', desc: 'Likely Q&As for your target role' },
  { id: 'LINX',   role: 'LinkedIn Optimizer', icon: '🔗', color: '#38BDF8', desc: 'Headline, summary & skill optimization' },
  { id: 'PATH',   role: 'Learning Planner',   icon: '🗺️', color: '#34D399', desc: 'Roadmaps to close skill gaps fast' },
  { id: 'SIGMA',  role: 'Study Scheduler',    icon: '📅', color: '#FB923C', desc: 'Deadline tracking & study planning' },
  { id: 'BUILD',  role: 'Project Ideator',    icon: '🏗️', color: '#E879F9', desc: 'Portfolio-worthy project concepts' },
  { id: 'FOLIO',  role: 'Portfolio Coach',    icon: '🖼️', color: '#2DD4BF', desc: 'Curates what to show to employers' },
  { id: 'CITE',   role: 'Citation Agent',     icon: '📚', color: '#FACC15', desc: 'APA, MLA, Chicago in seconds' },
  { id: 'DRAFT',  role: 'Email Drafter',      icon: '✉️', color: '#60A5FA', desc: 'Cold emails to recruiters & professors' },
  { id: 'FUND',   role: 'Scholarship Finder', icon: '💰', color: '#86EFAC', desc: 'Matched scholarship opportunities' },
  { id: 'MATCH',  role: 'Internship Matcher', icon: '🎪', color: '#F87171', desc: 'Best-fit internship discovery' },
  { id: 'PAY',    role: 'Salary Intel',       icon: '📊', color: '#A3E635', desc: 'Market rates & negotiation strategy' },
  { id: 'NET',    role: 'Network Strategist', icon: '🌐', color: '#C084FC', desc: 'Who to contact & how to reach them' },
  { id: 'BRIEF',  role: 'Summarizer',         icon: '⚡', color: '#67E8F9', desc: 'Condenses papers, articles & docs' },
  { id: 'ESSAY',  role: 'Academic Writer',    icon: '🎓', color: '#FB7185', desc: 'SOPs, essays & academic writing' },
];

const PIPELINE_AGENTS = ['ARIA', 'SCOUT', 'NEXUS', 'LENS', 'RESUME'];

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function agentColor(id) {
  return AGENTS.find(a => a.id === id)?.color ?? '#7B61FF';
}

function useAutoScroll(ref, dep) {
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [dep]);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentCard({ agent, status }) {
  const isActive = status === 'active';
  const isDone   = status === 'done';
  const color    = agent.color;

  return (
    <motion.div
      layout
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '9px 12px',
        borderRadius: 10,
        background: isActive ? `${color}12` : 'transparent',
        border: `1px solid ${isActive ? color + '40' : 'transparent'}`,
        transition: 'background 0.25s, border-color 0.25s',
        cursor: 'default',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
        <span style={{ fontSize: 15 }}>{agent.icon}</span>
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.7, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              background: color, opacity: 0.35,
            }}
          />
        )}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 7, height: 7, borderRadius: '50%',
          background: isDone ? '#4ADE80' : isActive ? color : 'rgba(255,255,255,0.15)',
          boxShadow: isActive ? `0 0 6px ${color}` : 'none',
          transition: 'background 0.3s',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            color: isActive ? color : isDone ? '#4ADE80' : 'rgba(255,255,255,0.75)',
          }}>{agent.id}</span>
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '1px 5px',
          }}>{agent.role}</span>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', lineHeight: 1.3 }}>
          {agent.desc}
        </p>
      </div>
    </motion.div>
  );
}

function CommLogEntry({ entry, index }) {
  const fromColor = agentColor(entry.from_agent);
  const toColor   = agentColor(entry.to_agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '8px 12px', borderLeft: `2px solid ${fromColor}40` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: fromColor }}>{entry.from_agent}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>→</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: toColor }}>{entry.to_agent}</span>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.45 }}>
        {entry.message}
      </p>
    </motion.div>
  );
}

function ResumeDisplay({ resume, jdAnalysis, userName, onCopy }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = buildPlainText(resume, jdAnalysis, userName);
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 16, padding: 28, maxWidth: 720, width: '100%',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>{userName}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Tailored for: <span style={{ color: '#00D1FF' }}>{jdAnalysis?.role}</span>
            {jdAnalysis?.company && jdAnalysis.company !== 'Unknown' && (
              <> at <span style={{ color: '#7B61FF' }}>{jdAnalysis.company}</span></>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <MatchBadge score={jdAnalysis?._match_score} />
          <button onClick={handleCopy} style={{
            background: copied ? '#4ADE8022' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${copied ? '#4ADE80' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 8, padding: '6px 14px', color: copied ? '#4ADE80' : 'rgba(255,255,255,0.7)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', transition: 'all 0.2s',
          }}>
            {copied ? '✓ Copied' : 'Copy Text'}
          </button>
        </div>
      </div>

      <Divider label="SUMMARY" />
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, margin: '10px 0 20px' }}>
        {resume.summary}
      </p>

      {resume.skills_technical?.length > 0 && (
        <>
          <Divider label="TECHNICAL SKILLS" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '10px 0 20px' }}>
            {resume.skills_technical.map((s, i) => (
              <Chip key={i} label={s} color="#00D1FF" />
            ))}
          </div>
        </>
      )}

      {resume.skills_soft?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '0 0 20px' }}>
          {resume.skills_soft.map((s, i) => (
            <Chip key={i} label={s} color="#7B61FF" />
          ))}
        </div>
      )}

      {resume.experience?.length > 0 && (
        <>
          <Divider label="EXPERIENCE" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: '10px 0 20px' }}>
            {resume.experience.map((exp, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{exp.title}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>@ {exp.company}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{exp.period}</span>
                </div>
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  {(exp.bullets || []).map((b, j) => (
                    <li key={j} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginBottom: 3 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {resume.education?.length > 0 && (
        <>
          <Divider label="EDUCATION" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0 20px' }}>
            {resume.education.map((edu, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{edu.degree}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>{edu.school}</span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{edu.year}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {resume.projects?.length > 0 && (
        <>
          <Divider label="PROJECTS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '10px 0 20px' }}>
            {resume.projects.map((proj, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{proj.name}</span>
                  {(proj.tech || []).map((t, j) => (
                    <Chip key={j} label={t} color="#FF5FB6" small />
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', lineHeight: 1.55 }}>
                  {proj.description}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {resume.certifications?.length > 0 && (
        <>
          <Divider label="CERTIFICATIONS" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '10px 0' }}>
            {resume.certifications.map((c, i) => (
              <Chip key={i} label={c} color="#FBBF24" />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 0' }}>
      <span style={{ fontSize: 10, letterSpacing: '0.12em', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

function Chip({ label, color, small }) {
  return (
    <span style={{
      fontSize: small ? 10 : 12, padding: small ? '2px 7px' : '3px 10px',
      borderRadius: 20, border: `1px solid ${color}40`,
      color, background: `${color}10`,
    }}>
      {label}
    </span>
  );
}

function MatchBadge({ score }) {
  if (!score) return null;
  const color = score >= 80 ? '#4ADE80' : score >= 60 ? '#FBBF24' : '#F87171';
  return (
    <div style={{
      padding: '6px 12px', borderRadius: 8, border: `1px solid ${color}40`,
      background: `${color}12`, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ fontSize: 10, color, fontWeight: 700 }}>MATCH</span>
      <span style={{ fontSize: 14, fontWeight: 800, color }}>{score}%</span>
    </div>
  );
}

function buildPlainText(resume, jd, userName) {
  const lines = [userName, ''];
  if (resume.summary) { lines.push('SUMMARY', resume.summary, ''); }
  if (resume.skills_technical?.length) {
    lines.push('TECHNICAL SKILLS', resume.skills_technical.join(', '), '');
  }
  if (resume.skills_soft?.length) {
    lines.push('SOFT SKILLS', resume.skills_soft.join(', '), '');
  }
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
    resume.projects.forEach(p => {
      lines.push(`${p.name} [${(p.tech || []).join(', ')}]`);
      lines.push(`  ${p.description}`);
      lines.push('');
    });
  }
  return lines.join('\n');
}

// ── Chat message types ────────────────────────────────────────────────────────

function UserMessage({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <div style={{
        maxWidth: '75%', background: 'rgba(123,97,255,0.18)', border: '1px solid rgba(123,97,255,0.3)',
        borderRadius: '16px 4px 16px 16px', padding: '10px 16px',
        fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55,
      }}>
        {text}
      </div>
    </div>
  );
}

function SystemMessage({ text, isLoading }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
        background: 'linear-gradient(135deg, #00D1FF, #7B61FF)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#fff',
      }}>A</div>
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '4px 16px 16px 16px', padding: '10px 16px',
        fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6,
      }}>
        {isLoading
          ? <LoadingDots />
          : <span>{text}</span>}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }}
        />
      ))}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ isOpen, onToggle, agentStatuses, commLogs }) {
  const commsRef = useRef(null);
  useAutoScroll(commsRef, commLogs.length);

  return (
    <>
      {/* Toggle strip */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute', left: isOpen ? 318 : 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 20, width: 20, height: 60, borderRadius: isOpen ? '0 8px 8px 0' : '0 8px 8px 0',
          background: '#12121e', border: '1px solid rgba(255,255,255,0.1)',
          borderLeft: isOpen ? 'none' : '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'left 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
          color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Manrope, sans-serif',
        }}
      >
        {isOpen ? '‹' : '›'}
      </button>

      {/* Sidebar panel */}
      <motion.div
        initial={false}
        animate={{ width: isOpen ? 318 : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flexShrink: 0, overflow: 'hidden',
          background: '#07070f', borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ width: 318, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Sidebar header */}
          <div style={{
            padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00D1FF, #7B61FF)',
              boxShadow: '0 0 8px #00D1FF',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
              AGENT NETWORK
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 6px',
            }}>
              {AGENTS.length} agents
            </span>
          </div>

          {/* Agent list (upper half) */}
          <div style={{ flex: '0 0 55%', overflowY: 'auto', padding: '8px 6px' }}>
            {AGENTS.map(agent => (
              <AgentCard key={agent.id} agent={agent} status={agentStatuses[agent.id] || 'idle'} />
            ))}
          </div>

          {/* Comms log (lower half) */}
          <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>
                LIVE COMMS
              </span>
              {commLogs.length > 0 && (
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }}
                />
              )}
            </div>
            <div ref={commsRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {commLogs.length === 0 ? (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 16px' }}>
                  Run a pipeline to see agents communicate in real time.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {commLogs.map((log, i) => (
                    <CommLogEntry key={i} entry={log} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  'Build me a resume for a Software Engineer role at Google — I have 2 years of React experience.',
  'I\'m a CS student applying to a Machine Learning internship at OpenAI. Create my resume.',
  'Here\'s a Product Manager JD from Stripe. Tailor my resume to it.',
  'Help me apply for a Data Analyst role at a fintech startup.',
];

function WelcomeScreen({ onExample }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '40px 24px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #00D1FF22, #7B61FF22)',
          border: '1px solid rgba(123,97,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
        }}>⚡</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
          Agent Studio
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          Paste a job description and 4 specialized agents will collaborate to build your tailored resume in seconds.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
          TRY AN EXAMPLE
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => onExample(p)} style={{
              textAlign: 'left', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '11px 14px', cursor: 'pointer',
              fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'Manrope, sans-serif',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(123,97,255,0.4)'; e.target.style.background = 'rgba(123,97,255,0.06)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(0,209,255,0.05)', border: '1px solid rgba(0,209,255,0.15)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PIPELINE_AGENTS.map(id => {
            const a = AGENTS.find(x => x.id === id);
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12 }}>{a?.icon}</span>
                <span style={{ fontSize: 11, color: a?.color, fontWeight: 600 }}>{id}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{a?.role}</span>
                {id !== 'RESUME' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>→</span>}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '8px 0 0' }}>
          5 agents collaborate in sequence. Watch them talk in the sidebar.
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentStudioPage({ userName = 'USER', onBack }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [commLogs, setCommLogs] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [resolvedName, setResolvedName] = useState(userName);

  const chatRef = useRef(null);
  const textareaRef = useRef(null);
  useAutoScroll(chatRef, messages.length);

  useEffect(() => {
    getMe().then(u => { if (u?.name) setResolvedName(u.name); }).catch(() => {});
  }, []);

  function addMessage(role, content, extra = {}) {
    setMessages(prev => [...prev, { role, content, ...extra, id: Date.now() + Math.random() }]);
  }

  function setAgentStatus(id, status) {
    setAgentStatuses(prev => ({ ...prev, [id]: status }));
  }

  function replayLogs(logs) {
    logs.forEach(log => {
      setTimeout(() => {
        setCommLogs(prev => [...prev, log]);
        // Activate agents involved in this log entry
        if (log.from_agent && log.from_agent !== 'USER') {
          setAgentStatus(log.from_agent, 'active');
        }
        if (log.to_agent && log.to_agent !== 'USER' && log.to_agent !== 'ARIA') {
          setAgentStatus(log.to_agent, 'active');
        }
      }, log.delay_ms);
    });

    // Mark each pipeline agent as done progressively
    const doneDelays = { ARIA: 500, SCOUT: 1000, NEXUS: 2500, LENS: 4000, RESUME: 7000 };
    Object.entries(doneDelays).forEach(([id, delay]) => {
      setTimeout(() => setAgentStatus(id, 'done'), delay);
    });
  }

  async function handleRun(text) {
    const jd = (text || input).trim();
    if (!jd || isRunning) return;

    setInput('');
    setCurrentResult(null);
    setCommLogs([]);
    setAgentStatuses({});
    setIsRunning(true);
    setSidebarOpen(true);

    // Activate ARIA immediately
    setAgentStatus('ARIA', 'active');

    addMessage('user', jd);
    addMessage('assistant', '', { loading: true });

    try {
      const data = await runStudioPipeline('resume', jd);

      // Replace loading message with status text
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, loading: false, content: `Pipeline complete. Match score: ${data.match_analysis?.match_score ?? '—'}%. Replaying agent communications…` }
          : m
      ));

      // Attach match score to jd_analysis for badge display
      const jdWithScore = { ...data.jd_analysis, _match_score: data.match_analysis?.match_score };

      // Replay agent comms, then show resume
      replayLogs(data.agent_logs || []);

      const totalDelay = Math.max(...(data.agent_logs || [{ delay_ms: 0 }]).map(l => l.delay_ms)) + 600;
      setTimeout(() => {
        setCurrentResult({ resume: data.resume, jdAnalysis: jdWithScore, userName: resolvedName });
        addMessage('assistant', '');
        setIsRunning(false);
      }, totalDelay);

    } catch (err) {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, loading: false, content: `Error: ${err.message}. Make sure the backend is running.` }
          : m
      ));
      setIsRunning(false);
      setAgentStatuses({});
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
  }

  const showWelcome = messages.length === 0;

  return (
    <div style={{
      display: 'flex', width: '100%', height: '100%',
      background: '#02030A', fontFamily: 'Manrope, sans-serif',
      position: 'relative',
    }}>
      {/* Sidebar */}
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
          agentStatuses={agentStatuses}
          commLogs={commLogs}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingLeft: sidebarOpen ? 0 : 20 }}>

        {/* Top bar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: 'inherit',
            padding: '4px 8px', borderRadius: 6,
          }}>←</button>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: 'linear-gradient(135deg, #00D1FF, #7B61FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>A</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              Agent Studio
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {PIPELINE_AGENTS.map(id => {
              const st = agentStatuses[id];
              const color = AGENTS.find(a => a.id === id)?.color ?? '#7B61FF';
              return (
                <div key={id} title={id} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: st === 'done' ? '#4ADE80' : st === 'active' ? color : 'rgba(255,255,255,0.15)',
                  boxShadow: st === 'active' ? `0 0 6px ${color}` : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
              );
            })}
          </div>
        </div>

        {/* Chat / welcome area */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence>
            {showWelcome && <WelcomeScreen onExample={(p) => { setInput(p); textareaRef.current?.focus(); }} />}
          </AnimatePresence>

          {messages.map((msg, i) => (
            <div key={msg.id ?? i}>
              {msg.role === 'user'
                ? <UserMessage text={msg.content} />
                : <SystemMessage text={msg.content} isLoading={msg.loading} />
              }
              {/* Render resume card after last assistant message (non-loading) */}
              {msg.role === 'assistant' && !msg.loading && !msg.content && currentResult && i === messages.length - 1 && (
                <div style={{ paddingLeft: 38, marginBottom: 16 }}>
                  <ResumeDisplay
                    resume={currentResult.resume}
                    jdAnalysis={currentResult.jdAnalysis}
                    userName={currentResult.userName}
                    onCopy={() => {}}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '10px 10px 10px 16px',
            boxShadow: '0 0 0 0px rgba(123,97,255,0)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(123,97,255,0.4)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              placeholder="Paste a job description or describe what you need…"
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                resize: 'none', fontFamily: 'Manrope, sans-serif', fontSize: 14,
                color: 'rgba(255,255,255,0.85)', lineHeight: 1.55,
                maxHeight: 160, overflowY: 'auto',
                placeholder: 'opacity: 0.3',
              }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
            />
            <motion.button
              whileHover={{ scale: isRunning ? 1 : 1.04 }}
              whileTap={{ scale: isRunning ? 1 : 0.95 }}
              onClick={() => handleRun()}
              disabled={isRunning || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: isRunning || !input.trim()
                  ? 'rgba(255,255,255,0.07)'
                  : 'linear-gradient(135deg, #00D1FF, #7B61FF)',
                border: 'none', cursor: isRunning || !input.trim() ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isRunning || !input.trim() ? 'rgba(255,255,255,0.25)' : '#fff',
                fontSize: 16, transition: 'background 0.2s',
              }}
            >
              {isRunning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)' }}
                />
              ) : '↑'}
            </motion.button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '8px 0 0' }}>
            Enter to send · Shift+Enter for new line · Pipeline takes ~15 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
