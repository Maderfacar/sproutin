/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 消費 workspace 內的共用 package（型別 + runtime 工具，如 selectDashboardCards）
  transpilePackages: ['@sproutin/shared'],
  webpack: (config) => {
    // @sproutin/shared 原始碼採 NodeNext（相對匯入帶 .js 副檔名，指向 .ts 檔）。
    // webpack 預設無法把 './foo.js' 解析回 './foo.ts' → 匯入 shared 的 runtime 值時會 module-not-found。
    // extensionAlias 讓 .js 請求優先嘗試 .ts/.tsx（webpack 5）。
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
