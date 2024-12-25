/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transform fetch-mock ESM modules to be compatible with Jest
  transpilePackages: ["@fetch-mock", "fetch-mock"],
};

module.exports = nextConfig;
