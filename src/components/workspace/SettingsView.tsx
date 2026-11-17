import { Bell, KeyRound, Lock, Save, Shield, UserCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { ClinicianUser, WorkflowSettings } from '../../types';
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassPanel,
} from '../glass/GlassPrimitives';

export const SettingsView: React.FC<{
  user: ClinicianUser;
  onUserUpdated: (user: ClinicianUser) => void;
  onToast: (msg: string) => void;
}> = ({ user, onUserUpdated, onToast }) => {
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [profileName, setProfileName] = useState(user.name);
  const [profileRole, setProfileRole] = useState(user.role);
  const [profileDepartment, setProfileDepartment] = useState(user.department);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getSettings();
        setSettings(res.settings);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Unable to load settings.');
      }
    })();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({
        name: profileName,
        role: profileRole,
        department: profileDepartment,
      });
      onUserUpdated(res.user);
      onToast('Clinician profile updated.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      onToast('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.resetPassword(user.email, newPassword);
      setNewPassword('');
      onToast(res.message);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      onToast('Workflow, notification, and privacy preferences saved.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="h-64 animate-pulse rounded-2xl glass-surface" />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-white/10 pb-4">
        <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">Settings &amp; Governance</h1>
        <p className="mt-1 text-sm text-[#A5B0C7]">
          Profile management, security controls, notification preferences, role permissions, and
          data privacy settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Profile Settings */}
        <GlassCard accent="cyan" className="lg:col-span-7 p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <UserCheck className="h-4 w-4 text-[#32D9E8]" />
            <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">Profile Settings</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Clinician Name</label>
              <GlassInput
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">Clinical Role</label>
                <GlassInput
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">Department</label>
                <GlassInput
                  value={profileDepartment}
                  onChange={(e) => setProfileDepartment(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xs text-[#77849E]">{user.email}</span>
              <GlassButton type="submit" variant="primary" size="sm" disabled={saving}>
                <Save className="h-3.5 w-3.5" />
                <span>Update Profile</span>
              </GlassButton>
            </div>
          </form>
        </GlassCard>

        {/* 2. Security Settings & Password Reset */}
        <GlassCard accent="purple" className="lg:col-span-5 p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <KeyRound className="h-4 w-4 text-[#A879FF]" />
            <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
              Security &amp; Account Management
            </h2>
          </div>
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">
                Rotate Session Password
              </label>
              <GlassInput
                type="password"
                minLength={6}
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#A5B0C7]">
              <span>Session Timeout</span>
              <span className="font-mono text-[#32D9E8]">
                {settings.sessionTimeoutMinutes || 60} mins
              </span>
            </div>
            <GlassButton type="submit" variant="secondary" size="sm" disabled={saving} className="w-full">
              <Lock className="h-3.5 w-3.5 text-[#A879FF]" />
              <span>Update Credentials</span>
            </GlassButton>
          </form>
        </GlassCard>
      </div>

      {/* 3. User Preferences, Notification Preferences & Data Privacy */}
      <form onSubmit={handleSaveSettings}>
        <GlassCard accent="emerald" className="p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#19D6A0]" />
              <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                Workflow, Notification &amp; Privacy Preferences
              </h2>
            </div>
            <span className="font-mono text-xs text-[#32D9E8]">
              {settings.providerEngineLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassPanel className="p-4">
              <label className="block text-xs font-medium text-[#A5B0C7]">
                Critical Queue Threshold ({settings.criticalConfidenceThreshold}%)
              </label>
              <input
                type="range"
                min={70}
                max={98}
                value={settings.criticalConfidenceThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    criticalConfidenceThreshold: Number(e.target.value),
                  })
                }
                className="mt-2.5 w-full accent-[#19D6A0]"
              />
            </GlassPanel>

            <GlassPanel className="p-4">
              <label className="block text-xs font-medium text-[#A5B0C7]">
                High Queue Threshold ({settings.highConfidenceThreshold}%)
              </label>
              <input
                type="range"
                min={55}
                max={90}
                value={settings.highConfidenceThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    highConfidenceThreshold: Number(e.target.value),
                  })
                }
                className="mt-2.5 w-full accent-[#32D9E8]"
              />
            </GlassPanel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                key: 'autoFlagSuboptimalQuality' as const,
                title: 'Auto-Flag Suboptimal Quality',
                desc: 'Highlight motion artifact, crop, or missingness warnings automatically.',
              },
              {
                key: 'requireSecondReadForCritical' as const,
                title: 'Human Oversight Lock on Critical',
                desc: 'Require explicit attending sign-off before clearing critical cases.',
              },
              {
                key: 'criticalDesktopAlerts' as const,
                title: 'Priority Signal Notifications',
                desc: 'Generate workspace alerts when Critical or High cues are detected.',
              },
              {
                key: 'anonymizeExports' as const,
                title: 'De-Identify Analytics Exports',
                desc: 'Strip patient identifiers when exporting cohort metrics.',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#090F1E]/70 p-3.5 cursor-pointer hover:border-white/20"
              >
                <div>
                  <span className="block text-xs font-semibold text-[#F4F7FF]">{item.title}</span>
                  <span className="block text-[11px] text-[#A5B0C7] mt-0.5">{item.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings[item.key])}
                  onChange={(e) =>
                    setSettings({ ...settings, [item.key]: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#19D6A0]"
                />
              </label>
            ))}
          </div>

          {/* Role & Permissions Matrix */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-[#32D9E8]" />
              <h3 className="text-xs font-semibold text-[#F4F7FF]">
                Active Role &amp; Governance Permissions
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <GlassBadge tone="emerald">Imaging Ingestion: Enabled</GlassBadge>
              <GlassBadge tone="cyan">Dataset Stratification: Enabled</GlassBadge>
              <GlassBadge tone="purple">Priority Override: Authorized</GlassBadge>
              <GlassBadge tone="blue">Clinical Sign-Off: Authorized</GlassBadge>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/10">
            <GlassButton type="submit" variant="primary" disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </GlassButton>
          </div>
        </GlassCard>
      </form>
    </div>
  );
};
