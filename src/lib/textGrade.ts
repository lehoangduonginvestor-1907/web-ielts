// Chấm bài dạng văn bản (Writing) bằng model NGOÀI Gemini qua API chuẩn OpenAI (chat/completions),
// để dành hạn mức Gemini cho Speaking (cần nghe audio).
//
// Nhà cung cấp được bật khi có key trong biến môi trường; thứ tự thử đặt bằng WRITING_PROVIDERS
// (mặc định "nvidia,groq,openrouter"):
//   - NVIDIA     NVIDIA_API_KEY      — build.nvidia.com, ~40 lượt/phút, không giới hạn token/phút.
//                                      Mặc định Nemotron 3 Ultra: thử 18/11/2026 chấm khớp Gemini 4 Hydrogen (~95s/bài);
//                                      GLM 5.3 Flash, Kimi K3.1 Pro, Mistral Large 4 quá chậm (>150s), DeepSeek V4.1 Flash đã ngừng (410).
//                                      Lưu ý: NVIDIA ghi lại nội dung gửi lên để cải thiện sản phẩm.
//   - Groq       GROQ_API_KEY        — ~1.000 lượt/ngày nhưng chỉ ~8.000 token/phút.
//   - OpenRouter OPENROUTER_API_KEY  — model ":free", ~50 lượt/ngày cho cả tài khoản.
// Đổi model bằng NVIDIA_WRITING_MODEL / GROQ_WRITING_MODEL / OPENROUTER_WRITING_MODEL.

type ProviderId = 'nvidia' | 'groq' | 'openrouter';

/**
 * Cách ép model trả JSON, từ chặt tới lỏng. Nếu API từ chối một cách (400 do tham số),
 * thử cách kế tiếp trong danh sách của nhà cung cấp đó.
 */
type OutputMode =
  | 'strict' //            response_format json_schema strict:true (Groq)
  | 'schema+reasoning' //  response_format json_schema + yêu cầu suy luận cao
  | 'schema' //            response_format json_schema, không gửi tham số suy luận
  | 'json_object'; //      chỉ đảm bảo JSON hợp lệ; schema được dán vào system prompt

export interface TextProvider {
  id: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  modes: OutputMode[];
  /** Hạn mức token/phút của gói miễn phí — dùng để co max_completion_tokens cho vừa. */
  tpmLimit?: number;
}

const DEFAULT_ORDER: ProviderId[] = ['nvidia', 'groq', 'openrouter'];

export function writingTextProviders(): TextProvider[] {
  const env = process.env;
  const all: Record<ProviderId, TextProvider | null> = {
    nvidia: env.NVIDIA_API_KEY?.trim()
      ? {
          id: 'nvidia',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          apiKey: env.NVIDIA_API_KEY.trim(),
          model: env.NVIDIA_WRITING_MODEL?.trim() || 'nvidia/nemotron-3-ultra-550b-a55b',
          // Endpoint của NVIDIA nhận response_format json_schema; nvext.guided_json thì bị từ chối (đã thử 11/2026)
          modes: ['schema+reasoning', 'schema', 'json_object'],
        }
      : null,
    groq: env.GROQ_API_KEY?.trim()
      ? {
          id: 'groq',
          baseUrl: 'https://api.groq.com/openai/v1',
          apiKey: env.GROQ_API_KEY.trim(),
          model: env.GROQ_WRITING_MODEL?.trim() || 'openai/gpt-oss-120b',
          modes: ['strict'],
          tpmLimit: Number(env.GROQ_TPM_LIMIT) || 8000,
        }
      : null,
    openrouter: env.OPENROUTER_API_KEY?.trim()
      ? {
          id: 'openrouter',
          baseUrl: 'https://openrouter.ai/api/v1',
          apiKey: env.OPENROUTER_API_KEY.trim(),
          model: env.OPENROUTER_WRITING_MODEL?.trim() || 'nvidia/nemotron-3.5-super-vl:free',
          modes: ['schema+reasoning', 'json_object'],
        }
      : null,
  };
  const order = (env.WRITING_PROVIDERS?.split(',').map(s => s.trim().toLowerCase()) ?? DEFAULT_ORDER).filter(
    (id): id is ProviderId => id in all,
  );
  return [...new Set(order)].map(id => all[id]).filter((p): p is TextProvider => !!p);
}

