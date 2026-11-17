import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Bài học là file Markdown đọc lúc chạy: phải nằm trong gói hàm khi triển khai trên Vercel
  outputFileTracingIncludes: {
    "/skills": ["./src/content/learn/**"],
    "/skills/[slug]": ["./src/content/learn/**"],
  },
};

export default nextConfig;
