/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@azhl/ui", "@azhl/utils", "@azhl/types", "@azhl/database"],
};

export default nextConfig;