/**
 * Chuyển schema thường sang dạng strict của OpenAI/Groq: mọi object có additionalProperties:false,
 * mọi thuộc tính đều nằm trong required; bỏ minimum/maximum (máy chủ tự kẹp giá trị sau).
 */
export function toStrictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStrictSchema);
  if (!node || typeof node !== 'object') return node;
  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k === 'minimum' || k === 'maximum') continue;
    out[k] = k === 'properties' ? mapValues(v as Record<string, unknown>, toStrictSchema) : toStrictSchema(v);
  }
  if (src.type === 'object' && src.properties && typeof src.properties === 'object') {
    out.additionalProperties = false;
    out.required = Object.keys(src.properties as object);
  }
  return out;
}

function mapValues(obj: Record<string, unknown>, fn: (v: unknown) => unknown) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
}

/** Lấy phần JSON từ câu trả lời: bỏ khối suy nghĩ <think>, rào ```json, chữ thừa trước/sau. */
export function extractJson(raw: string): string {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  return first >= 0 && last > first ? s.slice(first, last + 1) : s;
}

/** Ước lượng thô số token (≈ 3,5 ký tự / token cho văn bản Anh–Việt lẫn JSON). */
const estimateTokens = (s: string) => Math.ceil(s.length / 3.5);

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

interface ChatResponse {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
  error?: { message?: string; code?: string; type?: string } | string;
  detail?: string;
}

function errMessage(j: ChatResponse, status: number) {
  if (typeof j.error === 'string') return j.error;
  return j.error?.message ?? j.detail ?? `HTTP ${status}`;
}

/** 400 do API không nhận một tham số (khác với 400 do model trả JSON lệch schema). */
const isUnsupportedParam = (msg: string) =>
  /response_format|json_schema|guided|nvext|reasoning|unsupported|not supported|unrecognized|unknown (field|param)|extra (fields|inputs)/i.test(
    msg,
  ) && !/json_validate_failed|failed to validate|does not match/i.test(msg);

/** Nhãn hiển thị model đã chấm, vd "nvidia · deepseek-ai/deepseek-v4.1-flash". */
export const providerLabel = (p: TextProvider) => `${p.id} · ${p.model}`;

function buildBody(
  p: TextProvider,
  mode: OutputMode,
  systemInstruction: string,
  input: string,
  schema: Record<string, unknown>,
  effort: 'high' | 'medium',
) {
  const schemaForMode = mode === 'strict' ? toStrictSchema(schema) : schema;
  const system =
    mode === 'json_object'
      ? `${systemInstruction}\n\nOUTPUT FORMAT: return ONLY one JSON object (no prose, no code fences) that follows this JSON Schema exactly:\n${JSON.stringify(schema)}`
      : systemInstruction;
  const promptTokens = estimateTokens(system + input + (mode === 'json_object' ? '' : JSON.stringify(schemaForMode)));
  // Gói miễn phí của Groq tính cả token vào lẫn max token ra trong hạn mức token/phút
  const maxOut = p.tpmLimit ? Math.max(2500, p.tpmLimit - promptTokens - 300) : 16_000;

  const body: Record<string, unknown> = {
    model: p.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ],
    max_tokens: maxOut,
    temperature: 0.2,
  };
  if (mode === 'strict' || mode === 'schema' || mode === 'schema+reasoning') {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'ielts_writing_grade', strict: mode === 'strict', schema: schemaForMode },
    };
  } else {
    body.response_format = { type: 'json_object' };
  }

  if (p.id === 'groq') {
    body.reasoning_effort = effort;
    body.seed = 20260407;
  } else if (p.id === 'openrouter' && mode !== 'json_object') {
    body.reasoning = { effort, exclude: true };
  } else if (p.id === 'nvidia' && mode === 'schema+reasoning') {
    body.reasoning_effort = effort;
  }
  return body;
}

