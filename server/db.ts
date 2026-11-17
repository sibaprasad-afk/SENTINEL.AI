import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AuditLogEntry,
  ClinicalCase,
  ClinicianUser,
  DatasetAnalysisRecord,
  ImageAnalysisRecord,
  NotificationItem,
  PatientRecord,
  PriorityLevel,
  WorkflowSettings,
} from '../src/types.ts';

export interface StoredUser extends ClinicianUser {
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface DemoRequestRecord {
  id: string;
  fullName: string;
  organization: string;
  email: string;
  role: string;
  notes: string;
  createdAt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  sessions: Record<string, { userId: string; createdAt: string }>;
  patients: PatientRecord[];
  cases: ClinicalCase[];
  imageAnalyses: ImageAnalysisRecord[];
  datasetAnalyses: DatasetAnalysisRecord[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  settings: WorkflowSettings;
  demoRequests: DemoRequestRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'sentinel-db.json');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const target = Buffer.from(hash, 'hex');
  if (derived.length !== target.length) return false;
  return crypto.timingSafeEqual(derived, target);
}

function buildInitialSeed(): DatabaseState {
  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  const demoCreds = hashPassword('SentinelDemo2026!');

  const users: StoredUser[] = [
    {
      id: 'usr_dr_sarah',
      name: 'Dr. Sarah Chen, MD',
      email: 'dr.sarah.chen@sentinel-clinical.org',
      role: 'Attending Radiologist',
      department: 'Cardiothoracic & Clinical Intelligence',
      isDemoAccount: true,
      passwordHash: demoCreds.hash,
      passwordSalt: demoCreds.salt,
      createdAt: hoursAgo(720),
    },
  ];

  const patients: PatientRecord[] = [
    {
      id: 'pat_101',
      mrn: 'SYN-48291',
      fullName: 'Eleanor Vance (Demo)',
      age: 64,
      sex: 'F',
      primaryService: 'Cardiology Telemetry',
      riskTier: 'critical',
      latestVitals: {
        heartRateBpm: 108,
        bloodPressure: '148/92',
        spo2Pct: 93,
        troponinNgL: 64.2,
      },
      clinicalContext: 'Synthetic demo profile: Exertional dyspnea and mild anterior chest discomfort; serial troponin elevation.',
      lastUpdated: minsAgo(14),
      isSyntheticDemo: true,
    },
    {
      id: 'pat_102',
      mrn: 'SYN-51904',
      fullName: 'Marcus Sterling (Demo)',
      age: 57,
      sex: 'M',
      primaryService: 'Thoracic Radiology',
      riskTier: 'high',
      latestVitals: {
        heartRateBpm: 92,
        bloodPressure: '134/84',
        spo2Pct: 95,
        troponinNgL: 18.4,
      },
      clinicalContext: 'Synthetic demo profile: Persistent non-productive cough with mild basilar opacification noted on triage intake.',
      lastUpdated: minsAgo(42),
      isSyntheticDemo: true,
    },
    {
      id: 'pat_103',
      mrn: 'SYN-60318',
      fullName: 'Claire Moreau (Demo)',
      age: 49,
      sex: 'F',
      primaryService: 'Neurology Imaging',
      riskTier: 'moderate',
      latestVitals: {
        heartRateBpm: 74,
        bloodPressure: '122/78',
        spo2Pct: 98,
        troponinNgL: 5.1,
      },
      clinicalContext: 'Synthetic demo profile: Episodic migraines with aura; baseline structural T2-FLAIR screening.',
      lastUpdated: hoursAgo(3),
      isSyntheticDemo: true,
    },
    {
      id: 'pat_104',
      mrn: 'SYN-77120',
      fullName: 'David Okafor (Demo)',
      age: 71,
      sex: 'M',
      primaryService: 'Acute Medicine',
      riskTier: 'high',
      latestVitals: {
        heartRateBpm: 101,
        bloodPressure: '112/70',
        spo2Pct: 94,
        troponinNgL: 31.8,
      },
      clinicalContext: 'Synthetic demo profile: Post-operative biomarker surveillance cohort; elevated lactate and CRP trend.',
      lastUpdated: hoursAgo(2),
      isSyntheticDemo: true,
    },
    {
      id: 'pat_105',
      mrn: 'SYN-83402',
      fullName: 'Hannah Lindqvist (Demo)',
      age: 38,
      sex: 'F',
      primaryService: 'Preventive Cardiology',
      riskTier: 'routine',
      latestVitals: {
        heartRateBpm: 66,
        bloodPressure: '116/74',
        spo2Pct: 99,
        troponinNgL: 3.2,
      },
      clinicalContext: 'Synthetic demo profile: Routine annual athletic cardiac structural screening.',
      lastUpdated: hoursAgo(8),
      isSyntheticDemo: true,
    },
  ];

  const cases: ClinicalCase[] = [
    {
      id: 'case_001',
      caseCode: 'SNT-2026-0891',
      patientId: 'pat_101',
      patientName: 'Eleanor Vance (Demo)',
      mrn: 'SYN-48291',
      modality: 'Cardiac MRI',
      sourceType: 'imaging',
      title: '4-Chamber Cine & Myocardial Perfusion Review',
      priority: 'critical',
      reviewStatus: 'awaiting_review',
      modelConfidence: 94,
      dataQuality: 'optimal',
      dataQualityWarnings: [],
      potentialSignalsCount: 3,
      imageUrl: '/src/assets/images/cardiac_mri_sample_1794899382406.jpg',
      assignedClinician: 'Dr. Sarah Chen, MD',
      createdAt: minsAgo(18),
      updatedAt: minsAgo(14),
      clinicalSummary:
        'Synthetic demo signal: Subendocardial perfusion asymmetry detected along the anterior-septal left ventricular wall with mildly reduced regional wall motion index. Recommend prioritized cardiology & radiology correlation.',
      findings: [
        {
          id: 'f_101',
          title: 'Anterior-Septal Perfusion Asymmetry',
          anatomicalRegion: 'Left Ventricular Anterior Wall',
          severity: 'critical',
          confidence: 94,
          evidenceSummary: 'Signal intensity gradient shows 24% delayed wash-in relative to lateral myocardium reference segment.',
          recommendedFocus: 'Correlate with serial high-sensitivity troponin trend and short-axis LGE sequence.',
        },
        {
          id: 'f_102',
          title: 'Mild Left Ventricular End-Systolic Dilation',
          anatomicalRegion: 'Left Ventricle Chamber',
          severity: 'high',
          confidence: 88,
          evidenceSummary: 'Estimated chamber contour ratio slightly exceeds age-adjusted baseline reference.',
          recommendedFocus: 'Verify ejection fraction quantification on full cine stack.',
        },
        {
          id: 'f_103',
          title: 'Trace Pericardial Fluid Rim',
          anatomicalRegion: 'Inferior Pericardial Space',
          severity: 'moderate',
          confidence: 81,
          evidenceSummary: 'Thin hyperintense rim (<4mm) visible along inferior border; non-compressive.',
          recommendedFocus: 'Routine longitudinal comparison with prior baseline.',
        },
      ],
      isSyntheticDemo: true,
    },
    {
      id: 'case_002',
      caseCode: 'SNT-2026-0890',
      patientId: 'pat_102',
      patientName: 'Marcus Sterling (Demo)',
      mrn: 'SYN-51904',
      modality: 'Chest Radiograph',
      sourceType: 'imaging',
      title: 'AP Thoracic Radiograph Triage',
      priority: 'high',
      reviewStatus: 'awaiting_review',
      modelConfidence: 91,
      dataQuality: 'acceptable',
      dataQualityWarnings: ['Mild inspiratory under-expansion may accentuate lower-zone vascular crowding.'],
      potentialSignalsCount: 2,
      imageUrl: '/src/assets/images/chest_xray_sample_1794899382638.jpg',
      assignedClinician: 'Dr. Sarah Chen, MD',
      createdAt: minsAgo(48),
      updatedAt: minsAgo(42),
      clinicalSummary:
        'Synthetic demo signal: Subtle right infrahilar interstitial prominence and borderline cardiothoracic ratio (0.52). Flagged for priority radiologist review.',
      findings: [
        {
          id: 'f_201',
          title: 'Right Infrahilar Interstitial Prominence',
          anatomicalRegion: 'Right Lower Lung Zone',
          severity: 'high',
          confidence: 91,
          evidenceSummary: 'Increased linear opacity density compared to contralateral left lower lobe parenchyma.',
          recommendedFocus: 'Assess clinical infection markers and consider lateral view correlation.',
        },
        {
          id: 'f_202',
          title: 'Borderline Cardiothoracic Ratio',
          anatomicalRegion: 'Mediastinum / Cardiac Silhouette',
          severity: 'moderate',
          confidence: 84,
          evidenceSummary: 'Measured transverse cardiac silhouette spans 52% of thoracic width on AP projection.',
          recommendedFocus: 'Account for AP magnification factor during formal read.',
        },
      ],
      isSyntheticDemo: true,
    },
    {
      id: 'case_003',
      caseCode: 'SNT-2026-0889',
      patientId: 'pat_104',
      patientName: 'David Okafor (Demo)',
      mrn: 'SYN-77120',
      modality: 'Clinical Dataset',
      sourceType: 'dataset',
      title: 'ICU Post-Op Biomarker & Sepsis Panel (Cohort Batch #14)',
      priority: 'high',
      reviewStatus: 'in_review',
      modelConfidence: 89,
      dataQuality: 'optimal',
      dataQualityWarnings: [],
      potentialSignalsCount: 2,
      datasetId: 'ds_001',
      assignedClinician: 'Dr. Sarah Chen, MD',
      createdAt: hoursAgo(2),
      updatedAt: minsAgo(55),
      clinicalSummary:
        'Synthetic demo signal: Multi-parameter biomarker slope detects concurrent CRP elevation, rising serum lactate (>2.4 mmol/L), and mild tachycardia cluster in 4 of 24 monitored post-op rows.',
      findings: [
        {
          id: 'f_301',
          title: 'Elevated Lactate & Inflammatory Biomarker Cluster',
          anatomicalRegion: 'Systemic Metabolic Panel',
          severity: 'high',
          confidence: 89,
          evidenceSummary: 'Four patient observations exhibit simultaneous Lactate >= 2.4 mmol/L and CRP > 85 mg/L.',
          recommendedFocus: 'Prioritize bedside clinical reassessment and repeat blood gas telemetry.',
        },
      ],
      isSyntheticDemo: true,
    },
    {
      id: 'case_004',
      caseCode: 'SNT-2026-0887',
      patientId: 'pat_103',
      patientName: 'Claire Moreau (Demo)',
      mrn: 'SYN-60318',
      modality: 'Brain MRI',
      sourceType: 'imaging',
      title: 'Axial T2-FLAIR Neuroimaging Screen',
      priority: 'moderate',
      reviewStatus: 'awaiting_review',
      modelConfidence: 87,
      dataQuality: 'optimal',
      dataQualityWarnings: [],
      potentialSignalsCount: 1,
      imageUrl: '/src/assets/images/brain_mri_sample_1794899382930.jpg',
      assignedClinician: 'Dr. Sarah Chen, MD',
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
      clinicalSummary:
        'Synthetic demo signal: Symmetric ventricular morphology and intact midline structures; two punctate periventricular white matter hyperintensities within non-specific migraine-associated range.',
      findings: [
        {
          id: 'f_401',
          title: 'Punctate Periventricular White Matter Foci',
          anatomicalRegion: 'Bilateral Centrum Semiovale',
          severity: 'moderate',
          confidence: 87,
          evidenceSummary: 'Two sub-3mm hyperintense foci without mass effect or restricted diffusion appearance.',
          recommendedFocus: 'Routine neuroradiology correlation with migraine history.',
        },
      ],
      isSyntheticDemo: true,
    },
    {
      id: 'case_005',
      caseCode: 'SNT-2026-0884',
      patientId: 'pat_105',
      patientName: 'Hannah Lindqvist (Demo)',
      mrn: 'SYN-83402',
      modality: 'Chest Radiograph',
      sourceType: 'imaging',
      title: 'Baseline Thoracic Screening Radiograph',
      priority: 'routine',
      reviewStatus: 'completed',
      modelConfidence: 96,
      dataQuality: 'optimal',
      dataQualityWarnings: [],
      potentialSignalsCount: 0,
      imageUrl: '/src/assets/images/chest_xray_sample_1794899382638.jpg',
      assignedClinician: 'Dr. Sarah Chen, MD',
      createdAt: hoursAgo(8),
      updatedAt: hoursAgo(6),
      reviewedBy: 'Dr. Sarah Chen, MD',
      reviewedAt: hoursAgo(6),
      reviewNotes: 'Confirmed clear lung fields and normal mediastinal contour. Routine clearance logged.',
      clinicalSummary:
        'Synthetic demo signal: Clear pulmonary parenchyma, sharp costophrenic angles, and unremarkable mediastinal silhouette.',
      findings: [
        {
          id: 'f_501',
          title: 'No Acute Cardiopulmonary Signal Detected',
          anatomicalRegion: 'Bilateral Thorax',
          severity: 'routine',
          confidence: 96,
          evidenceSummary: 'Symmetric lung aeration and normal vascular distribution across all zones.',
          recommendedFocus: 'Standard routine sign-off.',
        },
      ],
      isSyntheticDemo: true,
    },
    {
      id: 'case_006',
      caseCode: 'SNT-2026-0881',
      patientId: 'pat_101',
      patientName: 'Eleanor Vance (Demo)',
      mrn: 'SYN-48291',
      modality: 'Clinical Dataset',
      sourceType: 'dataset',
      title: 'Serial Cardiac Troponin & ECG Rhythm Telemetry',
      priority: 'critical',
      reviewStatus: 'completed',
      modelConfidence: 93,
      dataQuality: 'optimal',
      dataQualityWarnings: [],
      potentialSignalsCount: 2,
      datasetId: 'ds_002',
      assignedClinician: 'Dr. Sarah Chen, MD',
      createdAt: hoursAgo(12),
      updatedAt: hoursAgo(10),
      reviewedBy: 'Dr. Sarah Chen, MD',
      reviewedAt: hoursAgo(10),
      reviewNotes: 'Escalated for urgent Cardiac MRI perfusion study (SNT-2026-0891).',
      clinicalSummary:
        'Synthetic demo signal: Upward troponin trajectory (+48% over 6h) accompanied by mild ST-segment variability.',
      findings: [
        {
          id: 'f_601',
          title: 'Rising Serial Troponin Slope',
          anatomicalRegion: 'Cardiac Biomarker Trajectory',
          severity: 'critical',
          confidence: 93,
          evidenceSummary: 'Troponin I climbed from 43.1 ng/L to 64.2 ng/L within 6-hour interval.',
          recommendedFocus: 'Immediate correlation with 4-chamber Cardiac MRI study.',
        },
      ],
      isSyntheticDemo: true,
    },
  ];

  const imageAnalyses: ImageAnalysisRecord[] = cases
    .filter((c) => c.sourceType === 'imaging' && c.imageUrl)
    .map((c, idx) => ({
      id: `img_ana_00${idx + 1}`,
      caseId: c.id,
      patientId: c.patientId,
      patientName: c.patientName,
      modality: c.modality,
      studyTitle: c.title,
      imageUrl: c.imageUrl!,
      modelName: 'gemini-4-hydrogen',
      modelConfidence: c.modelConfidence,
      dataQuality: c.dataQuality,
      dataQualityWarnings: c.dataQualityWarnings,
      overallPriority: c.priority,
      clinicalSummary: c.clinicalSummary,
      findings: c.findings,
      analyzedBy: 'Dr. Sarah Chen, MD',
      createdAt: c.createdAt,
      isSyntheticDemo: true,
    }));

  const datasetAnalyses: DatasetAnalysisRecord[] = [
    {
      id: 'ds_001',
      caseId: 'case_003',
      datasetName: 'icu_postop_sepsis_cohort_demo.csv',
      clinicalFocus: 'Early inflammatory & lactate trajectory stratification',
      rowCount: 24,
      columnCount: 6,
      columnStats: [
        { column: 'patient_code', type: 'categorical', missingCount: 0, uniqueCount: 24 },
        { column: 'heart_rate_bpm', type: 'numeric', missingCount: 0, min: 64, max: 118, mean: 86.4 },
        { column: 'lactate_mmol_l', type: 'numeric', missingCount: 0, min: 0.9, max: 3.4, mean: 1.72 },
        { column: 'crp_mg_l', type: 'numeric', missingCount: 1, min: 4.2, max: 142.0, mean: 41.8 },
        { column: 'spo2_pct', type: 'numeric', missingCount: 0, min: 91, max: 99, mean: 96.2 },
        { column: 'temp_c', type: 'numeric', missingCount: 0, min: 36.4, max: 38.9, mean: 37.3 },
      ],
      sampleRows: [
        { patient_code: 'OBS-401', heart_rate_bpm: 108, lactate_mmol_l: 3.1, crp_mg_l: 128.4, spo2_pct: 92, temp_c: 38.6 },
        { patient_code: 'OBS-402', heart_rate_bpm: 72, lactate_mmol_l: 1.1, crp_mg_l: 11.2, spo2_pct: 98, temp_c: 36.8 },
        { patient_code: 'OBS-403', heart_rate_bpm: 101, lactate_mmol_l: 2.6, crp_mg_l: 96.0, spo2_pct: 94, temp_c: 38.1 },
        { patient_code: 'OBS-404', heart_rate_bpm: 78, lactate_mmol_l: 1.3, crp_mg_l: 19.5, spo2_pct: 97, temp_c: 37.0 },
      ],
      overallPriority: 'high',
      modelConfidence: 89,
      dataQuality: 'optimal',
      dataQualityWarnings: ['1 missing CRP observation detected in row OBS-417 (4.1% missingness).'],
      cohortSignals: [
        {
          signalName: 'Elevated Lactate & CRP Coupling',
          affectedSubgroup: '4 of 24 observations (OBS-401, OBS-403, OBS-412, OBS-419)',
          severity: 'high',
          confidence: 89,
          evidence: 'Mean lactate 2.85 mmol/L paired with CRP > 90 mg/L and HR > 100 bpm.',
        },
        {
          signalName: 'Mild Desaturation Borderline Cluster',
          affectedSubgroup: '2 observations (SpO2 91%–92%)',
          severity: 'moderate',
          confidence: 82,
          evidence: 'Co-occurs with elevated respiratory rate and febrile temperature > 38.3°C.',
        },
      ],
      clinicalSummary:
        'Synthetic demo dataset analysis: Identified a 16.7% high-priority subgroup exhibiting concurrent hyperlactatemia, elevated CRP, and mild tachycardia suitable for expedited physician review.',
      analyzedBy: 'Dr. Sarah Chen, MD',
      createdAt: hoursAgo(2),
      isSyntheticDemo: true,
    },
    {
      id: 'ds_002',
      caseId: 'case_006',
      datasetName: 'serial_troponin_cardiac_demo.csv',
      clinicalFocus: 'Acute myocardial injury biomarker kinetics',
      rowCount: 16,
      columnCount: 5,
      columnStats: [
        { column: 'interval_hr', type: 'numeric', missingCount: 0, min: 0, max: 12, mean: 6 },
        { column: 'troponin_ng_l', type: 'numeric', missingCount: 0, min: 14.0, max: 64.2, mean: 38.9 },
        { column: 'bnp_pg_ml', type: 'numeric', missingCount: 0, min: 85, max: 410, mean: 230 },
        { column: 'systolic_bp', type: 'numeric', missingCount: 0, min: 118, max: 152, mean: 136 },
        { column: 'st_deviation_mm', type: 'numeric', missingCount: 0, min: 0.1, max: 1.4, mean: 0.72 },
      ],
      sampleRows: [
        { interval_hr: 0, troponin_ng_l: 18.2, bnp_pg_ml: 140, systolic_bp: 132, st_deviation_mm: 0.3 },
        { interval_hr: 3, troponin_ng_l: 43.1, bnp_pg_ml: 260, systolic_bp: 144, st_deviation_mm: 0.9 },
        { interval_hr: 6, troponin_ng_l: 64.2, bnp_pg_ml: 395, systolic_bp: 148, st_deviation_mm: 1.4 },
      ],
      overallPriority: 'critical',
      modelConfidence: 93,
      dataQuality: 'optimal',
      dataQualityWarnings: [],
      cohortSignals: [
        {
          signalName: 'Accelerated Troponin Delta (+252% from baseline)',
          affectedSubgroup: 'Serial Hours 0–6',
          severity: 'critical',
          confidence: 93,
          evidence: 'Progressive rise across three consecutive draws accompanied by ST deviation > 1.0 mm.',
        },
      ],
      clinicalSummary:
        'Synthetic demo dataset analysis: Clear upward troponin kinetic curve warranting immediate cardiology correlation.',
      analyzedBy: 'Dr. Sarah Chen, MD',
      createdAt: hoursAgo(12),
      isSyntheticDemo: true,
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud_001',
      timestamp: minsAgo(14),
      actorName: 'SENTINEL Imaging Engine',
      actorRole: 'Clinical Analysis Provider',
      actionType: 'image_analysis',
      targetId: 'case_001',
      targetLabel: 'SNT-2026-0891 · Cardiac MRI',
      details: 'Completed perfusion signal stratification (94% model confidence). Assigned Critical review priority.',
    },
    {
      id: 'aud_002',
      timestamp: minsAgo(42),
      actorName: 'SENTINEL Imaging Engine',
      actorRole: 'Clinical Analysis Provider',
      actionType: 'image_analysis',
      targetId: 'case_002',
      targetLabel: 'SNT-2026-0890 · Chest Radiograph',
      details: 'Flagged right infrahilar interstitial prominence with 1 data quality note.',
    },
    {
      id: 'aud_003',
      timestamp: minsAgo(55),
      actorName: 'Dr. Sarah Chen, MD',
      actorRole: 'Attending Radiologist',
      actionType: 'dataset_analysis',
      targetId: 'case_003',
      targetLabel: 'icu_postop_sepsis_cohort_demo.csv',
      details: 'Initiated clinical dataset cohort analysis across 24 synthetic patient rows.',
    },
    {
      id: 'aud_004',
      timestamp: hoursAgo(6),
      actorName: 'Dr. Sarah Chen, MD',
      actorRole: 'Attending Radiologist',
      actionType: 'case_reviewed',
      targetId: 'case_005',
      targetLabel: 'SNT-2026-0884 · Routine Thoracic Screen',
      details: 'Completed human clinical review and signed off normal thoracic baseline.',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'not_001',
      title: 'Critical Priority Signal Flagged',
      message: 'SNT-2026-0891 (Eleanor Vance Demo) Cardiac MRI flagged with anterior-septal perfusion asymmetry (94% confidence).',
      severity: 'critical',
      category: 'Priority Signal',
      relatedCaseId: 'case_001',
      read: false,
      createdAt: minsAgo(14),
    },
    {
      id: 'not_002',
      title: 'High Priority Chest Radiograph Ready',
      message: 'SNT-2026-0890 (Marcus Sterling Demo) awaits radiologist review; minor inspiratory quality note logged.',
      severity: 'high',
      category: 'Data Quality',
      relatedCaseId: 'case_002',
      read: false,
      createdAt: minsAgo(42),
    },
    {
      id: 'not_003',
      title: 'Dataset Cohort Outlier Summary',
      message: '4 high-priority observations detected in icu_postop_sepsis_cohort_demo.csv.',
      severity: 'high',
      category: 'Workflow Review',
      relatedCaseId: 'case_003',
      read: true,
      createdAt: hoursAgo(2),
    },
  ];

  const settings: WorkflowSettings = {
    criticalConfidenceThreshold: 88,
    highConfidenceThreshold: 75,
    autoFlagSuboptimalQuality: true,
    requireSecondReadForCritical: true,
    defaultImagingModality: 'Chest Radiograph',
    providerEngineLabel: 'Gemini Clinical Multimodal Engine',
    emailAlertsEnabled: true,
    criticalDesktopAlerts: true,
    compactDensity: false,
    sessionTimeoutMinutes: 60,
    anonymizeExports: true,
  };

  return {
    users,
    sessions: {},
    patients,
    cases,
    imageAnalyses,
    datasetAnalyses,
    auditLogs,
    notifications,
    settings,
    demoRequests: [],
  };
}

const DEFAULT_SETTINGS: WorkflowSettings = {
  criticalConfidenceThreshold: 88,
  highConfidenceThreshold: 75,
  autoFlagSuboptimalQuality: true,
  requireSecondReadForCritical: true,
  defaultImagingModality: 'Chest Radiograph',
  providerEngineLabel: 'Gemini Clinical Multimodal Engine',
  emailAlertsEnabled: true,
  criticalDesktopAlerts: true,
  compactDensity: false,
  sessionTimeoutMinutes: 60,
  anonymizeExports: true,
};

let cachedState: DatabaseState | null = null;

export function getDb(): DatabaseState {
  if (cachedState) return cachedState;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      parsed.settings = {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
      };
      parsed.notifications = (parsed.notifications || []).map((n) => ({
        ...n,
        category: n.category || (n.severity === 'critical' ? 'Priority Signal' : 'Workflow Review'),
      }));
      cachedState = parsed;
      return cachedState;
    } catch {
      // Fallback to fresh seed if corrupted
    }
  }
  cachedState = buildInitialSeed();
  saveDb(cachedState);
  return cachedState;
}

export function saveDb(state: DatabaseState): void {
  cachedState = state;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function appendAuditLog(
  db: DatabaseState,
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): AuditLogEntry {
  const created: AuditLogEntry = {
    id: `aud_${crypto.randomBytes(5).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  db.auditLogs.unshift(created);
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
  return created;
}

export function createPriorityNotification(
  db: DatabaseState,
  payload: {
    title: string;
    message: string;
    severity: PriorityLevel;
    category?: NotificationItem['category'];
    relatedCaseId?: string;
  }
): NotificationItem {
  const item: NotificationItem = {
    id: `not_${crypto.randomBytes(5).toString('hex')}`,
    title: payload.title,
    message: payload.message,
    severity: payload.severity,
    category: payload.category || (payload.severity === 'critical' ? 'Priority Signal' : 'Workflow Review'),
    relatedCaseId: payload.relatedCaseId,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(item);
  return item;
}
