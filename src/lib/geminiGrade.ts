import { GoogleGenAI } from '@google/genai';

// Gọi Gemini Interactions API để chấm bài, trả về JSON đúng schema.
// - Mỗi loại bài tự chọn danh sách model; KHÔNG tự lùi xuống model yếu hơn ngoài danh sách đó,
//   để cùng một bài không lúc chấm bằng model mạnh, lúc bằng model nhẹ.
// - Chấp nhận đầu vào nhiều phần (văn bản + audio).

const DEFAULT_GRADE_MODELS = ['gemini-4-hydrogen', 'gemini-3.8-flash'];

/**
 * Danh sách model đọc từ biến môi trường (phân tách bằng dấu phẩy), rỗng thì dùng mặc định.
 * Google đổi tên hoặc ngừng một model thì chỉ cần sửa biến trên Vercel, không phải sửa code.
 */
export function modelsFromEnv(name: string, fallback: readonly string[]): string[] {
  const list = (process.env[name] ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return list.length ? [...new Set(list)] : [...fallback];
}

/** Speaking phải nghe audio → chỉ model đa phương thức mạnh của Gemini, đều ở mức suy luận high. Biến: SPEAKING_GRADE_MODELS. */
export const speakingGradeModels = () => modelsFromEnv('SPEAKING_GRADE_MODELS', DEFAULT_GRADE_MODELS);
/**
 * Writing cũng chấm bằng Gemini trước (Hydrogen rồi 3.8 Flash); chỉ khi cả hai lỗi mới chuyển sang
 * model ngoài Gemini (NVIDIA / Groq / OpenRouter, xem textGrade.ts). Biến: WRITING_GEMINI_MODELS.
 * Lưu ý: Writing và Speaking dùng chung hạn mức Hydrogen (gói miễn phí ~20 lượt/ngày).
 */
export const writingGeminiModels = () => modelsFromEnv('WRITING_GEMINI_MODELS', DEFAULT_GRADE_MODELS);

/** Seed cố định giúp chấm lại cùng một bài cho kết quả ổn định hơn. */
const GRADE_SEED = 20260407;

// Nhớ tạm các model đã chạm giới hạn cứng (limit: 0 hoặc quota ngày) trong 10 phút để không tốn thời gian thử lại
const skippedUntil = new Map<string, number>();

export type GradeContent =
  | { type: 'text'; text: string }
  | { type: 'audio'; mime_type: string; data?: string; uri?: string };

export type ThinkingLevel = 'low' | 'medium' | 'high';

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

class RetryableError extends Error {}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function createStructuredGrade<T>({
  apiKey,
  models,
  systemInstruction,
  input,
  schema,
  thinkingLevel = 'high',
  timeoutMs = 180_000,
  budgetMs = 285_000,
  validate,
  retryOverloadedLast = true,
}: {
  apiKey: string;
  models: readonly string[];
  systemInstruction: string;
  input: string | GradeContent[];
  schema: Record<string, unknown>;
  thinkingLevel?: ThinkingLevel;
  /** Kiểm tra nội dung kết quả (vd. đủ điểm từng tiêu chí); trả lời báo lỗi thì coi như JSON hỏng và chấm lại. */
  validate?: (data: T) => string | null;
  /** Thời gian tối đa cho MỘT lần gọi. */
  timeoutMs?: number;
  /** Tổng thời gian cho mọi lần thử (phải nhỏ hơn maxDuration của route). */
  budgetMs?: number;
  /**
   * Model cuối danh sách quá tải (503) thì có chờ rồi thử lại không. Để false khi phía sau còn bộ chấm dự phòng
   * khác (Writing có NVIDIA), để thời gian dành cho bộ dự phòng đó.
   */
  retryOverloadedLast?: boolean;
}): Promise<{ data: T; model: string }> {
  let lastErr: unknown;
  const deadline = Date.now() + budgetMs;

  for (const model of models) {
    if ((skippedUntil.get(model) ?? 0) > Date.now()) {
      lastErr = new Error(`${model} quota exhausted; skipping temporarily for a few minutes.`);
      continue;
    }

    const body = {
      model,
      system_instruction: systemInstruction,
      // Đầu vào nhiều phần (văn bản + audio) gói trong một bước user_input — dạng có kiểu rõ ràng của Interactions API
      input: typeof input === 'string' ? input : [{ type: 'user_input', content: input }],
      response_format: { type: 'text', mime_type: 'application/json', schema },
      generation_config: { thinking_level: thinkingLevel, seed: GRADE_SEED },
    };

    // Mỗi model: tối đa 3 lần cho lỗi tạm thời (500, JSON hỏng, 503 ở model cuối), nghỉ 5s rồi 15s. Giữ ít lần thử vì mỗi lần
    // gọi có thể bị tính vào hạn mức theo ngày (Free Tier của Hydrogen chỉ 20 lượt/ngày).
    // Hết giờ thì KHÔNG thử lại cùng model (một lượt chấm chậm lặp lại cũng sẽ chậm), mà chuyển model kế tiếp nếu còn thời gian.
    const BACKOFF = [5000, 15000];
    for (let attempt = 0; attempt <= BACKOFF.length; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 20_000) {
        lastErr ??= new Error('request timed out');
        break;
      }
      const started = Date.now();
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
        });
        const json = (await r.json().catch(() => ({}))) as InteractionRestResponse;

        if (!r.ok) {
          const msg = json.error?.message ?? `HTTP ${r.status}`;
          console.warn(`[grade] ${model} #${attempt + 1} HTTP ${r.status} after ${Math.round((Date.now() - started) / 1000)}s: ${msg}`);
          if (r.status === 429) {
            if (/limit:\s*0\b|per day/i.test(msg)) skippedUntil.set(model, Date.now() + 10 * 60_000);
            lastErr = new Error(
              /per day/i.test(msg)
                ? `${model} daily quota reached for this API key (${msg})`
                : `${model} rate limit exceeded (${msg})`,
            );
            break; // try next model if available
          }
          if (r.status === 404) {
            lastErr = new Error(`${model}: model unavailable for this API key (${msg})`);
            break;
          }
          // 503 = model đang quá tải ("high demand"): đợt quá tải hiếm khi hết sau 5–15 giây, nên chuyển ngay
          // sang model kế tiếp thay vì chờ thử lại. Chỉ thử lại khi đây là lựa chọn cuối cùng (không còn dự phòng).
          if (r.status === 503 && !(model === models[models.length - 1] && retryOverloadedLast)) {
            lastErr = new Error(`${model} is overloaded right now (${msg})`);
            break;
          }
          if (r.status === 503 || r.status === 500) throw new RetryableError(`${model}: ${msg}`);
          throw new Error(msg);
        }

        const raw = extractOutputText(json);
        if (!raw) throw new RetryableError(`${model} returned an empty response.`);
        let data: T;
        try {
          data = JSON.parse(raw) as T;
        } catch {
          throw new RetryableError(`${model} returned malformed JSON.`);
        }
        const problem = validate?.(data);
        if (problem) throw new RetryableError(`${model} returned an incomplete grade (${problem}).`);
        console.info(`[grade] ${model} finished in ${Math.round((Date.now() - started) / 1000)}s`);
        return { data, model };
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (/timeout|aborted/i.test(msg)) {
          console.warn(`[grade] ${model} #${attempt + 1} timed out after ${Math.round((Date.now() - started) / 1000)}s`);
          lastErr = new Error(`${model} took too long to respond`);
          break;
        }
        const retryable = err instanceof RetryableError || /fetch failed|ECONNRESET/i.test(msg);
        if (!retryable) throw err;
        console.warn(`[grade] ${model} #${attempt + 1} transient error: ${msg}`);
        const wait = BACKOFF[attempt];
        if (wait !== undefined && deadline - Date.now() > wait + 30_000) await sleep(wait);
        else break;
      }
    }
  }

  const msg = (lastErr instanceof Error ? lastErr.message : '').trim().replace(/\.+$/, '');
  throw new Error(
    `Could not grade with ${models.join(' / ')}${msg ? ` — ${msg}` : ''}. Your work is saved; please try grading again in a few minutes.`,
  );
}

