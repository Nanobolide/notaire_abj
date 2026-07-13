/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
  },
};
module.exports = nextConfig;
