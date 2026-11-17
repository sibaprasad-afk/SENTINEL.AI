import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Database,
  FileSearch,
  Layers,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import type { ClinicianUser, DashboardOverviewData, NotificationItem } from '../../types';
import { HeartHologram } from '../HeartHologram';
import { PriorityLabel, ReviewStatusLabel } from '../PriorityBadge';
import {
  GlassButton,
  GlassCard,
  GlassChart,
  GlassChartTooltip,
  GlassMetricCard,
  GlassPanel,
} from '../glass/GlassPrimitives';

interface CommandCenterViewProps {
  user: ClinicianUser;
  overview: DashboardOverviewData | null;
  loading: boolean;
  onNavigate: (page: string) => void;
  onSelectCaseId: (caseId: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  user,
  overview,
  loading,
  onNavigate,
  onSelectCaseId,
}) => {
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getNotifications();
        setRecentNotifications(res.notifications.slice(0, 3));
      } catch {
        // Non-critical
      }
    })();
  }, []);

  if (loading || !overview) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 animate-pulse rounded-2xl glass-surface" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl glass-surface" />
      </div>
    );
  }

  const { metrics, priorityCounts, activitySeries, recentCases } = overview;
  const priorityPieData = [
    { name: 'Critical', value: priorityCounts.critical, color: '#FF647C' },
    { name: 'High', value: priorityCounts.high, color: '#F6BE58' },
    { name: 'Moderate', value: priorityCounts.moderate, color: '#32D9E8' },
    { name: 'Routine', value: priorityCounts.routine, color: '#19D6A0' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#F4F7FF]">
            Good morning, {user.name.split(',')[0]}
          </h1>
          <p className="mt-1 text-sm text-[#A5B0C7]">
            Command Center clinical intelligence overview · Synthetic demo cases explicitly tagged.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('ai-copilot')}
            className="border-[#A879FF]/40 hover:border-[#A879FF]/70"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#A879FF]" />
            <span>Clinical AI Studio</span>
          </GlassButton>
          <GlassButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onNavigate('image-analysis')}
          >
            <FileSearch className="h-3.5 w-3.5" />
            <span>New Image Analysis</span>
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('dataset-analysis')}
          >
            <Database className="h-3.5 w-3.5 text-[#32D9E8]" />
            <span>Analyze Dataset</span>
          </GlassButton>
        </div>
      </div>

      {/* 4 Floating Glass Metric KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <GlassMetricCard
          title="Total Cases"
          value={metrics.totalCases}
          subtitle="Active clinical worklist"
          trend={`${metrics.potentialSignalsTotal} cues tracked`}
          accent="cyan"
          icon={<Layers className="h-4 w-4" />}
          sparkline={activitySeries.map((p) => p.imagingVolume + p.datasetVolume)}
          delay={0}
        />
        <GlassMetricCard
          title="Awaiting Review"
          value={metrics.awaitingReview}
          subtitle="Pending clinician sign-off"
          trend="Human-in-the-loop"
          accent="warning"
          icon={<Clock className="h-4 w-4" />}
          sparkline={[3, 5, 4, 6, 5, metrics.awaitingReview]}
          delay={0.05}
        />
        <GlassMetricCard
          title="High Priority"
          value={metrics.highPriority}
          subtitle="Critical & High queue"
          trend={`${priorityCounts.critical} critical`}
          accent="critical"
          icon={<AlertTriangle className="h-4 w-4" />}
          sparkline={[1, 2, 3, 2, 4, metrics.highPriority]}
          delay={0.1}
        />
        <GlassMetricCard
          title="Completed Reviews"
          value={metrics.completedReviews}
          subtitle="Verified & audit-logged"
          trend={`${metrics.avgModelConfidence}% mean conf.`}
          accent="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
          sparkline={activitySeries.map((p) => p.completedReviews)}
          delay={0.15}
        />
      </div>

      {/* Hologram Stage + Clinical Activity Area Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-5">
          <HeartHologram />
        </div>

        <div className="xl:col-span-7 flex flex-col">
          <GlassChart
            title="Clinical Activity & Triage Velocity"
            subtitle="7-day imaging volume, dataset batches, and completed specialist sign-offs"
            accent="emerald"
            height="h-72 sm:h-80"
            action={
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="text-xs font-medium text-[#32D9E8] hover:underline"
              >
                Explore Analytics
              </button>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activitySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="cmdImgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#19D6A0" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#19D6A0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cmdDsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#32D9E8" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#32D9E8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cmdCompGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A879FF" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#A879FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="#77849E" fontSize={11} tickLine={false} />
                <YAxis stroke="#77849E" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="imagingVolume"
                  name="Imaging Studies"
                  stroke="#19D6A0"
                  strokeWidth={2.2}
                  fill="url(#cmdImgGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="datasetVolume"
                  name="Dataset Cohorts"
                  stroke="#32D9E8"
                  strokeWidth={2}
                  fill="url(#cmdDsGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="completedReviews"
                  name="Completed Reviews"
                  stroke="#A879FF"
                  strokeWidth={2}
                  fill="url(#cmdCompGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassChart>
        </div>
      </div>

      {/* Middle Analytics Row: Priority Distribution + Analysis Volume + Signal Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassChart
          title="Priority Distribution"
          subtitle="Active workflow categories"
          accent="purple"
          height="h-56"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityPieData}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={4}
                stroke="rgba(5,8,20,0.9)"
                strokeWidth={2}
              >
                {priorityPieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<GlassChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </GlassChart>

        <GlassChart
          title="Analysis Volume"
          subtitle="Daily imaging vs. dataset runs"
          accent="cyan"
          height="h-56"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activitySeries} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#77849E" fontSize={11} tickLine={false} />
              <YAxis stroke="#77849E" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<GlassChartTooltip />} />
              <Bar dataKey="imagingVolume" name="Imaging" fill="#32D9E8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="datasetVolume" name="Datasets" fill="#A879FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassChart>

        <GlassCard accent="emerald" className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                Clinical Signal Distribution
              </h2>
              <p className="mt-0.5 text-xs text-[#77849E]">
                Quality compliance: {metrics.optimalQualityPct}% optimal
              </p>
            </div>
            <Activity className="h-4 w-4 text-[#19D6A0]" />
          </div>
          <div className="mt-4 space-y-3">
            {priorityPieData.map((row) => {
              const total = Math.max(1, metrics.totalCases);
              const pct = Math.round((row.value / total) * 100);
              return (
                <div key={row.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#F4F7FF]">{row.name}</span>
                    <span className="font-mono text-[#A5B0C7] tabular-nums">
                      {row.value} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row: Recent Cases + Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <GlassCard className="lg:col-span-7 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#19D6A0]" />
              <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">Recent Cases</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('clinical-queue')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#19D6A0] hover:text-[#32D9E8]"
            >
              <span>Open Clinical Queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 divide-y divide-white/[0.07]">
            {recentCases.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectCaseId(c.id);
                  onNavigate('clinical-queue');
                }}
                className="w-full py-2.5 px-2 -mx-2 flex items-center justify-between gap-3 text-left rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#F4F7FF]">
                    <span className="font-mono text-[#32D9E8]">{c.caseCode}</span>
                    <span className="truncate">{c.patientName}</span>
                  </div>
                  <p className="truncate text-xs text-[#A5B0C7]">
                    {c.modality} · {c.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <PriorityLabel priority={c.priority} compact />
                  <ReviewStatusLabel status={c.reviewStatus} />
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-5 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#A879FF]" />
              <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                Recent Notifications
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="text-xs font-medium text-[#32D9E8] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="mt-3 space-y-2.5">
            {recentNotifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#77849E]">No active alerts.</p>
            ) : (
              recentNotifications.map((n) => (
                <GlassPanel key={n.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <PriorityLabel priority={n.severity} compact />
                    <span className="font-mono text-[10px] text-[#77849E]">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#F4F7FF] truncate">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#A5B0C7] line-clamp-2">{n.message}</p>
                </GlassPanel>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
