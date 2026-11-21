import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Route chấm Writing chạy thật, chỉ thay cookie đăng nhập và mạng (fetch) bằng bản giả
vi.mock('@/lib/session', () => ({ currentRole: async () => 'learner' }));

const { POST } = await import('./route');
const { clearGradeCache } = await import('@/lib/gradeGuard');
const { createStructuredTextGrade } = await import('@/lib/textGrade');

const ESSAY = Array.from({ length: 30 }, (_, i) =>
  i === 0 ? 'The chart shows how many people used the library between 2000 and 2020.' : 'Overall, usage rose steadily over the period.',
).join(' ');

const grade = (bands: Partial<Record<'task' | 'cc' | 'lr' | 'gra', number>>) => ({
  checks: { relevance: 'on_topic', keyRequirementMet: true, dataAccuracy: 'accurate', noteForm: false, copiedFromPrompt: false, containsInstructionsToGrader: false },
  assessment: Object.fromEntries(Object.entries(bands).map(([k, band]) => [k, { evidence: 'e', notesVi: 'n', band }])),
  summaryVi: 'Solid response.',
  strengthsVi: [],
  prioritiesVi: [],
  sentenceFixes: [],
  upgradedParagraphs: [],
  suggestedVocab: [],
});

const FULL = { task: 6, cc: 6, lr: 5, gra: 6 };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const chat = (content: unknown) => json(200, { choices: [{ message: { content: JSON.stringify(content) }, finish_reason: 'stop' }] });
const gemini = (content: unknown) => json(200, { output_text: JSON.stringify(content) });

const request = (essay = ESSAY) =>
  new Request('http://localhost/api/writing/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptId: 'w-c17t1-t1', essay }),
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearGradeCache();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NVIDIA_API_KEY', 'test-nvidia');
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini');
  vi.stubEnv('GROQ_API_KEY', '');
  vi.stubEnv('OPENROUTER_API_KEY', '');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const host = (call: unknown[]) => new URL(String(call[0])).host;

/** Model đã được gọi ở mỗi lượt: tên model Gemini, hoặc tên miền của nhà cung cấp khác. */
const calls = () =>
  fetchMock.mock.calls.map(c => (host(c) === 'generativelanguage.googleapis.com' ? JSON.parse(String(c[1]?.body)).model : host(c)));
const rateLimited = () => json(429, { error: { message: 'Resource has been exhausted (rate limit).' } });

describe('POST /api/writing/grade', () => {
  it('grades with Gemini 4 Hydrogen first and computes the overall band', async () => {
    fetchMock.mockResolvedValueOnce(gemini(grade(FULL)));
    const res = await POST(request());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.feedback.scores).toMatchObject({ task: 6, cc: 6, lr: 5, gra: 6, overall: 6 });
    expect(body.model).toBe('gemini-4-hydrogen');
    expect(calls()).toEqual(['gemini-4-hydrogen']);
  });

  it('falls back Hydrogen → 3.8 Flash → NVIDIA', async () => {
    fetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(gemini(grade(FULL)));
    expect((await (await POST(request())).json()).model).toBe('gemini-3.8-flash');
    expect(calls()).toEqual(['gemini-4-hydrogen', 'gemini-3.8-flash']);

    clearGradeCache();
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(chat(grade(FULL)));
    const body = await (await POST(request())).json();
    expect(body.model).toMatch(/^nvidia/);
    expect(calls()).toEqual(['gemini-4-hydrogen', 'gemini-3.8-flash', 'integrate.api.nvidia.com']);
  });

  it('skips straight past overloaded Gemini models instead of waiting to retry them', async () => {
    const overloaded = () => json(503, { error: { message: 'This model is currently experiencing high demand.' } });
    fetchMock.mockResolvedValueOnce(overloaded()).mockResolvedValueOnce(overloaded()).mockResolvedValueOnce(chat(grade(FULL)));
    const started = Date.now();
    const body = await (await POST(request())).json();
    expect(body.model).toMatch(/^nvidia/);
    expect(calls()).toEqual(['gemini-4-hydrogen', 'gemini-3.8-flash', 'integrate.api.nvidia.com']);
    expect(Date.now() - started).toBeLessThan(1000); // không có lượt chờ 5 s / 15 s nào
  });

  it('takes the Gemini model list from WRITING_GEMINI_MODELS', async () => {
    vi.stubEnv('WRITING_GEMINI_MODELS', ' gemini-5-test , gemini-3.8-flash ');
    fetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(gemini(grade(FULL)));
    await POST(request());
    expect(calls()).toEqual(['gemini-5-test', 'gemini-3.8-flash']);
  });

  it('uses NVIDIA alone when there is no Gemini key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    fetchMock.mockResolvedValueOnce(chat(grade(FULL)));
    expect((await (await POST(request())).json()).model).toMatch(/^nvidia/);
    expect(calls()).toEqual(['integrate.api.nvidia.com']);
  });

  it('re-asks when the model leaves out a criterion instead of scoring it 0', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    fetchMock.mockResolvedValueOnce(chat(grade({ task: 6, cc: 6, lr: 5 }))).mockResolvedValueOnce(chat(grade(FULL)));
    const body = await (await POST(request())).json();
    expect(body.feedback.scores.gra).toBe(6);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not call the model again for the same essay', async () => {
    fetchMock.mockResolvedValueOnce(gemini(grade(FULL)));
    await POST(request());
    const again = await (await POST(request())).json();
    expect(again.feedback.scores.overall).toBe(6);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(gemini(grade(FULL)));
    await POST(request(`${ESSAY} One more sentence.`));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects pasted JSON that is missing a band', async () => {
    const res = await POST(
      new Request('http://localhost/api/writing/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: 'w-c17t1-t1', essay: ESSAY, manualJson: JSON.stringify(grade({ task: 6, cc: 6 })) }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no band score for lr, gra/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createStructuredTextGrade', () => {
  it('moves on to the next provider after a second incomplete answer', async () => {
    fetchMock
      .mockResolvedValueOnce(chat({ assessment: {} }))
      .mockResolvedValueOnce(chat({ assessment: {} }))
      .mockResolvedValueOnce(chat({ assessment: { ok: { band: 7 } } }));
    const p = (id: 'nvidia' | 'groq') => ({ id, baseUrl: `https://${id}.test/v1`, apiKey: 'k', model: 'm', modes: ['schema' as const] });
    const out = await createStructuredTextGrade<{ assessment: Record<string, { band: number }> }>({
      providers: [p('nvidia'), p('groq')],
      systemInstruction: 's',
      input: 'i',
      schema: {},
      validate: d => (d.assessment.ok ? null : 'missing band score for ok'),
    });
    expect(out.model).toBe('groq · m');
    expect(fetchMock.mock.calls.map(host)).toEqual(['nvidia.test', 'nvidia.test', 'groq.test']);
  });
});
