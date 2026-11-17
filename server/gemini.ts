import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import type {
  ChatbotModelId,
  ChatbotPersona,
  ChatbotReasoningMode,
  ClinicalFinding,
  DataQualityStatus,
  DatasetColumnStat,
  PriorityLevel,
} from '../src/types.ts';

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Configure your API key in Settings > Secrets to run live Gemini clinical analyses.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface MedicalImageAnalysisOutput {
  overallPriority: PriorityLevel;
  modelConfidence: number;
  dataQuality: DataQualityStatus;
  dataQualityWarnings: string[];
  clinicalSummary: string;
  findings: ClinicalFinding[];
}

function resolveImagePayload(imageInput: string): { mimeType: string; data: string } {
  // Handle data URLs (e.g. data:image/png;base64,...)
  const dataUrlMatch = imageInput.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }

  // Handle built-in sample asset paths under /src/assets/images/
  if (imageInput.startsWith('/src/assets/images/')) {
    const safeRel = path.normalize(imageInput).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]/, '');
    const fullPath = path.resolve(process.cwd(), safeRel);
    const allowedDir = path.resolve(process.cwd(), 'src/assets/images');
    if (!fullPath.startsWith(allowedDir) || !fs.existsSync(fullPath)) {
      throw new Error('Selected clinical sample image was not found on disk.');
    }
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return {
      mimeType,
      data: buffer.toString('base64'),
    };
  }

  throw new Error('Unsupported image payload format. Please upload a PNG, JPEG, or WebP medical image.');
}

