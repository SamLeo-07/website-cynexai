import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/attendance",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
