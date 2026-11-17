import {
  AudioLines,
  Bot,
  Check,
  Copy,
  FileAudio,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  Radio,
  Save,
  Send,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { api, getStoredToken } from '../../lib/api';
import {
  addChatMessageToFirestore,
  auth,
  createChatSession,
  removeChatSession,
  removeTranscriptionFromFirestore,
  saveTranscriptionToFirestore,
  saveVoiceSessionToFirestore,
  subscribeChatMessages,
  subscribeChatSessions,
  subscribeTranscriptions,
  subscribeVoiceSessions,
  updateChatSessionMeta,
} from '../../lib/firebase';
import type {
  ChatbotModelId,
  ChatbotPersona,
  ChatbotReasoningMode,
  ChatMessageRecord,
  ChatSessionRecord,
  ClinicalCase,
  ClinicianUser,
  TranscriptionRecord,
  VoiceSessionRecord,
} from '../../types';
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassPanel,
  GlassSelect,
  GlassTextarea,
} from '../glass/GlassPrimitives';

interface ClinicalAiStudioViewProps {
  user: ClinicianUser;
  onToast: (msg: string) => void;
}

type StudioTab = 'chat' | 'voice' | 'transcribe';

const PERSONA_OPTIONS: Array<{
  id: ChatbotPersona;
  label: string;
  desc: string;
}> = [
  {
    id: 'triage_specialist',
    label: 'Clinical Triage Specialist',
    desc: 'Prioritization, vital correlation, and differential checklists',
  },
  {
    id: 'radiology_reviewer',
    label: 'Radiology Signal Reviewer',
    desc: 'Imaging quality assessment and anatomical follow-up cues',
  },
  {
    id: 'biomarker_analyst',
    label: 'Biomarker & Cohort Analyst',
    desc: 'Serial troponin/lactate trajectories and cohort anomalies',
  },
  {
    id: 'clinical_concierge',
    label: 'Clinical Workflow Concierge',
    desc: 'Concise SBAR handoffs and clinician review notes',
  },
];

const REASONING_OPTIONS: Array<{
  id: ChatbotReasoningMode;
  modelId: ChatbotModelId;
  label: string;
  badge: string;
}> = [
  {
    id: 'standard',
    modelId: 'gemini-4-hydrogen',
    label: 'Balanced · gemini-4-hydrogen',
    badge: 'General',
  },
  {
    id: 'deep',
    modelId: 'gemini-4-hydrogen',
    label: 'Deep Reasoning · gemini-4-hydrogen (XHIGH)',
    badge: 'Deep Reason',
  },
  {
    id: 'fast',
    modelId: 'gemini-3.1-flash-lite',
    label: 'Ultra-Fast · gemini-3.1-flash-lite',
    badge: 'Fast',
  },
];

