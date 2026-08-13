# @sproutin/web — Next.js (LIFF + Web)

見 [docs/04-module-structure.md](../../docs/04-module-structure.md)。

## 目標結構（實作階段建立）

```text
src/
├── app/            App Router · LIFF 進入點
├── features/       dashboard/ leave/ attendance/ message/ announcement/
├── components/ui/  reusable · design-token 驅動 (Card/Form/Button)
├── lib/            liff/ (LINE Login) · api/ (type-safe client) · auth/
├── config/         runtime branding + feature-flag loader
└── styles/         design tokens
```

## 鐵則

- Mobile-first、LIFF WebView optimized、同時支援一般瀏覽器 (§7)
- Card-based Dashboard，不寫死任何角色首頁 (§25)
- 前端只用角色決定顯示，**不做授權**；card 清單由後端 `GET /me/dashboard` 回傳 (Rule 5/6)
- 消費 `@sproutin/shared` 的型別與 contract

## 下一步（實作 Phase 1）

1. LIFF init + LINE Login → 換取後端 JWT
2. `lib/api` type-safe client（消費 shared contract）
3. Card Registry + Dashboard 動態組裝
4. Leave 申請表單（第一條 vertical slice，對應 api 的 leave 模組）
