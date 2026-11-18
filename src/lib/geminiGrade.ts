const GRADE_MODELS = [
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

// Nhớ tạm các model đã chạm giới hạn cứng (limit: 0 hoặc quota ngày) trong 10 phút để không tốn thời gian thử lại
const skippedUntil = new Map<string, number>();

interface InteractionStep {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
}

interface InteractionRestResponse {
  output_text?: string;
  steps?: InteractionStep[];
  outputs?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; code?: string };
}

function extractOutputText(res: InteractionRestResponse): string {
  if (res.output_text) return res.output_text;
  if (Array.isArray(res.steps)) {
    const modelSteps = res.steps.filter(s => s.type === 'model_output');
    const last = modelSteps[modelSteps.length - 1];
    const txt = last?.content?.map(c => c.text ?? '').join('') ?? '';
    if (txt) return txt;
  }
  if (Array.isArray(res.outputs)) {
    const txt = res.outputs.map(o => o.text ?? '').join('');
    if (txt) return txt;
  }
  return '';
}

export async function createStructuredGrade<T>({
  apiKey,
  systemInstruction,
  input,
  schema,
}: {
  apiKey: string;
  systemInstruction: string;
  input: string;
  schema: Record<string, unknown>;
}): Promise<{ data: T; model: string }> {
  const now = Date.now();
  let lastErr: unknown;

  for (const model of GRADE_MODELS) {
    const skipAt = skippedUntil.get(model) ?? 0;
    if (skipAt > now) continue;

    try {
      const body: Record<string, unknown> = {
        model,
        system_instruction: systemInstruction,
        input,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema,
        },
      };
      if (model.startsWith('gemini-4-') || model.startsWith('gemini-3.8-')) {
        body.generation_config = { thinking_level: 'low' };
      }

      // Nếu gặp 503 tạm thời (high demand), thử lại 1 lần nhanh sau 1s trước khi chuyển model kế tiếp
      let r: Response | null = null;
      let json: InteractionRestResponse = {};
      for (let attempt = 0; attempt < 2; attempt++) {
        r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(22000),
        });
        json = (await r.json()) as InteractionRestResponse;
        if (r.status !== 503 || attempt === 1) break;
        await new Promise(res => setTimeout(res, 1000));
      }

      if (!r!.ok) {
        const msg = json.error?.message ?? `HTTP ${r!.status}`;
        // Khoá cứng 10 phút nếu model bị limit 0 hoặc hết quota ngày trên Free Tier
        if (r!.status === 429 && /limit:\s*0\b|per day/i.test(msg)) {
          skippedUntil.set(model, Date.now() + 10 * 60_000);
        }
        if (r!.status === 429 || r!.status === 503 || r!.status === 404) {
          lastErr = new Error(`${model}: ${msg}`);
          continue;
        }
        throw new Error(msg);
      }

      const raw = extractOutputText(json);
      if (!raw) {
        lastErr = new Error(`Model ${model} không trả về dữ liệu.`);
        continue;
      }
      return { data: JSON.parse(raw) as T, model };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/timeout|aborted|429|503|404|rate limit|high demand|service_unavailable/i.test(msg)) {
        continue;
      }
      throw err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Không thể kết nối các model Gemini để chấm bài.');
}
