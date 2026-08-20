# Sproutin 園所簡介 DM

給業主／園所看的產品介紹，五頁一組。視覺沿用產品本身的「清葉加厚」設計系統，
其中的手機／後台模擬區塊使用與 `apps/web` **完全相同**的 token 與版面，等同於可捲動的截圖。

## 正本在哪

**`apps/web/public/_dm/`** —— 那是 Vercel 直接對外服務的目錄，線上網址：

```
https://sproutin-kb91-theta.vercel.app/_dm
```

`docs/dm/` 只放「不該被公開下載」的東西：這份說明與 PDF 產生器。
**刻意不在兩個地方各放一份 HTML**，兩份一定會走鐘。

| 檔案 | 位置 | 內容 |
|------|------|------|
| `index.html` | `apps/web/public/_dm/` | 01 總覽 — 產品定位、三個設計前提、三種身分並列、園所的一天、目錄 |
| `parent.html` | 同上 | 02 家長端 — 今天／聯絡簿／請假／娃娃車／公告／訊息中心 + 家長看不到什麼 |
| `teacher.html` | 同上 | 03 班導師端 — 待辦首頁／點名／聯絡簿直欄模式／請假審核／我的班 + 老師的邊界 |
| `admin.html` | 同上 | 04 園長與行政 — 手機全園總覽／桌面後台／LINE 群發／園所外觀／人員權限稽核 |
| `platform.html` | 同上 | 05 功能總表、六種身分權限對照、資料與安全、產品藍圖、導入流程 |
| `dm.css` | 同上 | 五頁共用的樣式（含產品畫面複刻區） |
| `build-pdf.mjs` | `docs/dm/` | 把五頁併成一份 PDF |

`/_dm` 這個短網址靠 `apps/web/next.config.mjs` 的一條 redirect 轉到 `/_dm/index.html`
—— Next.js 的 `public/` 底下**不會**自動把資料夾對應到 index.html。

## 產生 PDF

```bash
node docs/dm/build-pdf.mjs
```

產出 `docs/dm/Sproutin-園所簡介.pdf`（A4 直式，約 56 頁）與中繼檔 `dm-print.html`，兩者都不進版控。
需要本機有 Chrome 或 Edge。

腳本做的事：

1. 抽出五頁的 `<main>`，串成一份含封面與目錄的單一文件（不是五個 PDF 再合併 —— 那樣頁碼與空白頁都是斷的）。
2. 列印時把手機外框從「固定高度 + 可捲動」放開成完整高度，等於一張完整長截圖。
3. 先量一次每支手機的高度，替超過一頁的那幾支各寫一條 `zoom`，避免被攔腰切成兩半。
   最長的兩支（老師的聯絡簿、園所外觀）會縮到約 45%，在螢幕上讀沒問題，列印時偏小。

## 本機預覽

五頁是純靜態檔，直接用瀏覽器開 `apps/web/public/_dm/index.html` 即可，不需要跑 Next。
若要傳給業主離線看，整個 `_dm` 資料夾一起壓縮（五頁共用 `dm.css`，只傳一頁會沒有樣式）。

## 示範資料說明

畫面中的園名（晴光幼兒園）、班級、姓名與數字皆為示範內容。
園名、代表色、園徽、封面圖與家長首頁顯示哪些功能，實際上由各園所在後台自行設定。

## 維護

- 產品版面若有調整（`apps/web/src/components/ui/*`、`src/app/globals.css`、`tailwind.config.ts`），
  對應的模擬區塊與 `dm.css` 的 `.app` 段落需要一起更新 —— 這份 DM 的價值在於它跟現況一致。
- 功能狀態（已上線／規劃中）以 `apps/web/src/features/roadmap/roadmap.ts` 與
  `src/features/dashboard/cards.ts` 為準。
