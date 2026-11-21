import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Ngày trong app tính theo giờ máy: cố định múi giờ của người học để test không đổi kết quả theo máy chạy.
process.env.TZ = 'Asia/Ho_Chi_Minh';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
