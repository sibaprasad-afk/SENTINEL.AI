import { BarChart3, CheckCircle2, Clock, Download, Layers } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import type { AnalyticsTimePoint, PriorityLevel } from '../../types';
import {
  GlassButton,
  GlassChart,
  GlassChartTooltip,
  GlassMetricCard,
} from '../glass/GlassPrimitives';

export const AnalyticsView: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const [range, setRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [data, setData] = useState<{
    totalCases: number;
    totalImageStudies: number;
    totalDatasetBatches: number;
    totalAuditEvents: number;
    completionRatePct: number;
    avgTurnaroundHrs: number;
    byModality: Record<string, number>;
    byPriority: Record<PriorityLevel, number>;
    byStatus: Record<string, number>;
    timeSeries: AnalyticsTimePoint[];
    confidenceSeries: Array<{ label: string; confidence: number; priority: PriorityLevel }>;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getAnalytics(range);
        setData(res);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Unable to load analytics.');
      }
    })();
  }, [range]);

  const handleExport = (format: 'json' | 'csv') => {
    if (!data) return;
    let blob: Blob;
    let filename: string;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      filename = `sentinel_analytics_${range}.json`;
    } else {
      const headers = 'date,imagingVolume,datasetVolume,completedReviews,avgTurnaroundHrs\n';
      const rows = data.timeSeries
        .map(
          (p) =>
            `${p.date},${p.imagingVolume},${p.datasetVolume},${p.completedReviews},${p.avgTurnaroundHrs}`
        )
        .join('\n');
      blob = new Blob([headers + rows], { type: 'text/csv' });
      filename = `sentinel_analytics_${range}.csv`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${filename}`);
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl glass-surface" />
        <div className="h-72 animate-pulse rounded-2xl glass-surface" />
      </div>
    );
  }

  const modalityData = Object.entries(data.byModality).map(([name, value]) => ({ name, value }));
  const priorityData = [
    { name: 'Critical', value: data.byPriority.critical, color: '#FF647C' },
    { name: 'High', value: data.byPriority.high, color: '#F6BE58' },
    { name: 'Moderate', value: data.byPriority.moderate, color: '#32D9E8' },
    { name: 'Routine', value: data.byPriority.routine, color: '#19D6A0' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">Analytics</h1>
          <p className="mt-1 text-sm text-[#A5B0C7]">
            Workflow telemetry &amp; model output distributions (reflects queue activity, not
            confirmed disease prevalence).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Filter */}
          <div className="inline-flex rounded-xl glass-surface p-1">
            {(['7d', '14d', '30d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                  range === r
                    ? 'bg-[#19D6A0] text-[#050814] font-semibold'
                    : 'text-[#A5B0C7] hover:text-[#F4F7FF]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-3.5 w-3.5 text-[#32D9E8]" />
            <span>CSV</span>
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleExport('json')}
          >
            <Download className="h-3.5 w-3.5 text-[#A879FF]" />
            <span>JSON</span>
          </GlassButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassMetricCard
          title="Analysis Volume"
          value={data.totalCases}
          subtitle={`${data.totalImageStudies} imaging · ${data.totalDatasetBatches} cohorts`}
          accent="cyan"
          icon={<Layers className="h-4 w-4" />}
          sparkline={data.timeSeries.map((p) => p.imagingVolume + p.datasetVolume)}
        />
        <GlassMetricCard
          title="Review Turnaround"
          value={`${data.avgTurnaroundHrs}h`}
          subtitle="Mean triage-to-signoff window"
          accent="purple"
          icon={<Clock className="h-4 w-4" />}
          sparkline={data.timeSeries.map((p) => p.avgTurnaroundHrs)}
        />
        <GlassMetricCard
          title="Completion Rate"
          value={`${data.completionRatePct}%`}
          subtitle="Reviewed vs. pending queue"
          accent="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
          sparkline={data.timeSeries.map((p) => p.completedReviews)}
        />
        <GlassMetricCard
          title="Audit Events"
          value={data.totalAuditEvents}
          subtitle="Logged clinical provenance"
          accent="blue"
          icon={<BarChart3 className="h-4 w-4" />}
          sparkline={[4, 6, 8, 7, 10, data.totalAuditEvents]}
        />
      </div>

      {/* Time-Series & Turnaround */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <GlassChart
            title="Analysis Volume & Completed Reviews"
            subtitle={`Rolling ${range.toUpperCase()} clinical pipeline telemetry`}
            accent="emerald"
            height="h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.timeSeries}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="anaImgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#19D6A0" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#19D6A0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anaDsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#32D9E8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#32D9E8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="#77849E" fontSize={11} tickLine={false} />
                <YAxis stroke="#77849E" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="imagingVolume"
                  name="Imaging Volume"
                  stroke="#19D6A0"
                  strokeWidth={2.2}
                  fill="url(#anaImgGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="datasetVolume"
                  name="Dataset Volume"
                  stroke="#32D9E8"
                  strokeWidth={2}
                  fill="url(#anaDsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassChart>
        </div>

        <div className="lg:col-span-5">
          <GlassChart
            title="Review Turnaround Time (Hours)"
            subtitle="Mean hours from ingestion to specialist verification"
            accent="purple"
            height="h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.timeSeries}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="#77849E" fontSize={11} tickLine={false} />
                <YAxis stroke="#77849E" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<GlassChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="avgTurnaroundHrs"
                  name="Avg Turnaround (hrs)"
                  stroke="#A879FF"
                  strokeWidth={2.4}
                  dot={{ r: 3, fill: '#A879FF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassChart>
        </div>
      </div>

      {/* Bottom Charts: Priority Distribution + Modality Breakdown + Model Output Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassChart
          title="Case Priority Distribution"
          subtitle="Configurable workflow categories"
          accent="cyan"
          height="h-60"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityData}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={4}
                stroke="rgba(5,8,20,0.9)"
                strokeWidth={2}
              >
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<GlassChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </GlassChart>

        <GlassChart
          title="Modality Breakdown"
          subtitle="Studies per acquisition source"
          accent="emerald"
          height="h-60"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={modalityData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="#77849E" fontSize={11} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#A5B0C7"
                fontSize={11}
                width={105}
                tickLine={false}
              />
              <Tooltip content={<GlassChartTooltip />} />
              <Bar dataKey="value" name="Cases" fill="#19D6A0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassChart>

        <GlassChart
          title="Model Output Confidence (%)"
          subtitle="Calibrated score across recent cases"
          accent="purple"
          height="h-60"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.confidenceSeries}
              margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#77849E" fontSize={11} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                stroke="#77849E"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<GlassChartTooltip />} />
              <Bar dataKey="confidence" name="Confidence %" fill="#32D9E8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassChart>
      </div>
    </div>
  );
};
