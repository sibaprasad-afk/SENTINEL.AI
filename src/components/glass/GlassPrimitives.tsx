import { ChevronDown, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export type GlassAccent =
  | 'none'
  | 'emerald'
  | 'cyan'
  | 'purple'
  | 'blue'
  | 'critical'
  | 'warning';

const ACCENT_CLASSES: Record<GlassAccent, string> = {
  none: 'border-white/10 hover:border-white/20',
  emerald: 'glass-glow-emerald hover:border-[#19D6A0]/50',
  cyan: 'glass-glow-cyan hover:border-[#32D9E8]/50',
  purple: 'glass-glow-purple hover:border-[#A879FF]/50',
  blue: 'border-[#4F9BFF]/30 shadow-[0_8px_32px_rgba(0,0,0,0.28),0_0_24px_-10px_rgba(79,155,255,0.3)] hover:border-[#4F9BFF]/50',
  critical:
    'border-[#FF647C]/35 shadow-[0_8px_32px_rgba(0,0,0,0.28),0_0_24px_-10px_rgba(255,100,124,0.28)]',
  warning:
    'border-[#F6BE58]/35 shadow-[0_8px_32px_rgba(0,0,0,0.28),0_0_24px_-10px_rgba(246,190,88,0.25)]',
};

/* 1. GlassCard */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  accent?: GlassAccent;
  elevated?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ children, accent = 'none', elevated = false, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl transition-all duration-200 ${
        elevated ? 'glass-elevated' : 'glass-surface'
      } ${ACCENT_CLASSES[accent]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

/* 2. GlassPanel */
export const GlassPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`rounded-xl border border-white/10 bg-[#090F1E]/65 backdrop-blur-xl ${className}`}
  >
    {children}
  </div>
);

/* 3. GlassButton */
export const GlassButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
  }
> = ({ variant = 'secondary', size = 'md', className = '', children, ...props }) => {
  const variants = {
    primary:
      'bg-[#19D6A0] text-[#050814] font-semibold shadow-[0_0_24px_-4px_rgba(25,214,160,0.5)] hover:bg-[#35D6A0] border border-[#19D6A0]/50',
    secondary:
      'glass-surface text-[#F4F7FF] font-medium hover:bg-[rgba(28,39,62,0.72)] hover:border-[#32D9E8]/40',
    ghost: 'text-[#A5B0C7] hover:text-[#F4F7FF] hover:bg-white/[0.05] border border-transparent',
    danger:
      'border border-[#FF647C]/40 bg-[#FF647C]/12 text-[#FF647C] font-semibold hover:bg-[#FF647C]/20',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-xs sm:text-sm rounded-xl',
    lg: 'px-5 py-3 text-sm rounded-xl',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-55 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19D6A0] ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

/* 4. GlassInput / GlassSelect / GlassTextarea */
export const GlassInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-white/12 bg-[#050814]/70 px-3.5 py-2.5 text-xs sm:text-sm text-[#F4F7FF] placeholder:text-[#77849E] backdrop-blur-md transition-colors focus:border-[#19D6A0] focus:outline-none focus:ring-1 focus:ring-[#19D6A0]/40 ${className}`}
  />
);

export const GlassSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <select
    {...props}
    className={`rounded-xl border border-white/12 bg-[#090F1E]/85 px-3 py-2 text-xs text-[#F4F7FF] backdrop-blur-md transition-colors focus:border-[#19D6A0] focus:outline-none ${className}`}
  >
    {children}
  </select>
);

export const GlassTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  ...props
}) => (
  <textarea
    {...props}
    className={`w-full rounded-xl border border-white/12 bg-[#050814]/70 px-3.5 py-2.5 text-xs sm:text-sm text-[#F4F7FF] placeholder:text-[#77849E] backdrop-blur-md transition-colors focus:border-[#19D6A0] focus:outline-none focus:ring-1 focus:ring-[#19D6A0]/40 ${className}`}
  />
);

