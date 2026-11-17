import { ArrowLeft, ArrowRight, KeyRound, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { api, setStoredToken } from '../lib/api';
import { signInWithGoogleFirebase, syncUserProfileToFirestore } from '../lib/firebase';
import type { ClinicianUser } from '../types';
import { AmbientBackground } from './AmbientBackground';
import { HeartHologram } from './HeartHologram';
import { SentinelLogo } from './SentinelLogo';
import { GlassButton, GlassCard, GlassInput } from './glass/GlassPrimitives';

type AuthMode = 'login' | 'register' | 'reset';

interface AuthViewProps {
  initialMode?: AuthMode;
  onAuthenticated: (user: ClinicianUser) => void;
  onBackToLanding: () => void;
  onToast: (msg: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onAuthenticated,
  onBackToLanding,
  onToast,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('dr.sarah.chen@sentinel-clinical.org');
  const [password, setPassword] = useState('SentinelDemo2026!');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Attending Physician');
  const [department, setDepartment] = useState('Cardiothoracic Intelligence');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.demoLogin();
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start demo session.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const fbUser = await signInWithGoogleFirebase();
      const email = fbUser.email || `${fbUser.uid}@firebase.local`;
      const displayName = fbUser.displayName || email.split('@')[0];

      if (fbUser.emailVerified) {
        await syncUserProfileToFirestore({
          uid: fbUser.uid,
          displayName,
          email,
          photoUrl: fbUser.photoURL,
        });
      }

      const res = await api.firebaseSession({
        uid: fbUser.uid,
        email,
        name: displayName,
        photoUrl: fbUser.photoURL || undefined,
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In was cancelled or could not be completed.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetNotice(null);
    try {
      if (mode === 'reset') {
        const res = await api.resetPassword(email, newPassword);
        setResetNotice(res.message);
        onToast(res.message);
        setMode('login');
        setPassword(newPassword);
        setNewPassword('');
        return;
      }
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register({ name, email, password, role, department });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between px-4 py-6 sm:px-8 overflow-x-hidden">
      <AmbientBackground variant="auth" />

      {/* Top Return Bar */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-[rgba(19,29,49,0.58)] px-3.5 py-2 text-xs font-medium text-[#A5B0C7] backdrop-blur-xl hover:border-[#32D9E8]/40 hover:text-[#F4F7FF] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Public Site</span>
        </button>
        <SentinelLogo />
      </div>

      {/* Centered Split Glass Authentication Stage */}
      <div className="relative z-10 mx-auto my-8 grid w-full max-w-6xl grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Animated Medical Hologram Panel */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block lg:col-span-6 space-y-5"
        >
          <GlassCard accent="cyan" className="p-5">
            <HeartHologram />
          </GlassCard>
          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#19D6A0]">
                <ShieldCheck className="h-4 w-4" />
                <span>Role-Based Governance</span>
              </div>
              <p className="mt-1.5 text-xs text-[#A5B0C7]">
                Scoped clinician sessions with immutable audit provenance on every review.
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#32D9E8]">
                <Lock className="h-4 w-4" />
                <span>Human-Led Oversight</span>
              </div>
              <p className="mt-1.5 text-xs text-[#A5B0C7]">
                Clinical signals support triage prioritization without autonomous diagnosis.
              </p>
            </GlassCard>
          </div>
        </motion.div>

        {/* Right: Centered Glass Authentication Panel */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 w-full max-w-md mx-auto"
        >
          <GlassCard elevated accent="emerald" className="p-6 sm:p-8">
            <p className="text-xs font-medium text-[#32D9E8]">Clinician Portal</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#F4F7FF]">
              {mode === 'login'
                ? 'Access Clinical Workspace'
                : mode === 'register'
                  ? 'Register Clinician Profile'
                  : 'Reset Clinician Password'}
            </h1>
            <p className="mt-1.5 text-xs text-[#A5B0C7]">
              {mode === 'reset'
                ? 'Verify your registered email address and set a new session password.'
                : 'Authenticate to review prioritized medical imaging and clinical datasets.'}
            </p>

            {/* Google Sign-In via Firebase Auth */}
            <div className="mt-5 space-y-2.5">
              <GlassButton
                type="button"
                variant="secondary"
                disabled={loading || googleLoading}
                onClick={handleGoogleLogin}
                className="w-full py-2.5 border-[#32D9E8]/35 hover:border-[#32D9E8]/70 bg-[#090F1E]/80"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45c-.28 1.48-1.12 2.74-2.38 3.58v2.98h3.85c2.25-2.07 3.57-5.13 3.57-8.59z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.85-2.98c-1.07.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.3v3.08C3.27 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.3a7.17 7.17 0 0 1 0-4.6V6.62H1.3a12 12 0 0 0 0 10.76l3.97-3.08z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.74c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.27 2.7 1.3 6.62l3.97 3.08c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>
                  {googleLoading ? 'Connecting Google Account...' : 'Sign in with Google'}
                </span>
              </GlassButton>

              {/* 1-Click Instant Demo Session */}
              <div className="rounded-xl border border-[#19D6A0]/35 bg-[#090F1E]/75 p-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#F4F7FF]">Instant Clinical Demo</p>
                  <p className="mt-0.5 text-[11px] text-[#A5B0C7]">
                    Dr. Sarah Chen, MD · Synthetic Cohort
                  </p>
                </div>
                <GlassButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={loading || googleLoading}
                  onClick={handleDemoLogin}
                >
                  <span>Launch</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </GlassButton>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#050814]/70 p-1">
              {(
                [
                  { id: 'login', label: 'Sign In' },
                  { id: 'register', label: 'Register' },
                  { id: 'reset', label: 'Reset' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setError(null);
                  }}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    mode === tab.id
                      ? 'bg-[rgba(28,39,62,0.85)] text-[#19D6A0] border border-[#19D6A0]/30'
                      : 'text-[#A5B0C7] hover:text-[#F4F7FF]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-[#FF647C]/40 bg-[#FF647C]/12 px-3.5 py-2.5 text-xs text-[#FF647C]">
                {error}
              </div>
            )}

            {resetNotice && (
              <div className="mt-4 rounded-xl border border-[#19D6A0]/40 bg-[#19D6A0]/12 px-3.5 py-2.5 text-xs text-[#19D6A0]">
                {resetNotice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#A5B0C7]">
                      Full Name &amp; Title
                    </label>
                    <GlassInput
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Alex Rivera, MD"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-[#A5B0C7]">Role</label>
                      <GlassInput
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#A5B0C7]">Department</label>
                      <GlassInput
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">Work Email</label>
                <GlassInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              {mode === 'reset' ? (
                <div>
                  <label className="block text-xs font-medium text-[#A5B0C7]">
                    New Password (min 6 characters)
                  </label>
                  <GlassInput
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-[#A5B0C7]">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('reset')}
                        className="text-[11px] text-[#32D9E8] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <GlassInput
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              <GlassButton
                type="submit"
                variant="secondary"
                disabled={loading}
                className="w-full py-2.5 mt-2 border-[#19D6A0]/35 hover:border-[#19D6A0]/70"
              >
                {mode === 'login' ? (
                  <>
                    <Lock className="h-4 w-4 text-[#19D6A0]" />
                    <span>{loading ? 'Authenticating...' : 'Sign In with Credentials'}</span>
                  </>
                ) : mode === 'register' ? (
                  <>
                    <UserPlus className="h-4 w-4 text-[#32D9E8]" />
                    <span>{loading ? 'Creating Profile...' : 'Create Clinician Account'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 text-[#A879FF]" />
                    <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
                  </>
                )}
              </GlassButton>
            </form>
          </GlassCard>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl text-center text-xs text-[#77849E]">
        SENTINEL AI Clinical Intelligence Platform · Decision-Support Environment
      </div>
    </div>
  );
};