export async function createStructuredTextGrade<T>({
  providers,
  systemInstruction,
  input,
  schema,
  timeoutMs = 150_000,
  budgetMs = 285_000,
}: {
  providers: TextProvider[];
  systemInstruction: string;
  input: string;
  schema: Record<string, unknown>;
  timeoutMs?: number;
  budgetMs?: number;
}): Promise<{ data: T; model: string }> {
  const deadline = Date.now() + budgetMs;
  let lastErr: unknown;

  for (const p of providers) {
    let modeIdx = 0;
    let effort: 'high' | 'medium' = 'high';
    let retries = 0; // lỗi tạm thời (5xx, JSON hỏng, 429 theo phút) — tối đa 1 lần thử lại

    while (modeIdx < p.modes.length) {
      const remaining = deadline - Date.now();
      if (remaining < 20_000) break;
      const mode = p.modes[modeIdx];
      const body = buildBody(p, mode, systemInstruction, input, schema, effort);
      const tag = `${providerLabel(p)} [${mode}${effort === 'medium' ? ', medium' : ''}]`;
      const started = Date.now();
      try {
        const r = await fetch(`${p.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}`, Accept: 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
        });
        const j = (await r.json().catch(() => ({}))) as ChatResponse;
        const secs = Math.round((Date.now() - started) / 1000);

        if (!r.ok) {
          const msg = errMessage(j, r.status);
          console.warn(`[grade] ${tag} HTTP ${r.status} after ${secs}s: ${msg}`);
          lastErr = new Error(`${providerLabel(p)}: ${msg}`);
          // Per-minute rate limit (not daily): wait per retry-after then retry once
          const perMinute = r.status === 429 && /per minute|TPM|RPM/i.test(msg) && !/per day|RPD|TPD/i.test(msg);
          if (perMinute && retries === 0) {
            const wait = Math.min(45, Number(r.headers.get('retry-after')) || 20) * 1000;
            if (deadline - Date.now() > wait + 60_000) {
              retries++;
              await sleep(wait);
              continue;
            }
          }
          // API rejected this parameter -> fall back to next JSON output mode
          if (r.status === 400 || r.status === 422) {
            if (isUnsupportedParam(msg) && modeIdx < p.modes.length - 1) {
              modeIdx++;
              continue;
            }
            if (retries === 0) {
              retries++;
              await sleep(3000);
              continue;
            }
            break;
          }
          if (r.status >= 500 && retries === 0) {
            retries++;
            await sleep(5000);
            continue;
          }
          // Daily 429, 401/403/404, 413... -> try next provider
          break;
        }

        const choice = j.choices?.[0];
        const raw = choice?.message?.content?.trim() ?? '';
        try {
          if (!raw) throw new Error('empty');
          const data = JSON.parse(extractJson(raw)) as T;
          console.info(`[grade] ${tag} finished in ${secs}s`);
          return { data, model: providerLabel(p) };
        } catch {
          lastErr = new Error(`${providerLabel(p)} returned empty or malformed JSON (finish_reason: ${choice?.finish_reason ?? '?'})`);
          console.warn(`[grade] ${tag} malformed/empty JSON after ${secs}s, finish_reason=${choice?.finish_reason}`);
          if (retries > 0) break;
          retries++;
          // Truncated due to token limit: lower reasoning effort to leave room for JSON
          if (choice?.finish_reason === 'length') effort = 'medium';
          continue;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        lastErr = err;
        if (/timeout|aborted/i.test(msg)) {
          console.warn(`[grade] ${tag} timed out`);
          lastErr = new Error(`${providerLabel(p)} took too long to respond`);
          break;
        }
        if (!/fetch failed|ECONNRESET/i.test(msg) || retries > 0) throw err;
        retries++;
        await sleep(3000);
      }
    }
  }

  const msg = (lastErr instanceof Error ? lastErr.message : '').trim().replace(/\.+$/, '');
  throw new Error(
    `Could not grade with ${providers.map(providerLabel).join(' / ')}${msg ? ` — ${msg}` : ''}. Your work is saved; please try grading again in a few minutes.`,
  );
}
