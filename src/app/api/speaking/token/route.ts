import { GoogleGenAI } from '@google/genai';
import { currentRole } from '@/lib/session';

export async function POST(req: Request) {
  if ((await currentRole()) !== 'learner') {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || req.headers.get('x-gemini-key')?.trim();
  if (!apiKey) {
    return Response.json(
      { error: 'GEMINI_API_KEY is not configured. Add it to .env.local or enter it in Journal → Settings.' },
      { status: 400 },
    );
  }

  try {
    const client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } });
    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

    const token = await client.authTokens.create({
      config: {
        uses: 2,
        expireTime,
        newSessionExpireTime,
      },
    });

    // Tên model Live đổi được qua biến môi trường (Google hay đổi tên model Live theo phiên bản)
    const models = {
      extended: process.env.GEMINI_LIVE_MODEL?.trim() || 'gemini-3.8-live-extended-thinking',
      standard: process.env.GEMINI_LIVE_FAST_MODEL?.trim() || 'gemini-3.8-live',
    };
    return Response.json({ token: token.name, model: models.extended, models });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to start a live Speaking session.';
    return Response.json({ error: msg }, { status: 500 });
  }
}