export async function analyzeMedicalImageWithGemini(params: {
  imageInput: string;
  modality: string;
  studyTitle: string;
  clinicalContext: string;
}): Promise<MedicalImageAnalysisOutput> {
  const ai = getGeminiClient();
  const { mimeType, data } = resolveImagePayload(params.imageInput);

  const systemInstruction = [
    'You are SENTINEL AI Clinical Intelligence Engine, a clinical decision-support and case-prioritization assistant.',
    'Analyze the provided medical image solely to identify potential visual clinical signals, assess image acquisition quality, and assign a workflow review priority category (critical, high, moderate, or routine).',
    'Never state a definitive or autonomous medical diagnosis. Frame all findings as potential signals requiring licensed clinician verification.',
    'Provide grounded anatomical evidence from what is actually visible in the image, realistic calibrated confidence (0-100), and concrete data quality warnings if positioning, contrast, crop, or artifacts limit interpretation.',
  ].join(' ');

  const prompt = `Modality: ${params.modality}\nStudy Title: ${params.studyTitle}\nClinical Context: ${params.clinicalContext || 'Standard triage review'}\n\nReturn structured clinical triage signals and data quality evaluation.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallPriority: {
            type: Type.STRING,
            description: 'Workflow review priority: critical, high, moderate, or routine.',
          },
          modelConfidence: {
            type: Type.INTEGER,
            description: 'Calibrated confidence percentage from 1 to 99.',
          },
          dataQuality: {
            type: Type.STRING,
            description: 'Image acquisition quality: optimal, acceptable, or suboptimal.',
          },
          dataQualityWarnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Specific image quality, artifact, or framing warnings, or empty if optimal.',
          },
          clinicalSummary: {
            type: Type.STRING,
            description: 'Concise 2-sentence evidence-driven clinical decision support summary.',
          },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                anatomicalRegion: { type: Type.STRING },
                severity: { type: Type.STRING },
                confidence: { type: Type.INTEGER },
                evidenceSummary: { type: Type.STRING },
                recommendedFocus: { type: Type.STRING },
              },
              required: ['title', 'anatomicalRegion', 'severity', 'confidence', 'evidenceSummary', 'recommendedFocus'],
            },
          },
        },
        required: [
          'overallPriority',
          'modelConfidence',
          'dataQuality',
          'dataQualityWarnings',
          'clinicalSummary',
          'findings',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    overallPriority?: string;
    modelConfidence?: number;
    dataQuality?: string;
    dataQualityWarnings?: string[];
    clinicalSummary?: string;
    findings?: Array<{
      title: string;
      anatomicalRegion: string;
      severity: string;
      confidence: number;
      evidenceSummary: string;
      recommendedFocus: string;
    }>;
  };

  const normalizePriority = (val?: string): PriorityLevel => {
    const v = (val || '').toLowerCase();
    if (v === 'critical' || v === 'high' || v === 'moderate' || v === 'routine') return v;
    return 'moderate';
  };

  const normalizeQuality = (val?: string): DataQualityStatus => {
    const v = (val || '').toLowerCase();
    if (v === 'optimal' || v === 'acceptable' || v === 'suboptimal') return v;
    return 'acceptable';
  };

  return {
    overallPriority: normalizePriority(parsed.overallPriority),
    modelConfidence: Math.min(99, Math.max(10, Math.round(parsed.modelConfidence ?? 82))),
    dataQuality: normalizeQuality(parsed.dataQuality),
    dataQualityWarnings: Array.isArray(parsed.dataQualityWarnings) ? parsed.dataQualityWarnings : [],
    clinicalSummary:
      parsed.clinicalSummary ||
      'Automated signal extraction completed. Clinical correlation by an attending specialist is required.',
    findings: (parsed.findings || []).map((f, idx) => ({
      id: `f_ai_${Date.now()}_${idx}`,
      title: f.title,
      anatomicalRegion: f.anatomicalRegion,
      severity: normalizePriority(f.severity),
      confidence: Math.min(99, Math.max(10, Math.round(f.confidence ?? 80))),
      evidenceSummary: f.evidenceSummary,
      recommendedFocus: f.recommendedFocus,
    })),
  };
}

export interface ClinicalDatasetAnalysisOutput {
  overallPriority: PriorityLevel;
  modelConfidence: number;
  dataQuality: DataQualityStatus;
  dataQualityWarnings: string[];
  clinicalSummary: string;
  cohortSignals: {
    signalName: string;
    affectedSubgroup: string;
    severity: PriorityLevel;
    confidence: number;
    evidence: string;
  }[];
}

export async function analyzeClinicalDatasetWithGemini(params: {
  datasetName: string;
  clinicalFocus: string;
  rowCount: number;
  columnStats: DatasetColumnStat[];
  sampleRows: Record<string, string | number>[];
}): Promise<ClinicalDatasetAnalysisOutput> {
  const ai = getGeminiClient();

  const systemInstruction = [
    'You are SENTINEL AI Clinical Dataset Intelligence Engine.',
    'Analyze the provided tabular clinical dataset summary statistics and representative rows to identify potential clinical signals, abnormal cohort patterns, missingness/quality issues, and workflow review prioritization (critical, high, moderate, routine).',
    'Never assert autonomous diagnoses. Highlight measurable biomarker/vital anomalies and explain why those records warrant prioritized clinician review.',
  ].join(' ');

  const prompt = JSON.stringify(
    {
      datasetName: params.datasetName,
      clinicalFocus: params.clinicalFocus,
      rowCount: params.rowCount,
      columnStats: params.columnStats,
      sampleRows: params.sampleRows.slice(0, 18),
    },
    null,
    2
  );

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Analyze this clinical dataset summary and sample rows:\n${prompt}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallPriority: { type: Type.STRING },
          modelConfidence: { type: Type.INTEGER },
          dataQuality: { type: Type.STRING },
          dataQualityWarnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          clinicalSummary: { type: Type.STRING },
          cohortSignals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                signalName: { type: Type.STRING },
                affectedSubgroup: { type: Type.STRING },
                severity: { type: Type.STRING },
                confidence: { type: Type.INTEGER },
                evidence: { type: Type.STRING },
              },
              required: ['signalName', 'affectedSubgroup', 'severity', 'confidence', 'evidence'],
            },
          },
        },
        required: [
          'overallPriority',
          'modelConfidence',
          'dataQuality',
          'dataQualityWarnings',
          'clinicalSummary',
          'cohortSignals',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    overallPriority?: string;
    modelConfidence?: number;
    dataQuality?: string;
    dataQualityWarnings?: string[];
    clinicalSummary?: string;
    cohortSignals?: Array<{
      signalName: string;
      affectedSubgroup: string;
      severity: string;
      confidence: number;
      evidence: string;
    }>;
  };

  const normalizePriority = (val?: string): PriorityLevel => {
    const v = (val || '').toLowerCase();
    if (v === 'critical' || v === 'high' || v === 'moderate' || v === 'routine') return v;
    return 'moderate';
  };

  const normalizeQuality = (val?: string): DataQualityStatus => {
    const v = (val || '').toLowerCase();
    if (v === 'optimal' || v === 'acceptable' || v === 'suboptimal') return v;
    return 'acceptable';
  };

  return {
    overallPriority: normalizePriority(parsed.overallPriority),
    modelConfidence: Math.min(99, Math.max(10, Math.round(parsed.modelConfidence ?? 85))),
    dataQuality: normalizeQuality(parsed.dataQuality),
    dataQualityWarnings: Array.isArray(parsed.dataQualityWarnings) ? parsed.dataQualityWarnings : [],
    clinicalSummary:
      parsed.clinicalSummary ||
      'Dataset cohort stratification completed. Clinician verification recommended for highlighted subgroups.',
    cohortSignals: (parsed.cohortSignals || []).map((s) => ({
      signalName: s.signalName,
      affectedSubgroup: s.affectedSubgroup,
      severity: normalizePriority(s.severity),
      confidence: Math.min(99, Math.max(10, Math.round(s.confidence ?? 84))),
      evidence: s.evidence,
    })),
  };
}

const PERSONA_INSTRUCTIONS: Record<ChatbotPersona, string> = {
  triage_specialist: [
    'You are SENTINEL AI Clinical Triage Specialist.',
    'Help licensed clinicians prioritize incoming cases, synthesize vitals/biomarkers, and structure differential review checklists.',
    'Never declare a definitive diagnosis; frame guidance as decision-support signals requiring attending verification.',
  ].join(' '),
  radiology_reviewer: [
    'You are SENTINEL AI Radiology Signal Reviewer.',
    'Discuss imaging acquisition quality, anatomical landmarks, perfusion/density cues, and follow-up view recommendations with precision.',
    'Always emphasize clinician correlation and note any potential imaging artifacts.',
  ].join(' '),
  biomarker_analyst: [
    'You are SENTINEL AI Biomarker & Cohort Analyst.',
    'Interpret serial lab trajectories (e.g., troponin, lactate, CRP), cohort outliers, and missingness patterns clearly and concisely.',
  ].join(' '),
  clinical_concierge: [
    'You are SENTINEL AI Clinical Workflow Concierge.',
    'Draft concise handoff summaries, SBAR notes, and review checklists for clinical teams with high clarity and zero fluff.',
  ].join(' '),
};

export async function runClinicalChatTurn(params: {
  history: Array<{ sender: 'user' | 'assistant'; text: string }>;
  message: string;
  rolePersona: ChatbotPersona;
  reasoningMode: ChatbotReasoningMode;
  caseContext?: string;
}): Promise<{ reply: string; modelId: ChatbotModelId }> {
  const ai = getGeminiClient();

  const modelId: ChatbotModelId =
    params.reasoningMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

  const baseInstruction =
    PERSONA_INSTRUCTIONS[params.rolePersona] || PERSONA_INSTRUCTIONS.triage_specialist;
  const systemInstruction = params.caseContext?.trim()
    ? `${baseInstruction}\n\nActive Case Context:\n${params.caseContext.trim()}`
    : baseInstruction;

  const formattedHistory = params.history
    .filter((h) => h.text.trim().length > 0)
    .slice(-24)
    .map((h) => ({
      role: h.sender === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: h.text }],
    }));

  const chatConfig =
    modelId === 'gemini-3.1-flash-lite'
      ? {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        }
      : {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel:
              params.reasoningMode === 'deep' ? ThinkingLevel.XHIGH : ThinkingLevel.MEDIUM,
          },
        };

  const chat = ai.chats.create({
    model: modelId,
    history: formattedHistory,
    config: chatConfig,
  });

  const response = await chat.sendMessage({ message: params.message });
  const reply = response.text?.trim();
  if (!reply) {
    throw new Error('Gemini returned an empty response for this conversation turn.');
  }
  return { reply, modelId };
}

export async function transcribeAudioWithGemini(params: {
  audioBase64: string;
  mimeType: string;
  promptHint?: string;
}): Promise<{ transcript: string; modelId: 'gemini-3.5-transcribe' }> {
  const ai = getGeminiClient();
  const cleanBase64 = params.audioBase64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!cleanBase64) {
    throw new Error('Audio payload is empty. Please record or upload a valid audio file.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType || 'audio/webm',
            data: cleanBase64,
          },
        },
        {
          text:
            params.promptHint?.trim() ||
            'Transcribe this clinical audio dictation verbatim with clean punctuation and medical terminology accuracy.',
        },
      ],
    },
  });

  const transcript = response.text?.trim();
  if (!transcript) {
    throw new Error('No speech could be transcribed from the provided audio.');
  }
  return {
    transcript,
    modelId: 'gemini-3.5-transcribe',
  };
}
