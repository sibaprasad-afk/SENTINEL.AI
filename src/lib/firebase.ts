import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  ChatbotModelId,
  ChatbotPersona,
  ChatbotReasoningMode,
  ChatMessageRecord,
  ChatSessionRecord,
  TranscriptionRecord,
  VoiceSessionRecord,
} from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

// Blueprint volumetric limits (synchronized with firebase-blueprint.json & firestore.rules)
const LIMITS = {
  ID_MAX: 128,
  DISPLAY_NAME_MAX: 120,
  ROLE_MAX: 80,
  DEPARTMENT_MAX: 100,
  EMAIL_MAX: 200,
  PHOTO_URL_MAX: 500,
  TITLE_MAX: 140,
  CHAT_TEXT_MAX: 16000,
  TRANSCRIPT_MAX: 20000,
  VOICE_SUMMARY_MAX: 16000,
  MIME_MAX: 80,
  MODEL_ID_MAX: 64,
} as const;

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, LIMITS.ID_MAX);
  return cleaned || `id_${Date.now()}`;
}

function clampString(raw: string, maxLen: number, fallback = 'Untitled'): string {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return sanitizeId(`${prefix}_${Date.now()}_${rand}`);
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export async function signInWithGoogleFirebase() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase() {
  await signOut(auth);
}

export async function syncUserProfileToFirestore(params: {
  uid: string;
  displayName: string;
  email: string;
  photoUrl?: string | null;
  role?: string;
  department?: string;
}): Promise<void> {
  const uid = sanitizeId(params.uid);
  const profilePath = `users/${uid}`;
  const contactPath = `users/${uid}/private/contact`;

  try {
    const profileRef = doc(db, 'users', uid);
    const snap = await getDoc(profileRef);
    const displayName = clampString(params.displayName, LIMITS.DISPLAY_NAME_MAX, 'Clinician');
    const role = clampString(params.role || 'Attending Clinician', LIMITS.ROLE_MAX);
    const department = clampString(
      params.department || 'Clinical Intelligence',
      LIMITS.DEPARTMENT_MAX
    );

    if (!snap.exists()) {
      await setDoc(profileRef, {
        uid,
        displayName,
        role,
        department,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(profileRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }

  try {
    const contactRef = doc(db, 'users', uid, 'private', 'contact');
    const contactSnap = await getDoc(contactRef);
    const email = clampString(params.email, LIMITS.EMAIL_MAX, 'clinician@sentinel.local');
    const payload: Record<string, unknown> = {
      uid,
      email,
      updatedAt: serverTimestamp(),
    };
    if (params.photoUrl && params.photoUrl.trim()) {
      payload.photoUrl = params.photoUrl.trim().slice(0, LIMITS.PHOTO_URL_MAX);
    }

    if (!contactSnap.exists()) {
      await setDoc(contactRef, payload);
    } else {
      await updateDoc(contactRef, {
        email: payload.email,
        ...(payload.photoUrl ? { photoUrl: payload.photoUrl } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, contactPath);
  }
}

export function subscribeChatSessions(
  rawUid: string,
  onData: (sessions: ChatSessionRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(rawUid);
  const path = `users/${uid}/chatSessions`;
  const q = query(
    collection(db, 'users', uid, 'chatSessions'),
    where('userId', '==', uid),
    orderBy('updatedAt', 'desc'),
    limit(25)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatSessionRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          userId: String(data.userId || uid),
          title: String(data.title || 'Clinical Thread'),
          rolePersona: (data.rolePersona as ChatbotPersona) || 'triage_specialist',
          modelId: (data.modelId as ChatbotModelId) || 'gemini-4-hydrogen',
          reasoningMode: (data.reasoningMode as ChatbotReasoningMode) || 'standard',
          messageCount: Number(data.messageCount || 0),
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function createChatSession(params: {
  uid: string;
  title: string;
  rolePersona: ChatbotPersona;
  modelId: ChatbotModelId;
  reasoningMode: ChatbotReasoningMode;
}): Promise<ChatSessionRecord> {
  const uid = sanitizeId(params.uid);
  const sessionId = makeDocId('sess');
  const path = `users/${uid}/chatSessions/${sessionId}`;
  const title = clampString(params.title, LIMITS.TITLE_MAX, 'Clinical Consultation');

  try {
    await setDoc(doc(db, 'users', uid, 'chatSessions', sessionId), {
      id: sessionId,
      userId: uid,
      title,
      rolePersona: params.rolePersona,
      modelId: params.modelId,
      reasoningMode: params.reasoningMode,
      messageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const now = new Date().toISOString();
    return {
      id: sessionId,
      userId: uid,
      title,
      rolePersona: params.rolePersona,
      modelId: params.modelId,
      reasoningMode: params.reasoningMode,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateChatSessionMeta(params: {
  uid: string;
  sessionId: string;
  title?: string;
  rolePersona?: ChatbotPersona;
  modelId?: ChatbotModelId;
  reasoningMode?: ChatbotReasoningMode;
  messageCount?: number;
}): Promise<void> {
  const uid = sanitizeId(params.uid);
  const sessionId = sanitizeId(params.sessionId);
  const path = `users/${uid}/chatSessions/${sessionId}`;
  try {
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (params.title !== undefined) {
      updates.title = clampString(params.title, LIMITS.TITLE_MAX, 'Clinical Consultation');
    }
    if (params.rolePersona !== undefined) updates.rolePersona = params.rolePersona;
    if (params.modelId !== undefined) updates.modelId = params.modelId;
    if (params.reasoningMode !== undefined) updates.reasoningMode = params.reasoningMode;
    if (params.messageCount !== undefined) {
      updates.messageCount = Math.min(500, Math.max(0, Math.round(params.messageCount)));
    }
    await updateDoc(doc(db, 'users', uid, 'chatSessions', sessionId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeChatSession(uidRaw: string, sessionIdRaw: string): Promise<void> {
  const uid = sanitizeId(uidRaw);
  const sessionId = sanitizeId(sessionIdRaw);
  const path = `users/${uid}/chatSessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'chatSessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeChatMessages(
  uidRaw: string,
  sessionIdRaw: string,
  onData: (messages: ChatMessageRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(uidRaw);
  const sessionId = sanitizeId(sessionIdRaw);
  const path = `users/${uid}/chatSessions/${sessionId}/messages`;
  const q = query(
    collection(db, 'users', uid, 'chatSessions', sessionId, 'messages'),
    where('userId', '==', uid),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatMessageRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          sessionId: String(data.sessionId || sessionId),
          userId: String(data.userId || uid),
          sender: data.sender === 'assistant' ? 'assistant' : 'user',
          text: String(data.text || ''),
          modelId: String(data.modelId || 'gemini-4-hydrogen'),
          createdAt: timestampToIso(data.createdAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function addChatMessageToFirestore(params: {
  uid: string;
  sessionId: string;
  sender: 'user' | 'assistant';
  text: string;
  modelId: string;
}): Promise<ChatMessageRecord> {
  const uid = sanitizeId(params.uid);
  const sessionId = sanitizeId(params.sessionId);
  const messageId = makeDocId('msg');
  const path = `users/${uid}/chatSessions/${sessionId}/messages/${messageId}`;
  const text = clampString(params.text, LIMITS.CHAT_TEXT_MAX, 'Message');
  const modelId = clampString(params.modelId, LIMITS.MODEL_ID_MAX, 'gemini-4-hydrogen');

  try {
    await setDoc(doc(db, 'users', uid, 'chatSessions', sessionId, 'messages', messageId), {
      id: messageId,
      sessionId,
      userId: uid,
      sender: params.sender,
      text,
      modelId,
      createdAt: serverTimestamp(),
    });
    return {
      id: messageId,
      sessionId,
      userId: uid,
      sender: params.sender,
      text,
      modelId,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeTranscriptions(
  uidRaw: string,
  onData: (items: TranscriptionRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(uidRaw);
  const path = `users/${uid}/transcriptions`;
  const q = query(
    collection(db, 'users', uid, 'transcriptions'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: TranscriptionRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          userId: String(data.userId || uid),
          title: String(data.title || 'Clinical Audio Dictation'),
          transcript: String(data.transcript || ''),
          mimeType: String(data.mimeType || 'audio/webm'),
          durationSec: Number(data.durationSec || 0),
          modelId: 'gemini-3.5-transcribe',
          createdAt: timestampToIso(data.createdAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function saveTranscriptionToFirestore(params: {
  uid: string;
  title: string;
  transcript: string;
  mimeType: string;
  durationSec: number;
}): Promise<TranscriptionRecord> {
  const uid = sanitizeId(params.uid);
  const transcriptionId = makeDocId('tr');
  const path = `users/${uid}/transcriptions/${transcriptionId}`;
  const title = clampString(params.title, LIMITS.TITLE_MAX, 'Clinical Dictation');
  const transcript = clampString(params.transcript, LIMITS.TRANSCRIPT_MAX, 'Transcript');
  const mimeType = clampString(params.mimeType, LIMITS.MIME_MAX, 'audio/webm');
  const durationSec = Math.min(7200, Math.max(0, Number(params.durationSec) || 0));

  try {
    await setDoc(doc(db, 'users', uid, 'transcriptions', transcriptionId), {
      id: transcriptionId,
      userId: uid,
      title,
      transcript,
      mimeType,
      durationSec,
      modelId: 'gemini-3.5-transcribe',
      createdAt: serverTimestamp(),
    });
    return {
      id: transcriptionId,
      userId: uid,
      title,
      transcript,
      mimeType,
      durationSec,
      modelId: 'gemini-3.5-transcribe',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeTranscriptionFromFirestore(
  uidRaw: string,
  transcriptionIdRaw: string
): Promise<void> {
  const uid = sanitizeId(uidRaw);
  const transcriptionId = sanitizeId(transcriptionIdRaw);
  const path = `users/${uid}/transcriptions/${transcriptionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'transcriptions', transcriptionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeVoiceSessions(
  uidRaw: string,
  onData: (items: VoiceSessionRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const uid = sanitizeId(uidRaw);
  const path = `users/${uid}/voiceSessions`;
  const q = query(
    collection(db, 'users', uid, 'voiceSessions'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: VoiceSessionRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          userId: String(data.userId || uid),
          title: String(data.title || 'Live Voice Consult'),
          voiceName: (data.voiceName as VoiceSessionRecord['voiceName']) || 'Zephyr',
          transcriptSummary: String(data.transcriptSummary || ''),
          turnCount: Number(data.turnCount || 0),
          modelId: 'gemini-3.8-live',
          createdAt: timestampToIso(data.createdAt),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function saveVoiceSessionToFirestore(params: {
  uid: string;
  title: string;
  voiceName: VoiceSessionRecord['voiceName'];
  transcriptSummary: string;
  turnCount: number;
}): Promise<VoiceSessionRecord> {
  const uid = sanitizeId(params.uid);
  const voiceSessionId = makeDocId('voice');
  const path = `users/${uid}/voiceSessions/${voiceSessionId}`;
  const title = clampString(params.title, LIMITS.TITLE_MAX, 'Live Voice Consult');
  const transcriptSummary = clampString(
    params.transcriptSummary,
    LIMITS.VOICE_SUMMARY_MAX,
    'Live clinical voice consultation completed.'
  );
  const turnCount = Math.min(500, Math.max(0, Math.round(params.turnCount)));

  try {
    await setDoc(doc(db, 'users', uid, 'voiceSessions', voiceSessionId), {
      id: voiceSessionId,
      userId: uid,
      title,
      voiceName: params.voiceName,
      transcriptSummary,
      turnCount,
      modelId: 'gemini-3.8-live',
      createdAt: serverTimestamp(),
    });
    return {
      id: voiceSessionId,
      userId: uid,
      title,
      voiceName: params.voiceName,
      transcriptSummary,
      turnCount,
      modelId: 'gemini-3.8-live',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
