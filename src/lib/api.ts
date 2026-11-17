import type {
  AnalyticsTimePoint,
  AuditLogEntry,
  ClinicalCase,
  ClinicianUser,
  DashboardOverviewData,
  DatasetAnalysisRecord,
  ImageAnalysisRecord,
  NotificationItem,
  PatientRecord,
  PriorityLevel,
  ReviewStatus,
  WorkflowSettings,
} from '../types';

const TOKEN_KEY = 'sentinel_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota issues
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getPreviewMetrics: () =>
    apiFetch<{
      totalCases: number;
      awaitingReview: number;
      highPriority: number;
      completedReviews: number;
      isSyntheticDemo: boolean;
    }>('/api/public/preview-metrics'),

  submitDemoRequest: (payload: {
    fullName: string;
    organization: string;
    email: string;
    role: string;
    notes: string;
  }) =>
    apiFetch<{ message: string }>('/api/demo-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  demoLogin: () =>
    apiFetch<{ token: string; user: ClinicianUser }>('/api/auth/demo-login', {
      method: 'POST',
    }),

  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: ClinicianUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
  }) =>
    apiFetch<{ token: string; user: ClinicianUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetPassword: (email: string, newPassword: string) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    }),

  updateProfile: (payload: { name?: string; role?: string; department?: string }) =>
    apiFetch<{ user: ClinicianUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  me: () => apiFetch<{ user: ClinicianUser }>('/api/auth/me'),

  logout: () =>
    apiFetch<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getOverview: () => apiFetch<DashboardOverviewData>('/api/dashboard/overview'),

  getCases: (params?: { priority?: string; status?: string; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.priority) query.set('priority', params.priority);
    if (params?.status) query.set('status', params.status);
    if (params?.q) query.set('q', params.q);
    const qs = query.toString();
    return apiFetch<{ cases: ClinicalCase[] }>(`/api/cases${qs ? `?${qs}` : ''}`);
  },

  updateCase: (
    id: string,
    payload: { priority?: PriorityLevel; reviewStatus?: ReviewStatus; reviewNotes?: string }
  ) =>
    apiFetch<{ case: ClinicalCase }>(`/api/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getPatients: () => apiFetch<{ patients: PatientRecord[]; cases: ClinicalCase[] }>('/api/patients'),

  createPatient: (payload: {
    fullName: string;
    mrn?: string;
    age: number;
    sex: 'F' | 'M' | 'Other';
    primaryService: string;
    riskTier: PriorityLevel;
    clinicalContext: string;
  }) =>
    apiFetch<{ patient: PatientRecord }>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getImageAnalyses: () => apiFetch<{ analyses: ImageAnalysisRecord[] }>('/api/analyses/images'),

  analyzeImage: (payload: {
    imageInput: string;
    modality: ClinicalCase['modality'];
    studyTitle: string;
    patientId?: string;
    clinicalContext?: string;
  }) =>
    apiFetch<{ analysis: ImageAnalysisRecord; case: ClinicalCase }>('/api/analyze/image', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDatasetAnalyses: () => apiFetch<{ analyses: DatasetAnalysisRecord[] }>('/api/analyses/datasets'),

  analyzeDataset: (payload: {
    datasetName: string;
    clinicalFocus: string;
    csvContent: string;
    patientId?: string;
  }) =>
    apiFetch<{ analysis: DatasetAnalysisRecord; case: ClinicalCase }>('/api/analyze/dataset', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAnalytics: (range: '7d' | '14d' | '30d' = '7d') =>
    apiFetch<{
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
    }>(`/api/analytics?range=${range}`),

  getAuditLogs: () => apiFetch<{ auditLogs: AuditLogEntry[]; cases: ClinicalCase[] }>('/api/audit-logs'),

  getNotifications: () => apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    apiFetch<{ notification: NotificationItem }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    apiFetch<{ ok: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    }),

  clearNotifications: (scope: 'all' | 'read' = 'all') =>
    apiFetch<{ ok: boolean; remaining: number }>(`/api/notifications?scope=${scope}`, {
      method: 'DELETE',
    }),

  getSettings: () => apiFetch<{ settings: WorkflowSettings }>('/api/settings'),

  updateSettings: (payload: Partial<WorkflowSettings>) =>
    apiFetch<{ settings: WorkflowSettings }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  firebaseSession: (payload: {
    uid: string;
    email: string;
    name: string;
    photoUrl?: string;
  }) =>
    apiFetch<{ token: string; user: ClinicianUser }>('/api/auth/firebase-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendChatTurn: (payload: {
    history: Array<{ sender: 'user' | 'assistant'; text: string }>;
    message: string;
    rolePersona: string;
    reasoningMode: 'standard' | 'deep' | 'fast';
    caseContext?: string;
  }) =>
    apiFetch<{ reply: string; modelId: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite' }>(
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  transcribeAudio: (payload: {
    audioBase64: string;
    mimeType: string;
    promptHint?: string;
  }) =>
    apiFetch<{ transcript: string; modelId: 'gemini-3.5-transcribe' }>('/api/transcribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