/* 5. GlassSearchBar */
export const GlassSearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
}> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  onFocus,
  onBlur,
  onKeyDown,
  ariaLabel,
  ariaExpanded,
  ariaControls,
}) => (
  <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77849E]" />
    <input
      type="text"
      role="searchbox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      className={`w-full rounded-xl border border-white/12 bg-[#090F1E]/75 py-2 pl-10 ${
        value ? 'pr-8' : 'pr-3.5'
      } text-xs text-[#F4F7FF] placeholder:text-[#77849E] backdrop-blur-md transition-colors focus:border-[#32D9E8] focus:outline-none`}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#77849E] transition-colors hover:bg-white/10 hover:text-[#F4F7FF]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

/* 6. GlassBadge */
export const GlassBadge: React.FC<{
  tone?: 'emerald' | 'cyan' | 'purple' | 'blue' | 'warning' | 'critical' | 'neutral';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', icon, children, className = '' }) => {
  const tones = {
    emerald: 'border-[#19D6A0]/35 bg-[#19D6A0]/12 text-[#19D6A0]',
    cyan: 'border-[#32D9E8]/35 bg-[#32D9E8]/12 text-[#32D9E8]',
    purple: 'border-[#A879FF]/35 bg-[#A879FF]/12 text-[#A879FF]',
    blue: 'border-[#4F9BFF]/35 bg-[#4F9BFF]/12 text-[#4F9BFF]',
    warning: 'border-[#F6BE58]/35 bg-[#F6BE58]/12 text-[#F6BE58]',
    critical: 'border-[#FF647C]/35 bg-[#FF647C]/12 text-[#FF647C]',
    neutral: 'border-white/15 bg-white/[0.05] text-[#A5B0C7]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};

/* 7. GlassMetricCard */
export const GlassMetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  trend?: string;
  accent?: 'emerald' | 'cyan' | 'purple' | 'blue' | 'warning' | 'critical';
  icon: React.ReactNode;
  sparkline?: number[];
  delay?: number;
}> = ({
  title,
  value,
  subtitle,
  trend,
  accent = 'emerald',
  icon,
  sparkline,
  delay = 0,
}) => {
  const strokeMap = {
    emerald: '#19D6A0',
    cyan: '#32D9E8',
    purple: '#A879FF',
    blue: '#4F9BFF',
    warning: '#F6BE58',
    critical: '#FF647C',
  };
  const stroke = strokeMap[accent];
  const chartData = (sparkline || [4, 6, 5, 8, 7, 10, 9]).map((v, i) => ({ i, v }));
  const gradId = `spark_${title.replace(/[^a-zA-Z0-9]/g, '')}_${accent}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard accent={accent} className="p-4 sm:p-5 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-[#A5B0C7]">{title}</span>
            <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-semibold text-[#F4F7FF] tabular-nums">
              {value}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-[#090F1E]/80 shrink-0"
            style={{ color: stroke }}
          >
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {trend && (
              <span className="block font-mono text-[11px] font-medium" style={{ color: stroke }}>
                {trend}
              </span>
            )}
            <span className="block truncate text-[11px] text-[#77849E]">{subtitle}</span>
          </div>
          <div className="h-9 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stroke} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={stroke}
                  strokeWidth={1.8}
                  fill={`url(#${gradId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

/* 8. GlassModal */
export const GlassModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050814]/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full ${maxWidth} rounded-2xl glass-elevated p-6`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-lg p-2 text-[#A5B0C7] hover:bg-white/10 hover:text-[#F4F7FF]"
        >
          <X className="h-4 w-4" />
        </button>
        {title && (
          <h2 className="pr-8 font-display text-lg font-semibold text-[#F4F7FF]">{title}</h2>
        )}
        {children}
      </motion.div>
    </div>
  );
};

/* 9. GlassDropdown */
export const GlassDropdown: React.FC<{
  label: string;
  items: Array<{ title: string; subtitle?: string; onClick: () => void }>;
}> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
          open ? 'text-[#19D6A0]' : 'text-[#A5B0C7] hover:text-[#F4F7FF]'
        }`}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl glass-elevated p-2 z-50">
          {items.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="block text-xs font-semibold text-[#F4F7FF]">{item.title}</span>
              {item.subtitle && (
                <span className="mt-0.5 block text-xs text-[#A5B0C7]">{item.subtitle}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* 10. GlassTable */
export const GlassTable: React.FC<{
  headers: Array<{ label: string; align?: 'left' | 'right' }>;
  children: React.ReactNode;
  minWidth?: string;
}> = ({ headers, children, minWidth = 'min-w-[600px]' }) => (
  <div className="overflow-x-auto rounded-2xl glass-surface">
    <table className={`w-full ${minWidth} text-left text-xs`}>
      <thead>
        <tr className="border-b border-white/10 bg-[#090F1E]/75 text-[#A5B0C7]">
          {headers.map((h) => (
            <th
              key={h.label}
              className={`px-4 py-3 font-medium ${h.align === 'right' ? 'text-right' : ''}`}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.07]">{children}</tbody>
    </table>
  </div>
);

/* 11. GlassChart */
export const GlassChart: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  accent?: GlassAccent;
  height?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, action, accent = 'none', height = 'h-64', children }) => (
  <GlassCard accent={accent} className="p-5 flex flex-col">
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
      <div>
        <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[#77849E]">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className={`mt-4 w-full ${height}`}>{children}</div>
  </GlassCard>
);

/* 12. GlassNotification */
export const GlassNotification: React.FC<{
  title: string;
  message: string;
  timestamp: string;
  unread?: boolean;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, message, timestamp, unread = false, badge, actions }) => (
  <GlassCard
    accent={unread ? 'emerald' : 'none'}
    elevated={unread}
    className="p-4 flex flex-wrap items-start justify-between gap-3"
  >
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2.5">
        {badge}
        <span className="font-mono text-[11px] text-[#77849E]">{timestamp}</span>
        {unread && <GlassBadge tone="emerald">Unread</GlassBadge>}
      </div>
      <h3 className="mt-2 font-display text-sm font-semibold text-[#F4F7FF]">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#A5B0C7]">{message}</p>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </GlassCard>
);

/* Shared Recharts Glass Tooltip */
export const GlassChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl glass-elevated px-3.5 py-2.5 text-xs">
      {label && <p className="font-mono text-[11px] text-[#A5B0C7] mb-1.5">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#F4F7FF]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || '#19D6A0' }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-mono font-semibold text-[#F4F7FF] tabular-nums">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
