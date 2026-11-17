import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { ClinicalCase, ImageAnalysisRecord, PatientRecord } from '../../types';
import { PriorityLabel } from '../PriorityBadge';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassPanel,
  GlassSelect,
  GlassTextarea,
} from '../glass/GlassPrimitives';

interface ImageAnalysisViewProps {
  onAnalysisComplete: (newCase: ClinicalCase) => void;
  onToast: (msg: string) => void;
}

const SAMPLE_STUDIES: Array<{
  label: string;
  modality: ClinicalCase['modality'];
  imageUrl: string;
  title: string;
}> = [
  {
    label: 'Chest Radiograph',
    modality: 'Chest Radiograph',
    imageUrl: '/src/assets/images/chest_xray_sample_1794899382638.jpg',
    title: 'Thoracic AP Radiograph Triage',
  },
  {
    label: 'Cardiac MRI',
    modality: 'Cardiac MRI',
    imageUrl: '/src/assets/images/cardiac_mri_sample_1794899382406.jpg',
    title: '4-Chamber Myocardial Perfusion Cine',
  },
  {
    label: 'Brain MRI',
    modality: 'Brain MRI',
    imageUrl: '/src/assets/images/brain_mri_sample_1794899382930.jpg',
    title: 'Axial T2-FLAIR Neuroimaging Screen',
  },
];

