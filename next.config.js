/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Active instrumentation.js (self-check RLS/fonctions SQL au démarrage, cf. TODO-DEV.md #6).
  experimental: { instrumentationHook: true },
};
module.exports = nextConfig;