const VOICE_OPTIONS: Array<VoiceSessionRecord['voiceName']> = [
  'Zephyr',
  'Kore',
  'Puck',
  'Charon',
  'Fenrir',
];

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export const ClinicalAiStudioView: React.FC<ClinicalAiStudioViewProps> = ({ user, onToast }) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<StudioTab>('chat');
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  const firebaseUid =
    auth.currentUser?.emailVerified && auth.currentUser.uid ? auth.currentUser.uid : null;

  // --- Tab 1: Multi-Turn Gemini Chatbot State ---
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('local_default');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [persona, setPersona] = useState<ChatbotPersona>('triage_specialist');
  const [reasoningMode, setReasoningMode] = useState<ChatbotReasoningMode>('standard');
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [dictatingChat, setDictatingChat] = useState(false);
  const chatRecorderRef = useRef<MediaRecorder | null>(null);
  const chatStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Tab 2: Gemini Live API Voice State ---
  const [liveVoice, setLiveVoice] = useState<VoiceSessionRecord['voiceName']>('Zephyr');
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [liveMuted, setLiveMuted] = useState(false);
  const [liveTurns, setLiveTurns] = useState<
    Array<{ id: string; speaker: 'Clinician' | 'SENTINEL Live'; text: string }>
  >([]);
  const [savedVoiceSessions, setSavedVoiceSessions] = useState<VoiceSessionRecord[]>([]);
  const [savingVoice, setSavingVoice] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // --- Tab 3: Audio Transcription State ---
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [dictationTitle, setDictationTitle] = useState('Clinical Case Dictation');
  const [transcriptText, setTranscriptText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedTranscriptions, setSavedTranscriptions] = useState<TranscriptionRecord[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    mutedRef.current = liveMuted;
  }, [liveMuted]);

  // Load clinical cases for optional case-aware chat context
  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getCases();
        setCases(res.cases);
      } catch {
        // Non-blocking
      }
    })();
  }, []);

  // Firestore real-time subscriptions when authenticated with verified Google Firebase Auth
  useEffect(() => {
    if (!firebaseUid) return;

    const unsubSessions = subscribeChatSessions(
      firebaseUid,
      (list) => {
        setSessions(list);
        if (list.length > 0 && (!activeSessionId || activeSessionId === 'local_default')) {
          setActiveSessionId(list[0].id);
          setPersona(list[0].rolePersona);
          setReasoningMode(list[0].reasoningMode);
        }
      },
      (err) => onToast(err.message)
    );

    const unsubTranscriptions = subscribeTranscriptions(
      firebaseUid,
      setSavedTranscriptions,
      (err) => onToast(err.message)
    );

    const unsubVoice = subscribeVoiceSessions(
      firebaseUid,
      setSavedVoiceSessions,
      (err) => onToast(err.message)
    );

    return () => {
      unsubSessions();
      unsubTranscriptions();
      unsubVoice();
    };
  }, [firebaseUid]);

  // Subscribe to messages for the selected Firestore chat session
  useEffect(() => {
    if (!firebaseUid || !activeSessionId || activeSessionId === 'local_default') return;
    const unsub = subscribeChatMessages(
      firebaseUid,
      activeSessionId,
      setMessages,
      (err) => onToast(err.message)
    );
    return () => unsub();
  }, [firebaseUid, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sendingChat]);

  const stopLiveVoice = () => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore
      }
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((t) => t.stop());
      liveStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close().catch(() => undefined);
      inputCtxRef.current = null;
    }
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // Ignore
      }
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;

    if (outputCtxRef.current) {
      void outputCtxRef.current.close().catch(() => undefined);
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    setLiveStatus('idle');
    setLiveMuted(false);
  };

  useEffect(() => {
    return () => {
      stopLiveVoice();
      if (timerRef.current) window.clearInterval(timerRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      chatStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // --- Chat Handlers ---
  const selectedReasoning =
    REASONING_OPTIONS.find((r) => r.id === reasoningMode) || REASONING_OPTIONS[0];

  const handleNewChatSession = async () => {
    if (firebaseUid) {
      try {
        const created = await createChatSession({
          uid: firebaseUid,
          title: `Clinical Consult ${new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          rolePersona: persona,
          modelId: selectedReasoning.modelId,
          reasoningMode,
        });
        setActiveSessionId(created.id);
        setMessages([]);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Could not create Firestore session.');
      }
    } else {
      const localId = `local_${Date.now()}`;
      setSessions((prev) => [
        {
          id: localId,
          userId: user.id,
          title: 'Local Consult Thread',
          rolePersona: persona,
          modelId: selectedReasoning.modelId,
          reasoningMode,
          messageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setActiveSessionId(localId);
      setMessages([]);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt || sendingChat) return;

    setSendingChat(true);
    setChatInput('');

    let targetSessionId = activeSessionId;
    const caseObj = cases.find((c) => c.id === selectedCaseId);
    const caseContext = caseObj
      ? `${caseObj.caseCode} | ${caseObj.patientName} (${caseObj.mrn}) | ${caseObj.modality} | Priority: ${caseObj.priority} | Confidence: ${caseObj.modelConfidence}% | Summary: ${caseObj.clinicalSummary}`
      : undefined;

    try {
      if (firebaseUid && (!targetSessionId || targetSessionId === 'local_default')) {
        const created = await createChatSession({
          uid: firebaseUid,
          title: prompt.slice(0, 56),
          rolePersona: persona,
          modelId: selectedReasoning.modelId,
          reasoningMode,
        });
        targetSessionId = created.id;
        setActiveSessionId(created.id);
      }

      const historyPayload = messages.map((m) => ({ sender: m.sender, text: m.text }));

      if (firebaseUid) {
        await addChatMessageToFirestore({
          uid: firebaseUid,
          sessionId: targetSessionId,
          sender: 'user',
          text: prompt,
          modelId: selectedReasoning.modelId,
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `u_${Date.now()}`,
            sessionId: targetSessionId,
            userId: user.id,
            sender: 'user',
            text: prompt,
            modelId: selectedReasoning.modelId,
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      const aiRes = await api.sendChatTurn({
        history: historyPayload,
        message: prompt,
        rolePersona: persona,
        reasoningMode,
        caseContext,
      });

      if (firebaseUid) {
        await addChatMessageToFirestore({
          uid: firebaseUid,
          sessionId: targetSessionId,
          sender: 'assistant',
          text: aiRes.reply,
          modelId: aiRes.modelId,
        });
        await updateChatSessionMeta({
          uid: firebaseUid,
          sessionId: targetSessionId,
          rolePersona: persona,
          modelId: aiRes.modelId,
          reasoningMode,
          messageCount: historyPayload.length + 2,
          ...(historyPayload.length === 0 ? { title: prompt.slice(0, 56) } : {}),
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            sessionId: targetSessionId,
            userId: user.id,
            sender: 'assistant',
            text: aiRes.reply,
            modelId: aiRes.modelId,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to send chat message.');
    } finally {
      setSendingChat(false);
    }
  };

  // Inline mic dictation into chat input via gemini-3.5-transcribe
  const handleToggleChatDictation = async () => {
    if (dictatingChat && chatRecorderRef.current) {
      chatRecorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chatStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        chatStreamRef.current = null;
        setDictatingChat(false);
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result !== 'string') return;
          try {
            const res = await api.transcribeAudio({ audioBase64: reader.result, mimeType });
            setChatInput((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
            onToast('Voice dictation transcribed into composer.');
          } catch (err) {
            onToast(err instanceof Error ? err.message : 'Voice dictation failed.');
          }
        };
        reader.readAsDataURL(blob);
      };
      chatRecorderRef.current = recorder;
      recorder.start();
      setDictatingChat(true);
    } catch {
      onToast('Microphone permission denied or unavailable.');
    }
  };

  // --- Live API Voice Handlers ---
  const playPcm24kChunk = (base64Audio: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    const float32 = pcm16Base64ToFloat32(base64Audio);
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  };

  const handleStartLiveVoice = async () => {
    if (liveStatus !== 'idle') {
      stopLiveVoice();
      return;
    }
    const token = getStoredToken();
    if (!token) {
      onToast('Active session token required for Gemini Live Voice.');
      return;
    }

    setLiveStatus('connecting');
    setLiveTurns([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/live?token=${encodeURIComponent(
        token
      )}&voice=${encodeURIComponent(liveVoice)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (ev) => {
          if (mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
          const base64 = float32ToPcm16Base64(ev.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        };
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as {
          ready?: boolean;
          audio?: string;
          inputTranscript?: string;
          outputTranscript?: string;
          interrupted?: boolean;
          error?: string;
          closed?: boolean;
        };

        if (msg.ready) {
          setLiveStatus('connected');
          onToast(`Connected to Gemini Live (${liveVoice})`);
        }
        if (msg.audio) {
          playPcm24kChunk(msg.audio);
        }
        if (msg.interrupted) {
          activeSourcesRef.current.forEach((src) => {
            try {
              src.stop();
            } catch {
              // Ignore
            }
          });
          activeSourcesRef.current = [];
          nextStartTimeRef.current = 0;
        }
        if (msg.inputTranscript) {
          const text = msg.inputTranscript;
          setLiveTurns((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'Clinician') {
              return [...prev.slice(0, -1), { ...last, text: `${last.text} ${text}` }];
            }
            return [...prev, { id: `lt_${Date.now()}`, speaker: 'Clinician', text }];
          });
        }
        if (msg.outputTranscript) {
          const text = msg.outputTranscript;
          setLiveTurns((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'SENTINEL Live') {
              return [...prev.slice(0, -1), { ...last, text: `${last.text} ${text}` }];
            }
            return [...prev, { id: `lt_${Date.now()}`, speaker: 'SENTINEL Live', text }];
          });
        }
        if (msg.error) {
          onToast(msg.error);
          stopLiveVoice();
        }
        if (msg.closed) {
          stopLiveVoice();
        }
      };

      ws.onerror = () => {
        onToast('Live voice WebSocket connection error.');
        stopLiveVoice();
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          stopLiveVoice();
        }
      };
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to initialize microphone for Live API.');
      stopLiveVoice();
    }
  };

  const handleSaveVoiceSession = async () => {
    if (!firebaseUid) {
      onToast('Sign in with Google to persist voice consult logs in Firestore.');
      return;
    }
    if (liveTurns.length === 0) return;
    setSavingVoice(true);
    try {
      const summary = liveTurns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
      await saveVoiceSessionToFirestore({
        uid: firebaseUid,
        title: `Voice Consult (${liveVoice}) · ${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        voiceName: liveVoice,
        transcriptSummary: summary,
        turnCount: liveTurns.length,
      });
      onToast('Live voice transcript saved to Firestore.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to save voice session.');
    } finally {
      setSavingVoice(false);
    }
  };

  // --- Audio Transcription Handlers (gemini-3.5-transcribe) ---
  const processAudioTranscription = async (
    base64Data: string,
    mimeType: string,
    durationSec: number,
    title: string
  ) => {
    setTranscribing(true);
    try {
      const res = await api.transcribeAudio({
        audioBase64: base64Data,
        mimeType,
      });
      setTranscriptText(res.transcript);
      if (firebaseUid) {
        await saveTranscriptionToFirestore({
          uid: firebaseUid,
          title,
          transcript: res.transcript,
          mimeType,
          durationSec,
        });
        onToast('Audio transcribed via gemini-3.5-transcribe and saved to Firestore.');
      } else {
        setSavedTranscriptions((prev) => [
          {
            id: `tr_local_${Date.now()}`,
            userId: user.id,
            title,
            transcript: res.transcript,
            mimeType,
            durationSec,
            modelId: 'gemini-3.5-transcribe',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        onToast('Audio transcribed via gemini-3.5-transcribe.');
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Audio transcription failed.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (recordingAudio && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      const startedAt = Date.now();

      setRecordingSec(0);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordingSec(Math.round((Date.now() - startedAt) / 1000));
      }, 500);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        setRecordingAudio(false);

        const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            void processAudioTranscription(
              reader.result,
              mimeType,
              elapsed,
              dictationTitle.trim() || 'Microphone Dictation'
            );
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingAudio(true);
    } catch {
      onToast('Microphone access denied or unavailable.');
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const cleanTitle = file.name.replace(/\.[^.]+$/, '') || 'Uploaded Clinical Audio';
        setDictationTitle(cleanTitle);
        void processAudioTranscription(
          reader.result,
          file.type || 'audio/mp3',
          0,
          cleanTitle
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const copyText = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">
              Clinical AI Studio
            </h1>
            <GlassBadge tone={firebaseUid ? 'emerald' : 'cyan'}>
              {firebaseUid ? 'Firestore Cloud Sync Active' : 'Session Mode · Sign in with Google to Sync'}
            </GlassBadge>
          </div>
          <p className="mt-1 text-sm text-[#A5B0C7]">
            Multi-turn Gemini reasoning chat, real-time Live voice consults, and speech-to-text clinical dictation.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-white/12 bg-[#090F1E]/80 p-1 backdrop-blur-xl">
          {[
            { id: 'chat' as const, label: 'AI Chat', Icon: MessageSquare },
            { id: 'voice' as const, label: 'Live Voice', Icon: Radio },
            { id: 'transcribe' as const, label: 'Transcribe Audio', Icon: AudioLines },
          ].map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#19D6A0]/18 text-[#19D6A0] border border-[#19D6A0]/40 shadow-[0_0_18px_-6px_rgba(25,214,160,0.5)]'
                    : 'text-[#A5B0C7] hover:text-[#F4F7FF] border border-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: MULTI-TURN GEMINI CHATBOT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Rail: Sessions, Role Persona, Model Tier, Case Context */}
          <GlassCard accent="cyan" className="lg:col-span-4 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#32D9E8]" />
                <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                  Assistant Configuration
                </h2>
              </div>
              <GlassButton type="button" variant="primary" size="sm" onClick={handleNewChatSession}>
                <Plus className="h-3.5 w-3.5" />
                <span>New Thread</span>
              </GlassButton>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">
                  System Role Persona
                </label>
                <GlassSelect
                  value={persona}
                  onChange={(e) => setPersona(e.target.value as ChatbotPersona)}
                  className="mt-1 w-full"
                >
                  {PERSONA_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </GlassSelect>
                <p className="mt-1 text-[11px] text-[#77849E]">
                  {PERSONA_OPTIONS.find((p) => p.id === persona)?.desc}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">
                  Reasoning &amp; Speed Tier
                </label>
                <GlassSelect
                  value={reasoningMode}
                  onChange={(e) => setReasoningMode(e.target.value as ChatbotReasoningMode)}
                  className="mt-1 w-full"
                >
                  {REASONING_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </GlassSelect>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A5B0C7]">
                  Attach Queue Case Context (Optional)
                </label>
                <GlassSelect
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="mt-1 w-full"
                >
                  <option value="">No case attached</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseCode} · {c.patientName}
                    </option>
                  ))}
                </GlassSelect>
              </div>
            </div>

            {/* Thread List */}
            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#A5B0C7]">Conversation History</span>
                <span className="font-mono text-[11px] text-[#77849E]">{sessions.length}</span>
              </div>
              {sessions.length === 0 ? (
                <p className="text-xs text-[#77849E] py-3">
                  Start typing below to create your first clinical thread.
                </p>
              ) : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {sessions.map((s) => {
                    const active = s.id === activeSessionId;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 transition-colors ${
                          active
                            ? 'border-[#19D6A0]/40 bg-[#19D6A0]/12'
                            : 'border-white/10 bg-[#050814]/50 hover:border-white/20'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setPersona(s.rolePersona);
                            setReasoningMode(s.reasoningMode);
                          }}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="truncate text-xs font-medium text-[#F4F7FF]">{s.title}</p>
                          <p className="text-[10px] font-mono text-[#77849E]">
                            {s.modelId} · {s.messageCount} msgs
                          </p>
                        </button>
                        {firebaseUid && (
                          <button
                            type="button"
                            onClick={() => void removeChatSession(firebaseUid, s.id)}
                            aria-label="Delete thread"
                            className="rounded p-1 text-[#77849E] hover:bg-white/10 hover:text-[#FF647C]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Right Stage: Scrollable Multi-Turn Thread & Composer */}
          <GlassCard accent="emerald" className="lg:col-span-8 flex flex-col h-[620px]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#19D6A0]/35 bg-[#19D6A0]/12 text-[#19D6A0]">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#F4F7FF]">
                    {PERSONA_OPTIONS.find((p) => p.id === persona)?.label}
                  </p>
                  <p className="font-mono text-[11px] text-[#32D9E8]">{selectedReasoning.label}</p>
                </div>
              </div>
              <GlassBadge tone="emerald">{selectedReasoning.badge}</GlassBadge>
            </div>

            {/* Scrollable Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
                  <Sparkles className="h-8 w-8 text-[#19D6A0]" />
                  <h3 className="font-display text-base font-semibold text-[#F4F7FF]">
                    SENTINEL Clinical Reasoning Thread
                  </h3>
                  <p className="text-xs text-[#A5B0C7] leading-relaxed">
                    Ask about differential prioritization, radiology signal correlation, serial troponin kinetics, or SBAR handoff summaries. Multi-turn context is preserved automatically.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {[
                      'Summarize key follow-up checks for SNT-2026-0891',
                      'Compare Critical vs High triage thresholds',
                      'Draft a concise SBAR cardiology handoff',
                    ].map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => setChatInput(starter)}
                        className="rounded-xl border border-white/12 bg-[#090F1E]/75 px-3 py-1.5 text-[11px] text-[#A5B0C7] hover:border-[#19D6A0]/45 hover:text-[#F4F7FF] transition-colors"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isUser
                            ? 'border border-[#19D6A0]/35 bg-[#19D6A0]/14 text-[#F4F7FF]'
                            : 'glass-elevated border-white/12 text-[#F4F7FF]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1.5 text-[10px]">
                          <span className="font-semibold text-[#32D9E8]">
                            {isUser ? user.name.split(',')[0] : 'SENTINEL AI'}
                          </span>
                          <span className="font-mono text-[#77849E]">{m.modelId}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {sendingChat && (
                <div className="flex justify-start">
                  <div className="rounded-2xl glass-elevated px-4 py-3 text-xs text-[#32D9E8]">
                    Synthesizing clinical guidance...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSendChat} className="border-t border-white/10 p-4 flex items-end gap-2.5">
              <GlassTextarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendChat(e);
                  }
                }}
                placeholder="Ask SENTINEL AI a clinical workflow question (Enter to send, Shift+Enter for newline)..."
                className="flex-1 resize-none"
              />
              <GlassButton
                type="button"
                variant={dictatingChat ? 'danger' : 'secondary'}
                onClick={handleToggleChatDictation}
                title="Dictate into chat using gemini-3.5-transcribe"
                className="h-10 px-3"
              >
                {dictatingChat ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4 text-[#32D9E8]" />}
              </GlassButton>
              <GlassButton
                type="submit"
                variant="primary"
                disabled={sendingChat || !chatInput.trim()}
                className="h-10 px-4"
              >
                <Send className="h-4 w-4" />
                <span>Send</span>
              </GlassButton>
            </form>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: REAL-TIME VOICE CONVERSATION (gemini-3.8-live) */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <GlassCard accent="purple" className="lg:col-span-5 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                  Gemini Live Voice Consult
                </h2>
                <p className="font-mono text-[11px] text-[#A879FF]">
                  Model: gemini-3.8-live · 16kHz PCM In / 24kHz Out
                </p>
              </div>
              <GlassBadge
                tone={
                  liveStatus === 'connected'
                    ? 'emerald'
                    : liveStatus === 'connecting'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {liveStatus === 'connected'
                  ? 'Live Connected'
                  : liveStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Standby'}
              </GlassBadge>
            </div>

            {/* Animated Acoustic Visualizer Ring */}
            <div className="flex flex-col items-center justify-center py-6">
              <motion.div
                animate={
                  liveStatus === 'connected' && !prefersReducedMotion
                    ? { scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }
                    : { scale: 1, opacity: 0.9 }
                }
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className={`relative flex h-36 w-36 items-center justify-center rounded-full border ${
                  liveStatus === 'connected'
                    ? 'border-[#19D6A0]/60 bg-[#19D6A0]/12 shadow-[0_0_48px_-8px_rgba(25,214,160,0.55)]'
                    : 'border-[#A879FF]/40 bg-[#A879FF]/10 shadow-[0_0_36px_-10px_rgba(168,121,255,0.4)]'
                }`}
              >
                <Volume2
                  className={`h-10 w-10 ${
                    liveStatus === 'connected' ? 'text-[#19D6A0]' : 'text-[#A879FF]'
                  }`}
                />
              </motion.div>
              <p className="mt-4 text-xs text-[#A5B0C7] text-center">
                {liveStatus === 'connected'
                  ? liveMuted
                    ? 'Microphone muted · Listening paused'
                    : 'Speak naturally — SENTINEL Live responds in real time.'
                  : 'Select a clinical voice persona and start a low-latency voice session.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Voice Persona</label>
              <GlassSelect
                value={liveVoice}
                disabled={liveStatus !== 'idle'}
                onChange={(e) => setLiveVoice(e.target.value as VoiceSessionRecord['voiceName'])}
                className="mt-1 w-full"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <GlassButton
                type="button"
                variant={liveStatus === 'idle' ? 'primary' : 'danger'}
                onClick={handleStartLiveVoice}
                className="flex-1 py-2.5"
              >
                {liveStatus === 'idle' ? (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>Start Live Consult</span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="h-4 w-4" />
                    <span>End Session</span>
                  </>
                )}
              </GlassButton>

              {liveStatus === 'connected' && (
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => setLiveMuted((m) => !m)}
                >
                  {liveMuted ? <MicOff className="h-4 w-4 text-[#FF647C]" /> : <Mic className="h-4 w-4 text-[#19D6A0]" />}
                  <span>{liveMuted ? 'Unmute' : 'Mute'}</span>
                </GlassButton>
              )}
            </div>
          </GlassCard>

          <GlassCard accent="cyan" className="lg:col-span-7 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                Real-Time Voice Transcript
              </h2>
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={savingVoice || liveTurns.length === 0}
                onClick={handleSaveVoiceSession}
              >
                <Save className="h-3.5 w-3.5 text-[#19D6A0]" />
                <span>{savingVoice ? 'Saving...' : 'Save to Firestore'}</span>
              </GlassButton>
            </div>

            <div className="h-64 overflow-y-auto space-y-2.5 pr-1">
              {liveTurns.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#77849E]">
                  Live conversation captions will appear here as you speak.
                </div>
              ) : (
                liveTurns.map((t) => (
                  <GlassPanel key={t.id} className="p-3">
                    <span
                      className={`text-[11px] font-semibold ${
                        t.speaker === 'Clinician' ? 'text-[#32D9E8]' : 'text-[#19D6A0]'
                      }`}
                    >
                      {t.speaker}
                    </span>
                    <p className="mt-1 text-xs text-[#F4F7FF] leading-relaxed">{t.text}</p>
                  </GlassPanel>
                ))
              )}
            </div>

            {savedVoiceSessions.length > 0 && (
              <div className="border-t border-white/10 pt-3 space-y-2">
                <h3 className="text-xs font-semibold text-[#A5B0C7]">
                  Saved Voice Sessions ({savedVoiceSessions.length})
                </h3>
                <div className="max-h-36 overflow-y-auto space-y-2">
                  {savedVoiceSessions.map((vs) => (
                    <GlassPanel key={vs.id} className="p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#F4F7FF]">{vs.title}</span>
                        <span className="font-mono text-[10px] text-[#32D9E8]">
                          {vs.turnCount} turns
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#A5B0C7] line-clamp-2">
                        {vs.transcriptSummary}
                      </p>
                    </GlassPanel>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB 3: AUDIO TRANSCRIPTION (gemini-3.5-transcribe) */}
      {activeTab === 'transcribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <GlassCard accent="emerald" className="lg:col-span-5 p-5 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                Clinical Audio Dictation
              </h2>
              <p className="font-mono text-[11px] text-[#19D6A0] mt-0.5">
                Model: gemini-3.5-transcribe
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5B0C7]">Dictation Title</label>
              <GlassInput
                type="text"
                value={dictationTitle}
                onChange={(e) => setDictationTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="rounded-2xl border border-white/12 bg-[#050814]/70 p-5 text-center space-y-3">
              <div className="flex items-center justify-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full border ${
                    recordingAudio
                      ? 'border-[#FF647C]/60 bg-[#FF647C]/15 text-[#FF647C]'
                      : 'border-[#19D6A0]/40 bg-[#19D6A0]/12 text-[#19D6A0]'
                  }`}
                >
                  <Mic className="h-7 w-7" />
                </div>
              </div>
              <p className="font-mono text-sm text-[#F4F7FF] tabular-nums">
                {recordingAudio
                  ? `Recording · ${recordingSec}s`
                  : transcribing
                    ? 'Transcribing audio...'
                    : 'Ready to record microphone audio'}
              </p>
              <GlassButton
                type="button"
                variant={recordingAudio ? 'danger' : 'primary'}
                disabled={transcribing}
                onClick={handleToggleRecording}
                className="w-full py-2.5"
              >
                {recordingAudio ? (
                  <>
                    <Square className="h-4 w-4" />
                    <span>Stop &amp; Transcribe</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>{transcribing ? 'Transcribing...' : 'Start Microphone Recording'}</span>
                  </>
                )}
              </GlassButton>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#090F1E]/70 px-4 py-3 text-xs text-[#A5B0C7] hover:border-[#32D9E8]/60 hover:text-[#F4F7FF] transition-colors">
              <Upload className="h-4 w-4 text-[#32D9E8]" />
              <span>Or upload audio file (.mp3, .wav, .webm, .m4a)</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFileUpload}
                className="sr-only"
              />
            </label>
          </GlassCard>

          <GlassCard accent="cyan" className="lg:col-span-7 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileAudio className="h-4 w-4 text-[#32D9E8]" />
                <h2 className="font-display text-sm font-semibold text-[#F4F7FF]">
                  Transcription Output
                </h2>
              </div>
              {transcriptText && (
                <div className="flex items-center gap-2">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyText('current', transcriptText)}
                  >
                    {copiedId === 'current' ? (
                      <Check className="h-3.5 w-3.5 text-[#19D6A0]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedId === 'current' ? 'Copied' : 'Copy'}</span>
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setChatInput(transcriptText);
                      setActiveTab('chat');
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Send to AI Chat</span>
                  </GlassButton>
                </div>
              )}
            </div>

            <GlassTextarea
              rows={6}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Recorded or uploaded speech transcriptions will appear here..."
            />

            <div className="border-t border-white/10 pt-3 space-y-2.5">
              <h3 className="text-xs font-semibold text-[#A5B0C7]">
                Saved Transcriptions ({savedTranscriptions.length})
              </h3>
              {savedTranscriptions.length === 0 ? (
                <p className="text-xs text-[#77849E] py-3">
                  No saved transcriptions yet. Record or upload an audio clip to begin.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {savedTranscriptions.map((item) => (
                    <GlassPanel key={item.id} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDictationTitle(item.title);
                            setTranscriptText(item.transcript);
                          }}
                          className="text-left text-xs font-semibold text-[#F4F7FF] hover:text-[#19D6A0] truncate"
                        >
                          {item.title}
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] text-[#32D9E8] tabular-nums">
                            {item.durationSec}s
                          </span>
                          {firebaseUid && (
                            <button
                              type="button"
                              onClick={() =>
                                void removeTranscriptionFromFirestore(firebaseUid, item.id)
                              }
                              aria-label="Delete transcription"
                              className="rounded p-1 text-[#77849E] hover:bg-white/10 hover:text-[#FF647C]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-[#A5B0C7] line-clamp-2">
                        {item.transcript}
                      </p>
                    </GlassPanel>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