export const ImageAnalysisView: React.FC<ImageAnalysisViewProps> = ({
  onAnalysisComplete,
  onToast,
}) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [history, setHistory] = useState<ImageAnalysisRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [modality, setModality] = useState<ClinicalCase['modality']>('Chest Radiograph');
  const [studyTitle, setStudyTitle] = useState('Thoracic AP Radiograph Triage');
  const [clinicalContext, setClinicalContext] = useState('');
  const [imageInput, setImageInput] = useState<string>(SAMPLE_STUDIES[0].imageUrl);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeResult, setActiveResult] = useState<ImageAnalysisRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Viewer controls: Zoom, Pan, Fullscreen, Compare
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const [compareMode, setCompareMode] = useState(false);
  const [compareImageUrl, setCompareImageUrl] = useState<string>(SAMPLE_STUDIES[1].imageUrl);
  const [fullscreen, setFullscreen] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [patRes, imgRes] = await Promise.all([api.getPatients(), api.getImageAnalyses()]);
        setPatients(patRes.patients);
        if (patRes.patients.length > 0) setSelectedPatientId(patRes.patients[0].id);
        setHistory(imgRes.analyses);
        if (imgRes.analyses.length > 0) {
          setActiveResult(imgRes.analyses[0]);
          setImageInput(imgRes.analyses[0].imageUrl);
        }
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Unable to load image analysis history.');
      }
    })();
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid PNG, JPEG, or WebP medical image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageInput(reader.result);
        setStudyTitle(file.name.replace(/\.[^.]+$/, ''));
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.analyzeImage({
        imageInput,
        modality,
        studyTitle,
        patientId: selectedPatientId,
        clinicalContext,
      });
      setActiveResult(res.analysis);
      setHistory((prev) => [res.analysis, ...prev]);
      onAnalysisComplete(res.case);
      onToast(`Image analysis completed (${res.case.caseCode} added to queue).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image analysis failed.';
      setError(msg);
      onToast(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeResult) return;
    setSavingNotes(true);
    try {
      await api.updateCase(activeResult.caseId, { reviewNotes: reviewerNotes });
      onToast('Reviewer notes saved to clinical case.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to save reviewer notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const activeIdx = history.findIndex((h) => h.id === activeResult?.id);
  const stepStudy = (dir: -1 | 1) => {
    if (history.length === 0) return;
    const nextIdx = (activeIdx + dir + history.length) % history.length;
    const next = history[nextIdx];
    setActiveResult(next);
    setImageInput(next.imageUrl);
    setStudyTitle(next.studyTitle);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-white/10 pb-4">
        <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">Image Analysis</h1>
        <p className="mt-1 text-sm text-[#A5B0C7]">
          Three-panel medical imaging workspace with zoom, pan, comparison mode, and live Gemini
          clinical signal analysis.
        </p>
      </div>

      {/* Three-Panel Glass Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: Upload, Case Selection, Study Info, Thumbnails */}
        <GlassCard accent="emerald" className="xl:col-span-3 p-4 space-y-4">
          <form onSubmit={handleAnalyze} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">
                Upload Medical Image
              </label>
              <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#050814]/60 px-3 py-3 text-xs text-[#A5B0C7] hover:border-[#19D6A0]/60 hover:text-[#F4F7FF] transition-colors">
                <Upload className="h-4 w-4 text-[#19D6A0]" />
                <span>PNG, JPG, or WebP scan</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Patient Case</label>
              <GlassSelect
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="mt-1 w-full"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.fullName}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Modality</label>
              <GlassSelect
                value={modality}
                onChange={(e) => setModality(e.target.value as ClinicalCase['modality'])}
                className="mt-1 w-full"
              >
                <option value="Chest Radiograph">Chest Radiograph</option>
                <option value="Cardiac MRI">Cardiac MRI</option>
                <option value="Brain MRI">Brain MRI</option>
                <option value="CT Angiography">CT Angiography</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Study Title</label>
              <GlassInput
                type="text"
                value={studyTitle}
                onChange={(e) => setStudyTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">
                Clinical Indication
              </label>
              <GlassTextarea
                rows={2}
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
                placeholder="Symptom context or referral reason..."
                className="mt-1"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-[#FF647C]/40 bg-[#FF647C]/12 px-3 py-2 text-xs text-[#FF647C]">
                {error}
              </div>
            )}

            <GlassButton
              type="submit"
              variant="primary"
              disabled={analyzing}
              className="w-full py-2.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>{analyzing ? 'Analyzing Scan...' : 'Run Gemini Analysis'}</span>
            </GlassButton>
          </form>

          {/* Sample & History Thumbnails */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <span className="text-xs font-semibold text-[#A5B0C7]">Study Thumbnails</span>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_STUDIES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setImageInput(s.imageUrl);
                    setModality(s.modality);
                    setStudyTitle(s.title);
                    resetView();
                  }}
                  className={`overflow-hidden rounded-lg border p-1 transition-colors ${
                    imageInput === s.imageUrl
                      ? 'border-[#19D6A0] bg-[#19D6A0]/10'
                      : 'border-white/10 bg-black/50 hover:border-white/30'
                  }`}
                >
                  <img
                    src={s.imageUrl}
                    alt={s.label}
                    referrerPolicy="no-referrer"
                    className="h-14 w-full object-cover rounded"
                  />
                  <span className="mt-1 block truncate text-[10px] text-[#A5B0C7]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* CENTER PANEL: Dark Precision Image Viewer */}
        <GlassCard
          accent="cyan"
          className={`${
            fullscreen ? 'fixed inset-4 z-50 flex flex-col' : 'xl:col-span-5 flex flex-col'
          } p-4`}
        >
          {/* Viewer Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                aria-label="Zoom out"
                className="rounded-lg border border-white/12 bg-[#090F1E]/80 p-1.5 text-[#A5B0C7] hover:text-[#F4F7FF]"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-xs text-[#32D9E8] w-12 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                aria-label="Zoom in"
                className="rounded-lg border border-white/12 bg-[#090F1E]/80 p-1.5 text-[#A5B0C7] hover:text-[#F4F7FF]"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={resetView}
                aria-label="Reset zoom and pan"
                className="rounded-lg border border-white/12 bg-[#090F1E]/80 p-1.5 text-[#A5B0C7] hover:text-[#F4F7FF]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepStudy(-1)}
                aria-label="Previous study"
                className="rounded-lg border border-white/12 bg-[#090F1E]/80 p-1.5 text-[#A5B0C7] hover:text-[#F4F7FF]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => stepStudy(1)}
                aria-label="Next study"
                className="rounded-lg border border-white/12 bg-[#090F1E]/80 p-1.5 text-[#A5B0C7] hover:text-[#F4F7FF]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCompareMode((c) => !c)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  compareMode
                    ? 'border-[#19D6A0]/50 bg-[#19D6A0]/15 text-[#19D6A0]'
                    : 'border-white/12 bg-[#090F1E]/80 text-[#A5B0C7] hover:text-[#F4F7FF]'
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span>Compare</span>
              </button>
              <button
                type="button"
                onClick={() => setFullscreen((f) => !f)}
                aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen viewer'}
                className="rounded-lg border border-white/12 bg-[#090F1E]/80 p-1.5 text-[#A5B0C7] hover:text-[#F4F7FF]"
              >
                {fullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {compareMode && (
            <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#A5B0C7]">Comparison Study:</span>
              <GlassSelect
                value={compareImageUrl}
                onChange={(e) => setCompareImageUrl(e.target.value)}
              >
                {SAMPLE_STUDIES.map((s) => (
                  <option key={s.imageUrl} value={s.imageUrl}>
                    {s.label}
                  </option>
                ))}
              </GlassSelect>
            </div>
          )}

          {/* Crisp Dark Radiology Viewport */}
          <div
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              setDragging(true);
              dragOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            }}
            onMouseMove={(e) => {
              if (!dragging) return;
              setPan({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
            }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            className={`relative mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#020409] ${
              fullscreen ? 'flex-1' : 'h-[420px]'
            } ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
          >
            <div className={`grid h-full w-full ${compareMode ? 'grid-cols-2 gap-1' : 'grid-cols-1'}`}>
              <div className="relative h-full w-full overflow-hidden flex items-center justify-center">
                <img
                  src={imageInput}
                  alt={studyTitle}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: dragging ? 'none' : 'transform 0.15s ease-out',
                  }}
                  className="max-h-full max-w-full object-contain select-none"
                />
              </div>

              {compareMode && (
                <div className="relative h-full w-full overflow-hidden border-l border-white/15 flex items-center justify-center">
                  <img
                    src={compareImageUrl}
                    alt="Comparison baseline study"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    }}
                    className="max-h-full max-w-full object-contain select-none"
                  />
                  <span className="absolute top-2 left-2 rounded bg-black/75 px-2 py-0.5 font-mono text-[10px] text-[#32D9E8]">
                    Reference Baseline
                  </span>
                </div>
              )}
            </div>

            {/* Subtle Emerald Scanning Animation During Active Analysis */}
            {analyzing && (
              <div className="pointer-events-none absolute inset-0 bg-[#19D6A0]/[0.04]">
                <div className="animate-scan-sweep h-16 w-full bg-gradient-to-b from-transparent via-[#19D6A0]/35 to-transparent border-b-2 border-[#19D6A0]" />
                <div className="absolute bottom-3 left-3 rounded-lg border border-[#19D6A0]/40 bg-[#050814]/85 px-3 py-1.5 font-mono text-xs text-[#19D6A0]">
                  Extracting anatomical signals...
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#77849E]">
            <span>{studyTitle}</span>
            <span className="font-mono">{modality}</span>
          </div>
        </GlassCard>

        {/* RIGHT PANEL: Patient Context, Findings, Evidence, Warnings, Reviewer Notes */}
        <GlassCard accent="purple" className="xl:col-span-4 p-4 space-y-4">
          {selectedPatient && (
            <GlassPanel className="p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#32D9E8]">{selectedPatient.mrn}</span>
                <span className="text-[#A5B0C7]">{selectedPatient.primaryService}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#F4F7FF]">
                {selectedPatient.fullName} ({selectedPatient.age}y · {selectedPatient.sex})
              </p>
              <p className="mt-1 text-[11px] text-[#A5B0C7]">{selectedPatient.clinicalContext}</p>
            </GlassPanel>
          )}

          {!activeResult ? (
            <div className="py-10 text-center text-xs text-[#A5B0C7]">
              Run an analysis to inspect calibrated model confidence and potential clinical signals.
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[11px] text-[#A5B0C7]">Priority Classification</span>
                  <div className="mt-0.5">
                    <PriorityLabel priority={activeResult.overallPriority} />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#A5B0C7]">Model Confidence</span>
                  <p className="font-mono text-xl font-semibold text-[#19D6A0] tabular-nums">
                    {activeResult.modelConfidence}%
                  </p>
                </div>
              </div>

              {activeResult.dataQualityWarnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-[#F6BE58]/35 bg-[#F6BE58]/10 p-3 text-xs text-[#F4F7FF]">
                  <AlertTriangle className="h-4 w-4 text-[#F6BE58] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#F6BE58]">Data Quality Warning: </span>
                    {activeResult.dataQualityWarnings.join(' ')}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-[#A5B0C7]">Clinical Signal Summary</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#F4F7FF]">
                  {activeResult.clinicalSummary}
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <h3 className="text-xs font-semibold text-[#A5B0C7]">
                  Potential Findings ({activeResult.findings.length})
                </h3>
                {activeResult.findings.map((f) => (
                  <GlassPanel key={f.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#F4F7FF]">{f.title}</span>
                      <span className="font-mono text-xs text-[#19D6A0] tabular-nums">
                        {f.confidence}%
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-[#32D9E8]">
                      {f.anatomicalRegion}
                    </p>
                    <p className="mt-1 text-[11px] text-[#A5B0C7]">{f.evidenceSummary}</p>
                  </GlassPanel>
                ))}
              </div>

              <div className="border-t border-white/10 pt-3 space-y-2">
                <label className="block text-xs font-medium text-[#A5B0C7]">Reviewer Notes</label>
                <GlassTextarea
                  rows={2}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Add attending verification notes..."
                />
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={savingNotes}
                  onClick={handleSaveNotes}
                  className="w-full"
                >
                  <Save className="h-3.5 w-3.5 text-[#19D6A0]" />
                  <span>{savingNotes ? 'Saving...' : 'Save Reviewer Notes'}</span>
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
