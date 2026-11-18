import { currentRole } from '@/lib/session';
import { createStructuredGrade } from '@/lib/geminiGrade';
import type { SpeakingFeedback, SpeakingMode, SpeakingPartNum, SpeakingTopic, SpeakingTurn } from '@/lib/types';

const roundHalf = (n: number) => Math.max(0, Math.min(9, Math.round(n * 2) / 2));

const SPEAKING_FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: {
        fc: { type: 'number', description: 'Fluency and Coherence band 0.0-9.0 in 0.5 steps' },
        lr: { type: 'number', description: 'Lexical Resource band 0.0-9.0 in 0.5 steps' },
        gra: { type: 'number', description: 'Grammatical Range and Accuracy band 0.0-9.0 in 0.5 steps' },
        p: { type: 'number', description: 'Pronunciation & Delivery estimate band 0.0-9.0 in 0.5 steps based on transcript & examiner notes' },
        overall: { type: 'number', description: 'Overall Speaking Band 0.0-9.0 in 0.5 steps' },
      },
      required: ['fc', 'lr', 'gra', 'p', 'overall'],
    },
    summaryVi: { type: 'string', description: 'Nhận xét tổng quan về phần thi Speaking bằng tiếng Việt (3-4 câu).' },
    strengthsVi: { type: 'array', items: { type: 'string' } },
    prioritiesVi: { type: 'array', items: { type: 'string' } },
    criteriaNotesVi: {
      type: 'object',
      properties: {
        fc: { type: 'string' },
        lr: { type: 'string' },
        gra: { type: 'string' },
        p: { type: 'string' },
      },
      required: ['fc', 'lr', 'gra', 'p'],
    },
    utteranceFixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string', description: 'Exact utterance or sentence spoken by the candidate.' },
          improved: { type: 'string', description: 'Natural spoken English upgrade (Band target +0.5 to +1.0, conversational yet idiomatic).' },
          criterion: { type: 'string', enum: ['fc', 'lr', 'gra', 'p'] },
          reasonVi: { type: 'string', description: 'Giải thích ngắn gọn bằng tiếng Việt.' },
          errorPattern: { type: 'string', description: 'Nhãn lỗi, vd: Thiếu liên kết, Sai thì quá khứ, Từ vựng lặp, Trả lời quá ngắn' },
        },
        required: ['original', 'improved', 'criterion', 'reasonVi', 'errorPattern'],
      },
    },
    pronunciationTipsVi: {
      type: 'array',
      items: { type: 'string' },
      description: '2-3 gợi ý phát âm, nối âm, ngữ điệu cụ thể dựa trên các từ/cụm câu thí sinh đã nói.',
    },
    suggestedVocab: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          pos: { type: 'string' },
          vi: { type: 'string' },
          context: { type: 'string' },
        },
        required: ['word', 'pos', 'vi', 'context'],
      },
    },
  },
  required: ['scores', 'summaryVi', 'strengthsVi', 'prioritiesVi', 'criteriaNotesVi', 'utteranceFixes', 'pronunciationTipsVi', 'suggestedVocab'],
};

export async function POST(req: Request) {
  if ((await currentRole()) !== 'learner') {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || req.headers.get('x-gemini-key')?.trim();
  if (!apiKey) {
    return Response.json(
      { error: 'Chưa cấu hình GEMINI_API_KEY. Hãy thêm trong .env.local hoặc nhập ở Nhật ký → Cài đặt.' },
      { status: 400 },
    );
  }

  let body: {
    topic?: SpeakingTopic;
    mode?: SpeakingMode;
    parts?: SpeakingPartNum[];
    seconds?: number;
    transcript?: SpeakingTurn[];
    examinerNotes?: { criterion: string; note: string }[];
    targetBand?: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  const { topic, mode = 'full', parts = [1, 2, 3], seconds = 0, transcript = [], examinerNotes = [], targetBand = 6.5 } = body;
  const candidateTurns = transcript.filter(t => t.role === 'candidate' && t.text.trim());
  if (!topic || candidateTurns.length === 0) {
    return Response.json({ error: 'Chưa có câu trả lời nào của thí sinh để chấm điểm.' }, { status: 400 });
  }

  const targetFixBand = Math.min(8.5, targetBand + 0.5).toFixed(1);
  const formattedTranscript = transcript
    .map(t => `[Part ${t.part}] ${t.role === 'examiner' ? 'Examiner' : 'Candidate'}: ${t.text}`)
    .join('\n');

  const notesBlock = examinerNotes.length
    ? `\nLive Examiner Observations (during the conversation):\n${examinerNotes.map(n => `- (${n.criterion}) ${n.note}`).join('\n')}\n`
    : '';

  const systemInstruction = `You are a certified IELTS Speaking Examiner & Vietnamese IELTS Coach.
Evaluate the candidate's spoken transcript across the 4 official IELTS Speaking criteria:
- Fluency and Coherence (fc)
- Lexical Resource (lr)
- Grammatical Range and Accuracy (gra)
- Pronunciation & Delivery (p — inferred from transcription clarity, hesitation patterns, word choice, and any live examiner observations; state honestly in criteriaNotesVi.p that pronunciation relies on speech-to-text capture + live session cues).

Rules:
1. Be fair, accurate, and avoid score inflation. Short one-sentence answers in Part 1/3 or an underdeveloped Part 2 (<120 words) cap FC around 5.0-5.5.
2. All explanations (summaryVi, strengthsVi, prioritiesVi, criteriaNotesVi, reasonVi, pronunciationTipsVi, vi) MUST be in warm, clear Vietnamese.
3. For utteranceFixes: pick 4 to 7 real candidate sentences ("original" verbatim) and show how to express the exact same personal idea naturally at Band ${targetFixBand} spoken English (conversational idioms, phrasal verbs, smooth linking, NOT stiff essay writing).
4. For suggestedVocab: provide 4 to 6 spoken collocations useful for this topic.`;

  const input = `Topic: ${topic.title}
Mode: ${mode} (Parts covered: ${parts.join(', ')})
Duration: ${seconds} seconds
Target Band: ${targetBand}
${notesBlock}
Full Conversation Transcript:
${formattedTranscript}`;

  try {
    const { data: parsed, model } = await createStructuredGrade<SpeakingFeedback>({
      apiKey,
      systemInstruction,
      input,
      schema: SPEAKING_FEEDBACK_SCHEMA,
    });

    const fc = roundHalf(parsed.scores.fc);
    const lr = roundHalf(parsed.scores.lr);
    const gra = roundHalf(parsed.scores.gra);
    const p = roundHalf(parsed.scores.p);
    const overall = roundHalf((fc + lr + gra + p) / 4);

    const feedback: SpeakingFeedback = {
      ...parsed,
      scores: { fc, lr, gra, p, overall },
      strengthsVi: parsed.strengthsVi ?? [],
      prioritiesVi: parsed.prioritiesVi ?? [],
      utteranceFixes: parsed.utteranceFixes ?? [],
      pronunciationTipsVi: parsed.pronunciationTipsVi ?? [],
      suggestedVocab: parsed.suggestedVocab ?? [],
    };

    return Response.json({ feedback, model });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi khi chấm Speaking.';
    return Response.json({ error: msg }, { status: 500 });
  }
}
