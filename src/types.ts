export type PriorityLevel = 'critical' | 'high' | 'moderate' | 'routine';
export type ReviewStatus = 'awaiting_review' | 'in_review' | 'completed' | 'escalated';
export type DataQualityStatus = 'optimal' | 'acceptable' | 'suboptimal';

export interface ClinicianUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isDemoAccount?: boolean;
  firebaseUid?: string;
  photoUrl?: string;
}

export interface ClinicalFinding {
  id: string;
  title: string;
  anatomicalRegion: string;
  severity: PriorityLevel;
  confidence: number;
  evidenceSummary: string;
  recommendedFocus: string;
}

export interface ClinicalCase {
  id: string;
  caseCode: string;
  patientId: string;
  patientName: string;
  mrn: string;
  modality: 'Chest Radiograph' | 'Cardiac MRI' | 'Brain MRI' | 'Clinical Dataset' | 'CT Angiography';
  sourceType: 'imaging' | 'dataset';
  title: string;
  priority: PriorityLevel;
  reviewStatus: ReviewStatus;
  modelConfidence: number;
  dataQuality: DataQualityStatus;
  dataQualityWarnings: string[];
  potentialSignalsCount: number;
  findings: ClinicalFinding[];
  clinicalSummary: string;
  imageUrl?: string;
  datasetId?: string;
  assignedClinician: string;
  createdAt: string;
  updatedAt: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isSyntheticDemo: boolean;
}

export interface PatientRecord {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  sex: 'F' | 'M' | 'Other';
  primaryService: string;
  riskTier: PriorityLevel;
  latestVitals: {
    heartRateBpm: number;
    bloodPressure: string;
    spo2Pct: number;
    troponinNgL: number;
  };
  clinicalContext: string;
  lastUpdated: string;
  isSyntheticDemo: boolean;
}

export interface ImageAnalysisRecord {
  id: string;
  caseId: string;
  patientId: string;
  patientName: string;
  modality: string;
  studyTitle: string;
  imageUrl: string;
  modelName: string;
  modelConfidence: number;
  dataQuality: DataQualityStatus;
  dataQualityWarnings: string[];
  overallPriority: PriorityLevel;
  clinicalSummary: string;
  findings: ClinicalFinding[];
  analyzedBy: string;
  createdAt: string;
  isSyntheticDemo: boolean;
}

export interface DatasetColumnStat {
  column: string;
  type: 'numeric' | 'categorical';
  missingCount: number;
  min?: number;
  max?: number;
  mean?: number;
  uniqueCount?: number;
}

export interface DatasetAnalysisRecord {
  id: string;
  caseId: string;
  datasetName: string;
  clinicalFocus: string;
  rowCount: number;
  columnCount: number;
  columnStats: DatasetColumnStat[];
  sampleRows: Record<string, string | number>[];
  overallPriority: PriorityLevel;
  modelConfidence: number;
  dataQuality: DataQualityStatus;
  dataQualityWarnings: string[];
  cohortSignals: {
    signalName: string;
    affectedSubgroup: string;
    severity: PriorityLevel;
    confidence: number;
    evidence: string;
  }[];
  clinicalSummary: string;
  analyzedBy: string;
  createdAt: string;
  isSyntheticDemo: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionType:
    | 'auth_signin'
    | 'auth_register'
    | 'auth_password_reset'
    | 'image_analysis'
    | 'dataset_analysis'
    | 'case_reviewed'
    | 'priority_updated'
    | 'patient_created'
    | 'settings_updated';
  targetId?: string;
  targetLabel: string;
  previousPriority?: PriorityLevel;
  updatedPriority?: PriorityLevel;
  details: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: PriorityLevel;
  category?: 'Priority Signal' | 'Data Quality' | 'Workflow Review' | 'System';
  relatedCaseId?: string;
  read: boolean;
  createdAt: string;
}

export interface WorkflowSettings {
  criticalConfidenceThreshold: number;
  highConfidenceThreshold: number;
  autoFlagSuboptimalQuality: boolean;
  requireSecondReadForCritical: boolean;
  defaultImagingModality: string;
  providerEngineLabel: string;
  emailAlertsEnabled?: boolean;
  criticalDesktopAlerts?: boolean;
  compactDensity?: boolean;
  sessionTimeoutMinutes?: number;
  anonymizeExports?: boolean;
}

export interface AnalyticsTimePoint {
  date: string;
  imagingVolume: number;
  datasetVolume: number;
  completedReviews: number;
  avgTurnaroundHrs: number;
}

export interface DashboardOverviewData {
  metrics: {
    totalCases: number;
    awaitingReview: number;
    highPriority: number;
    completedReviews: number;
    avgModelConfidence: number;
    potentialSignalsTotal: number;
    optimalQualityPct: number;
  };
  priorityCounts: Record<PriorityLevel, number>;
  activitySeries: AnalyticsTimePoint[];
  recentCases: ClinicalCase[];
  recentActivity: AuditLogEntry[];
  unreadNotifications: number;
}

export type ChatbotPersona =
  | 'triage_specialist'
  | 'radiology_reviewer'
  | 'biomarker_analyst'
  | 'clinical_concierge';

export type ChatbotModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
export type ChatbotReasoningMode = 'standard' | 'deep' | 'fast';

export interface ChatSessionRecord {
  id: string;
  userId: string;
  title: string;
  rolePersona: ChatbotPersona;
  modelId: ChatbotModelId;
  reasoningMode: ChatbotReasoningMode;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  userId: string;
  sender: 'user' | 'assistant';
  text: string;
  modelId: string;
  createdAt: string;
}

export interface TranscriptionRecord {
  id: string;
  userId: string;
  title: string;
  transcript: string;
  mimeType: string;
  durationSec: number;
  modelId: 'gemini-3.5-transcribe';
  createdAt: string;
}

export interface VoiceSessionRecord {
  id: string;
  userId: string;
  title: string;
  voiceName: 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
  transcriptSummary: string;
  turnCount: number;
  modelId: 'gemini-3.8-live';
  createdAt: string;
}
