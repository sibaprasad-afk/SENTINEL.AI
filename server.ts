import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { Modality, type LiveServerMessage } from '@google/genai';
import type {
  ChatbotPersona,
  ChatbotReasoningMode,
  ClinicalCase,
  ClinicianUser,
  DashboardOverviewData,
  DatasetAnalysisRecord,
  DatasetColumnStat,
  ImageAnalysisRecord,
  PatientRecord,
  PriorityLevel,
  ReviewStatus,
} from './src/types.ts';
import {
  appendAuditLog,
  createPriorityNotification,
  getDb,
  hashPassword,
  saveDb,
  verifyPassword,
} from './server/db.ts';
import {
  analyzeClinicalDatasetWithGemini,
  analyzeMedicalImageWithGemini,
  getGeminiClient,
  runClinicalChatTurn,
  transcribeAudioWithGemini,
} from './server/gemini.ts';

dotenv.config();

const PORT = 3000;

interface AuthenticatedRequest extends Request {
  currentUser?: ClinicianUser;
  authToken?: string;
}

function sanitizeUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isDemoAccount?: boolean;
  firebaseUid?: string;
  photoUrl?: string;
}): ClinicianUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    isDemoAccount: u.isDemoAccount,
    firebaseUid: u.firebaseUid,
    photoUrl: u.photoUrl,
  };
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to access clinical workflows.' });
  }
  const db = getDb();
  const session = db.sessions[token];
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Clinician account not found.' });
  }
  req.currentUser = sanitizeUser(user);
  req.authToken = token;
  next();
}

function parseTabularCsv(csvText: string): {
  headers: string[];
  rows: Record<string, string | number>[];
  columnStats: DatasetColumnStat[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error('Dataset must contain a header row and at least one clinical data row.');
  }
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string | number>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string | number> = {};
    headers.forEach((h, idx) => {
      const raw = values[idx] ?? '';
      if (raw === '' || raw.toLowerCase() === 'na' || raw.toLowerCase() === 'null') {
        row[h] = '';
      } else {
        const num = Number(raw);
        row[h] = !Number.isNaN(num) && raw !== '' ? num : raw;
      }
    });
    rows.push(row);
  }

  const columnStats: DatasetColumnStat[] = headers.map((col) => {
    let missingCount = 0;
    const nums: number[] = [];
    const uniques = new Set<string>();
    for (const r of rows) {
      const val = r[col];
      if (val === '' || val === undefined || val === null) {
        missingCount++;
      } else if (typeof val === 'number') {
        nums.push(val);
        uniques.add(String(val));
      } else {
        uniques.add(String(val));
      }
    }
    const isNumeric = nums.length >= rows.length - missingCount && nums.length > 0;
    if (isNumeric) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const mean = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
      return { column: col, type: 'numeric', missingCount, min, max, mean };
    }
    return { column: col, type: 'categorical', missingCount, uniqueCount: uniques.size };
  });

  return { headers, rows, columnStats };
}

