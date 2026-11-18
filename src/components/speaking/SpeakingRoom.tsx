'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Behavior,
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  Type,
  type LiveServerMessage,
  type Session,
} from '@google/genai';
import {
  ArrowLeft,
  Check,
  Clock,
  Layers,
  Loader2,
  Mic,
  MicOff,
  NotebookPen,
  PhoneOff,
  Send,
  Volume2,
} from 'lucide-react';
import type {
  SpeakingAttempt,
  SpeakingFeedback,
  SpeakingMode,
  SpeakingPartNum,
  SpeakingTopic,
  SpeakingTurn,
} from '@/lib/types';
import { getAudioBlob, saveAudioBlob } from '@/lib/audioStore';
import {
  addGrammarMistakes,
  addWord,
  hasWord,
  logSeconds,
  recordSpeakingAttempt,
  updateSpeakingAttempt,
  useStore,
} from '@/lib/store';
import { geminiHeaders } from '@/lib/geminiKey';
import { fmtBand } from '@/lib/band';
import { fmtClock, fmtDuration } from '@/lib/dates';
import { MascotLoading, SealMascot } from '../Mascots';

type Phase = 'intro' | 'live' | 'review';
type UiStage = 'part1' | 'part2_prep' | 'part2_speak' | 'part3' | 'finished';

const CRITERION_NAME: Record<'fc' | 'lr' | 'gra' | 'p', string> = {
  fc: 'Fluency',
  lr: 'Lexical',
  gra: 'Grammar',
  p: 'Pronunciation',
};

function partsForMode(mode: SpeakingMode): SpeakingPartNum[] {
  if (mode === 'part1') return [1];
  if (mode === 'part2') return [2];
  if (mode === 'part3') return [3];
  return [1, 2, 3];
}

function initialStageForMode(mode: SpeakingMode): UiStage {
  if (mode === 'part2') return 'part2_prep';
  if (mode === 'part3') return 'part3';
  return 'part1';
}

