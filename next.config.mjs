import { createRequire } from "module";
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Force all modules to resolve to the same Yjs instance
    config.resolve.alias['yjs'] = require.resolve('yjs');
    return config;
  },
}

export default nextConfig
