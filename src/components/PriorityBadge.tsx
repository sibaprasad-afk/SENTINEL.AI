import { AlertOctagon, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import React from 'react';
import type { PriorityLevel, ReviewStatus } from '../types';

export const PriorityLabel: React.FC<{ priority: PriorityLevel; compact?: boolean }> = ({
  priority,
  compact = false,
}) => {
  const config: Record<
    PriorityLevel,
    { label: string; colorClass: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    critical: {
      label: 'Critical',
      colorClass: 'text-[#FF647C]',
      Icon: AlertOctagon,
    },
    high: {
      label: 'High',
      colorClass: 'text-[#F6BE58]',
      Icon: AlertTriangle,
    },
    moderate: {
      label: 'Moderate',
      colorClass: 'text-[#32D9E8]',
      Icon: Clock,
    },
    routine: {
      label: 'Routine',
      colorClass: 'text-[#19D6A0]',
      Icon: CheckCircle2,
    },
  };

  const { label, colorClass, Icon } = config[priority] || config.moderate;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${
        compact ? 'text-xs' : 'text-[13px]'
      } ${colorClass}`}
    >
      <Icon className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
      <span>{label}</span>
    </span>
  );
};

export const ReviewStatusLabel: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  const map: Record<ReviewStatus, { label: string; colorClass: string }> = {
    awaiting_review: { label: 'Awaiting Review', colorClass: 'text-[#F6BE58]' },
    in_review: { label: 'In Review', colorClass: 'text-[#32D9E8]' },
    completed: { label: 'Reviewed', colorClass: 'text-[#35D6A0]' },
    escalated: { label: 'Escalated', colorClass: 'text-[#FF647C]' },
  };
  const item = map[status] || map.awaiting_review;
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${item.colorClass}`}>
      {item.label}
    </span>
  );
};
