import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is now the default in Next.js 16
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [
      '@google/generative-ai',
      '@google/generative-ai/server',
      'googleapis',
    ],
  },
};

export default nextConfig;
