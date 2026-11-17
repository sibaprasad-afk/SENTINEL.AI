import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  History,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { ClinicalCase, PriorityLevel, ReviewStatus } from '../../types';
import { PriorityLabel, ReviewStatusLabel } from '../PriorityBadge';
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassPanel,
  GlassSearchBar,
  GlassSelect,
  GlassTable,
  GlassTextarea,
} from '../glass/GlassPrimitives';

const RECENT_SEARCHES_KEY = 'sentinel_clinical_queue_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function loadRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function persistRecentSearches(items: string[]): void {
  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

interface ClinicalQueueViewProps {
  selectedCaseId: string | null;
  onSelectCaseId: (id: string | null) => void;
  onRefreshParent: () => void;
  onToast: (msg: string) => void;
}

export const ClinicalQueueView: React.FC<ClinicalQueueViewProps> = ({
  selectedCaseId,
  onSelectCaseId,
  onRefreshParent,
  onToast,
}) => {
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [allCases, setAllCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [recentOpen, setRecentOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const recordRecentPatientSearch = useCallback((patientName: string) => {
    const trimmed = patientName.trim();
    if (trimmed.length < 2) return;
    setRecentSearches((prev) => [
      trimmed,
      ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES));
  }, []);

  const removeRecentSearch = (patientName: string) => {
    setRecentSearches((prev) =>
      prev.filter((item) => item.toLowerCase() !== patientName.toLowerCase())
    );
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    setRecentOpen(false);
  };

  useEffect(() => {
    persistRecentSearches(recentSearches);
    if (recentSearches.length === 0) {
      setRecentOpen(false);
    }
  }, [recentSearches]);

  const resolvePatientNameForQuery = useCallback(
    (query: string, candidateCases: ClinicalCase[]): string | null => {
      const q = query.trim().toLowerCase();
      if (q.length < 2) return null;
      const matchingPatientNames = Array.from(
        new Set(
          candidateCases
            .filter((c) => c.patientName.toLowerCase().includes(q))
            .map((c) => c.patientName)
        )
      );
      if (matchingPatientNames.length === 1) {
        return matchingPatientNames[0];
      }
      return null;
    },
    []
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setRecentOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const [filteredRes, allRes] = await Promise.all([
        api.getCases({ priority: priorityFilter, status: statusFilter, q: search }),
        api.getCases(),
      ]);
      setCases(filteredRes.cases);
      setAllCases(allRes.cases);
      if (selectedCaseId) {
        setDrawerOpen(true);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to load clinical queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [priorityFilter, statusFilter, search]);

  // Persist settled patient-name searches after user pauses typing
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) return;
    const timer = window.setTimeout(() => {
      const resolved = resolvePatientNameForQuery(trimmed, allCases);
      if (resolved) {
        recordRecentPatientSearch(resolved);
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [search, allCases, resolvePatientNameForQuery, recordRecentPatientSearch]);

  const instantMatchedCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allCases
      .filter(
        (c) =>
          c.caseCode.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.mrn.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.modality.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [search, allCases]);

  const hasDropdownContent = search.trim().length > 0 || recentSearches.length > 0;

  const activeCase =
    cases.find((c) => c.id === selectedCaseId) ||
    allCases.find((c) => c.id === selectedCaseId) ||
    cases[0] ||
    null;

  useEffect(() => {
    setReviewNotes(activeCase?.reviewNotes || '');
  }, [activeCase?.id]);

  const handleUpdateCase = async (updates: {
    priority?: PriorityLevel;
    reviewStatus?: ReviewStatus;
  }) => {
    if (!activeCase) return;
    setSaving(true);
    try {
      const res = await api.updateCase(activeCase.id, {
        ...updates,
        reviewNotes,
      });
      setCases((prev) => prev.map((c) => (c.id === res.case.id ? res.case : c)));
      setAllCases((prev) => prev.map((c) => (c.id === res.case.id ? res.case : c)));
      onRefreshParent();
      onToast(`Updated ${res.case.caseCode} workflow status.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update clinical case.');
    } finally {
      setSaving(false);
    }
  };

  const counts: Record<PriorityLevel, number> = {
    critical: allCases.filter((c) => c.priority === 'critical').length,
    high: allCases.filter((c) => c.priority === 'high').length,
    moderate: allCases.filter((c) => c.priority === 'moderate').length,
    routine: allCases.filter((c) => c.priority === 'routine').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">Clinical Queue</h1>
          <p className="mt-1 text-sm text-[#A5B0C7]">
            Configurable priority panels (Critical, High, Moderate, Routine). Not autonomous
            diagnoses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div ref={searchContainerRef} className="relative">
            <GlassSearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                if (val.trim().length > 0 || recentSearches.length > 0) {
                  setRecentOpen(true);
                }
              }}
              onFocus={() => {
                if (hasDropdownContent) setRecentOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setRecentOpen(false);
                  return;
                }
                if (e.key === 'Enter' && search.trim().length >= 2) {
                  const resolved =
                    resolvePatientNameForQuery(search, allCases) || search.trim();
                  recordRecentPatientSearch(resolved);
                  setRecentOpen(false);
                }
              }}
              placeholder="Search case, patient, MRN..."
              ariaLabel="Search clinical queue by case, patient name, or MRN"
              ariaExpanded={recentOpen && hasDropdownContent}
              ariaControls="clinical-queue-search-dropdown"
              className="w-64 sm:w-72"
            />

            <AnimatePresence>
              {recentOpen && hasDropdownContent && (
                <motion.div
                  id="clinical-queue-search-dropdown"
                  role="listbox"
                  aria-label="Clinical queue search results and recent searches"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 left-0 sm:left-auto sm:w-96 top-full z-40 mt-2 overflow-hidden rounded-2xl glass-elevated glass-glow-cyan"
                >
                  {/* Subtle ambient glass sheen */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#32D9E8]/[0.08] via-[#19D6A0]/[0.03] to-transparent"
                  />

                  {/* Live Matching Search Results */}
                  {search.trim().length > 0 && (
                    <div
                      className={`relative ${
                        recentSearches.length > 0 ? 'border-b border-white/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07]">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5B0C7]">
                          Matching Cases
                        </span>
                        <GlassBadge tone="cyan" className="tabular-nums">
                          {instantMatchedCases.length} shown
                        </GlassBadge>
                      </div>

                      {instantMatchedCases.length === 0 ? (
                        <div className="px-3.5 py-3 text-xs text-[#77849E]">
                          No cases match &ldquo;{search.trim()}&rdquo;.
                        </div>
                      ) : (
                        <ul className="max-h-52 space-y-1 overflow-y-auto p-1.5">
                          {instantMatchedCases.map((c) => (
                            <motion.li
                              key={c.id}
                              whileHover={prefersReducedMotion ? undefined : { x: 3 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                            >
                              <button
                                type="button"
                                role="option"
                                aria-selected={selectedCaseId === c.id}
                                onClick={() => {
                                  recordRecentPatientSearch(c.patientName);
                                  onSelectCaseId(c.id);
                                  setDrawerOpen(true);
                                  setRecentOpen(false);
                                }}
                                className="group flex w-full items-center justify-between gap-2.5 rounded-xl border border-transparent bg-transparent px-2.5 py-2 text-left transition-all duration-150 hover:border-[#32D9E8]/25 hover:bg-white/[0.06] hover:shadow-[0_0_20px_-8px_rgba(50,217,232,0.35)]"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="font-mono font-medium text-[#32D9E8]">
                                      {c.caseCode}
                                    </span>
                                    <span className="truncate font-semibold text-[#F4F7FF] group-hover:text-[#19D6A0] transition-colors">
                                      {c.patientName}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 truncate text-[11px] text-[#77849E]">
                                    {c.modality} · {c.title}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <PriorityLabel priority={c.priority} compact />
                                  <ArrowUpRight className="h-3.5 w-3.5 text-[#77849E] opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:text-[#32D9E8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </div>
                              </button>
                            </motion.li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Persistent Recent Searches Section */}
                  {recentSearches.length > 0 && (
                    <div className="relative">
                      <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#A5B0C7]">
                          <History className="h-3.5 w-3.5 text-[#32D9E8]" />
                          <span>Recent Searches</span>
                        </div>
                        <GlassButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearRecentSearches}
                          aria-label="Clear recent searches"
                          className="!px-2 !py-1 !text-[11px] border border-white/10 bg-white/[0.03] text-[#A5B0C7] hover:border-[#FF647C]/40 hover:bg-[#FF647C]/12 hover:text-[#FF647C]"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Clear</span>
                        </GlassButton>
                      </div>

                      <ul className="max-h-56 space-y-1 overflow-y-auto p-1.5">
                        {recentSearches.map((patientName) => {
                          const isCurrent =
                            search.trim().toLowerCase() === patientName.toLowerCase();
                          return (
                            <motion.li
                              key={patientName}
                              whileHover={prefersReducedMotion ? undefined : { x: 3 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="group flex items-center gap-1"
                            >
                              <button
                                type="button"
                                role="option"
                                aria-selected={isCurrent}
                                onClick={() => {
                                  setSearch(patientName);
                                  recordRecentPatientSearch(patientName);
                                  setRecentOpen(false);
                                }}
                                className={`flex flex-1 min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-xs transition-all duration-150 ${
                                  isCurrent
                                    ? 'border-[#19D6A0]/35 bg-[#19D6A0]/14 text-[#19D6A0] shadow-[0_0_18px_-8px_rgba(25,214,160,0.45)]'
                                    : 'border-transparent bg-transparent text-[#F4F7FF] hover:border-white/12 hover:bg-white/[0.06]'
                                }`}
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 ${
                                    isCurrent
                                      ? 'border-[#19D6A0]/40 bg-[#19D6A0]/15 text-[#19D6A0]'
                                      : 'border-white/10 bg-[#050814]/60 text-[#A5B0C7] group-hover:border-[#32D9E8]/35 group-hover:text-[#32D9E8]'
                                  }`}
                                >
                                  <User className="h-3.5 w-3.5" />
                                </span>
                                <span className="truncate font-medium">{patientName}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRecentSearch(patientName);
                                }}
                                aria-label={`Remove ${patientName} from recent searches`}
                                className="rounded-lg border border-transparent p-1.5 text-[#77849E] opacity-70 transition-all duration-150 hover:border-white/12 hover:bg-white/10 hover:text-[#FF647C] group-hover:opacity-100"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <GlassSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="routine">Routine</option>
          </GlassSelect>

          <GlassSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by review status"
          >
            <option value="all">All Statuses</option>
            <option value="awaiting_review">Awaiting Review</option>
            <option value="in_review">In Review</option>
            <option value="escalated">Escalated</option>
            <option value="completed">Reviewed</option>
          </GlassSelect>
        </div>
      </div>

      {/* Four Glass Priority Panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: 'critical' as const,
            label: 'Critical',
            count: counts.critical,
            desc: 'Immediate specialist focus',
            accent: 'critical' as const,
            color: '#FF647C',
            Icon: AlertOctagon,
          },
          {
            id: 'high' as const,
            label: 'High',
            count: counts.high,
            desc: 'Expedited review tier',
            accent: 'warning' as const,
            color: '#F6BE58',
            Icon: AlertTriangle,
          },
          {
            id: 'moderate' as const,
            label: 'Moderate',
            count: counts.moderate,
            desc: 'Standard prioritized queue',
            accent: 'cyan' as const,
            color: '#32D9E8',
            Icon: Clock,
          },
          {
            id: 'routine' as const,
            label: 'Routine',
            count: counts.routine,
            desc: 'Nominal screening baseline',
            accent: 'emerald' as const,
            color: '#19D6A0',
            Icon: CheckCircle2,
          },
        ].map(({ id, label, count, desc, accent, color, Icon }) => {
          const active = priorityFilter === id;
          return (
            <GlassCard
              key={id}
              accent={active ? accent : 'none'}
              elevated={active}
              onClick={() => setPriorityFilter((p) => (p === id ? 'all' : id))}
              className="p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F4F7FF]">{label}</span>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-[#F4F7FF] tabular-nums">
                {count}
              </p>
              <p className="mt-0.5 text-[11px] text-[#77849E]">{desc}</p>
            </GlassCard>
          );
        })}
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 animate-pulse rounded-xl glass-surface" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-[#A5B0C7]">
          No cases match the active filter criteria.
        </GlassCard>
      ) : (
        <GlassTable
          headers={[
            { label: 'Case / Patient' },
            { label: 'Modality & Study' },
            { label: 'Assigned Clinician' },
            { label: 'Priority' },
            { label: 'Review Status' },
            { label: 'Confidence', align: 'right' },
          ]}
        >
          {cases.map((c) => {
            const selected = activeCase?.id === c.id && drawerOpen;
            return (
              <tr
                key={c.id}
                onClick={() => {
                  if (search.trim().length > 0) {
                    recordRecentPatientSearch(c.patientName);
                  }
                  onSelectCaseId(c.id);
                  setDrawerOpen(true);
                }}
                className={`cursor-pointer transition-colors ${
                  selected ? 'bg-[#19D6A0]/12' : 'hover:bg-white/[0.04]'
                }`}
              >
                <td className="px-4 py-3.5">
                  <div className="font-mono text-[#32D9E8]">{c.caseCode}</div>
                  <div className="mt-0.5 font-medium text-[#F4F7FF]">{c.patientName}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-[#F4F7FF]">{c.title}</div>
                  <div className="text-[11px] text-[#77849E]">{c.modality}</div>
                </td>
                <td className="px-4 py-3.5 text-[#A5B0C7]">{c.assignedClinician}</td>
                <td className="px-4 py-3.5">
                  <PriorityLabel priority={c.priority} compact />
                </td>
                <td className="px-4 py-3.5">
                  <ReviewStatusLabel status={c.reviewStatus} />
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-[#F4F7FF] tabular-nums">
                  {c.modelConfidence}%
                </td>
              </tr>
            );
          })}
        </GlassTable>
      )}

      {/* Case Details Glass Drawer */}
      {drawerOpen && activeCase && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#050814]/70 backdrop-blur-sm">
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
          <div className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/15 bg-[rgba(9,15,30,0.92)] backdrop-blur-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#32D9E8]">
                  <span>{activeCase.caseCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeCase.mrn}</span>
                  {activeCase.isSyntheticDemo && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#A5B0C7]">Synthetic Demo</span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#F4F7FF]">
                  {activeCase.title}
                </h2>
                <p className="text-xs text-[#A5B0C7]">
                  {activeCase.patientName} · Assigned to {activeCase.assignedClinician}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close case details"
                className="rounded-xl p-2 text-[#A5B0C7] hover:bg-white/10 hover:text-[#F4F7FF]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeCase.imageUrl && (
              <div className="overflow-hidden rounded-xl border border-white/12 bg-black h-52">
                <img
                  src={activeCase.imageUrl}
                  alt={activeCase.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            {activeCase.dataQualityWarnings.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#F6BE58]/35 bg-[#F6BE58]/10 p-3 text-xs text-[#F4F7FF]">
                <AlertTriangle className="h-4 w-4 text-[#F6BE58] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#F6BE58]">Quality Advisory: </span>
                  {activeCase.dataQualityWarnings.join(' ')}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-[#A5B0C7]">
                Clinical Decision Support Summary
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#F4F7FF]">
                {activeCase.clinicalSummary}
              </p>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-[#A5B0C7]">
                Potential Clinical Signals ({activeCase.findings.length})
              </h3>
              {activeCase.findings.map((f) => (
                <GlassPanel key={f.id} className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#F4F7FF]">{f.title}</span>
                    <span className="font-mono text-xs text-[#19D6A0] tabular-nums">
                      {f.confidence}%
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[#32D9E8]">
                    {f.anatomicalRegion}
                  </p>
                  <p className="mt-1 text-xs text-[#A5B0C7]">{f.evidenceSummary}</p>
                </GlassPanel>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#A5B0C7]">
                  Workflow Priority Override
                </label>
                <GlassSelect
                  value={activeCase.priority}
                  disabled={saving}
                  onChange={(e) =>
                    handleUpdateCase({ priority: e.target.value as PriorityLevel })
                  }
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                  <option value="routine">Routine</option>
                </GlassSelect>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">
                  Clinician Review Notes
                </label>
                <GlassTextarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record clinical correlation or specialist sign-off notes..."
                  className="mt-1"
                />
              </div>

              <div className="flex flex-wrap gap-2.5">
                <GlassButton
                  type="button"
                  variant="primary"
                  disabled={saving}
                  onClick={() => handleUpdateCase({ reviewStatus: 'completed' })}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Sign Off Review</span>
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="danger"
                  disabled={saving}
                  onClick={() => handleUpdateCase({ reviewStatus: 'escalated' })}
                >
                  Escalate
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
