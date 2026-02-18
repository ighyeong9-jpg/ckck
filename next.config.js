/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
  webpack: (config) => {
    config.cache = false;
    config.infrastructureLogging = { level: 'error' };
    return config;
  },
};
module.exports = nextConfig;
