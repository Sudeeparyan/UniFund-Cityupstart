import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DeveloperLoginPage from './pages/DeveloperLoginPage';
import { guestLogin, getMe, saveOnboarding } from './lib/api';

const OnboardingPage  = lazy(() => import('./pages/OnboardingPage'));
const ChatbotPage     = lazy(() => import('./pages/ChatbotPage'));
const AgenticWebPage  = lazy(() => import('./pages/AgenticWebPage'));
const CommunityPage   = lazy(() => import('./pages/CommunityPage'));
const TimelinePage    = lazy(() => import('./pages/TimelinePage'));
const RunwayPage      = lazy(() => import('./pages/RunwayPage'));
const DeveloperPage   = lazy(() => import('./pages/DeveloperPage'));

function PageLoader() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#02030A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(123,97,255,0.2)', borderTopColor: '#7B61FF', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Bottom navigation bar ─────────────────────────────────────────────────────

const BOTTOM_NAV = [
  { key: 'runway',    label: 'Runway'    },
  { key: 'web',       label: 'Web'       },
  { key: 'chatbot',   label: 'Chatbot'   },
  { key: 'community', label: 'Community' },
];

function BottomNav({ active, onNavigate }) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      style={{
        position: 'fixed',
        bottom: 36,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: '#12121e',
        borderRadius: 100,
        padding: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        boxShadow: '0 12px 48px rgba(0,0,0,0.65), 0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.09)',
        whiteSpace: 'nowrap',
        fontFamily: 'Manrope, sans-serif',
      }}>
      {BOTTOM_NAV.map(item => {
        const isActive = active === item.key;
        return (
          <motion.button key={item.key} onClick={() => onNavigate(item.key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            style={{
              position: 'relative',
              padding: '11px 24px',
              borderRadius: 100,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#0d0d18' : 'rgba(255,255,255,0.52)',
              background: 'transparent',
              transition: 'color 0.18s',
              zIndex: 1,
            }}>
            {isActive && (
              <motion.div layoutId="nav-active"
                style={{
                  position: 'absolute', inset: 0,
                  borderRadius: 100,
                  background: 'white',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
            )}
            {item.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ── Transition bridge (onboarding → web) ──────────────────────────────────────

function TransitionBridge({ phase }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'idle' ? 0 : 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, background: '#02030A', pointerEvents: 'none' }}
    >
      <motion.div
        animate={
          phase === 'shrink-in'  ? { scale: 1, opacity: 1 }
          : phase === 'shrink-out' ? { scale: 0.0, opacity: 0 }
          : { scale: 0, opacity: 0 }
        }
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: 200, height: 200, borderRadius: '50%', position: 'relative' }}
      >
        <div style={{ position: 'absolute', inset: -40, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,97,255,0.35) 0%, rgba(0,209,255,0.15) 50%, transparent 75%)',
          filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #7B61FF, #00D1FF)',
          filter: 'blur(2px)' }} />
        <div style={{ position: 'absolute', inset: 12, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(180,160,255,0.7) 50%, transparent 80%)' }} />
        <div style={{ position: 'absolute', inset: '35%', borderRadius: '50%',
          background: 'white', boxShadow: '0 0 40px 20px rgba(255,255,255,0.6)' }} />
      </motion.div>
    </motion.div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

const MAIN_TABS = ['runway', 'web', 'chatbot', 'community'];

export default function App() {
  const isDeveloperRoute = window.location.pathname === '/developer';
  // page: 'onboarding' | 'transitioning' | 'web' | 'chatbot' | 'community' | 'timeline' | 'runway' | 'developer-login' | 'developer'
  // Start directly at onboarding — no login required. Guest token obtained silently.
  const [page, setPage] = useState(isDeveloperRoute ? 'developer-login' : 'onboarding');
  const [bridgePhase, setBridgePhase] = useState('idle');
  const [isExiting, setIsExiting] = useState(false);
  const [userName, setUserName] = useState('USER');
  const [simulationData, setSimulationData] = useState(null);
  const [simulationKnowledgeCount, setSimulationKnowledgeCount] = useState(null);
  const [chatbotCompleteTarget, setChatbotCompleteTarget] = useState('web');

  // Silently obtain a guest token so all API calls work without login
  useEffect(() => {
    if (isDeveloperRoute) return;
    async function ensureToken() {
      const existing = localStorage.getItem('unifund_token');
      if (existing) {
        try {
          const user = await getMe();
          if (user?.name) setUserName(user.name.toUpperCase());
          return;
        } catch {
          localStorage.removeItem('unifund_token');
        }
      }
      try {
        const { access_token, name } = await guestLogin();
        localStorage.setItem('unifund_token', access_token);
        if (name) setUserName(name.toUpperCase());
      } catch (e) {
        console.warn('Guest login failed — backend may be down:', e.message);
      }
    }
    ensureToken();
  }, []);

  async function handleEnter(answers) {
    if (answers) {
      saveOnboarding(answers).catch(e => console.warn('Could not save onboarding:', e));
    }
    setIsExiting(true);
    setBridgePhase('shrink-in');
    setPage('transitioning');
    setTimeout(() => setBridgePhase('shrink-out'), 400);
    setTimeout(() => setBridgePhase('hold'), 800);
    setTimeout(() => { setPage('web'); setBridgePhase('idle'); setIsExiting(false); }, 1000);
  }

  const showBottomNav = MAIN_TABS.includes(page);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#02030A' }}>
      <AnimatePresence mode="wait">

        {(page === 'onboarding' || page === 'transitioning') && (
          <motion.div key="onboarding" initial={{ opacity: 1 }} animate={{ opacity: isExiting ? 0 : 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: 'easeIn' }} style={{ position: 'absolute', inset: 0 }}>
            <Suspense fallback={<PageLoader />}>
              <OnboardingPage onEnter={handleEnter} />
            </Suspense>
          </motion.div>
        )}

        {page === 'developer-login' && (
          <motion.div key="developer-login" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.4 }} style={{ position:'absolute', inset:0 }}>
            <DeveloperLoginPage onSuccess={() => setPage('developer')} />
          </motion.div>
        )}

        {page === 'web' && (
          <motion.div key="web" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.5, delay:0.1 }} style={{ position:'absolute', inset:0, paddingBottom:88 }}>
            <Suspense fallback={<PageLoader />}>
              <AgenticWebPage
                userName={userName}
                onNavigateCommunity={() => setPage('community')}
                onNavigateChatbot={() => { setChatbotCompleteTarget('web'); setPage('chatbot'); }}
                onNavigateRunway={() => setPage('runway')}
                onNavigateDeveloper={() => setPage('developer')}
                onNavigateTimeline={(data, kCount) => {
                  setSimulationData(data || null);
                  setSimulationKnowledgeCount(kCount ?? null);
                  setPage('timeline');
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {page === 'chatbot' && (
          <motion.div key="chatbot" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.35 }} style={{ position:'absolute', inset:0, paddingBottom:88 }}>
            <Suspense fallback={<PageLoader />}>
              <ChatbotPage
                userName={userName}
                onComplete={() => setPage(chatbotCompleteTarget)}
                onSkip={() => setPage(chatbotCompleteTarget)}
                onHome={() => setPage('web')}
              />
            </Suspense>
          </motion.div>
        )}

        {page === 'community' && (
          <motion.div key="community" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.35 }} style={{ position:'absolute', inset:0, paddingBottom:88 }}>
            <Suspense fallback={<PageLoader />}>
              <CommunityPage
                userName={userName}
                onBack={() => setPage('web')}
                onHome={() => setPage('web')}
              />
            </Suspense>
          </motion.div>
        )}

        {page === 'runway' && (
          <motion.div key="runway" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.35 }} style={{ position:'absolute', inset:0, paddingBottom:88 }}>
            <Suspense fallback={<PageLoader />}>
              <RunwayPage userName={userName} />
            </Suspense>
          </motion.div>
        )}

        {page === 'timeline' && (
          <motion.div key="timeline" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.5 }} style={{ position:'absolute', inset:0 }}>
            <Suspense fallback={<PageLoader />}>
              <TimelinePage
                simulationData={simulationData}
                knowledgeCount={simulationKnowledgeCount}
                onBack={() => setPage('web')}
                onChatbot={() => { setChatbotCompleteTarget('web'); setPage('chatbot'); }}
              />
            </Suspense>
          </motion.div>
        )}

        {page === 'developer' && (
          <motion.div key="developer" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.5 }} style={{ position:'absolute', inset:0 }}>
            <Suspense fallback={<PageLoader />}>
              <DeveloperPage onBack={() => setPage('web')} />
            </Suspense>
          </motion.div>
        )}

      </AnimatePresence>

      {showBottomNav && <BottomNav active={page} onNavigate={setPage} />}

      <TransitionBridge phase={bridgePhase} />
    </div>
  );
}