// ---------- Audio ----------

/** Chuẩn hoá MIME từ MediaRecorder (vd "audio/webm;codecs=opus") sang loại Gemini nhận. */
export function normalizeAudioMime(mime: string): string {
  const base = (mime || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (base === 'audio/mp4' || base === 'audio/x-m4a') return 'audio/m4a';
  if (base === 'video/webm') return 'audio/webm';
  return base;
}

/** Dưới ngưỡng này gửi audio nhúng thẳng trong yêu cầu; lớn hơn thì tải lên Files API. */
const INLINE_AUDIO_LIMIT = 7 * 1024 * 1024;

/**
 * Chuẩn bị khối audio cho Gemini. File lớn được tải lên Files API (chờ tới khi ACTIVE);
 * hàm `cleanup` xoá file tạm đó sau khi chấm xong.
 */
export async function prepareAudioContent(
  apiKey: string,
  audio: Blob,
): Promise<{ content: GradeContent; cleanup: () => Promise<void> }> {
  const mime = normalizeAudioMime(audio.type);
  if (audio.size <= INLINE_AUDIO_LIMIT) {
    const data = Buffer.from(await audio.arrayBuffer()).toString('base64');
    return { content: { type: 'audio', mime_type: mime, data }, cleanup: async () => {} };
  }

  const ai = new GoogleGenAI({ apiKey });
  let file = await ai.files.upload({ file: audio, config: { mimeType: mime, displayName: 'ielts-speaking-session' } });
  const deadline = Date.now() + 90_000;
  while (file.state === 'PROCESSING' && Date.now() < deadline) {
    await sleep(2000);
    file = await ai.files.get({ name: file.name! });
  }
  if (file.state !== 'ACTIVE' || !file.uri) {
    throw new Error('Gemini has not finished processing the audio file yet. Please try grading again in a few minutes.');
  }
  const name = file.name!;
  return {
    content: { type: 'audio', mime_type: mime, uri: file.uri },
    cleanup: async () => {
      await ai.files.delete({ name }).catch(() => {});
    },
  };
}
