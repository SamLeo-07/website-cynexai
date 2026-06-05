/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/attendance",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
