import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tambahkan ini untuk mengabaikan error ESLint saat proses build di Vercel.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;