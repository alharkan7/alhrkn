import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is now the default in Next.js 16
  experimental: {
    serverComponentsExternalPackages: [
      'better-sqlite3',
      'puppeteer',
      'pdfjs-dist',
      'googleapis',
      '@google/generative-ai',
    ],
  },
};

export default nextConfig;