function stageToPart(s: UiStage): SpeakingPartNum {
  if (s === 'part2_prep' || s === 'part2_speak') return 2;
  if (s === 'part3') return 3;
  return 1;
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function base64ToInt16(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

function downsampleTo16k(input: Float32Array, sampleRate: number): Int16Array {
  if (sampleRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = sampleRate / 16000;
  const len = Math.floor(input.length / ratio);
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const idx = Math.floor(i * ratio);
    const s = Math.max(-1, Math.min(1, input[idx]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export default function SpeakingRoom({ topic, attemptId }: { topic: SpeakingTopic; attemptId?: string }) {
  const store = useStore();
  const router = useRouter();

  const existing = useMemo(
    () => (attemptId && store ? store.speakingAttempts?.find(a => a.id === attemptId) : undefined),
    [attemptId, store],
  );

  const [phase, setPhase] = useState<Phase>(attemptId ? 'review' : 'intro');
  const [mode, setMode] = useState<SpeakingMode>('part1');
  const [liveModel, setLiveModel] = useState<'gemini-3.8-live-extended-thinking' | 'gemini-3.8-live'>('gemini-3.8-live-extended-thinking');
  const [stage, setStage] = useState<UiStage>('part1');
  const [seconds, setSeconds] = useState(0);
  const [prepLeft, setPrepLeft] = useState(60);
  const [speakLeft, setSpeakLeft] = useState(120);
  const [notes, setNotes] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connErr, setConnErr] = useState('');
  const [interactionStatus, setInteractionStatus] = useState<string>('IDLE');
  const [micMuted, setMicMuted] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [turns, setTurns] = useState<SpeakingTurn[]>([]);
  const [liveExaminerText, setLiveExaminerText] = useState('');
  const [liveCandidateText, setLiveCandidateText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [examinerNotes, setExaminerNotes] = useState<{ criterion: string; note: string }[]>([]);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(attemptId ?? null);
  const [grading, setGrading] = useState(false);
  const [gradeErr, setGradeErr] = useState('');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [vocabToast, setVocabToast] = useState<string | null>(null);
  const [mistakeToast, setMistakeToast] = useState<string | null>(null);

  // Refs cho session Live API & Web Audio
  const sessionRef = useRef<Session | null>(null);
  const micMutedRef = useRef(false);
  const stageRef = useRef<UiStage>('part1');
  const turnsRef = useRef<SpeakingTurn[]>([]);
  const liveExaminerRef = useRef('');
  const liveCandidateRef = useRef('');
  const examinerNotesRef = useRef<{ criterion: string; note: string }[]>([]);
  const startedAtRef = useRef(0);
  const secondsRef = useRef(0);

  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef(0);
  const lastVoiceAtRef = useRef(0);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const currentAttempt: SpeakingAttempt | undefined = useMemo(() => {
    if (!store) return undefined;
    const id = activeAttemptId ?? attemptId;
    return id ? store.speakingAttempts?.find(a => a.id === id) : undefined;
  }, [store, activeAttemptId, attemptId]);

  // Nạp file ghi âm khi xem lại
  useEffect(() => {
    const id = activeAttemptId ?? attemptId;
    if (phase !== 'review' || !id) return;
    let url: string | null = null;
    void getAudioBlob(id).then(blob => {
      if (blob) {
        url = URL.createObjectURL(blob);
        setRecordingUrl(url);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
      setRecordingUrl(null);
    };
  }, [phase, activeAttemptId, attemptId]);

  const stopPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Bỏ qua nếu source đã dừng
      }
    }
    activeSourcesRef.current = [];
    if (playbackCtxRef.current) nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
  }, []);

  const schedulePcmPlayback = useCallback((b64: string) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const pcm = base64ToInt16(b64);
    if (!pcm.length) return;
    const buf = ctx.createBuffer(1, pcm.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime + 0.02, nextPlayTimeRef.current);
    src.start(startAt);
    nextPlayTimeRef.current = startAt + buf.duration;
    activeSourcesRef.current.push(src);
    src.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== src);
    };
  }, []);

  const flushPartialTurns = useCallback((who: 'examiner' | 'candidate' | 'both') => {
    const part = stageToPart(stageRef.current);
    if ((who === 'candidate' || who === 'both') && liveCandidateRef.current.trim()) {
      const next: SpeakingTurn = { role: 'candidate', text: liveCandidateRef.current.trim(), part, at: Date.now() };
      turnsRef.current = [...turnsRef.current, next];
      liveCandidateRef.current = '';
      setLiveCandidateText('');
      setTurns([...turnsRef.current]);
    }
    if ((who === 'examiner' || who === 'both') && liveExaminerRef.current.trim()) {
      const next: SpeakingTurn = { role: 'examiner', text: liveExaminerRef.current.trim(), part, at: Date.now() };
      turnsRef.current = [...turnsRef.current, next];
      liveExaminerRef.current = '';
      setLiveExaminerText('');
      setTurns([...turnsRef.current]);
    }
  }, []);

  const cleanupMediaAndSocket = useCallback(async (): Promise<Blob | null> => {
    stopPlaybackQueue();
    try {
      sessionRef.current?.close();
    } catch {
      // Bỏ qua
    }
    sessionRef.current = null;

    let recordedBlob: Blob | null = null;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      recordedBlob = await new Promise<Blob | null>(resolve => {
        rec.onstop = () => {
          const b = audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type: rec.mimeType || 'audio/webm' }) : null;
          resolve(b);
        };
        rec.stop();
      });
    }
    recorderRef.current = null;

    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;

    if (captureCtxRef.current && captureCtxRef.current.state !== 'closed') {
      await captureCtxRef.current.close().catch(() => {});
    }
    captureCtxRef.current = null;

    if (playbackCtxRef.current && playbackCtxRef.current.state !== 'closed') {
      await playbackCtxRef.current.close().catch(() => {});
    }
    playbackCtxRef.current = null;

    return recordedBlob;
  }, [stopPlaybackQueue]);

  useEffect(() => {
    return () => {
      void cleanupMediaAndSocket();
    };
  }, [cleanupMediaAndSocket]);

  // Đồng hồ tổng buổi nói
  useEffect(() => {
    if (phase !== 'live') return;
    let unlogged = 0;
    const id = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      unlogged++;
      if (unlogged >= 20) {
        logSeconds(unlogged);
        unlogged = 0;
      }
    }, 1000);
    return () => {
      clearInterval(id);
      if (unlogged > 0) logSeconds(unlogged);
    };
  }, [phase]);

  // Đồng hồ chuẩn bị 60s & nói 120s cho Part 2
  useEffect(() => {
    if (phase !== 'live') return;
    if (stage === 'part2_prep') {
      if (prepLeft <= 0) return;
      const t = setTimeout(() => setPrepLeft(x => x - 1), 1000);
      return () => clearTimeout(t);
    }
    if (stage === 'part2_speak') {
      if (speakLeft <= 0) return;
      const t = setTimeout(() => setSpeakLeft(x => x - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [phase, stage, prepLeft, speakLeft]);

  const targetBand = store?.profile?.target ?? 6.5;
  const runGrading = useCallback(
    async (attempt: SpeakingAttempt, extraNotes: { criterion: string; note: string }[] = []) => {
      setGrading(true);
      setGradeErr('');
      try {
        const res = await fetch('/api/speaking/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...geminiHeaders() },
          body: JSON.stringify({
            topic,
            mode: attempt.mode,
            parts: attempt.parts,
            seconds: attempt.seconds,
            transcript: attempt.transcript,
            examinerNotes: extraNotes,
            targetBand,
          }),
        });
        const data = (await res.json()) as { feedback?: SpeakingFeedback; error?: string };
        if (!res.ok || !data.feedback) throw new Error(data.error || 'Chưa chấm được phần Speaking.');
        updateSpeakingAttempt(attempt.id, a => {
          a.feedback = data.feedback;
        });
      } catch (err) {
        setGradeErr(err instanceof Error ? err.message : 'Lỗi kết nối Gemini 4 Argon');
      } finally {
        setGrading(false);
      }
    },
    [topic, targetBand],
  );

  const finishSession = useCallback(async () => {
    flushPartialTurns('both');
    const recordedBlob = await cleanupMediaAndSocket();
    const id = `s${Date.now().toString(36)}`;
    if (recordedBlob && recordedBlob.size > 0) {
      await saveAudioBlob(id, recordedBlob);
    }
    const attempt: SpeakingAttempt = {
      id,
      topicId: topic.id,
      mode,
      parts: partsForMode(mode),
      startedAt: startedAtRef.current || Date.now(),
      finishedAt: Date.now(),
      seconds: secondsRef.current,
      transcript: turnsRef.current,
      notes: notes.trim() || undefined,
      hasRecording: !!(recordedBlob && recordedBlob.size > 0),
    };
    recordSpeakingAttempt(attempt);
    setActiveAttemptId(id);
    setPhase('review');
    router.replace(`/speaking/${topic.id}?attempt=${id}`, { scroll: false });
    if (attempt.transcript.some(t => t.role === 'candidate' && t.text.trim())) {
      void runGrading(attempt, examinerNotesRef.current);
    }
  }, [flushPartialTurns, cleanupMediaAndSocket, topic.id, mode, notes, router, runGrading]);

  const startLiveSession = async () => {
    setConnecting(true);
    setConnErr('');
    turnsRef.current = [];
    examinerNotesRef.current = [];
    liveExaminerRef.current = '';
    liveCandidateRef.current = '';
    setTurns([]);
    setExaminerNotes([]);
    setLiveExaminerText('');
    setLiveCandidateText('');
    secondsRef.current = 0;
    setSeconds(0);
    setPrepLeft(60);
    setSpeakLeft(120);
    startedAtRef.current = Date.now();
    const initStage = initialStageForMode(mode);
    setStage(initStage);
    stageRef.current = initStage;

    try {
      // 1. Lấy Ephemeral Token từ server
      const tokRes = await fetch('/api/speaking/token', {
        method: 'POST',
        headers: { ...geminiHeaders() },
      });
      const tokData = (await tokRes.json()) as { token?: string; model?: string; error?: string };
      if (!tokRes.ok || !tokData.token) {
        throw new Error(tokData.error || 'Không lấy được phiên kết nối Live API.');
      }

      // 2. Mở Web Audio Playback (24kHz) & Microphone Capture (16kHz)
      const playCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playCtx;
      nextPlayTimeRef.current = playCtx.currentTime;

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        mediaStreamRef.current = stream;
        setMicAvailable(true);
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = ev => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      } catch {
        setMicAvailable(false);
        setMicMuted(true);
      }

      // 3. Cấu hình Examiner cho Gemini 3.8 Live Extended Thinking
      const ai = new GoogleGenAI({ apiKey: tokData.token, httpOptions: { apiVersion: 'v1alpha' } });
      const parts = partsForMode(mode);
      const systemPrompt = `You are a warm, realistic, professional British IELTS Speaking Examiner conducting a live IELTS Speaking practice session.
Topic: "${topic.title}" (${topic.themeVi})
Session mode: "${mode}" (Parts to conduct in order: ${parts.map(p => `Part ${p}`).join(', ')})

Part 1 questions (${topic.part1.topic}):
${topic.part1.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Part 2 Cue Card:
"${topic.part2.cueCardTitle}"
Bullets: ${topic.part2.bullets.join('; ')}
Follow-up: ${topic.part2.followUp}

Part 3 questions (${topic.part3.theme}):
${topic.part3.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Examiner Conduct Rules:
1. Speak naturally and concisely like a real IELTS Examiner — never lecture, never translate into Vietnamese, and never give long feedback mid-test.
2. Ask ONE question at a time and listen patiently while the candidate finishes speaking.
3. For Part 2: When transitioning into Part 2, call \`advance_stage({ stage: "part2_prep" })\`, tell the candidate they have 1 minute to prepare their cue card notes, and stay quiet until they signal they are ready to speak. When they speak in Part 2, listen silently without interrupting for up to 2 minutes, then thank them and ask the follow-up question.
4. Use \`advance_stage\` whenever moving between Part 1, Part 2 prep, Part 2 speak, Part 3, or finishing the test (\`"finished"\`).`;

      const advanceStageTool = {
        name: 'advance_stage',
        description: 'Updates the learner UI to show the current IELTS Speaking part or cue card stage.',
        behavior: Behavior.NON_BLOCKING,
        parameters: {
          type: Type.OBJECT,
          properties: {
            stage: {
              type: Type.STRING,
              enum: ['part1', 'part2_prep', 'part2_speak', 'part3', 'finished'],
            },
          },
          required: ['stage'],
        },
      };

      const isExtended = liveModel === 'gemini-3.8-live-extended-thinking';
      const session = await ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          ...(isExtended ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          contextWindowCompression: { slidingWindow: {} },
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: [{ functionDeclarations: [advanceStageTool] }],
        },
        callbacks: {
          onopen: () => {
            setConnecting(false);
            setPhase('live');
          },
          onmessage: (msg: LiveServerMessage) => {
            const rawStatus = (msg as unknown as { interactionStatus?: string }).interactionStatus;
            if (rawStatus) setInteractionStatus(rawStatus);

            if (msg.toolCall?.functionCalls) {
              const responses = msg.toolCall.functionCalls.map(fc => {
                if (fc.name === 'advance_stage') {
                  const nextStage = (fc.args?.stage as UiStage | undefined) ?? 'part1';
                  if (['part1', 'part2_prep', 'part2_speak', 'part3', 'finished'].includes(nextStage)) {
                    setStage(nextStage);
                    stageRef.current = nextStage;
                  }
                }
                return {
                  id: fc.id,
                  name: fc.name,
                  response: {
                    result: 'ok',
                    scheduling: FunctionResponseScheduling.SILENT,
                  },
                };
              });
              session.sendToolResponse({ functionResponses: responses });
            }

            const sc = msg.serverContent;
            if (!sc) return;

            if (sc.interrupted) {
              stopPlaybackQueue();
            }

            if (sc.inputTranscription?.text) {
              liveCandidateRef.current += sc.inputTranscription.text;
              setLiveCandidateText(liveCandidateRef.current);
            }

            if (sc.outputTranscription?.text) {
              // Khi giám khảo bắt đầu nói, chốt lượt thí sinh trước đó
              if (liveCandidateRef.current.trim()) flushPartialTurns('candidate');
              liveExaminerRef.current += sc.outputTranscription.text;
              setLiveExaminerText(liveExaminerRef.current);
            }

            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                  schedulePcmPlayback(part.inlineData.data);
                }
              }
            }

            if (sc.turnComplete) {
              flushPartialTurns('both');
            }
          },
          onerror: (e: ErrorEvent) => {
            setConnErr(e.message || 'Kết nối Live API gặp sự cố.');
          },
          onclose: () => {
            setConnecting(false);
          },
        },
      });

      sessionRef.current = session;

      // 4. Bắt đầu stream microphone 16kHz PCM sang Live API (lọc khoảng lặng & tạm ngưng khi Examiner đang phát audio để tiết kiệm token)
      if (stream) {
        const capCtx = new AudioContext({ sampleRate: 16000 });
        captureCtxRef.current = capCtx;
        const source = capCtx.createMediaStreamSource(stream);
        const processor = capCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = ev => {
          if (!sessionRef.current || micMutedRef.current || stageRef.current === 'part2_prep') return;
          // Không gửi audio khi Examiner đang nói (tránh tốn token & tự ngắt lời)
          if (activeSourcesRef.current.length > 0) return;

          const floatData = ev.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < floatData.length; i++) sum += floatData[i] * floatData[i];
          const rms = Math.sqrt(sum / floatData.length);
          const now = Date.now();
          if (rms > 0.012) {
            lastVoiceAtRef.current = now;
          } else if (now - lastVoiceAtRef.current > 1200) {
            return; // Quá 1.2s im lặng -> không stream khoảng lặng lên API
          }

          const pcm = downsampleTo16k(floatData, capCtx.sampleRate);
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: int16ToBase64(pcm),
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        };
        source.connect(processor);
        processor.connect(capCtx.destination);
      }

      // 5. Kích hoạt lời chào mở đầu của Examiner
      const introInstruction =
        mode === 'part2'
          ? 'Please start IELTS Speaking Part 2 now. Briefly introduce the cue card topic and give the candidate 1 minute to prepare.'
          : mode === 'part3'
            ? 'Please start IELTS Speaking Part 3 directly. Greet briefly and ask the first Part 3 discussion question.'
            : 'Please greet the candidate warmly and begin IELTS Speaking Part 1 with the first question.';
      session.sendRealtimeInput({ text: introInstruction });
    } catch (err) {
      await cleanupMediaAndSocket();
      setConnecting(false);
      setPhase('intro');
      setConnErr(err instanceof Error ? err.message : 'Không thể bắt đầu buổi thi Speaking.');
    }
  };

  const endTurnNow = () => {
    flushPartialTurns('candidate');
    sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
  };

  const sendTypedTurn = (e: React.FormEvent) => {
    e.preventDefault();
    const val = textInput.trim();
    if (!val || !sessionRef.current) return;
    const part = stageToPart(stage);
    const next: SpeakingTurn = { role: 'candidate', text: val, part, at: Date.now() };
    turnsRef.current = [...turnsRef.current, next];
    setTurns([...turnsRef.current]);
    setTextInput('');
    sessionRef.current.sendRealtimeInput({ text: val });
  };

  const startPart2Speaking = () => {
    setStage('part2_speak');
    stageRef.current = 'part2_speak';
    sessionRef.current?.sendRealtimeInput({
      text: 'The 1 minute preparation time has ended. I am ready to begin my 2-minute Part 2 talk now. Please listen until I finish.',
    });
  };

  if (!store) return <MascotLoading character="seal" label="Hải Cẩu đang chỉnh micro…" />;

  // ---------- Màn mở đầu ----------
  if (phase === 'intro') {
    const modes: { k: SpeakingMode; name: string; desc: string }[] = [
      { k: 'part1', name: 'Chỉ Part 1 (~4 phút)', desc: `Trả lời câu hỏi ngắn chủ đề ${topic.part1.topic}. Phù hợp khởi động mỗi ngày.` },
      { k: 'part2', name: 'Chỉ Part 2 (Cue Card 1p + 2p)', desc: '1 phút chuẩn bị ghi chú + 2 phút nói liên tục theo thẻ gợi ý.' },
      { k: 'part3', name: 'Chỉ Part 3 (~5 phút)', desc: `Thảo luận chuyên sâu chủ đề ${topic.part3.theme}.` },
      { k: 'full', name: 'Thi thử Full 3 Parts (11–14 phút)', desc: 'Phỏng vấn liên tục Part 1 → Part 2 → Part 3 như phòng thi thật.' },
    ];
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
        <div className="w-full max-w-2xl">
          <Link href="/speaking" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft size={15} /> Kho đề Speaking
          </Link>
          <div className="card mt-4 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-ember">Speaking Live Examiner · Gemini 3.8 Live Extended Thinking</p>
                <h1 className="mt-1.5 font-serif text-[26px] leading-tight font-semibold">{topic.title}</h1>
                <p className="mt-1 text-sm text-ink-2">{topic.themeVi}</p>
              </div>
              <SealMascot pose="speaking" size={68} className="hidden sm:block" />
            </div>

            <div className="mt-4 rounded-xl border border-line bg-paper/70 p-4 text-sm">
              <p className="font-semibold text-ink">Cue Card Part 2 trong bộ đề này:</p>
              <p className="mt-1 font-serif text-[15px] italic text-ink-2">“{topic.part2.cueCardTitle}”</p>
            </div>

            <div className="mt-5 grid gap-2">
              {modes.map(m => (
                <button
                  key={m.k}
                  onClick={() => setMode(m.k)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    mode === m.k ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:bg-sunk'
                  }`}
                >
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className={`mt-0.5 text-xs ${mode === m.k ? 'text-paper/75' : 'text-muted'}`}>{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper/60 px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-ink-2">Model Examiner:</span>
              <div className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setLiveModel('gemini-3.8-live-extended-thinking')}
                  className={`rounded-md px-2.5 py-1 font-medium ${liveModel === 'gemini-3.8-live-extended-thinking' ? 'bg-ink text-paper' : 'text-ink-2'}`}
                >
                  3.8 Extended Thinking
                </button>
                <button
                  type="button"
                  onClick={() => setLiveModel('gemini-3.8-live')}
                  className={`rounded-md px-2.5 py-1 font-medium ${liveModel === 'gemini-3.8-live' ? 'bg-ink text-paper' : 'text-ink-2'}`}
                >
                  3.8 Live (Nhẹ &amp; Tiết kiệm token)
                </button>
              </div>
            </div>

            {connErr && (
              <div className="mt-4 rounded-lg border border-bad/40 bg-bad-soft/60 p-3 text-sm text-bad">
                {connErr} —{' '}
                <Link href="/journal" className="font-semibold underline">
                  Kiểm tra API Key
                </Link>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn-primary px-6 py-2.5" disabled={connecting} onClick={() => void startLiveSession()}>
                {connecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang kết nối Examiner…
                  </>
                ) : (
                  <>
                    <Mic size={16} /> Bắt đầu phỏng vấn
                  </>
                )}
              </button>
              <span className="text-xs text-muted">Nên đeo tai nghe để tránh dội tiếng micro. Không có micro vẫn gõ trả lời được.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Phòng thi trực tiếp ----------
  if (phase === 'live') {
    const stageLabel =
      stage === 'part1'
        ? 'Part 1 · Hỏi đáp ngắn'
        : stage === 'part2_prep'
          ? 'Part 2 · Chuẩn bị 1 phút'
          : stage === 'part2_speak'
            ? 'Part 2 · Nói 2 phút'
            : stage === 'part3'
              ? 'Part 3 · Thảo luận chuyên sâu'
              : 'Đã hoàn thành';

    return (
      <div className="flex h-dvh flex-col bg-paper">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block size-2.5 animate-pulse rounded-full bg-ember" />
            <div>
              <div className="text-sm font-semibold">{topic.title}</div>
              <div className="text-xs text-muted">{stageLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="num flex items-center gap-1 rounded-md bg-sunk px-2.5 py-1 text-xs font-semibold text-ink">
              <Clock size={13} /> {fmtClock(seconds)}
            </span>
            <button className="btn-ghost border-bad/40 text-bad hover:bg-bad-soft" onClick={() => void finishSession()}>
              <PhoneOff size={15} /> Kết thúc &amp; Chấm điểm
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_1.15fr]">
          {/* Cột trái: Examiner + Cue Card Part 2 + Điều khiển mic */}
          <div className="scroll-thin flex flex-col justify-between gap-5 overflow-y-auto border-b border-line bg-surface p-5 lg:border-r lg:border-b-0 sm:p-7">
            <div className="space-y-5">
              <div className="card flex items-center gap-4 bg-paper/70 p-4">
                <SealMascot pose="speaking" size={70} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="eyebrow text-accent">IELTS Examiner</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        interactionStatus === 'IN_PROGRESS' ? 'bg-accent-soft text-accent-2' : 'bg-good-soft text-good'
                      }`}
                    >
                      {interactionStatus === 'IN_PROGRESS' ? 'Đang suy nghĩ / nói…' : 'Đang lắng nghe bạn'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-2">
                    Gemini 3.8 Live Extended Thinking · Trả lời xong một câu hãy bấm nút “Đã trả lời xong” nếu muốn Examiner hỏi tiếp ngay.
                  </p>
                </div>
              </div>

              {(stage === 'part2_prep' || stage === 'part2_speak' || mode === 'part2') && (
                <div className="card border-accent/40 bg-paper p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="eyebrow text-accent">Part 2 Cue Card</span>
                    {stage === 'part2_prep' ? (
                      <span className="num rounded bg-ember-soft px-2 py-0.5 text-xs font-bold text-ember">
                        Chuẩn bị: {fmtClock(prepLeft)}
                      </span>
                    ) : (
                      <span className="num rounded bg-good-soft px-2 py-0.5 text-xs font-bold text-good">
                        Nói: {fmtClock(speakLeft)}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-serif text-[18px] font-semibold">{topic.part2.cueCardTitle}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
                    {topic.part2.bullets.map(b => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {stage === 'part2_prep' && (
                    <div className="mt-4 space-y-2 border-t border-line pt-3">
                      <p className="text-xs font-semibold text-ink-2">Giấy nháp từ khóa (1 phút):</p>
                      <textarea
                        className="field min-h-24 text-sm"
                        placeholder="Ghi 10–15 từ khóa rời theo 4 chặng (Mở → Bối cảnh → Sự việc → Cảm xúc)…"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                      <button className="btn-primary w-full" onClick={startPart2Speaking}>
                        Bắt đầu nói Part 2 ngay
                      </button>
                    </div>
                  )}
                </div>
              )}

              {connErr && <p className="rounded-lg bg-bad-soft p-3 text-xs text-bad">{connErr}</p>}
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {micAvailable && (
                  <button
                    onClick={() => setMicMuted(m => !m)}
                    className={`btn-ghost ${micMuted ? 'border-bad/40 text-bad' : 'border-good/40 text-good'}`}
                  >
                    {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    {micMuted ? 'Đang tắt mic' : 'Mic đang bật'}
                  </button>
                )}
                <button className="btn-primary flex-1" onClick={endTurnNow}>
                  <Volume2 size={16} /> Đã trả lời xong câu này
                </button>
              </div>
              <form onSubmit={sendTypedTurn} className="flex gap-2">
                <input
                  className="field text-sm"
                  placeholder="Hoặc gõ câu trả lời tiếng Anh nếu không tiện bật mic…"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                />
                <button type="submit" className="btn-ghost px-3" disabled={!textInput.trim()} aria-label="Gửi">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>

          {/* Cột phải: Transcript trực tiếp */}
          <div className="scroll-thin flex flex-col overflow-y-auto p-5 sm:p-7">
            <p className="eyebrow mb-3">Phiên thoại trực tiếp</p>
            <div className="space-y-3">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    t.role === 'examiner' ? 'border border-line bg-surface' : 'ml-6 bg-accent-soft/70 text-ink'
                  }`}
                >
                  <div className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">
                    {t.role === 'examiner' ? `Examiner · Part ${t.part}` : `Bạn · Part ${t.part}`}
                  </div>
                  <p className="font-serif text-[15.5px]">{t.text}</p>
                </div>
              ))}
              {liveCandidateText && (
                <div className="ml-6 rounded-xl bg-accent-soft/40 px-4 py-3 text-sm italic">
                  <div className="mb-1 text-[11px] font-bold text-muted uppercase">Bạn (đang nói)…</div>
                  <p className="font-serif">{liveCandidateText}</p>
                </div>
              )}
              {liveExaminerText && (
                <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
                  <div className="mb-1 text-[11px] font-bold text-accent uppercase">Examiner…</div>
                  <p className="font-serif">{liveExaminerText}</p>
                </div>
              )}
              {!turns.length && !liveExaminerText && !liveCandidateText && (
                <p className="text-sm text-muted">Examiner đang mở lời chào… Hãy bật loa và chuẩn bị trả lời.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Màn Xem lại & Chấm điểm ----------
  const attempt = currentAttempt ?? existing;
  if (!attempt) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-muted">
        <div>
          <p>Không tìm thấy buổi luyện Speaking này.</p>
          <Link href="/speaking" className="btn-ghost mt-4">
            Về kho đề Speaking
          </Link>
        </div>
      </div>
    );
  }

  const fb = attempt.feedback;

  const saveVocab = () => {
    if (!fb) return;
    let n = 0;
    for (const v of fb.suggestedVocab) {
      if (!hasWord(store, v.word)) {
        if (addWord({ word: v.word, vi: v.vi, pos: v.pos, context: v.context, source: `Speaking · ${topic.title}` })) n++;
      }
    }
    updateSpeakingAttempt(attempt.id, a => {
      a.addedVocab = true;
    });
    setVocabToast(n > 0 ? `Đã thêm ${n} cụm từ nói tự nhiên vào bộ thẻ SRS.` : 'Các cụm từ này đã có trong bộ thẻ.');
  };

  const saveMistakes = () => {
    if (!fb) return;
    const n = addGrammarMistakes(
      fb.utteranceFixes.map(f => ({
        sourceId: attempt.id,
        skill: 'speaking' as const,
        original: f.original,
        improved: f.improved,
        criterion: f.criterion,
        reasonVi: f.reasonVi,
        errorPattern: f.errorPattern,
      })),
    );
    updateSpeakingAttempt(attempt.id, a => {
      a.addedMistakes = true;
    });
    setMistakeToast(n > 0 ? `Đã lưu ${n} câu cần sửa vào Sổ lỗi (quay lại sau 1–3–7 ngày).` : 'Các câu này đã có trong Sổ lỗi.');
  };

  return (
    <div className="min-h-dvh bg-paper pb-16">
      <header className="flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
        <Link href="/speaking" className="btn-quiet" aria-label="Quay lại">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{topic.title}</div>
          <div className="text-xs text-muted">Xem lại buổi Speaking · {fmtDuration(attempt.seconds)}</div>
        </div>
        <Link href={`/speaking/${topic.id}`} className="btn-ghost" onClick={() => setPhase('intro')}>
          Luyện lại đề này
        </Link>
      </header>

      <div className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 lg:grid-cols-[0.95fr_1.15fr] sm:px-6">
        {/* Cột trái: File ghi âm của bạn + Transcript hội thoại */}
        <aside className="space-y-4">
          {recordingUrl && (
            <div className="card p-4">
              <p className="eyebrow mb-2 text-ember">Bản ghi âm giọng nói của bạn</p>
              <audio controls src={recordingUrl} className="w-full" />
              <p className="mt-1.5 text-xs text-muted">Lưu cục bộ trên trình duyệt để bạn tự nghe lại phát âm và ngữ điệu.</p>
            </div>
          )}

          <div className="card p-5">
            <p className="eyebrow mb-3">Transcript buổi nói ({attempt.transcript.length} lượt)</p>
            <div className="space-y-2.5 text-sm">
              {attempt.transcript.map((t, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 ${t.role === 'examiner' ? 'bg-paper' : 'bg-accent-soft/60'}`}>
                  <span className="text-[11px] font-bold text-muted uppercase">
                    {t.role === 'examiner' ? `Examiner (P${t.part})` : `Bạn (P${t.part})`}:{' '}
                  </span>
                  <span className="font-serif text-[14.5px]">{t.text}</span>
                </div>
              ))}
              {!attempt.transcript.length && <p className="text-muted">Chưa ghi nhận lượt thoại nào trong phiên này.</p>}
            </div>
          </div>
        </aside>

        {/* Cột phải: Chấm 4 tiêu chí + Nâng cấp câu nói */}
        <section className="space-y-5">
          {grading && (
            <div className="card flex items-center gap-4 border-accent/40 bg-accent-soft/50 p-5">
              <Loader2 size={24} className="shrink-0 animate-spin text-accent" />
              <div>
                <p className="font-semibold">Đang phân tích 4 tiêu chí Speaking…</p>
                <p className="mt-0.5 text-sm text-ink-2">Gemini 4 Argon đang đối chiếu bản nói của bạn theo rubric chuẩn IELTS.</p>
              </div>
            </div>
          )}

          {gradeErr && (
            <div className="card border-bad/40 bg-bad-soft/60 p-5">
              <p className="font-semibold text-bad">Chưa chấm được phần Speaking</p>
              <p className="mt-1 text-sm text-ink-2">{gradeErr}</p>
              <button className="btn-primary mt-3" onClick={() => void runGrading(attempt, examinerNotes)}>
                Chấm lại
              </button>
            </div>
          )}

          {!fb && !grading && !gradeErr && attempt.transcript.some(t => t.role === 'candidate') && (
            <div className="card p-5">
              <button className="btn-primary" onClick={() => void runGrading(attempt, examinerNotes)}>
                Chấm chi tiết 4 tiêu chí (Gemini 4 Argon)
              </button>
            </div>
          )}

          {fb && (
            <>
              <div className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-6 p-5 sm:p-6">
                  <div>
                    <p className="eyebrow text-accent">Speaking Band ước tính</p>
                    <p className="num mt-1 font-serif text-[46px] leading-none font-semibold text-accent">{fmtBand(fb.scores.overall)}</p>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      ['Fluency', fb.scores.fc],
                      ['Lexical', fb.scores.lr],
                      ['Grammar', fb.scores.gra],
                      ['Pronunc.', fb.scores.p],
                    ].map(([l, v]) => (
                      <div key={l as string} className="rounded-lg border border-line bg-paper/70 p-2.5 text-center">
                        <div className="text-[11px] text-muted">{l}</div>
                        <div className="num mt-0.5 font-serif text-xl font-bold">{fmtBand(v as number)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-line bg-paper/60 px-5 py-4 text-sm leading-relaxed sm:px-6">
                  <p>{fb.summaryVi}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-good">Điểm mạnh</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ink-2">
                        {fb.strengthsVi.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ember">Cần cải thiện trước tiên</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ink-2">
                        {fb.prioritiesVi.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 sm:px-6">
                  <button className="btn-ghost" onClick={saveVocab} disabled={!fb.suggestedVocab.length || !!attempt.addedVocab}>
                    <Layers size={15} /> {attempt.addedVocab ? 'Đã lưu từ vựng' : `Lưu ${fb.suggestedVocab.length} cụm từ nói tự nhiên`}
                  </button>
                  <button className="btn-ghost" onClick={saveMistakes} disabled={!fb.utteranceFixes.length || !!attempt.addedMistakes}>
                    <NotebookPen size={15} /> {attempt.addedMistakes ? 'Đã đưa vào Sổ lỗi' : `Đưa ${fb.utteranceFixes.length} câu sửa vào Sổ lỗi`}
                  </button>
                </div>
                {(vocabToast || mistakeToast) && (
                  <div className="border-t border-line bg-good-soft/50 px-5 py-2 text-xs text-good sm:px-6">
                    {vocabToast && <p>{vocabToast}</p>}
                    {mistakeToast && <p>{mistakeToast}</p>}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Fluency & Coherence', fb.scores.fc, fb.criteriaNotesVi.fc],
                  ['Lexical Resource', fb.scores.lr, fb.criteriaNotesVi.lr],
                  ['Grammatical Range', fb.scores.gra, fb.criteriaNotesVi.gra],
                  ['Pronunciation & Delivery', fb.scores.p, fb.criteriaNotesVi.p],
                ].map(([title, sc, note]) => (
                  <div key={title as string} className="card p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold">{title}</span>
                      <span className="num text-xs font-bold text-accent">{fmtBand(sc as number)}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{note}</p>
                  </div>
                ))}
              </div>

              {fb.pronunciationTipsVi.length > 0 && (
                <div className="card p-4 sm:p-5">
                  <p className="eyebrow text-ember">Gợi ý phát âm &amp; ngữ điệu</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-2">
                    {fb.pronunciationTipsVi.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="mb-3 font-serif text-xl font-semibold">Nâng cấp câu nói thực tế</h3>
                <ul className="space-y-3">
                  {fb.utteranceFixes.map((f, i) => (
                    <li key={i} className="card p-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded bg-sunk px-2 py-0.5 font-bold">{CRITERION_NAME[f.criterion]}</span>
                        {f.errorPattern && <span className="rounded bg-ember-soft px-2 py-0.5 font-medium text-ember">{f.errorPattern}</span>}
                      </div>
                      <p className="mt-2 font-serif text-[14.5px] text-bad line-through decoration-1">{f.original}</p>
                      <p className="mt-1 font-serif text-[15px] font-medium text-good">→ {f.improved}</p>
                      <p className="mt-2 text-xs leading-relaxed text-ink-2">{f.reasonVi}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-4 sm:p-5">
                <p className="eyebrow mb-2">Từ vựng &amp; cụm nói tự nhiên</p>
                <ul className="divide-y divide-line">
                  {fb.suggestedVocab.map(v => (
                    <li key={v.word} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div>
                        <span className="font-serif font-semibold">{v.word}</span>{' '}
                        <span className="text-xs text-muted italic">({v.pos})</span>{' '}
                        <span className="text-sm text-ink-2">— {v.vi}</span>
                        <p className="mt-0.5 font-serif text-xs text-muted italic">“{v.context}”</p>
                      </div>
                      {hasWord(store, v.word) ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-good">
                          <Check size={13} /> Đã lưu
                        </span>
                      ) : (
                        <button
                          className="btn-ghost shrink-0 px-2.5 py-1 text-xs"
                          onClick={() => addWord({ word: v.word, vi: v.vi, pos: v.pos, context: v.context, source: `Speaking · ${topic.title}` })}
                        >
                          + Lưu thẻ
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
