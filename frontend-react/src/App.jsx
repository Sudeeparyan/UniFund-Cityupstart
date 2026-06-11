import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { guestLogin, saveOnboarding } from './lib/api';

const OnboardingPage  = lazy(() => import('./pages/OnboardingPage'));
const ChatbotPage     = lazy(() => import('./pages/ChatbotPage'));
const AgenticWebPage  = lazy(() => import('./pages/AgenticWebPage'));
const CommunityPage   = lazy(() => import('./pages/CommunityPage'));
const TimelinePage    = lazy(() => import('./pages/TimelinePage'));
const RunwayPage      = lazy(() => import('./pages/RunwayPage'));

function PageLoader() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#02030A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(123,97,255,0.2)', borderTopColor: '#7B61FF', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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
          phase === 'shrink-in'
            ? { scale: 1, opacity: 1 }
            : phase === 'shrink-out'
            ? { scale: 0.0, opacity: 0 }
            : { scale: 0, opacity: 0 }
        }
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: 200, height: 200, borderRadius: '50%', position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -40,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(123,97,255,0.35) 0%, rgba(0,209,255,0.15) 50%, transparent 75%)',
            filter: 'blur(20px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'conic-gradient(from 200deg, #00D1FF, #7B61FF, #FF5FB6, #7B61FF, #00D1FF)',
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(180,160,255,0.7) 50%, transparent 80%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '35%',
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 0 40px 20px rgba(255,255,255,0.6)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  // page: 'login' | 'signup' | 'chatbot' | 'onboarding' | 'transitioning' | 'agentic' | 'community' | 'timeline' | 'runway'
  // Auth skipped — start directly at onboarding
  const [page, setPage] = useState('onboarding');
  const [bridgePhase, setBridgePhase] = useState('idle');
  const [isExiting, setIsExiting] = useState(false);
  const [userName, setUserName] = useState('USER');
  const [authUser, setAuthUser] = useState(null);
  const [simulationData, setSimulationData] = useState(null);
  const [simulationKnowledgeCount, setSimulationKnowledgeCount] = useState(null);
  // Where chatbot should return after completion (onboarding for new users, agentic for returning)
  const [chatbotCompleteTarget, setChatbotCompleteTarget] = useState('onboarding');

  // Auto-obtain a guest token so all protected API calls work without real auth
  useEffect(() => {
    async function ensureToken() {
      const existing = localStorage.getItem('unimind_token');
      if (existing) {
        // Verify it still works; if not, refresh it
        try {
          const { getMe } = await import('./lib/api');
          await getMe();
          return;
        } catch {
          localStorage.removeItem('unimind_token');
        }
      }
      try {
        const { access_token, name } = await guestLogin();
        localStorage.setItem('unimind_token', access_token);
        if (name) setUserName(name.toUpperCase());
      } catch (e) {
        console.warn('Guest login failed — backend may be down:', e.message);
      }
    }
    ensureToken();
  }, []);

  // Auth skipped — these handlers are unused but kept for future re-enable
  function handleLoginSuccess(user) {
    setAuthUser(user);
    setUserName(user.name.toUpperCase());
    setPage(user.onboarding_complete ? 'agentic' : 'onboarding');
  }

  function handleSignupSuccess(user) {
    setAuthUser(user);
    setUserName(user.name.toUpperCase());
    setChatbotCompleteTarget('onboarding');
    setPage('chatbot');
  }

  async function handleEnter(answers) {
    // Save onboarding answers to backend (non-blocking)
    if (answers) {
      saveOnboarding(answers).catch(e => console.warn('Could not save onboarding:', e));
    }

    setIsExiting(true);
    setBridgePhase('shrink-in');
    setPage('transitioning');

    setTimeout(() => setBridgePhase('shrink-out'), 400);
    setTimeout(() => setBridgePhase('hold'), 800);
    setTimeout(() => {
      setPage('agentic');
      setBridgePhase('idle');
      setIsExiting(false);
    }, 1000);
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#02030A' }}>
      <AnimatePresence>
        {/* Auth skipped — login/signup pages commented out
        {page === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} style={{ position: 'absolute', inset: 0 }}>
            <LoginPage onLoginSuccess={handleLoginSuccess} onGoSignup={() => setPage('signup')} />
          </motion.div>
        )}
        {page === 'signup' && (
          <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} style={{ position: 'absolute', inset: 0 }}>
            <SignupPage onSignupSuccess={handleSignupSuccess} onGoLogin={() => setPage('login')} />
          </motion.div>
        )}
        */}

        {page === 'chatbot' && (
          <motion.div
            key="chatbot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={<PageLoader />}>
              <ChatbotPage
                userName={userName}
                onComplete={() => setPage(chatbotCompleteTarget)}
                onSkip={() => setPage(chatbotCompleteTarget === 'onboarding' ? 'agentic' : chatbotCompleteTarget)}
                onHome={() => setPage('agentic')}
              />
            </Suspense>
          </motion.div>
        )}

        {(page === 'onboarding' || page === 'transitioning') && (
          <motion.div
            key="page1"
            initial={{ opacity: 1 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeIn' }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={<PageLoader />}>
              <OnboardingPage onEnter={handleEnter} />
            </Suspense>
          </motion.div>
        )}

        {page === 'agentic' && (
          <motion.div
            key="page2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={<PageLoader />}>
              <AgenticWebPage
                userName={userName}
                onNavigateCommunity={() => setPage('community')}
                onNavigateChatbot={() => setPage('chatbot')}
                onNavigateRunway={() => setPage('runway')}
                onNavigateTimeline={(data, kCount) => {
                  setSimulationData(data || null);
                  setSimulationKnowledgeCount(kCount ?? null);
                  setPage('timeline');
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {page === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={<PageLoader />}>
              <TimelinePage
                simulationData={simulationData}
                knowledgeCount={simulationKnowledgeCount}
                onBack={() => setPage('agentic')}
                onChatbot={() => {
                  setChatbotCompleteTarget('agentic');
                  setPage('chatbot');
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {page === 'community' && (
          <motion.div
            key="community"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={<PageLoader />}>
              <CommunityPage
                userName={userName}
                onBack={() => setPage('agentic')}
                onHome={() => setPage('agentic')}
              />
            </Suspense>
          </motion.div>
        )}

        {page === 'runway' && (
          <motion.div
            key="runway"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={<PageLoader />}>
              <RunwayPage
                userName={userName}
                onBack={() => setPage('agentic')}
                onHome={() => setPage('agentic')}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <TransitionBridge phase={bridgePhase} />
    </div>
  );
}
