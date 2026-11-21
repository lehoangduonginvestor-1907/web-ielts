import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Route chấm Writing chạy thật, chỉ thay cookie đăng nhập bằng bản giả.
// App không tự gọi model nào: route chỉ kiểm tra JSON người học dán từ Gemini rồi tính band.
vi.mock('@/lib/session', () => ({ currentRole: async () => 'learner' }));

const { POST } = await import('./route');

const ESSAY = Array.from({ length: 30 }, (_, i) =>
  i === 0 ? 'The chart shows how many people used the library between 2000 and 2020.' : 'Overall, usage rose steadily over the period.',
).join(' ');

const grade = (bands: Partial<Record<'task' | 'cc' | 'lr' | 'gra', number | string>>, extra: Record<string, unknown> = {}) => ({
  checks: { relevance: 'relevant', keyRequirementMet: true, dataAccuracy: 'accurate', noteForm: false, copiedFromPrompt: false, containsInstructionsToGrader: false },
  assessment: Object.fromEntries(Object.entries(bands).map(([k, band]) => [k, { evidence: 'e', notesVi: 'n', band }])),
  summaryVi: 'Solid response.',
  strengthsVi: [],
  prioritiesVi: [],
  sentenceFixes: [],
  upgradedParagraphs: [],
  suggestedVocab: [],
  ...extra,
});

const FULL = { task: 6, cc: 6, lr: 5, gra: 6 };

const post = (body: Record<string, unknown>) =>
  POST(
    new Request('http://localhost/api/writing/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId: 'w-c17t1-t1', essay: ESSAY, attemptId: 'wabc', ...body }),
    }),
  );

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/writing/grade', () => {
  it('turns pasted Gemini JSON into band scores without calling any model', async () => {
    const res = await post({ manualJson: '```json\n' + JSON.stringify(grade(FULL, { attemptId: 'wabc' })) + '\n```' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.feedback.scores).toMatchObject({ task: 6, cc: 6, lr: 5, gra: 6, overall: 6 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('applies the IELTS caps the model is told about (e.g. major data errors in Task 1)', async () => {
    const raw = grade({ task: 7, cc: 6, lr: 6, gra: 6 });
    raw.checks.dataAccuracy = 'major_errors';
    const body = await (await post({ manualJson: JSON.stringify(raw) })).json();
    expect(body.feedback.scores.task).toBe(5);
    expect(body.feedback.gradingNotesVi.join(' ')).toMatch(/capped at Band 5/);
  });

  it('rejects a result with a missing band instead of scoring it 0', async () => {
    const res = await post({ manualJson: JSON.stringify(grade({ task: 6, cc: 6 })) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no band score for lr, gra/);
  });

  it('explains what to do when the JSON was cut off', async () => {
    const cut = JSON.stringify(grade(FULL)).slice(0, 150);
    const res = await post({ manualJson: cut });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/send the complete JSON again/);
  });

  it('rejects a result that belongs to another essay', async () => {
    const res = await post({ manualJson: JSON.stringify(grade(FULL, { attemptId: 'wother' })) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/different essay/);
  });

  it('no longer grades automatically: a request without pasted JSON gets the instructions', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Paste the grading JSON from Gemini/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
