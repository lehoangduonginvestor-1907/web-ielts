import { GoogleGenAI } from '@google/genai';
import { currentRole } from '@/lib/session';

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

    return Response.json({
      token: token.name,
      model: 'gemini-3.8-live-extended-thinking',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Không tạo được phiên Speaking trực tiếp.';
    return Response.json({ error: msg }, { status: 500 });
  }
}
