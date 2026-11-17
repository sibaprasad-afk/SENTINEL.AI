import { AlertTriangle, Database, Sparkles, Upload } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import type { ClinicalCase, DatasetAnalysisRecord } from '../../types';
import { PriorityLabel } from '../PriorityBadge';
import {
  GlassButton,
  GlassCard,
  GlassChart,
  GlassChartTooltip,
  GlassInput,
  GlassPanel,
  GlassSelect,
  GlassTable,
  GlassTextarea,
} from '../glass/GlassPrimitives';

interface DatasetAnalysisViewProps {
  onAnalysisComplete: (newCase: ClinicalCase) => void;
  onToast: (msg: string) => void;
}

const SAMPLE_CSV = `patient_code,heart_rate_bpm,lactate_mmol_l,crp_mg_l,spo2_pct,temp_c
OBS-501,114,3.4,136.2,91,38.7
OBS-502,74,1.0,10.5,98,36.8
OBS-503,104,2.7,98.4,93,38.2
OBS-504,69,1.2,14.8,99,36.9
OBS-505,109,2.9,112.0,92,38.4
OBS-506,79,1.4,21.0,97,37.1`;

export const DatasetAnalysisView: React.FC<DatasetAnalysisViewProps> = ({
  onAnalysisComplete,
  onToast,
}) => {
  const [history, setHistory] = useState<DatasetAnalysisRecord[]>([]);
  const [activeDataset, setActiveDataset] = useState<DatasetAnalysisRecord | null>(null);
  const [datasetName, setDatasetName] = useState('cardiac_sepsis_cohort_sample.csv');
  const [clinicalFocus, setClinicalFocus] = useState(
    'Early metabolic & inflammatory deterioration screening'
  );
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [dragOver, setDragOver] = useState(false);
  const [idColumnMap, setIdColumnMap] = useState('patient_code');
  const [targetMetricMap, setTargetMetricMap] = useState('lactate_mmol_l');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getDatasetAnalyses();
        setHistory(res.analyses);
        if (res.analyses.length > 0) setActiveDataset(res.analyses[0]);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Unable to load dataset analyses.');
      }
    })();
  }, []);

  const parsedPreview = useMemo(() => {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [] as string[][] };
    const delim = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delim).map((h) => h.trim());
    const rows = lines.slice(1, 6).map((l) => l.split(delim).map((v) => v.trim()));
    return { headers, rows };
  }, [csvContent]);

  const readCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvContent(reader.result);
        setDatasetName(file.name);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.analyzeDataset({
        datasetName,
        clinicalFocus: `${clinicalFocus} (ID column: ${idColumnMap}, Target signal: ${targetMetricMap})`,
        csvContent,
      });
      setActiveDataset(res.analysis);
      setHistory((prev) => [res.analysis, ...prev]);
      onAnalysisComplete(res.case);
      onToast(`Dataset cohort analysis completed (${res.case.caseCode} created).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Dataset analysis failed.';
      setError(msg);
      onToast(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const distributionChartData = useMemo(() => {
    if (!activeDataset) return [];
    return activeDataset.sampleRows.slice(0, 8).map((row, idx) => ({
      id: String(row[idColumnMap] ?? row.patient_code ?? row.interval_hr ?? `Row ${idx + 1}`),
      primary: Number(row[targetMetricMap] ?? row.lactate_mmol_l ?? row.troponin_ng_l ?? 0),
      secondary: Number(row.heart_rate_bpm ?? row.systolic_bp ?? 0),
    }));
  }, [activeDataset, idColumnMap, targetMetricMap]);

  const totalMissing = activeDataset
    ? activeDataset.columnStats.reduce((a, b) => a + b.missingCount, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">Dataset Analysis</h1>
        <p className="mt-1 text-sm text-[#A5B0C7]">
          Drag-and-drop CSV upload, column mapping, missingness quality profiling, and Gemini cohort
          signal detection.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Upload + Column Mapping */}
        <form
          onSubmit={handleAnalyze}
          className="xl:col-span-5 rounded-2xl glass-surface glass-glow-cyan p-5 space-y-4"
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readCsvFile(file);
            }}
          >
            <label className="block text-xs font-medium text-[#A5B0C7]">
              Drag &amp; Drop or Choose CSV Cohort
            </label>
            <label
              className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-xs transition-colors ${
                dragOver
                  ? 'border-[#19D6A0] bg-[#19D6A0]/12 text-[#19D6A0]'
                  : 'border-white/20 bg-[#050814]/60 text-[#A5B0C7] hover:border-[#32D9E8]/60 hover:text-[#F4F7FF]'
              }`}
            >
              <Upload className="h-5 w-5 text-[#32D9E8]" />
              <span>Drop .csv / .tsv file here or click to browse</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readCsvFile(file);
                }}
                className="sr-only"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Dataset Name</label>
              <GlassInput
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Clinical Focus</label>
              <GlassInput
                type="text"
                value={clinicalFocus}
                onChange={(e) => setClinicalFocus(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Column Mapping */}
          {parsedPreview.headers.length > 0 && (
            <GlassPanel className="p-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#A5B0C7]">Identifier Column</label>
                <GlassSelect
                  value={idColumnMap}
                  onChange={(e) => setIdColumnMap(e.target.value)}
                  className="mt-1 w-full"
                >
                  {parsedPreview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </GlassSelect>
              </div>
              <div>
                <label className="block text-[11px] text-[#A5B0C7]">Primary Biomarker</label>
                <GlassSelect
                  value={targetMetricMap}
                  onChange={(e) => setTargetMetricMap(e.target.value)}
                  className="mt-1 w-full"
                >
                  {parsedPreview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </GlassSelect>
              </div>
            </GlassPanel>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#A5B0C7]">CSV Payload</label>
              <button
                type="button"
                onClick={() => {
                  setCsvContent(SAMPLE_CSV);
                  setDatasetName('cardiac_sepsis_cohort_sample.csv');
                }}
                className="text-[11px] text-[#32D9E8] hover:underline"
              >
                Reset Sample CSV
              </button>
            </div>
            <GlassTextarea
              rows={5}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="mt-1 font-mono text-[11px]"
            />
          </div>

          {/* CSV Preview Table */}
          {parsedPreview.headers.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#050814]/65">
              <table className="w-full text-left text-[11px] font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-white/10 text-[#32D9E8]">
                    {parsedPreview.headers.map((h) => (
                      <th key={h} className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-[#A5B0C7]">
                  {parsedPreview.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((cell, ci) => (
                        <td key={ci} className="px-2.5 py-1.5 whitespace-nowrap">
                          {cell || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#FF647C]/40 bg-[#FF647C]/12 px-3 py-2 text-xs text-[#FF647C]">
              {error}
            </div>
          )}

          <GlassButton type="submit" variant="primary" disabled={analyzing} className="w-full py-2.5">
            <Sparkles className="h-4 w-4" />
            <span>{analyzing ? 'Analyzing Cohort...' : 'Analyze Clinical Dataset'}</span>
          </GlassButton>
        </form>

        {/* Right: Data Quality, Statistical Recharts, Cohort Signals */}
        <div className="xl:col-span-7 space-y-5">
          {activeDataset && (
            <>
              {/* Data Quality & Missing Data Cards */}
              <div className="grid grid-cols-3 gap-3">
                <GlassCard accent="emerald" className="p-4">
                  <span className="text-[11px] text-[#A5B0C7]">Cohort Size</span>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#F4F7FF] tabular-nums">
                    {activeDataset.rowCount}
                  </p>
                  <span className="text-[11px] text-[#77849E]">
                    {activeDataset.columnCount} mapped columns
                  </span>
                </GlassCard>
                <GlassCard accent="cyan" className="p-4">
                  <span className="text-[11px] text-[#A5B0C7]">Missing Cells</span>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#F6BE58] tabular-nums">
                    {totalMissing}
                  </p>
                  <span className="text-[11px] text-[#77849E]">
                    Quality: {activeDataset.dataQuality}
                  </span>
                </GlassCard>
                <GlassCard accent="purple" className="p-4">
                  <span className="text-[11px] text-[#A5B0C7]">Model Confidence</span>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#19D6A0] tabular-nums">
                    {activeDataset.modelConfidence}%
                  </p>
                  <PriorityLabel priority={activeDataset.overallPriority} compact />
                </GlassCard>
              </div>

              {/* Recharts Feature Distribution Chart */}
              <GlassChart
                title={`Feature Distribution (${targetMetricMap} vs. Heart Rate / BP)`}
                subtitle={activeDataset.datasetName}
                accent="purple"
                height="h-56"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distributionChartData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="id" stroke="#77849E" fontSize={11} tickLine={false} />
                    <YAxis stroke="#77849E" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<GlassChartTooltip />} />
                    <Bar
                      dataKey="primary"
                      name={targetMetricMap}
                      fill="#19D6A0"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="secondary"
                      name="Heart Rate / SBP"
                      fill="#A879FF"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GlassChart>

              {/* Analysis Summary & Signals */}
              <GlassCard className="p-5 space-y-4">
                {activeDataset.dataQualityWarnings.length > 0 && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#F6BE58]/35 bg-[#F6BE58]/10 p-3 text-xs text-[#F4F7FF]">
                    <AlertTriangle className="h-4 w-4 text-[#F6BE58] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#F6BE58]">Missing Data / Quality: </span>
                      {activeDataset.dataQualityWarnings.join(' ')}
                    </div>
                  </div>
                )}

                <p className="text-sm text-[#F4F7FF] leading-relaxed">
                  {activeDataset.clinicalSummary}
                </p>

                <div className="space-y-2.5">
                  {activeDataset.cohortSignals.map((sig) => (
                    <GlassPanel key={sig.signalName} className="p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#F4F7FF]">
                          {sig.signalName}
                        </span>
                        <div className="flex items-center gap-3">
                          <PriorityLabel priority={sig.severity} compact />
                          <span className="font-mono text-xs text-[#19D6A0] tabular-nums">
                            {sig.confidence}%
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[#32D9E8]">
                        Subgroup: {sig.affectedSubgroup}
                      </p>
                      <p className="mt-1 text-xs text-[#A5B0C7]">{sig.evidence}</p>
                    </GlassPanel>
                  ))}
                </div>

                <GlassTable
                  minWidth="min-w-[460px]"
                  headers={[
                    { label: 'Column' },
                    { label: 'Type' },
                    { label: 'Min', align: 'right' },
                    { label: 'Mean', align: 'right' },
                    { label: 'Max', align: 'right' },
                    { label: 'Missing', align: 'right' },
                  ]}
                >
                  {activeDataset.columnStats.map((cs) => (
                    <tr key={cs.column} className="font-mono tabular-nums">
                      <td className="px-3 py-2 text-[#F4F7FF]">{cs.column}</td>
                      <td className="px-3 py-2 text-[#A5B0C7]">{cs.type}</td>
                      <td className="px-3 py-2 text-right text-[#A5B0C7]">
                        {cs.min !== undefined ? cs.min : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-[#32D9E8]">
                        {cs.mean !== undefined ? cs.mean : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-[#A5B0C7]">
                        {cs.max !== undefined ? cs.max : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-[#F6BE58]">{cs.missingCount}</td>
                    </tr>
                  ))}
                </GlassTable>
              </GlassCard>
            </>
          )}

          {/* Stored Cohorts */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <Database className="h-4 w-4 text-[#19D6A0]" />
              <h3 className="font-display text-sm font-semibold text-[#F4F7FF]">
                Stored Cohort Batches
              </h3>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {history.map((ds) => (
                <GlassPanel
                  key={ds.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    activeDataset?.id === ds.id
                      ? 'border-[#19D6A0]/50 bg-[#19D6A0]/10'
                      : 'hover:border-white/25'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDataset(ds)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-[#F4F7FF]">
                        {ds.datasetName}
                      </span>
                      <PriorityLabel priority={ds.overallPriority} compact />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-[#A5B0C7]">
                      {ds.rowCount} rows · {ds.cohortSignals.length} signals
                    </p>
                  </button>
                </GlassPanel>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
