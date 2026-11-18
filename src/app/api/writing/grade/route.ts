import { currentRole } from '@/lib/session';
import { createStructuredGrade } from '@/lib/geminiGrade';
import type { WritingFeedback, WritingPrompt } from '@/lib/types';

const roundHalf = (n: number) => Math.max(0, Math.min(9, Math.round(n * 2) / 2));

const WRITING_FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: {
        task: { type: 'number', description: 'Task Achievement (Task 1) or Task Response (Task 2) band 0.0-9.0 in 0.5 steps' },
        cc: { type: 'number', description: 'Coherence and Cohesion band 0.0-9.0 in 0.5 steps' },
        lr: { type: 'number', description: 'Lexical Resource band 0.0-9.0 in 0.5 steps' },
        gra: { type: 'number', description: 'Grammatical Range and Accuracy band 0.0-9.0 in 0.5 steps' },
        overall: { type: 'number', description: 'Overall IELTS band score 0.0-9.0 in 0.5 steps' },
      },
      required: ['task', 'cc', 'lr', 'gra', 'overall'],
    },
    summaryVi: { type: 'string', description: 'Tóm tắt nhận xét tổng quan bằng tiếng Việt (3-4 câu), thẳng thắn và khích lệ.' },
    strengthsVi: {
      type: 'array',
      items: { type: 'string' },
      description: '2-3 điểm làm tốt trong bài bằng tiếng Việt',
    },
    prioritiesVi: {
      type: 'array',
      items: { type: 'string' },
      description: '2-3 việc cần ưu tiên sửa ngay để tăng band bằng tiếng Việt',
    },
    criteriaNotesVi: {
      type: 'object',
      properties: {
        task: { type: 'string' },
        cc: { type: 'string' },
        lr: { type: 'string' },
        gra: { type: 'string' },
      },
      required: ['task', 'cc', 'lr', 'gra'],
    },
    sentenceFixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string', description: 'Exact substring copied verbatim from the student essay that needs improvement.' },
          improved: { type: 'string', description: 'Natural upgraded version calibrated to +0.5 to +1.0 above current band (not overly robotic).' },
          criterion: { type: 'string', enum: ['task', 'cc', 'lr', 'gra'] },
          reasonVi: { type: 'string', description: 'Giải thích ngắn gọn bằng tiếng Việt vì sao cần sửa.' },
          errorPattern: { type: 'string', description: 'Nhãn ngắn dạng lỗi, vd: Mạo từ, Chia thì, Từ lặp, Giới từ, Trật tự từ' },
        },
        required: ['original', 'improved', 'criterion', 'reasonVi', 'errorPattern'],
      },
    },
    upgradedParagraphs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          original: { type: 'string' },
          upgraded: { type: 'string' },
          noteVi: { type: 'string' },
        },
        required: ['label', 'original', 'upgraded', 'noteVi'],
      },
    },
    suggestedVocab: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          pos: { type: 'string' },
          vi: { type: 'string' },
          context: { type: 'string', description: 'A natural English example sentence using this collocation on the essay topic.' },
        },
        required: ['word', 'pos', 'vi', 'context'],
      },
    },
  },
  required: ['scores', 'summaryVi', 'strengthsVi', 'prioritiesVi', 'criteriaNotesVi', 'sentenceFixes', 'upgradedParagraphs', 'suggestedVocab'],
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

  let body: { prompt?: WritingPrompt; essay?: string; targetBand?: number; mode?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const { prompt, essay, targetBand = 6.5 } = body;
  if (!prompt || !essay?.trim()) {
    return Response.json({ error: 'Thiếu đề bài hoặc nội dung bài viết.' }, { status: 400 });
  }

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;
  const criterionLabel = prompt.task === 'task1' ? 'Task Achievement' : 'Task Response';
  const targetFixBand = Math.min(8.5, targetBand + 0.5).toFixed(1);

  const systemInstruction = `You are a strict, fair, and deeply pedagogical IELTS Academic Writing Examiner & Vietnamese IELTS Coach.
Grade the student's essay according to official IELTS Writing Band Descriptors (${criterionLabel}, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
Rules:
1. Be honest and calibrated: do NOT inflate bands. Penalize missing Overview in Task 1 (max TA 5.0-5.5), under-length essays (<${prompt.minWords} words), off-topic arguments, or repetitive basic grammar.
2. All explanations (summaryVi, strengthsVi, prioritiesVi, criteriaNotesVi, reasonVi, noteVi, vi) MUST be in clear, warm, natural Vietnamese.
3. For sentenceFixes: copy "original" EXACTLY verbatim as a substring from the student's essay so the UI can highlight it inline. Provide 4 to 8 high-impact fixes. Calibrate "improved" to sound natural around Band ${targetFixBand} (natural academic English, NOT robotic thesaurus stuffing).
4. For upgradedParagraphs: rewrite up to 2–3 key paragraphs of the student's essay (preserving their original ideas!) to demonstrate how those exact ideas look at Band ${targetFixBand}.
5. For suggestedVocab: extract 4 to 6 high-utility academic collocations relevant to the prompt that the student should learn next.`;

  const input = `Task: IELTS Academic Writing ${prompt.task === 'task1' ? 'Task 1' : 'Task 2'} (Minimum ${prompt.minWords} words, student wrote ${wordCount} words)
Target Band of learner: ${targetBand}
Prompt:
${prompt.prompt}
${prompt.chartSummary ? `\nChart / Map / Diagram Verified Data:\n${prompt.chartSummary}\n` : ''}
Student's Essay:
"""
${essay.trim()}
"""`;

  try {
    const { data: parsed, model } = await createStructuredGrade<WritingFeedback>({
      apiKey,
      systemInstruction,
      input,
      schema: WRITING_FEEDBACK_SCHEMA,
    });

    const task = roundHalf(parsed.scores.task);
    const cc = roundHalf(parsed.scores.cc);
    const lr = roundHalf(parsed.scores.lr);
    const gra = roundHalf(parsed.scores.gra);
    const overall = roundHalf((task + cc + lr + gra) / 4);

    const feedback: WritingFeedback = {
      ...parsed,
      scores: { task, cc, lr, gra, overall },
      strengthsVi: parsed.strengthsVi ?? [],
      prioritiesVi: parsed.prioritiesVi ?? [],
      sentenceFixes: parsed.sentenceFixes ?? [],
      upgradedParagraphs: parsed.upgradedParagraphs ?? [],
      suggestedVocab: parsed.suggestedVocab ?? [],
    };

    return Response.json({ feedback, model });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối Gemini để chấm bài.';
    return Response.json({ error: msg }, { status: 500 });
  }
}
