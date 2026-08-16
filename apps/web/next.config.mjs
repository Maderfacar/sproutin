// 安全標頭（Phase 8 hardening，web/security）。低風險項先上；
// **刻意不加 CSP / X-Frame-Options**——LIFF 於 LINE in-app webview 執行，貿然設定易擋掉登入流程，
// 需先在裝置實測再逐步收緊（列為後續）。
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 消費 workspace 內的共用 package（型別 + runtime 工具，如 selectDashboardCards）
  transpilePackages: ['@sproutin/shared'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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
