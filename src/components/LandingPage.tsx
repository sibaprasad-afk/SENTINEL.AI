import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  FileCheck2,
  FileSearch,
  KeyRound,
  Layers,
  Lock,
  Menu,
  Shield,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import type { PriorityLevel } from '../types';
import { AmbientBackground } from './AmbientBackground';
import { HeroDashboardPreview } from './HeroDashboardPreview';
import { PriorityLabel } from './PriorityBadge';
import { SentinelLogo } from './SentinelLogo';
import {
  GlassButton,
  GlassCard,
  GlassDropdown,
  GlassPanel,
  GlassTable,
} from './glass/GlassPrimitives';

interface LandingPageProps {
  previewMetrics: {
    totalCases: number;
    awaitingReview: number;
    highPriority: number;
    completedReviews: number;
  };
  onLaunchDemo: () => void;
  onOpenAuth: () => void;
  onOpenRequestDemo: () => void;
  demoLoading: boolean;
}

interface ShowcaseStudy {
  id: string;
  tabLabel: string;
  modality: string;
  studyTitle: string;
  imageUrl: string;
  confidence: number;
  dataQuality: string;
  qualityWarning: string | null;
  findings: Array<{
    title: string;
    region: string;
    severity: PriorityLevel;
    confidence: number;
    evidence: string;
  }>;
}

const SHOWCASE_STUDIES: ShowcaseStudy[] = [
  {
    id: 'cardiac',
    tabLabel: 'Cardiac MRI',
    modality: 'Cardiac MRI · 4-Chamber Perfusion',
    studyTitle: 'Synthetic Case SNT-0891 · Myocardial Perfusion Evaluation',
    imageUrl: '/src/assets/images/cardiac_mri_sample_1794899382406.jpg',
    confidence: 94,
    dataQuality: 'Optimal Acquisition · Zero motion blur',
    qualityWarning: null,
    findings: [
      {
        title: 'Anterior-Septal Perfusion Asymmetry',
        region: 'Left Ventricular Anterior Wall',
        severity: 'critical',
        confidence: 94,
        evidence:
          '24% delayed signal wash-in compared with lateral myocardial reference contour; correlates with elevated troponin trend.',
      },
      {
        title: 'Mild End-Systolic Chamber Dilation',
        region: 'Left Ventricle',
        severity: 'high',
        confidence: 88,
        evidence: 'Chamber ratio slightly above age-adjusted baseline; recommend full cine EF quantification.',
      },
    ],
  },
  {
    id: 'chest',
    tabLabel: 'Chest Radiograph',
    modality: 'AP Thoracic Radiograph',
    studyTitle: 'Synthetic Case SNT-0890 · Thoracic Triage Screen',
    imageUrl: '/src/assets/images/chest_xray_sample_1794899382638.jpg',
    confidence: 91,
    dataQuality: 'Acceptable · 1 Quality Advisory',
    qualityWarning:
      'Mild inspiratory under-expansion detected; lower-zone pulmonary markings may appear accentuated.',
    findings: [
      {
        title: 'Right Infrahilar Interstitial Prominence',
        region: 'Right Lower Lung Zone',
        severity: 'high',
        confidence: 91,
        evidence:
          'Localized linear opacity increase relative to contralateral parenchyma; flagged for priority radiologist read.',
      },
      {
        title: 'Borderline Cardiothoracic Ratio (0.52)',
        region: 'Cardiac Silhouette',
        severity: 'moderate',
        confidence: 84,
        evidence: 'Account for anteroposterior projection magnification during clinical confirmation.',
      },
    ],
  },
  {
    id: 'brain',
    tabLabel: 'Brain MRI',
    modality: 'Axial T2-FLAIR Neuroimaging',
    studyTitle: 'Synthetic Case SNT-0887 · Structural Baseline Screen',
    imageUrl: '/src/assets/images/brain_mri_sample_1794899382930.jpg',
    confidence: 87,
    dataQuality: 'Optimal Acquisition · Symmetric axial plane',
    qualityWarning: null,
    findings: [
      {
        title: 'Punctate Periventricular White Matter Foci',
        region: 'Bilateral Centrum Semiovale',
        severity: 'moderate',
        confidence: 87,
        evidence:
          'Two sub-3mm hyperintense foci without mass effect or midline shift; consistent with chronic microvascular or migraine-associated baseline.',
      },
    ],
  },
];

