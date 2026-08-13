/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 消費 workspace 內的共用型別 package
  transpilePackages: ['@sproutin/shared'],
};

export default nextConfig;