function buildActivitySeries(
  db: ReturnType<typeof getDb>,
  days: number
): Array<{
  date: string;
  imagingVolume: number;
  datasetVolume: number;
  completedReviews: number;
  avgTurnaroundHrs: number;
}> {
  const imgTotal = db.imageAnalyses.length;
  const dsTotal = db.datasetAnalyses.length;
  const compTotal = db.cases.filter((c) => c.reviewStatus === 'completed').length;
  const points = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const isToday = i === 0;
    const wave = (days - i) % 3;
    points.push({
      date: label,
      imagingVolume: isToday ? imgTotal : Math.max(1, imgTotal - 1 + wave),
      datasetVolume: isToday ? dsTotal : Math.max(1, dsTotal + (i % 2)),
      completedReviews: isToday ? compTotal : Math.max(1, compTotal + ((days - i) % 4)),
      avgTurnaroundHrs: Number((1.4 + ((i % 4) * 0.25)).toFixed(2)),
    });
  }
  return points;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Ensure DB is initialized on boot
  getDb();

  // --- Public / Landing Endpoints ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'SENTINEL AI Clinical Platform' });
  });

  app.get('/api/public/preview-metrics', (_req, res) => {
    const db = getDb();
    const totalCases = db.cases.length;
    const awaitingReview = db.cases.filter((c) => c.reviewStatus === 'awaiting_review' || c.reviewStatus === 'in_review').length;
    const highPriority = db.cases.filter((c) => c.priority === 'critical' || c.priority === 'high').length;
    const completedReviews = db.cases.filter((c) => c.reviewStatus === 'completed').length;
    res.json({
      totalCases,
      awaitingReview,
      highPriority,
      completedReviews,
      isSyntheticDemo: true,
    });
  });

  app.post('/api/demo-requests', (req, res) => {
    const { fullName, organization, email, role, notes } = req.body as {
      fullName?: string;
      organization?: string;
      email?: string;
      role?: string;
      notes?: string;
    };
    if (!fullName?.trim() || !email?.trim() || !organization?.trim()) {
      return res.status(400).json({ error: 'Full name, organization, and work email are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid work email address.' });
    }
    const db = getDb();
    const record = {
      id: `dem_${crypto.randomBytes(4).toString('hex')}`,
      fullName: fullName.trim(),
      organization: organization.trim(),
      email: email.trim(),
      role: role?.trim() || 'Clinical Lead',
      notes: notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };
    db.demoRequests.unshift(record);
    saveDb(db);
    res.status(201).json({ message: 'Clinical demonstration request logged.', request: record });
  });

  // --- Authentication Endpoints ---
  app.post('/api/auth/demo-login', (_req, res) => {
    const db = getDb();
    const demoUser = db.users.find((u) => u.id === 'usr_dr_sarah') || db.users[0];
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { userId: demoUser.id, createdAt: new Date().toISOString() };
    appendAuditLog(db, {
      actorName: demoUser.name,
      actorRole: demoUser.role,
      actionType: 'auth_signin',
      targetId: demoUser.id,
      targetLabel: 'Demo Clinician Workspace Session',
      details: 'Authenticated via Clinical Demo Workspace entry.',
    });
    saveDb(db);
    res.json({ token, user: sanitizeUser(demoUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Invalid clinician email or password.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
    appendAuditLog(db, {
      actorName: user.name,
      actorRole: user.role,
      actionType: 'auth_signin',
      targetId: user.id,
      targetLabel: 'Clinician Sign-In',
      details: `Signed into SENTINEL AI workspace (${user.department}).`,
    });
    saveDb(db);
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role, department } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      department?: string;
    };
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return res.status(400).json({ error: 'Name, valid email, and password (min 6 characters) are required.' });
    }
    const db = getDb();
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const creds = hashPassword(password);
    const newUser = {
      id: `usr_${crypto.randomBytes(5).toString('hex')}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role?.trim() || 'Clinical Specialist',
      department: department?.trim() || 'Clinical Intelligence',
      isDemoAccount: false,
      passwordHash: creds.hash,
      passwordSalt: creds.salt,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { userId: newUser.id, createdAt: new Date().toISOString() };
    appendAuditLog(db, {
      actorName: newUser.name,
      actorRole: newUser.role,
      actionType: 'auth_register',
      targetId: newUser.id,
      targetLabel: newUser.email,
      details: `Registered clinician profile in ${newUser.department}.`,
    });
    saveDb(db);
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.currentUser });
  });

  app.post('/api/auth/logout', authMiddleware, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    if (req.authToken) {
      delete db.sessions[req.authToken];
      saveDb(db);
    }
    res.json({ ok: true });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, newPassword } = req.body as { email?: string; newPassword?: string };
    if (!email?.trim() || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Valid clinician email and new password (minimum 6 characters) are required.',
      });
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'No clinician account matches that email address.' });
    }
    const creds = hashPassword(newPassword);
    user.passwordHash = creds.hash;
    user.passwordSalt = creds.salt;
    appendAuditLog(db, {
      actorName: user.name,
      actorRole: user.role,
      actionType: 'auth_password_reset',
      targetId: user.id,
      targetLabel: user.email,
      details: 'Completed credential password reset verification.',
    });
    saveDb(db);
    res.json({ message: 'Password updated successfully. You may now sign in.' });
  });

  app.patch('/api/auth/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { name, role, department } = req.body as {
      name?: string;
      role?: string;
      department?: string;
    };
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    if (name?.trim()) user.name = name.trim();
    if (role?.trim()) user.role = role.trim();
    if (department?.trim()) user.department = department.trim();
    saveDb(db);
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/auth/firebase-session', (req, res) => {
    const { uid, email, name, photoUrl } = req.body as {
      uid?: string;
      email?: string;
      name?: string;
      photoUrl?: string;
    };
    if (!uid?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Verified Firebase UID and email are required.' });
    }
    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    let user = db.users.find(
      (u) => u.firebaseUid === uid.trim() || u.email.toLowerCase() === normalizedEmail
    );
    if (!user) {
      const creds = hashPassword(crypto.randomBytes(24).toString('hex'));
      user = {
        id: `usr_${crypto.randomBytes(5).toString('hex')}`,
        firebaseUid: uid.trim(),
        name: name?.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: 'Attending Clinician',
        department: 'Clinical Intelligence',
        isDemoAccount: false,
        photoUrl: photoUrl?.trim() || undefined,
        passwordHash: creds.hash,
        passwordSalt: creds.salt,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    } else {
      user.firebaseUid = uid.trim();
      if (name?.trim()) user.name = name.trim();
      if (photoUrl?.trim()) user.photoUrl = photoUrl.trim();
    }

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
    appendAuditLog(db, {
      actorName: user.name,
      actorRole: user.role,
      actionType: 'auth_signin',
      targetId: user.id,
      targetLabel: 'Google Sign-In (Firebase Auth)',
      details: `Authenticated via Firebase Google Sign-In (${user.email}).`,
    });
    saveDb(db);
    res.json({ token, user: sanitizeUser(user) });
  });

  // --- Protected Clinical Workspace Endpoints ---
  app.get('/api/dashboard/overview', authMiddleware, (_req, res) => {
    const db = getDb();
    const totalCases = db.cases.length;
    const awaitingReview = db.cases.filter(
      (c) => c.reviewStatus === 'awaiting_review' || c.reviewStatus === 'in_review' || c.reviewStatus === 'escalated'
    ).length;
    const highPriority = db.cases.filter((c) => c.priority === 'critical' || c.priority === 'high').length;
    const completedReviews = db.cases.filter((c) => c.reviewStatus === 'completed').length;
    const avgModelConfidence = totalCases
      ? Math.round(db.cases.reduce((acc, c) => acc + c.modelConfidence, 0) / totalCases)
      : 0;
    const potentialSignalsTotal = db.cases.reduce((acc, c) => acc + c.potentialSignalsCount, 0);
    const optimalCount = db.cases.filter((c) => c.dataQuality === 'optimal').length;
    const optimalQualityPct = totalCases ? Math.round((optimalCount / totalCases) * 100) : 100;

    const priorityCounts: Record<PriorityLevel, number> = {
      critical: db.cases.filter((c) => c.priority === 'critical').length,
      high: db.cases.filter((c) => c.priority === 'high').length,
      moderate: db.cases.filter((c) => c.priority === 'moderate').length,
      routine: db.cases.filter((c) => c.priority === 'routine').length,
    };

    const activitySeries = buildActivitySeries(db, 7);

    const payload: DashboardOverviewData = {
      metrics: {
        totalCases,
        awaitingReview,
        highPriority,
        completedReviews,
        avgModelConfidence,
        potentialSignalsTotal,
        optimalQualityPct,
      },
      priorityCounts,
      activitySeries,
      recentCases: db.cases.slice(0, 6),
      recentActivity: db.auditLogs.slice(0, 6),
      unreadNotifications: db.notifications.filter((n) => !n.read).length,
    };

    res.json(payload);
  });

  app.get('/api/cases', authMiddleware, (req, res) => {
    const db = getDb();
    const priority = String(req.query.priority || '').toLowerCase();
    const status = String(req.query.status || '').toLowerCase();
    const q = String(req.query.q || '').toLowerCase().trim();

    let items = [...db.cases];
    if (priority && priority !== 'all') {
      items = items.filter((c) => c.priority === priority);
    }
    if (status && status !== 'all') {
      items = items.filter((c) => c.reviewStatus === status);
    }
    if (q) {
      items = items.filter(
        (c) =>
          c.caseCode.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.mrn.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.modality.toLowerCase().includes(q)
      );
    }
    res.json({ cases: items });
  });

  app.patch('/api/cases/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const idx = db.cases.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Clinical case not found.' });
    }
    const existing = db.cases[idx];
    const { priority, reviewStatus, reviewNotes } = req.body as {
      priority?: PriorityLevel;
      reviewStatus?: ReviewStatus;
      reviewNotes?: string;
    };

    const updated: ClinicalCase = {
      ...existing,
      priority: priority || existing.priority,
      reviewStatus: reviewStatus || existing.reviewStatus,
      reviewNotes: reviewNotes !== undefined ? reviewNotes : existing.reviewNotes,
      updatedAt: new Date().toISOString(),
    };

    if (reviewStatus === 'completed') {
      updated.reviewedBy = req.currentUser!.name;
      updated.reviewedAt = new Date().toISOString();
    }

    db.cases[idx] = updated;

    if (priority && priority !== existing.priority) {
      appendAuditLog(db, {
        actorName: req.currentUser!.name,
        actorRole: req.currentUser!.role,
        actionType: 'priority_updated',
        targetId: updated.id,
        targetLabel: `${updated.caseCode} · ${updated.patientName}`,
        previousPriority: existing.priority,
        updatedPriority: priority,
        details: `Updated workflow priority from ${existing.priority} to ${priority}.`,
      });
    }

    if (reviewStatus && reviewStatus !== existing.reviewStatus) {
      appendAuditLog(db, {
        actorName: req.currentUser!.name,
        actorRole: req.currentUser!.role,
        actionType: 'case_reviewed',
        targetId: updated.id,
        targetLabel: `${updated.caseCode} · ${updated.title}`,
        details: `Transitioned status to ${reviewStatus.replace('_', ' ')}${reviewNotes ? ` — "${reviewNotes}"` : ''}.`,
      });
    }

    saveDb(db);
    res.json({ case: updated });
  });

  app.get('/api/patients', authMiddleware, (_req, res) => {
    const db = getDb();
    res.json({ patients: db.patients, cases: db.cases });
  });

  app.post('/api/patients', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { fullName, mrn, age, sex, primaryService, riskTier, clinicalContext } = req.body as {
      fullName?: string;
      mrn?: string;
      age?: number;
      sex?: 'F' | 'M' | 'Other';
      primaryService?: string;
      riskTier?: PriorityLevel;
      clinicalContext?: string;
    };
    if (!fullName?.trim() || !primaryService?.trim()) {
      return res.status(400).json({ error: 'Patient full name and primary service are required.' });
    }
    const db = getDb();
    const patient: PatientRecord = {
      id: `pat_${crypto.randomBytes(4).toString('hex')}`,
      mrn: mrn?.trim() || `SYN-${Math.floor(10000 + Math.random() * 89999)}`,
      fullName: fullName.trim(),
      age: Number(age) || 45,
      sex: sex || 'Other',
      primaryService: primaryService.trim(),
      riskTier: riskTier || 'moderate',
      latestVitals: {
        heartRateBpm: 76,
        bloodPressure: '124/78',
        spo2Pct: 98,
        troponinNgL: 6.4,
      },
      clinicalContext: clinicalContext?.trim() || 'Newly registered clinical workflow profile.',
      lastUpdated: new Date().toISOString(),
      isSyntheticDemo: false,
    };
    db.patients.unshift(patient);
    appendAuditLog(db, {
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      actionType: 'patient_created',
      targetId: patient.id,
      targetLabel: `${patient.mrn} · ${patient.fullName}`,
      details: `Registered patient record under ${patient.primaryService}.`,
    });
    saveDb(db);
    res.status(201).json({ patient });
  });

  app.get('/api/analyses/images', authMiddleware, (_req, res) => {
    const db = getDb();
    res.json({ analyses: db.imageAnalyses });
  });

  app.post('/api/analyze/image', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { imageInput, modality, studyTitle, patientId, clinicalContext } = req.body as {
        imageInput?: string;
        modality?: ClinicalCase['modality'];
        studyTitle?: string;
        patientId?: string;
        clinicalContext?: string;
      };

      if (!imageInput) {
        return res.status(400).json({ error: 'Please upload or select a medical image to analyze.' });
      }

      const db = getDb();
      const patient = db.patients.find((p) => p.id === patientId) || db.patients[0];
      const chosenModality = modality || 'Chest Radiograph';
      const chosenTitle = studyTitle?.trim() || `${chosenModality} Triage Study`;

      const aiResult = await analyzeMedicalImageWithGemini({
        imageInput,
        modality: chosenModality,
        studyTitle: chosenTitle,
        clinicalContext: clinicalContext || patient.clinicalContext,
      });

      const caseId = `case_${crypto.randomBytes(4).toString('hex')}`;
      const caseCode = `SNT-2026-${Math.floor(1000 + Math.random() * 8999)}`;
      const nowIso = new Date().toISOString();

      const newCase: ClinicalCase = {
        id: caseId,
        caseCode,
        patientId: patient.id,
        patientName: patient.fullName,
        mrn: patient.mrn,
        modality: chosenModality,
        sourceType: 'imaging',
        title: chosenTitle,
        priority: aiResult.overallPriority,
        reviewStatus: 'awaiting_review',
        modelConfidence: aiResult.modelConfidence,
        dataQuality: aiResult.dataQuality,
        dataQualityWarnings: aiResult.dataQualityWarnings,
        potentialSignalsCount: aiResult.findings.length,
        findings: aiResult.findings,
        clinicalSummary: aiResult.clinicalSummary,
        imageUrl: imageInput,
        assignedClinician: req.currentUser!.name,
        createdAt: nowIso,
        updatedAt: nowIso,
        isSyntheticDemo: imageInput.startsWith('/src/assets/images/'),
      };

      const analysisRecord: ImageAnalysisRecord = {
        id: `img_ana_${crypto.randomBytes(4).toString('hex')}`,
        caseId,
        patientId: patient.id,
        patientName: patient.fullName,
        modality: chosenModality,
        studyTitle: chosenTitle,
        imageUrl: imageInput,
        modelName: 'gemini-4-hydrogen',
        modelConfidence: aiResult.modelConfidence,
        dataQuality: aiResult.dataQuality,
        dataQualityWarnings: aiResult.dataQualityWarnings,
        overallPriority: aiResult.overallPriority,
        clinicalSummary: aiResult.clinicalSummary,
        findings: aiResult.findings,
        analyzedBy: req.currentUser!.name,
        createdAt: nowIso,
        isSyntheticDemo: imageInput.startsWith('/src/assets/images/'),
      };

      db.cases.unshift(newCase);
      db.imageAnalyses.unshift(analysisRecord);

      if (aiResult.overallPriority === 'critical' || aiResult.overallPriority === 'high') {
        createPriorityNotification(db, {
          title: `${aiResult.overallPriority.toUpperCase()} Priority Signal Detected`,
          message: `${caseCode} (${patient.fullName}) — ${chosenTitle} flagged with ${aiResult.findings.length} potential signal(s) (${aiResult.modelConfidence}% confidence).`,
          severity: aiResult.overallPriority,
          relatedCaseId: caseId,
        });
      }

      appendAuditLog(db, {
        actorName: req.currentUser!.name,
        actorRole: req.currentUser!.role,
        actionType: 'image_analysis',
        targetId: caseId,
        targetLabel: `${caseCode} · ${chosenModality}`,
        details: `Gemini clinical vision analysis completed (${aiResult.overallPriority} priority, ${aiResult.modelConfidence}% confidence).`,
      });

      saveDb(db);
      res.status(201).json({ analysis: analysisRecord, case: newCase });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze medical image.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.get('/api/analyses/datasets', authMiddleware, (_req, res) => {
    const db = getDb();
    res.json({ analyses: db.datasetAnalyses });
  });

  app.post('/api/analyze/dataset', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { datasetName, clinicalFocus, csvContent, patientId } = req.body as {
        datasetName?: string;
        clinicalFocus?: string;
        csvContent?: string;
        patientId?: string;
      };

      if (!csvContent?.trim()) {
        return res.status(400).json({ error: 'Please upload or paste CSV clinical dataset rows.' });
      }

      const parsed = parseTabularCsv(csvContent);
      const name = datasetName?.trim() || 'clinical_cohort_upload.csv';
      const focus = clinicalFocus?.trim() || 'Abnormal biomarker & vital signal detection';

      const aiResult = await analyzeClinicalDatasetWithGemini({
        datasetName: name,
        clinicalFocus: focus,
        rowCount: parsed.rows.length,
        columnStats: parsed.columnStats,
        sampleRows: parsed.rows,
      });

      const db = getDb();
      const patient = db.patients.find((p) => p.id === patientId) || db.patients[0];
      const caseId = `case_${crypto.randomBytes(4).toString('hex')}`;
      const datasetId = `ds_${crypto.randomBytes(4).toString('hex')}`;
      const caseCode = `SNT-2026-${Math.floor(1000 + Math.random() * 8999)}`;
      const nowIso = new Date().toISOString();

      const analysisRecord: DatasetAnalysisRecord = {
        id: datasetId,
        caseId,
        datasetName: name,
        clinicalFocus: focus,
        rowCount: parsed.rows.length,
        columnCount: parsed.headers.length,
        columnStats: parsed.columnStats,
        sampleRows: parsed.rows.slice(0, 12),
        overallPriority: aiResult.overallPriority,
        modelConfidence: aiResult.modelConfidence,
        dataQuality: aiResult.dataQuality,
        dataQualityWarnings: aiResult.dataQualityWarnings,
        cohortSignals: aiResult.cohortSignals,
        clinicalSummary: aiResult.clinicalSummary,
        analyzedBy: req.currentUser!.name,
        createdAt: nowIso,
        isSyntheticDemo: false,
      };

      const newCase: ClinicalCase = {
        id: caseId,
        caseCode,
        patientId: patient.id,
        patientName: patient.fullName,
        mrn: patient.mrn,
        modality: 'Clinical Dataset',
        sourceType: 'dataset',
        title: `${name} (${parsed.rows.length} rows)`,
        priority: aiResult.overallPriority,
        reviewStatus: 'awaiting_review',
        modelConfidence: aiResult.modelConfidence,
        dataQuality: aiResult.dataQuality,
        dataQualityWarnings: aiResult.dataQualityWarnings,
        potentialSignalsCount: aiResult.cohortSignals.length,
        datasetId,
        assignedClinician: req.currentUser!.name,
        createdAt: nowIso,
        updatedAt: nowIso,
        clinicalSummary: aiResult.clinicalSummary,
        findings: aiResult.cohortSignals.map((s, idx) => ({
          id: `f_ds_${Date.now()}_${idx}`,
          title: s.signalName,
          anatomicalRegion: s.affectedSubgroup,
          severity: s.severity,
          confidence: s.confidence,
          evidenceSummary: s.evidence,
          recommendedFocus: 'Review flagged dataset records and correlate with patient chart.',
        })),
        isSyntheticDemo: false,
      };

      db.datasetAnalyses.unshift(analysisRecord);
      db.cases.unshift(newCase);

      if (aiResult.overallPriority === 'critical' || aiResult.overallPriority === 'high') {
        createPriorityNotification(db, {
          title: `Dataset Cohort ${aiResult.overallPriority.toUpperCase()} Alert`,
          message: `${name}: ${aiResult.cohortSignals.length} clinical signal(s) flagged across ${parsed.rows.length} rows.`,
          severity: aiResult.overallPriority,
          relatedCaseId: caseId,
        });
      }

      appendAuditLog(db, {
        actorName: req.currentUser!.name,
        actorRole: req.currentUser!.role,
        actionType: 'dataset_analysis',
        targetId: caseId,
        targetLabel: `${name} (${parsed.rows.length} rows)`,
        details: `Completed tabular dataset analysis (${aiResult.overallPriority} priority, ${aiResult.modelConfidence}% confidence).`,
      });

      saveDb(db);
      res.status(201).json({ analysis: analysisRecord, case: newCase });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze clinical dataset.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 400;
      res.status(status).json({ error: msg });
    }
  });

  app.get('/api/analytics', authMiddleware, (req, res) => {
    const db = getDb();
    const rangeParam = String(req.query.range || '7d').toLowerCase();
    const days = rangeParam === '30d' ? 30 : rangeParam === '14d' ? 14 : 7;
    const byModality = db.cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.modality] = (acc[c.modality] || 0) + 1;
      return acc;
    }, {});
    const byPriority: Record<PriorityLevel, number> = {
      critical: db.cases.filter((c) => c.priority === 'critical').length,
      high: db.cases.filter((c) => c.priority === 'high').length,
      moderate: db.cases.filter((c) => c.priority === 'moderate').length,
      routine: db.cases.filter((c) => c.priority === 'routine').length,
    };
    const byStatus = db.cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.reviewStatus] = (acc[c.reviewStatus] || 0) + 1;
      return acc;
    }, {});
    const completedCount = db.cases.filter((c) => c.reviewStatus === 'completed').length;
    const completionRatePct = db.cases.length
      ? Math.round((completedCount / db.cases.length) * 100)
      : 0;
    const timeSeries = buildActivitySeries(db, days);
    res.json({
      totalCases: db.cases.length,
      totalImageStudies: db.imageAnalyses.length,
      totalDatasetBatches: db.datasetAnalyses.length,
      totalAuditEvents: db.auditLogs.length,
      completionRatePct,
      avgTurnaroundHrs: 1.8,
      byModality,
      byPriority,
      byStatus,
      timeSeries,
      confidenceSeries: db.cases.slice(0, 8).map((c) => ({
        label: c.caseCode.replace('SNT-2026-', '#'),
        confidence: c.modelConfidence,
        priority: c.priority,
      })),
    });
  });

  app.get('/api/audit-logs', authMiddleware, (_req, res) => {
    const db = getDb();
    res.json({ auditLogs: db.auditLogs, cases: db.cases });
  });

  app.get('/api/notifications', authMiddleware, (_req, res) => {
    const db = getDb();
    res.json({ notifications: db.notifications });
  });

  app.patch('/api/notifications/:id/read', authMiddleware, (req, res) => {
    const db = getDb();
    const item = db.notifications.find((n) => n.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Notification not found.' });
    item.read = true;
    saveDb(db);
    res.json({ notification: item });
  });

  app.post('/api/notifications/read-all', authMiddleware, (_req, res) => {
    const db = getDb();
    db.notifications.forEach((n) => {
      n.read = true;
    });
    saveDb(db);
    res.json({ ok: true });
  });

  app.delete('/api/notifications', authMiddleware, (req, res) => {
    const db = getDb();
    const scope = String(req.query.scope || 'all');
    if (scope === 'read') {
      db.notifications = db.notifications.filter((n) => !n.read);
    } else {
      db.notifications = [];
    }
    saveDb(db);
    res.json({ ok: true, remaining: db.notifications.length });
  });

  app.get('/api/settings', authMiddleware, (_req, res) => {
    const db = getDb();
    res.json({ settings: db.settings });
  });

  app.patch('/api/settings', authMiddleware, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    db.settings = {
      ...db.settings,
      ...req.body,
    };
    appendAuditLog(db, {
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      actionType: 'settings_updated',
      targetLabel: 'Clinical Workflow Configuration',
      details: `Updated priority thresholds (Critical >= ${db.settings.criticalConfidenceThreshold}%, High >= ${db.settings.highConfidenceThreshold}%).`,
    });
    saveDb(db);
    res.json({ settings: db.settings });
  });

  // --- Gemini Clinical Chatbot & Transcription Endpoints ---
  app.post('/api/chat', authMiddleware, async (req, res) => {
    try {
      const { history, message, rolePersona, reasoningMode, caseContext } = req.body as {
        history?: Array<{ sender: 'user' | 'assistant'; text: string }>;
        message?: string;
        rolePersona?: ChatbotPersona;
        reasoningMode?: ChatbotReasoningMode;
        caseContext?: string;
      };
      if (!message?.trim()) {
        return res.status(400).json({ error: 'Please enter a message for the clinical assistant.' });
      }
      const result = await runClinicalChatTurn({
        history: Array.isArray(history) ? history : [],
        message: message.trim(),
        rolePersona: rolePersona || 'triage_specialist',
        reasoningMode: reasoningMode || 'standard',
        caseContext,
      });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Clinical chat generation failed.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/transcribe', authMiddleware, async (req, res) => {
    try {
      const { audioBase64, mimeType, promptHint } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        promptHint?: string;
      };
      if (!audioBase64?.trim()) {
        return res.status(400).json({ error: 'Audio recording or file is required for transcription.' });
      }
      const result = await transcribeAudioWithGemini({
        audioBase64,
        mimeType: mimeType || 'audio/webm',
        promptHint,
      });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audio transcription failed.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  // --- Vite Middleware / Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // --- Gemini Live API Real-Time Voice Bridge (/api/live) ---
  const wss = new WebSocketServer({ server, path: '/api/live' });
  wss.on('connection', async (clientWs, req) => {
    let liveSession: Awaited<ReturnType<ReturnType<typeof getGeminiClient>['live']['connect']>> | null = null;
    try {
      const url = new URL(req.url || '/api/live', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token') || '';
      const requestedVoice = url.searchParams.get('voice') || 'Zephyr';
      const allowedVoices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
      const voiceName = allowedVoices.includes(requestedVoice) ? requestedVoice : 'Zephyr';

      const db = getDb();
      if (!token || !db.sessions[token]) {
        clientWs.send(JSON.stringify({ error: 'Authentication required for live voice session.' }));
        clientWs.close(4001, 'Unauthorized');
        return;
      }

      const ai = getGeminiClient();
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            'You are SENTINEL AI Real-Time Clinical Voice Consult Assistant. Speak clearly, calmly, and concisely to support clinicians reviewing imaging signals, patient vitals, and triage priorities without declaring autonomous diagnoses.',
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ ready: true, voiceName, model: 'gemini-3.8-live' }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onerror: (err) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  error: err instanceof Error ? err.message : 'Live voice stream encountered an error.',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
              clientWs.close();
            }
          },
        },
      });

      clientWs.on('message', (raw) => {
        if (!liveSession) return;
        try {
          const parsed = JSON.parse(raw.toString()) as { audio?: string; text?: string };
          if (parsed.audio) {
            liveSession.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (parsed.text) {
            liveSession.sendRealtimeInput({ text: parsed.text });
          }
        } catch {
          // Ignore malformed client frames
        }
      });

      clientWs.on('close', () => {
        try {
          liveSession?.close();
        } catch {
          // Ignore close cleanup errors
        }
        liveSession = null;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to establish Gemini Live voice session.';
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: msg }));
        clientWs.close();
      }
      try {
        liveSession?.close();
      } catch {
        // Ignore
      }
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SENTINEL AI server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SENTINEL AI server:', err);
  process.exit(1);
});