const PRIORITY_ROWS: Array<{
  code: string;
  study: string;
  modality: string;
  category: PriorityLevel;
  signal: string;
  confidence: number;
}> = [
  {
    code: 'SNT-2026-0891',
    study: '4-Chamber Myocardial Perfusion',
    modality: 'Cardiac MRI',
    category: 'critical',
    signal: 'Anterior-septal perfusion asymmetry',
    confidence: 94,
  },
  {
    code: 'SNT-2026-0890',
    study: 'AP Thoracic Radiograph',
    modality: 'Chest Radiograph',
    category: 'high',
    signal: 'Right infrahilar interstitial prominence',
    confidence: 91,
  },
  {
    code: 'SNT-2026-0889',
    study: 'Post-Op Sepsis Biomarker Batch',
    modality: 'Clinical Dataset',
    category: 'high',
    signal: 'Lactate >= 2.4 mmol/L & CRP cluster (4 rows)',
    confidence: 89,
  },
  {
    code: 'SNT-2026-0887',
    study: 'Axial T2-FLAIR Neuroimaging',
    modality: 'Brain MRI',
    category: 'moderate',
    signal: 'Punctate white matter foci without mass effect',
    confidence: 87,
  },
  {
    code: 'SNT-2026-0884',
    study: 'Baseline Thoracic Screening',
    modality: 'Chest Radiograph',
    category: 'routine',
    signal: 'No acute cardiopulmonary signal detected',
    confidence: 96,
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  previewMetrics,
  onLaunchDemo,
  onOpenAuth,
  onOpenRequestDemo,
  demoLoading,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeShowcaseId, setActiveShowcaseId] = useState<string>('cardiac');
  const [activePriorityFilter, setActivePriorityFilter] = useState<PriorityLevel | 'all'>('all');

  const scrollTo = (selector: string) => {
    setMobileMenuOpen(false);
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeShowcase =
    SHOWCASE_STUDIES.find((s) => s.id === activeShowcaseId) || SHOWCASE_STUDIES[0];

  const filteredPriorityRows =
    activePriorityFilter === 'all'
      ? PRIORITY_ROWS
      : PRIORITY_ROWS.filter((r) => r.category === activePriorityFilter);

  return (
    <div className="relative min-h-screen text-[#F4F7FF] overflow-x-hidden">
      <AmbientBackground variant="landing" />

      {/* GLASS TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(9,15,30,0.68)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-10">
          <a href="#top" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19D6A0]">
            <SentinelLogo />
          </a>

          <nav className="hidden lg:flex items-center gap-7">
            <GlassDropdown
              label="Platform"
              items={[
                {
                  title: 'Clinical Intelligence Overview',
                  subtitle: 'Unified triage across medical imaging and clinical datasets',
                  onClick: () => scrollTo('#platform'),
                },
                {
                  title: 'Image Analysis Workspace',
                  subtitle: 'Interactive findings, confidence calibration, and quality flags',
                  onClick: () => scrollTo('#clinical-intelligence'),
                },
                {
                  title: 'Case Prioritization Queue',
                  subtitle: 'Configurable Critical, High, Moderate, and Routine workflows',
                  onClick: () => scrollTo('#priority-intelligence'),
                },
              ]}
            />
            <GlassDropdown
              label="Solutions"
              items={[
                {
                  title: 'Radiology & Thoracic Triage',
                  subtitle: 'Expedite review of urgent chest radiographs and MRI studies',
                  onClick: () => scrollTo('#clinical-intelligence'),
                },
                {
                  title: 'Cardiovascular Telemetry',
                  subtitle: 'Correlate serial troponin panels with myocardial perfusion cues',
                  onClick: () => scrollTo('#hero-preview'),
                },
                {
                  title: 'Open Live Clinical Workspace',
                  subtitle: 'Inspect authenticated workflows with synthetic demo records',
                  onClick: onLaunchDemo,
                },
              ]}
            />
            <GlassDropdown
              label="Technology"
              items={[
                {
                  title: 'Four-Step Analysis Pipeline',
                  subtitle: 'From approved data ingestion to clinician sign-off',
                  onClick: () => scrollTo('#how-it-works'),
                },
                {
                  title: 'Explainable Signal Evidence',
                  subtitle: 'Transparent rationale and data quality warnings per finding',
                  onClick: () => scrollTo('#clinical-intelligence'),
                },
                {
                  title: 'Security & Clinical Oversight',
                  subtitle: 'Role-based access, audit trails, and human-in-the-loop control',
                  onClick: () => scrollTo('#trust-security'),
                },
              ]}
            />
            <GlassDropdown
              label="Resources"
              items={[
                {
                  title: 'Clinical Governance Overview',
                  subtitle: 'Decision-support boundaries and non-autonomous workflow design',
                  onClick: () => scrollTo('#trust-security'),
                },
                {
                  title: 'Clinician Authentication Portal',
                  subtitle: 'Sign in, register clinician profile, or reset credentials',
                  onClick: onOpenAuth,
                },
              ]}
            />
            <a
              href="#trust-security"
              className="py-2 text-sm font-medium text-[#A5B0C7] transition-colors hover:text-[#F4F7FF] whitespace-nowrap shrink-0"
            >
              About
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <GlassButton
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenRequestDemo}
              className="hidden sm:inline-flex px-4 py-2"
            >
              Request Demo
            </GlassButton>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-[rgba(19,29,49,0.65)] text-[#F4F7FF]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[rgba(9,15,30,0.92)] backdrop-blur-2xl px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => scrollTo('#platform')}
                className="rounded-xl border border-white/10 bg-[rgba(19,29,49,0.6)] px-3 py-2.5 text-left text-sm font-medium text-[#F4F7FF]"
              >
                Platform
              </button>
              <button
                type="button"
                onClick={() => scrollTo('#how-it-works')}
                className="rounded-xl border border-white/10 bg-[rgba(19,29,49,0.6)] px-3 py-2.5 text-left text-sm font-medium text-[#F4F7FF]"
              >
                Technology
              </button>
              <button
                type="button"
                onClick={() => scrollTo('#clinical-intelligence')}
                className="rounded-xl border border-white/10 bg-[rgba(19,29,49,0.6)] px-3 py-2.5 text-left text-sm font-medium text-[#F4F7FF]"
              >
                Solutions
              </button>
              <button
                type="button"
                onClick={() => scrollTo('#trust-security')}
                className="rounded-xl border border-white/10 bg-[rgba(19,29,49,0.6)] px-3 py-2.5 text-left text-sm font-medium text-[#F4F7FF]"
              >
                Trust &amp; About
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <GlassButton
                type="button"
                variant="primary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLaunchDemo();
                }}
                className="flex-1"
              >
                Launch Clinical Demo
              </GlassButton>
              <GlassButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRequestDemo();
                }}
                className="flex-1"
              >
                Request Demo
              </GlassButton>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <main id="top" className="relative z-10">
        <section className="mx-auto max-w-[1440px] px-4 pt-10 pb-16 sm:px-6 lg:px-10 lg:pt-14 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* LEFT COLUMN */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-medium tracking-wide text-[#32D9E8]">
                  Clinical Intelligence &amp; Prioritization Platform
                </p>

                <h1
                  className="mt-4 font-display font-bold tracking-tight text-[#F4F7FF] leading-[1.06]"
                  style={{ fontSize: 'clamp(2.45rem, 4.2vw, 3.85rem)', textWrap: 'balance' }}
                >
                  Smarter Care.
                  <br />
                  <span
                    className="text-[#19D6A0]"
                    style={{ textShadow: '0 0 36px rgba(25, 214, 160, 0.38)' }}
                  >
                    Faster Decisions.
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#A5B0C7]">
                  Transform medical images and clinical datasets into actionable intelligence.
                  Identify potential disease signals, understand clinical evidence and prioritize
                  cases that need further assessment.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3.5">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => scrollTo('#platform')}
                  >
                    Explore Platform
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={demoLoading}
                    onClick={onLaunchDemo}
                  >
                    <span>{demoLoading ? 'Starting Clinical Session...' : 'Launch Clinical Demo'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </GlassButton>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-xs font-medium text-[#A5B0C7] underline underline-offset-4 hover:text-[#32D9E8] whitespace-nowrap"
                  >
                    Clinician Sign In
                  </button>
                </div>

                {/* Four Glass Feature Indicators */}
                <div className="mt-9 grid grid-cols-2 gap-3 border-t border-white/10 pt-6">
                  {[
                    { label: 'AI Image Intelligence', Icon: FileSearch, color: '#19D6A0' },
                    { label: 'Clinical Data Analysis', Icon: Database, color: '#32D9E8' },
                    { label: 'Priority Intelligence', Icon: Layers, color: '#A879FF' },
                    { label: 'Explainable AI', Icon: Eye, color: '#4F9BFF' },
                  ].map(({ label, Icon, color }) => (
                    <GlassPanel key={label} className="flex items-center gap-2.5 px-3 py-2.5">
                      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                      <span className="text-xs sm:text-[13px] font-medium text-[#F4F7FF] truncate">
                        {label}
                      </span>
                    </GlassPanel>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#A5B0C7]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#19D6A0]" />
                  Evidence-driven analysis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-[#32D9E8]" />
                  Human-led decisions
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#A879FF]" />
                  Secure clinical workflows
                </span>
              </div>
            </motion.div>

            {/* RIGHT COLUMN */}
            <div id="hero-preview" className="lg:col-span-7">
              <HeroDashboardPreview metrics={previewMetrics} onLaunchDemo={onLaunchDemo} />
            </div>
          </div>
        </section>

        {/* SECTION 1 — THE INTELLIGENCE PLATFORM */}
        <section id="platform" className="border-t border-white/10 py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-[#19D6A0]">
                The Intelligence Platform
              </p>
              <h2
                className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F7FF]"
                style={{ textWrap: 'balance' }}
              >
                One Platform. Clearer Clinical Intelligence.
              </h2>
              <p className="mt-3 text-base text-[#A5B0C7]">
                Designed to surface potential disease cues early while preserving specialist
                oversight across every radiology study and tabular biomarker cohort.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: 'Medical Image Intelligence',
                  desc: 'Analyze thoracic radiographs, cardiac MRI, and neuroimaging studies to highlight subtle anatomical regions requiring closer specialist review.',
                  meta: 'Multimodal Vision · Quality Checks',
                  accent: 'emerald' as const,
                  color: '#19D6A0',
                  Icon: FileSearch,
                },
                {
                  title: 'Clinical Dataset Analysis',
                  desc: 'Ingest tabular lab cohorts, serial troponin panels, and ICU vitals to detect abnormal biomarker trajectories and missingness risks.',
                  meta: 'CSV & Cohort Telemetry · Outlier Signals',
                  accent: 'cyan' as const,
                  color: '#32D9E8',
                  Icon: Database,
                },
                {
                  title: 'Explainable Clinical Signals',
                  desc: 'Inspect structured evidence summaries, anatomical localization cues, and calibrated model confidence intervals before signing off.',
                  meta: 'Transparent Rationale · Non-Autonomous',
                  accent: 'purple' as const,
                  color: '#A879FF',
                  Icon: Sparkles,
                },
                {
                  title: 'Intelligent Case Prioritization',
                  desc: 'Route studies into Critical, High, Moderate, and Routine workflow queues so urgent cases reach attending specialists sooner.',
                  meta: 'Configurable Triage · Audit Logged',
                  accent: 'blue' as const,
                  color: '#4F9BFF',
                  Icon: Layers,
                },
              ].map(({ title, desc, meta, accent, color, Icon }) => (
                <GlassCard
                  key={title}
                  accent={accent}
                  className="group flex flex-col justify-between p-6 hover:-translate-y-1"
                >
                  <div>
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-[#090F1E]/80"
                      style={{ color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold text-[#F4F7FF]">
                      {title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#A5B0C7]">{desc}</p>
                  </div>
                  <div className="mt-6 border-t border-white/10 pt-3 flex items-center justify-between text-xs text-[#32D9E8]">
                    <span>{meta}</span>
                    <button
                      type="button"
                      onClick={onLaunchDemo}
                      aria-label={`Try ${title}`}
                      className="text-[#A5B0C7] group-hover:text-[#19D6A0] transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 2 — HOW IT WORKS */}
        <section id="how-it-works" className="border-t border-white/10 py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-[#32D9E8]">How It Works</p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F7FF]">
                  Structured Clinical Decision Support in Four Steps
                </h2>
              </div>
              <p className="max-w-md text-sm text-[#A5B0C7]">
                Every step records immutable audit provenance and keeps licensed clinicians in full
                diagnostic authority.
              </p>
            </div>

            <div className="relative mt-14">
              <div
                aria-hidden="true"
                className="hidden lg:block absolute top-9 left-12 right-12 h-[1px] bg-gradient-to-r from-[#19D6A0]/60 via-[#32D9E8]/55 to-[#A879FF]/60"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    step: '01',
                    title: 'Upload approved medical data.',
                    desc: 'Ingest de-identified imaging studies or clinical CSV cohorts through role-authenticated clinical endpoints.',
                    accent: 'emerald' as const,
                    color: '#19D6A0',
                  },
                  {
                    step: '02',
                    title: 'AI-powered analysis.',
                    desc: 'Multimodal clinical models evaluate anatomical structures, biomarker slopes, and acquisition quality.',
                    accent: 'cyan' as const,
                    color: '#32D9E8',
                  },
                  {
                    step: '03',
                    title: 'Understand potential clinical signals.',
                    desc: 'Review transparent evidence rationales, calibrated confidence levels, and data quality warnings.',
                    accent: 'purple' as const,
                    color: '#A879FF',
                  },
                  {
                    step: '04',
                    title: 'Prioritize cases for professional review.',
                    desc: 'Route flagged cases into Critical, High, Moderate, or Routine clinical queues for attending sign-off.',
                    accent: 'blue' as const,
                    color: '#4F9BFF',
                  },
                ].map((item) => (
                  <GlassCard key={item.step} accent={item.accent} className="relative p-6">
                    <div
                      className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-[#090F1E]/85 font-mono text-base font-semibold"
                      style={{ color: item.color }}
                    >
                      {item.step}
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold text-[#F4F7FF]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#A5B0C7]">{item.desc}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — CLINICAL INTELLIGENCE */}
        <section id="clinical-intelligence" className="border-t border-white/10 py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-medium tracking-wide text-[#19D6A0]">
                  Clinical Intelligence Workspace
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F7FF]">
                  Inspect Image Evidence &amp; Quality Before You Sign Off
                </h2>
              </div>

              <div className="inline-flex rounded-xl glass-surface p-1 self-start">
                {SHOWCASE_STUDIES.map((study) => (
                  <button
                    key={study.id}
                    type="button"
                    onClick={() => setActiveShowcaseId(study.id)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      study.id === activeShowcase.id
                        ? 'bg-[#19D6A0] text-[#050814] font-semibold'
                        : 'text-[#A5B0C7] hover:text-[#F4F7FF]'
                    }`}
                  >
                    {study.tabLabel}
                  </button>
                ))}
              </div>
            </div>

            <GlassCard accent="cyan" elevated className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-7">
              {/* Left: Imaging Preview */}
              <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-white/10 bg-[#050814]/85 p-4">
                <div className="flex items-center justify-between text-xs text-[#A5B0C7] pb-3 border-b border-white/10">
                  <span className="font-mono text-[#32D9E8]">{activeShowcase.modality}</span>
                  <span>Synthetic Demo Study</span>
                </div>

                <div className="relative my-4 aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black">
                  <img
                    src={activeShowcase.imageUrl}
                    alt={`${activeShowcase.modality} clinical imaging preview`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3">
                    <p className="font-mono text-[11px] text-[#F4F7FF]">
                      {activeShowcase.studyTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#A5B0C7]">
                  <span>Acquisition Check</span>
                  <span className="font-medium text-[#32D9E8]">{activeShowcase.dataQuality}</span>
                </div>
              </div>

              {/* Right: Evidence & Signals */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <span className="text-xs text-[#A5B0C7]">Calibrated Model Confidence</span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-mono text-3xl font-semibold text-[#19D6A0] tabular-nums">
                          {activeShowcase.confidence}%
                        </span>
                        <span className="text-xs text-[#A5B0C7]">
                          Decision-support index (non-diagnostic)
                        </span>
                      </div>
                    </div>

                    <GlassButton type="button" variant="secondary" size="sm" onClick={onLaunchDemo}>
                      <span>Analyze Your Own Image</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#19D6A0]" />
                    </GlassButton>
                  </div>

                  {activeShowcase.qualityWarning && (
                    <div className="flex items-start gap-3 rounded-xl border border-[#F6BE58]/35 bg-[#F6BE58]/10 p-3.5">
                      <AlertTriangle className="h-4 w-4 text-[#F6BE58] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#F6BE58]">Data Quality Warning</p>
                        <p className="mt-0.5 text-xs text-[#F4F7FF]/90">
                          {activeShowcase.qualityWarning}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-xs font-medium tracking-wide text-[#A5B0C7]">
                      Potential Findings &amp; Clinical Evidence
                    </h3>
                    {activeShowcase.findings.map((finding) => (
                      <GlassPanel key={finding.title} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-display text-sm font-semibold text-[#F4F7FF]">
                            {finding.title}
                          </h4>
                          <div className="flex items-center gap-3">
                            <PriorityLabel priority={finding.severity} compact />
                            <span className="font-mono text-xs text-[#A5B0C7] tabular-nums">
                              {finding.confidence}% conf.
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-[#32D9E8]">
                          Region: {finding.region}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-[#A5B0C7]">
                          {finding.evidence}
                        </p>
                      </GlassPanel>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[#77849E]">
                  All outputs in this showcase use synthetic demonstration studies. Licensed
                  clinician verification governs all clinical decisions.
                </p>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* SECTION 4 — PRIORITY INTELLIGENCE */}
        <section id="priority-intelligence" className="border-t border-white/10 py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-medium tracking-wide text-[#A879FF]">
                  Priority Intelligence
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F7FF]">
                  Configurable Clinical Review Workflows
                </h2>
                <p className="mt-3 text-sm text-[#A5B0C7]">
                  Critical, High, Moderate, and Routine are configurable clinical review workflow
                  categories designed to organize specialist reading queues—never autonomous
                  diagnoses.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 rounded-xl glass-surface p-1 self-start">
                {(
                  [
                    { id: 'all', label: 'All Categories' },
                    { id: 'critical', label: 'Critical' },
                    { id: 'high', label: 'High' },
                    { id: 'moderate', label: 'Moderate' },
                    { id: 'routine', label: 'Routine' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivePriorityFilter(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      activePriorityFilter === tab.id
                        ? 'bg-[rgba(28,39,62,0.85)] text-[#19D6A0] border border-[#19D6A0]/35'
                        : 'text-[#A5B0C7] hover:text-[#F4F7FF]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'critical' as const,
                  title: 'Critical',
                  desc: 'Immediate specialist escalation queue for high-acuity imaging or biomarker deltas.',
                  color: '#FF647C',
                  accent: 'critical' as const,
                  Icon: AlertOctagon,
                },
                {
                  id: 'high' as const,
                  title: 'High',
                  desc: 'Expedited review queue for notable multi-signal patterns requiring prompt correlation.',
                  color: '#F6BE58',
                  accent: 'warning' as const,
                  Icon: AlertTriangle,
                },
                {
                  id: 'moderate' as const,
                  title: 'Moderate',
                  desc: 'Standard prioritized worklist for non-urgent findings or longitudinal comparisons.',
                  color: '#32D9E8',
                  accent: 'cyan' as const,
                  Icon: Clock,
                },
                {
                  id: 'routine' as const,
                  title: 'Routine',
                  desc: 'Baseline screening studies with nominal signals queued for standard verification.',
                  color: '#19D6A0',
                  accent: 'emerald' as const,
                  Icon: CheckCircle2,
                },
              ].map(({ id, title, desc, color, accent, Icon }) => (
                <GlassCard
                  key={id}
                  accent={activePriorityFilter === id ? accent : 'none'}
                  onClick={() =>
                    setActivePriorityFilter((prev) => (prev === id ? 'all' : id))
                  }
                  className="p-5 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-semibold text-[#F4F7FF]">
                      {title}
                    </span>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#A5B0C7]">{desc}</p>
                </GlassCard>
              ))}
            </div>

            <div className="mt-6">
              <GlassTable
                headers={[
                  { label: 'Case ID (Demo)' },
                  { label: 'Study / Cohort' },
                  { label: 'Modality' },
                  { label: 'Primary Signal' },
                  { label: 'Workflow Category' },
                  { label: 'Confidence', align: 'right' },
                ]}
              >
                {filteredPriorityRows.map((row) => (
                  <tr key={row.code} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#32D9E8]">{row.code}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#F4F7FF]">{row.study}</td>
                    <td className="px-4 py-3 text-xs text-[#A5B0C7]">{row.modality}</td>
                    <td className="px-4 py-3 text-xs text-[#A5B0C7]">{row.signal}</td>
                    <td className="px-4 py-3">
                      <PriorityLabel priority={row.category} compact />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#F4F7FF] tabular-nums">
                      {row.confidence}%
                    </td>
                  </tr>
                ))}
              </GlassTable>
            </div>
          </div>
        </section>

        {/* SECTION 5 — TRUST AND SECURITY */}
        <section id="trust-security" className="border-t border-white/10 py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-[#32D9E8]">
                Trust &amp; Clinical Governance
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F7FF]">
                Built Around Controlled Access and Human Oversight
              </h2>
              <p className="mt-3 text-sm text-[#A5B0C7]">
                Every deployment enforces verifiable governance controls without claiming unverified
                third-party certifications.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  title: 'Role-Based Access',
                  desc: 'Scoped clinician permissions separate attending sign-off, intake review, and administrative workflow settings.',
                  Icon: KeyRound,
                  color: '#19D6A0',
                },
                {
                  title: 'Secure Data Handling',
                  desc: 'Authenticated API routes and server-side AI inference ensure model credentials remain strictly off client browsers.',
                  Icon: Lock,
                  color: '#32D9E8',
                },
                {
                  title: 'Audit Trails',
                  desc: 'Every sign-in, image analysis, dataset ingestion, priority shift, and clinician review is timestamped and logged.',
                  Icon: FileCheck2,
                  color: '#A879FF',
                },
                {
                  title: 'Controlled Access',
                  desc: 'Session tokens and configurable confidence thresholds enforce disciplined workflow routing across departments.',
                  Icon: Shield,
                  color: '#4F9BFF',
                },
                {
                  title: 'Human Clinical Oversight',
                  desc: 'SENTINEL AI surfaces decision-support signals only; licensed clinicians retain 100% diagnostic authority.',
                  Icon: UserCheck,
                  color: '#19D6A0',
                },
              ].map(({ title, desc, Icon, color }) => (
                <GlassCard key={title} className="p-5">
                  <Icon className="h-5 w-5" style={{ color }} />
                  <h3 className="mt-4 font-display text-base font-semibold text-[#F4F7FF]">
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#A5B0C7]">{desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6 — FINAL CALL TO ACTION */}
        <section className="border-t border-white/10 py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <GlassCard accent="emerald" elevated className="relative overflow-hidden px-6 py-14 sm:px-12 text-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-65"
                style={{
                  background:
                    'radial-gradient(circle at 50% 0%, rgba(25, 214, 160, 0.18), transparent 60%)',
                }}
              />
              <div className="relative z-10 mx-auto max-w-2xl">
                <Activity className="mx-auto h-8 w-8 text-[#19D6A0]" />
                <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F7FF]">
                  Better Clinical Intelligence Starts Here.
                </h2>
                <p className="mt-3 text-base text-[#A5B0C7]">
                  Enter the interactive SENTINEL AI workspace to analyze medical images, stratify
                  clinical datasets, and manage prioritized patient queues.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                  <GlassButton type="button" variant="secondary" size="lg" onClick={onOpenRequestDemo}>
                    Explore SENTINEL
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={demoLoading}
                    onClick={onLaunchDemo}
                  >
                    <span>{demoLoading ? 'Launching...' : 'Launch Demo'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>
      </main>

      {/* QUIET GLASS FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-[rgba(5,8,20,0.75)] backdrop-blur-xl py-12">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            <div className="md:col-span-2">
              <SentinelLogo />
              <p className="mt-3 max-w-md text-xs leading-relaxed text-[#A5B0C7]">
                SENTINEL AI Clinical Intelligence &amp; Prioritization Platform provides automated
                imaging and dataset signal support for licensed healthcare professionals. Not a
                standalone diagnostic medical device.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#F4F7FF]">Platform</h4>
              <ul className="mt-3 space-y-2 text-xs text-[#A5B0C7]">
                <li>
                  <a href="#platform" className="hover:text-[#19D6A0]">
                    Intelligence Capabilities
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-[#19D6A0]">
                    Workflow Pipeline
                  </a>
                </li>
                <li>
                  <a href="#clinical-intelligence" className="hover:text-[#19D6A0]">
                    Image Analysis Showcase
                  </a>
                </li>
                <li>
                  <a href="#priority-intelligence" className="hover:text-[#19D6A0]">
                    Priority Categories
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#F4F7FF]">Contact &amp; Governance</h4>
              <ul className="mt-3 space-y-2 text-xs text-[#A5B0C7]">
                <li>clinical-support@sentinel-ai.health</li>
                <li>
                  <button type="button" onClick={onOpenAuth} className="text-left hover:text-[#32D9E8]">
                    Clinician Portal Sign-In
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenRequestDemo}
                    className="text-left hover:text-[#19D6A0]"
                  >
                    Request Institutional Evaluation
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#77849E]">
            <span>© 2026 SENTINEL AI Clinical Systems. All rights reserved.</span>
            <span>Decision-Support Interface · Human-Led Clinical Oversight</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
