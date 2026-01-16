import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is now the default in Next.js 16
  serverExternalPackages: [
    '@google/generative-ai',
    '@google/generative-ai/server',
    'googleapis',
  ],
  // Exclude only unnecessary files from tracing
  outputFileTracingExcludes: {
    '*': [
      '.git/**',
    ],
  },
};

export default nextConfig;
