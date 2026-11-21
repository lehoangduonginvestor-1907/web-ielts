import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Ngày trong app tính theo giờ máy: cố định múi giờ của người học để test không đổi kết quả theo máy chạy.
process.env.TZ = 'Asia/Ho_Chi_Minh';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Gói đánh dấu "chỉ chạy trên máy chủ": ngoài Next nó luôn báo lỗi, nên trong test thay bằng bản rỗng
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
