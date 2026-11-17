import { CheckCircle2 } from 'lucide-react';
import React, { useState } from 'react';
import { api } from '../lib/api';
import { GlassButton, GlassInput, GlassModal, GlassTextarea } from './glass/GlassPrimitives';

interface RequestDemoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

export const RequestDemoModal: React.FC<RequestDemoModalProps> = ({
  open,
  onClose,
  onSuccessToast,
}) => {
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Chief Medical Information Officer');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.submitDemoRequest({ fullName, organization, email, role, notes });
      setSubmitted(true);
      onSuccessToast('Clinical demonstration request logged.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <GlassModal
      open={open}
      onClose={resetAndClose}
      title={submitted ? undefined : 'Request Clinical Platform Demo'}
    >
      {submitted ? (
        <div className="py-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#19D6A0]" />
          <h3 className="mt-3 font-display text-xl font-semibold text-[#F4F7FF]">
            Demonstration Request Logged
          </h3>
          <p className="mt-2 text-sm text-[#A5B0C7]">
            Thank you, {fullName}. Our clinical implementation team will coordinate a tailored
            walkthrough for {organization}.
          </p>
          <GlassButton variant="primary" onClick={resetAndClose} className="mt-6">
            Return to SENTINEL AI
          </GlassButton>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs sm:text-sm text-[#A5B0C7]">
            Schedule a guided clinical workflow evaluation with your imaging and dataset cohorts.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-[#FF647C]/40 bg-[#FF647C]/12 px-3 py-2 text-xs text-[#FF647C]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">Full Name</label>
                <GlassInput
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Jordan Patel"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">
                  Health System / Org
                </label>
                <GlassInput
                  type="text"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Metro Heart Institute"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">Work Email</label>
                <GlassInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="j.patel@hospital.org"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">Primary Role</label>
                <GlassInput
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">
                Clinical Modalities &amp; Review Priorities (Optional)
              </label>
              <GlassTextarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Chest radiographs, cardiac MRI perfusion triage, or ICU biomarker datasets..."
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <GlassButton type="button" variant="ghost" onClick={resetAndClose}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </GlassButton>
            </div>
          </form>
        </>
      )}
    </GlassModal>
  );
};
