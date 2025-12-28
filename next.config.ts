import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is now the default in Next.js 16
  output: 'standalone',
};

export default nextConfig;
