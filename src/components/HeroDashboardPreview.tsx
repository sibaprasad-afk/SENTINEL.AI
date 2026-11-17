import {
  Activity,
  BarChart3,
  CheckCircle2,
  Database,
  FileSearch,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { HeartHologram, type HeartHotspot } from './HeartHologram';
import { PriorityLabel } from './PriorityBadge';
import { GlassButton, GlassCard, GlassPanel } from './glass/GlassPrimitives';

type PreviewTab =
  | 'Overview'
  | 'Clinical Queue'
  | 'Image Analysis'
  | 'Dataset Analysis'
  | 'Patient Records'
  | 'Analytics';

interface HeroDashboardPreviewProps {
  metrics: {
    totalCases: number;
    awaitingReview: number;
    highPriority: number;
    completedReviews: number;
  };
  onLaunchDemo: () => void;
}

const SIDEBAR_ITEMS: Array<{
  label: PreviewTab;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { label: 'Overview', Icon: LayoutDashboard },
  { label: 'Clinical Queue', Icon: Layers },
  { label: 'Image Analysis', Icon: FileSearch },
  { label: 'Dataset Analysis', Icon: Database },
  { label: 'Patient Records', Icon: Users },
  { label: 'Analytics', Icon: BarChart3 },
];

const PREVIEW_TREND = [
  { d: 'M', img: 12, ds: 5 },
  { d: 'T', img: 18, ds: 8 },
  { d: 'W', img: 15, ds: 11 },
  { d: 'T', img: 24, ds: 13 },
  { d: 'F', img: 22, ds: 16 },
  { d: 'S', img: 29, ds: 19 },
];

export const HeroDashboardPreview: React.FC<HeroDashboardPreviewProps> = ({
  metrics,
  onLaunchDemo,
}) => {
  const [activeTab, setActiveTab] = useState<PreviewTab>('Overview');
  const [selectedSpot, setSelectedSpot] = useState<HeartHotspot | null>(null);

  const signalLabel = selectedSpot ? selectedSpot.label : 'LAD Perfusion Asymmetry';
  const confidenceValue = selectedSpot?.id === 'aortic' ? 96 : selectedSpot?.id === 'lv' ? 89 : 94;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full"
    >
      {/* Multi-spectrum atmospheric backlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-5 rounded-3xl opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 35% 30%, rgba(25, 214, 160, 0.22), transparent 55%), radial-gradient(circle at 78% 70%, rgba(168, 121, 255, 0.20), transparent 55%), radial-gradient(circle at 55% 50%, rgba(50, 217, 232, 0.14), transparent 65%)',
        }}
      />

      {/* Tilted glass dashboard on desktop (lg+), flat stacked on mobile/tablet */}
      <div className="relative rounded-2xl glass-elevated glass-glow-cyan transition-transform duration-500 ease-out lg:[transform:perspective(1550px)_rotateY(-7deg)_rotateX(2.5deg)] lg:hover:[transform:perspective(1550px)_rotateY(-3deg)_rotateX(1deg)]">
        <div className="grid grid-cols-1 md:grid-cols-[158px_1fr] overflow-hidden rounded-2xl">
          {/* A. LEFT MINI GLASS SIDEBAR */}
          <aside className="flex flex-row md:flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 bg-[rgba(9,15,30,0.75)] backdrop-blur-xl p-3">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible w-full">
              <div className="hidden md:flex items-center justify-between px-2 pb-2.5 mb-1.5 border-b border-white/10">
                <span className="font-display text-xs font-semibold tracking-tight text-[#F4F7FF]">
                  SENTINEL <span className="text-[#19D6A0]">AI</span>
                </span>
                <span className="font-mono text-[10px] text-[#32D9E8]">DEMO</span>
              </div>
              {SIDEBAR_ITEMS.map(({ label, Icon }) => {
                const active = activeTab === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveTab(label)}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#19D6A0]/16 text-[#19D6A0] border border-[#19D6A0]/35 shadow-[0_0_16px_-6px_rgba(25,214,160,0.6)]'
                        : 'text-[#A5B0C7] hover:text-[#F4F7FF] hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block pt-3 border-t border-white/10">
              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                onClick={onLaunchDemo}
                className="w-full"
              >
                Open Workspace
              </GlassButton>
            </div>
          </aside>

          {/* MAIN PREVIEW CONTENT */}
          <div className="flex flex-col gap-3 p-3.5 sm:p-4 bg-[rgba(11,17,34,0.52)]">
            {/* B. TOP HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div>
                <h2 className="font-display text-sm sm:text-base font-semibold text-[#F4F7FF]">
                  Good morning, Dr. Sarah
                </h2>
                <p className="text-xs text-[#A5B0C7]">
                  Here&apos;s your clinical intelligence overview.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#A5B0C7]">
                <span className="text-[#32D9E8]">Synthetic Demo View</span>
                <span aria-hidden="true">·</span>
                <span>{activeTab}</span>
              </div>
            </div>

            {/* C. CASE OVERVIEW CARD */}
            <GlassPanel className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5">
              <div className="px-2 py-1">
                <span className="block text-[11px] text-[#A5B0C7]">Total Cases</span>
                <span className="mt-0.5 block font-mono text-lg font-semibold text-[#F4F7FF] tabular-nums">
                  {metrics.totalCases}
                </span>
              </div>
              <div className="px-2 py-1 border-l border-white/10">
                <span className="block text-[11px] text-[#A5B0C7]">Awaiting Review</span>
                <span className="mt-0.5 block font-mono text-lg font-semibold text-[#F6BE58] tabular-nums">
                  {metrics.awaitingReview}
                </span>
              </div>
              <div className="px-2 py-1 sm:border-l border-white/10">
                <span className="block text-[11px] text-[#A5B0C7]">High Priority</span>
                <span className="mt-0.5 block font-mono text-lg font-semibold text-[#FF647C] tabular-nums">
                  {metrics.highPriority}
                </span>
              </div>
              <div className="px-2 py-1 border-l border-white/10">
                <span className="block text-[11px] text-[#A5B0C7]">Completed Reviews</span>
                <span className="mt-0.5 block font-mono text-lg font-semibold text-[#19D6A0] tabular-nums">
                  {metrics.completedReviews}
                </span>
              </div>
            </GlassPanel>

            {/* D & E. MEDICAL HOLOGRAM + RIGHT INTELLIGENCE PANEL */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-3 items-stretch">
              <HeartHologram
                compact
                selectedHotspotId={selectedSpot?.id}
                onSelectHotspot={(spot) => setSelectedSpot(spot)}
              />

              <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
                <GlassCard accent="emerald" className="p-3">
                  <div className="flex items-center justify-between text-[11px] text-[#A5B0C7]">
                    <span>Potential Clinical Signals</span>
                    <Activity className="h-3.5 w-3.5 text-[#19D6A0]" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#F4F7FF] truncate">
                    {signalLabel}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#77849E]">
                    3 active cues · Synthetic demo
                  </p>
                </GlassCard>

                <GlassCard accent="cyan" className="p-3">
                  <div className="flex items-center justify-between text-[11px] text-[#A5B0C7]">
                    <span>Model Confidence</span>
                    <span className="font-mono text-xs font-semibold text-[#32D9E8] tabular-nums">
                      {confidenceValue}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#19D6A0] via-[#32D9E8] to-[#A879FF] transition-all duration-300"
                      style={{ width: `${confidenceValue}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#77849E]">Calibrated signal index</p>
                </GlassCard>

                <GlassCard accent="purple" className="p-3">
                  <div className="flex items-center justify-between text-[11px] text-[#A5B0C7]">
                    <span>Data Quality</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-[#A879FF]" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#32D9E8]">Optimal Acquisition</p>
                  <p className="mt-0.5 text-[11px] text-[#77849E]">Zero motion artifact</p>
                </GlassCard>

                <GlassCard className="p-3">
                  <div className="flex items-center justify-between text-[11px] text-[#A5B0C7]">
                    <span>Analysis Status</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#19D6A0]" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#F4F7FF]">
                    Ready for Clinician Review
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#77849E]">Decision-support only</p>
                </GlassCard>
              </div>
            </div>

            {/* F. BOTTOM GLASS DASHBOARD CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <GlassPanel className="p-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-[#F4F7FF]">
                    Clinical Priority Queue
                  </span>
                  <span className="font-mono text-[10px] text-[#77849E]">Demo Queue</span>
                </div>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[#F4F7FF]">SNT-0891 · Cardiac MRI</span>
                    <PriorityLabel priority="critical" compact />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[#F4F7FF]">SNT-0890 · Chest X-Ray</span>
                    <PriorityLabel priority="high" compact />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[#A5B0C7]">SNT-0887 · Brain FLAIR</span>
                    <PriorityLabel priority="moderate" compact />
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel className="p-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-[#F4F7FF]">
                    Recent Analysis Activity
                  </span>
                  <span className="font-mono text-[10px] text-[#32D9E8]">6-Day Trend</span>
                </div>
                <div className="mt-2 h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={PREVIEW_TREND}>
                      <defs>
                        <linearGradient id="heroPreviewGradA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#19D6A0" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#19D6A0" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="heroPreviewGradB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A879FF" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="#A879FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="img"
                        stroke="#19D6A0"
                        strokeWidth={2}
                        fill="url(#heroPreviewGradA)"
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="ds"
                        stroke="#A879FF"
                        strokeWidth={1.8}
                        fill="url(#heroPreviewGradB)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassPanel>

              <GlassPanel className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F4F7FF]">Signal Distribution</span>
                  <span className="font-mono text-[10px] text-[#32D9E8]">By Category</span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {[
                    { label: 'Critical', pct: 33, color: '#FF647C' },
                    { label: 'High', pct: 33, color: '#F6BE58' },
                    { label: 'Moderate / Routine', pct: 34, color: '#19D6A0' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#A5B0C7]">{item.label}</span>
                        <span className="font-mono text-[#F4F7FF] tabular-nums">{item.pct}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel className="p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-[#F4F7FF]">Review Progress</span>
                  <p className="mt-1 font-mono text-lg font-semibold text-[#19D6A0] tabular-nums">
                    {metrics.totalCases > 0
                      ? Math.round((metrics.completedReviews / metrics.totalCases) * 100)
                      : 33}
                    %
                  </p>
                  <p className="text-[11px] text-[#77849E]">Clinician sign-offs logged</p>
                </div>
                <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" aria-hidden="true">
                  <circle
                    cx="32"
                    cy="32"
                    r="25"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="25"
                    fill="none"
                    stroke="#32D9E8"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="157"
                    strokeDashoffset={
                      157 -
                      157 *
                        (metrics.totalCases > 0
                          ? metrics.completedReviews / metrics.totalCases
                          : 0.33)
                    }
                    transform="rotate(-90 32 32)"
                  />
                </svg>
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
