import { Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { ClinicalCase, PatientRecord, PriorityLevel } from '../../types';
import { PriorityLabel, ReviewStatusLabel } from '../PriorityBadge';
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassPanel,
  GlassSearchBar,
  GlassSelect,
  GlassTable,
} from '../glass/GlassPrimitives';

interface PatientIntelligenceViewProps {
  onOpenCase: (caseId: string) => void;
  onToast: (msg: string) => void;
}

export const PatientIntelligenceView: React.FC<PatientIntelligenceViewProps> = ({
  onOpenCase,
  onToast,
}) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState(54);
  const [sex, setSex] = useState<'F' | 'M' | 'Other'>('F');
  const [primaryService, setPrimaryService] = useState('Cardiology Telemetry');
  const [riskTier, setRiskTier] = useState<PriorityLevel>('moderate');
  const [clinicalContext, setClinicalContext] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getPatients();
        setPatients(res.patients);
        setCases(res.cases);
        if (res.patients.length > 0) setSelectedId(res.patients[0].id);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Unable to load patient records.');
      }
    })();
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.primaryService.toLowerCase().includes(search.toLowerCase())
  );

  const activePatient = filtered.find((p) => p.id === selectedId) || filtered[0] || null;
  const linkedCases = activePatient ? cases.filter((c) => c.patientId === activePatient.id) : [];
  const imagingGallery = linkedCases.filter((c) => c.imageUrl);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPatient({
        fullName,
        age,
        sex,
        primaryService,
        riskTier,
        clinicalContext,
      });
      setPatients((prev) => [res.patient, ...prev]);
      setSelectedId(res.patient.id);
      setShowAdd(false);
      setFullName('');
      setClinicalContext('');
      onToast(`Patient record ${res.patient.mrn} created.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to create patient record.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">
            Patient Records &amp; Profile
          </h1>
          <p className="mt-1 text-sm text-[#A5B0C7]">
            Verified clinical baselines clearly separated from AI-generated prioritization signals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GlassSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search patient, MRN, service..."
            className="w-60"
          />
          <GlassButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowAdd((prev) => !prev)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Patient</span>
          </GlassButton>
        </div>
      </div>

      {showAdd && (
        <GlassCard accent="emerald" className="p-5">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassInput
              type="text"
              required
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <GlassInput
              type="text"
              required
              placeholder="Primary Clinical Service"
              value={primaryService}
              onChange={(e) => setPrimaryService(e.target.value)}
            />
            <div className="flex gap-2">
              <GlassInput
                type="number"
                min={1}
                max={115}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-20"
              />
              <GlassSelect
                value={sex}
                onChange={(e) => setSex(e.target.value as 'F' | 'M' | 'Other')}
              >
                <option value="F">F</option>
                <option value="M">M</option>
                <option value="Other">Other</option>
              </GlassSelect>
              <GlassSelect
                value={riskTier}
                onChange={(e) => setRiskTier(e.target.value as PriorityLevel)}
                className="flex-1"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="routine">Routine</option>
              </GlassSelect>
            </div>
            <GlassInput
              type="text"
              placeholder="Verified clinical history & intake context..."
              value={clinicalContext}
              onChange={(e) => setClinicalContext(e.target.value)}
              className="sm:col-span-2"
            />
            <div className="flex justify-end gap-2">
              <GlassButton type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" size="sm">
                Save Record
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Compact Patient Records Table */}
      <GlassTable
        headers={[
          { label: 'MRN' },
          { label: 'Patient Name' },
          { label: 'Demographics' },
          { label: 'Clinical Service' },
          { label: 'Priority Tier' },
          { label: 'Last Updated', align: 'right' },
        ]}
      >
        {filtered.map((p) => {
          const isSelected = activePatient?.id === p.id;
          return (
            <tr
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'bg-[#32D9E8]/10' : 'hover:bg-white/[0.03]'
              }`}
            >
              <td className="px-4 py-3 font-mono text-[#32D9E8]">{p.mrn}</td>
              <td className="px-4 py-3 font-medium text-[#F4F7FF]">{p.fullName}</td>
              <td className="px-4 py-3 text-[#A5B0C7]">
                {p.age}y · {p.sex}
              </td>
              <td className="px-4 py-3 text-[#A5B0C7]">{p.primaryService}</td>
              <td className="px-4 py-3">
                <PriorityLabel priority={p.riskTier} compact />
              </td>
              <td className="px-4 py-3 text-right font-mono text-[11px] text-[#77849E]">
                {new Date(p.lastUpdated).toLocaleDateString()}
              </td>
            </tr>
          );
        })}
      </GlassTable>

      {/* Layered Glass Patient Profile */}
      {!activePatient ? (
        <GlassCard className="p-12 text-center text-sm text-[#A5B0C7]">
          <Users className="mx-auto h-7 w-7 text-[#77849E] mb-2" />
          Select a patient row above to view their full profile.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left: Overview, Verified Clinical History & Lab Results */}
          <div className="xl:col-span-7 space-y-5">
            <GlassCard accent="cyan" className="p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#32D9E8]">{activePatient.mrn}</span>
                    <GlassBadge tone="emerald" icon={<ShieldCheck className="h-3 w-3" />}>
                      Verified Clinical Record
                    </GlassBadge>
                  </div>
                  <h2 className="mt-1.5 font-display text-xl font-semibold text-[#F4F7FF]">
                    {activePatient.fullName}
                  </h2>
                  <p className="text-xs text-[#A5B0C7]">
                    Age {activePatient.age} · Sex {activePatient.sex} · {activePatient.primaryService}
                  </p>
                </div>
                <PriorityLabel priority={activePatient.riskTier} />
              </div>

              {/* Lab Result & Vitals Panels */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <GlassPanel className="p-3">
                  <span className="text-[11px] text-[#A5B0C7]">Heart Rate</span>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-[#F4F7FF] tabular-nums">
                    {activePatient.latestVitals.heartRateBpm}{' '}
                    <span className="text-[11px] text-[#77849E]">bpm</span>
                  </p>
                </GlassPanel>
                <GlassPanel className="p-3">
                  <span className="text-[11px] text-[#A5B0C7]">Blood Pressure</span>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-[#F4F7FF] tabular-nums">
                    {activePatient.latestVitals.bloodPressure}
                  </p>
                </GlassPanel>
                <GlassPanel className="p-3">
                  <span className="text-[11px] text-[#A5B0C7]">SpO2</span>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-[#32D9E8] tabular-nums">
                    {activePatient.latestVitals.spo2Pct}%
                  </p>
                </GlassPanel>
                <GlassPanel className="p-3">
                  <span className="text-[11px] text-[#A5B0C7]">Troponin I</span>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-[#19D6A0] tabular-nums">
                    {activePatient.latestVitals.troponinNgL}{' '}
                    <span className="text-[11px] text-[#77849E]">ng/L</span>
                  </p>
                </GlassPanel>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[#A5B0C7]">
                  Verified Clinical History &amp; Notes
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#F4F7FF]">
                  {activePatient.clinicalContext}
                </p>
              </div>
            </GlassCard>

            {/* Medical Image Gallery */}
            <GlassCard className="p-5">
              <h3 className="font-display text-sm font-semibold text-[#F4F7FF] pb-3 border-b border-white/10">
                Medical Image Gallery ({imagingGallery.length})
              </h3>
              {imagingGallery.length === 0 ? (
                <p className="py-6 text-xs text-[#77849E]">
                  No medical imaging studies attached to this patient yet.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imagingGallery.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpenCase(c.id)}
                      className="group overflow-hidden rounded-xl border border-white/12 bg-black text-left hover:border-[#32D9E8]/50 transition-colors"
                    >
                      <img
                        src={c.imageUrl}
                        alt={c.title}
                        referrerPolicy="no-referrer"
                        className="h-28 w-full object-cover"
                      />
                      <div className="p-2 bg-[#090F1E]/90">
                        <p className="truncate font-mono text-[10px] text-[#32D9E8]">
                          {c.modality}
                        </p>
                        <p className="truncate text-[11px] text-[#F4F7FF]">{c.caseCode}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right: AI Previous Analyses & Activity Timeline */}
          <div className="xl:col-span-5 space-y-5">
            <GlassCard accent="purple" className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#A879FF]" />
                  <h3 className="font-display text-sm font-semibold text-[#F4F7FF]">
                    AI-Generated Analyses ({linkedCases.length})
                  </h3>
                </div>
                <GlassBadge tone="purple">Non-Diagnostic Cues</GlassBadge>
              </div>

              {linkedCases.length === 0 ? (
                <p className="py-6 text-xs text-[#77849E]">No AI analyses logged yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {linkedCases.map((c) => (
                    <GlassPanel key={c.id} className="p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-[#32D9E8]">{c.caseCode}</span>
                        <div className="flex items-center gap-2">
                          <PriorityLabel priority={c.priority} compact />
                          <ReviewStatusLabel status={c.reviewStatus} />
                        </div>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#F4F7FF]">{c.title}</p>
                      <p className="mt-1 text-[11px] text-[#A5B0C7] line-clamp-2">
                        {c.clinicalSummary}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#77849E]">
                          Confidence: {c.modelConfidence}%
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenCase(c.id)}
                          className="text-xs font-medium text-[#19D6A0] hover:underline"
                        >
                          Inspect Case
                        </button>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="font-display text-sm font-semibold text-[#F4F7FF] pb-3 border-b border-white/10">
                Patient Activity Timeline
              </h3>
              <div className="mt-3 space-y-3 border-l border-white/12 pl-4">
                {linkedCases.map((c) => (
                  <div key={c.id} className="relative text-xs">
                    <span className="font-mono text-[11px] text-[#32D9E8]">
                      {new Date(c.updatedAt).toLocaleString()}
                    </span>
                    <p className="mt-0.5 font-medium text-[#F4F7FF]">
                      {c.modality} · {c.reviewStatus.replace('_', ' ')}
                    </p>
                    {c.reviewNotes && (
                      <p className="mt-0.5 text-[11px] text-[#A5B0C7]">
                        Clinician note: &ldquo;{c.reviewNotes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};
