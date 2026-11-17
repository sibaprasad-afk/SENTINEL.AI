import { onAuthStateChanged } from 'firebase/auth';
import { CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AuthView } from './components/AuthView';
import { LandingPage } from './components/LandingPage';
import { RequestDemoModal } from './components/RequestDemoModal';
import { WorkspaceApp } from './components/WorkspaceApp';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { auth, signOutFirebase } from './lib/firebase';
import type { ClinicianUser } from './types';

export default function App() {
  const [user, setUser] = useState<ClinicianUser | null>(null);
  const [viewMode, setViewMode] = useState<'landing' | 'auth' | 'workspace'>('landing');
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewMetrics, setPreviewMetrics] = useState({
    totalCases: 6,
    awaitingReview: 4,
    highPriority: 4,
    completedReviews: 2,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    void (async () => {
      try {
        const m = await api.getPreviewMetrics();
        setPreviewMetrics({
          totalCases: m.totalCases,
          awaitingReview: m.awaitingReview,
          highPriority: m.highPriority,
          completedReviews: m.completedReviews,
        });
      } catch {
        // Keep initial preview counts
      }
    })();

    const token = getStoredToken();
    if (token) {
      void (async () => {
        try {
          const res = await api.me();
          setUser(res.user);
        } catch {
          setStoredToken(null);
        }
      })();
    }

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !getStoredToken()) {
        try {
          const email = fbUser.email || `${fbUser.uid}@firebase.local`;
          const res = await api.firebaseSession({
            uid: fbUser.uid,
            email,
            name: fbUser.displayName || email.split('@')[0],
            photoUrl: fbUser.photoURL || undefined,
          });
          setStoredToken(res.token);
          setUser(res.user);
        } catch {
          // Non-blocking background session sync
        }
      }
    });

    return () => unsubAuth();
  }, []);

  const handleLaunchDemo = async () => {
    if (user) {
      setViewMode('workspace');
      return;
    }
    setDemoLoading(true);
    try {
      const res = await api.demoLogin();
      setStoredToken(res.token);
      setUser(res.user);
      setViewMode('workspace');
      showToast(`Signed into Clinical Demo as ${res.user.name}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to start demo workspace.');
      setViewMode('auth');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Clear local session regardless
    }
    try {
      await signOutFirebase();
    } catch {
      // Clear Firebase session regardless
    }
    setStoredToken(null);
    setUser(null);
    setViewMode('landing');
    showToast('Signed out of SENTINEL AI workspace.');
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {viewMode === 'workspace' && user ? (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <WorkspaceApp
              user={user}
              onUserUpdated={setUser}
              onLogout={handleLogout}
              onReturnToLanding={() => setViewMode('landing')}
              onToast={showToast}
            />
          </motion.div>
        ) : viewMode === 'auth' ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <AuthView
              onAuthenticated={(loggedUser) => {
                setUser(loggedUser);
                setViewMode('workspace');
                showToast(`Welcome, ${loggedUser.name}`);
              }}
              onBackToLanding={() => setViewMode('landing')}
              onToast={showToast}
            />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <LandingPage
              previewMetrics={previewMetrics}
              onLaunchDemo={handleLaunchDemo}
              onOpenAuth={() => {
                if (user) {
                  setViewMode('workspace');
                } else {
                  setViewMode('auth');
                }
              }}
              onOpenRequestDemo={() => setDemoModalOpen(true)}
              demoLoading={demoLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <RequestDemoModal
        open={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onSuccessToast={showToast}
      />

      {/* Glass Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2.5 rounded-2xl glass-elevated glass-glow-emerald px-4 py-3 text-xs font-medium text-[#F4F7FF]"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 text-[#19D6A0] shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              aria-label="Dismiss notification"
              className="text-[#A5B0C7] hover:text-[#F4F7FF]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
