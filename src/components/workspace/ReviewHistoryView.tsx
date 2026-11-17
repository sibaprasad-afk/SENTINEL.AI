import { ArrowRight, CheckCircle2, History } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { AuditLogEntry, ClinicalCase } from '../../types';
import { PriorityLabel } from '../PriorityBadge';
import {
  GlassButton,
  GlassCard,
  GlassPanel,
  GlassSelect,
} from '../glass/GlassPrimitives';

export const ReviewHistoryView: React.FC<{
  onOpenCase: (caseId: string) => void;
  onToast: (msg: string) => void;
}> = ({ onOpenCase, onToast }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getAuditLogs();
        setAuditLogs(res.auditLogs);
        setCases(res.cases);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Unable to load review history.');
      }
    })();
  }, []);

  const completedCases = cases.filter((c) => c.reviewStatus === 'completed');
  const filteredLogs =
    actionFilter === 'all'
      ? auditLogs
      : auditLogs.filter((l) => l.actionType === actionFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">
            Review History &amp; Audit Timeline
          </h1>
          <p className="mt-1 text-sm text-[#A5B0C7]">
            Reviewer sign-offs, priority transitions, and immutable clinical provenance records.
          </p>
        </div>

        <GlassSelect
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="Filter audit events"
        >
          <option value="all">All Audit Events</option>
          <option value="image_analysis">Image Analyses</option>
          <option value="dataset_analysis">Dataset Analyses</option>
          <option value="case_reviewed">Clinician Sign-Offs</option>
          <option value="priority_updated">Priority Changes</option>
          <option value="auth_signin">Authentication Events</option>
          <option value="auth_password_reset">Password Resets</option>
        </GlassSelect>
      </div>

      {/* Completed Sign-Offs */}
      <GlassCard accent="emerald" className="p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <CheckCircle2 className="h-4 w-4 text-[#19D6A0]" />
          <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
            Completed Clinician Reviews ({completedCases.length})
          </h2>
        </div>

        {completedCases.length === 0 ? (
          <p className="py-6 text-xs text-[#77849E]">
            No completed reviews logged yet. Sign off cases in the Clinical Queue.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {completedCases.map((c) => (
              <GlassPanel
                key={c.id}
                className="p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-[#32D9E8]">{c.caseCode}</span>
                    <span className="font-medium text-[#F4F7FF]">{c.title}</span>
                    <PriorityLabel priority={c.priority} compact />
                  </div>
                  <p className="mt-1 text-xs text-[#A5B0C7]">
                    Reviewer: {c.reviewedBy || c.assignedClinician}
                    {c.reviewedAt ? ` · ${new Date(c.reviewedAt).toLocaleString()}` : ''}
                    {c.reviewNotes ? ` — "${c.reviewNotes}"` : ''}
                  </p>
                </div>
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenCase(c.id)}
                >
                  Inspect Case
                </GlassButton>
              </GlassPanel>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Glass Activity Timeline */}
      <GlassCard accent="cyan" className="p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <History className="h-4 w-4 text-[#32D9E8]" />
          <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
            Clinical Audit Timeline
          </h2>
        </div>

        <div className="mt-4 space-y-4 border-l border-white/15 pl-5">
          {filteredLogs.map((log) => (
            <GlassPanel key={log.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-[#F4F7FF]">{log.actorName}</span>
                  <span className="text-[#77849E]" aria-hidden="true">·</span>
                  <span className="text-[#32D9E8]">{log.actorRole}</span>
                  <span className="text-[#77849E]" aria-hidden="true">·</span>
                  <span className="font-mono text-[11px] text-[#A879FF]">
                    {log.actionType.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#77849E]">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-[#32D9E8]">{log.targetLabel}</span>
                {log.previousPriority && log.updatedPriority && (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <PriorityLabel priority={log.previousPriority} compact />
                    <ArrowRight className="h-3 w-3 text-[#77849E]" />
                    <PriorityLabel priority={log.updatedPriority} compact />
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-[#A5B0C7]">{log.details}</p>
            </GlassPanel>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
