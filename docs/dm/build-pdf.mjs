// 把五頁 DM 併成一份可列印的單一 HTML（dm-print.html），再用 Chrome 輸出 PDF。
//
// 為什麼不是「五個 PDF 再合併」：合併出來的檔案每一頁的頁碼、頁首、目錄都是斷的，
// 而且五份各自的空白頁會留在中間。併成一份 HTML 再一次列印，才會是一份連續的文件。
//
// 用法：
//   node docs/dm/build-pdf.mjs            # 產生 dm-print.html + Sproutin-園所簡介.pdf
//   node docs/dm/build-pdf.mjs --html     # 只產生 dm-print.html（不叫 Chrome）
//
// 螢幕版的手機模擬框是「固定高度 + 可捲動」；紙上沒有捲動這回事，
// 所以列印時把框放開成內容的完整高度 —— 等於一張完整的長截圖。

import { readFile, writeFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

// 五頁 DM 的正本住在 apps/web/public/_dm —— 那是 Vercel 直接對外服務的目錄
// （https://<web>/\_dm/）。**刻意不在 docs 下再放一份**：兩份一定會走鐘。
// 這支腳本（與產出的 PDF）留在 docs/dm，因為它們不該被公開下載。
const SRC_DIR = join(HERE, '..', '..', 'apps', 'web', 'public', '_dm');

const PAGES = [
  { file: 'index.html', no: '01', title: '總覽', sub: '產品定位 · 三個設計前提 · 三種身分 · 園所的一天' },
  { file: 'parent.html', no: '02', title: '家長看到什麼', sub: '今天 · 聯絡簿 · 請假 · 娃娃車 · 公告與訊息中心' },
  { file: 'teacher.html', no: '03', title: '老師看到什麼', sub: '待辦首頁 · 點名 · 聯絡簿直欄模式 · 請假審核 · 我的班' },
  { file: 'admin.html', no: '04', title: '園長與行政', sub: '全園總覽 · 園務後台 · LINE 群發 · 園所外觀 · 權限與稽核' },
  { file: 'platform.html', no: '05', title: '功能與藍圖', sub: '功能總表 · 六種身分權限 · 資料安全 · 藍圖 · 導入流程' },
];

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

function between(html, startRe, endStr) {
  const start = html.search(startRe);
  if (start < 0) throw new Error('找不到起點');
  const end = html.indexOf(endStr, start);
  if (end < 0) throw new Error('找不到終點');
  return html.slice(start, end + endStr.length);
}

// PDF 裡的連結指向不存在的檔案只會讓人按到 404，所以把跨頁連結拆成純文字。
function deadenLinks(html) {
  return html
    .replace(/<a\s+class="card card-link"\s+href="[^"]*"/g, '<div class="card card-link"')
    .replace(/<\/a>(\s*<\/div>\s*<\/div>\s*<\/section>)/g, '</div>$1')
    .replace(/\shref="(index|parent|teacher|admin|platform)\.html[^"]*"/g, '');
}

// card-link 用的是 <a>，上面那條把開頭換成 <div> 之後結尾也要換。
// 直接做一次結構性的處理：把整段 <a class="card card-link" ...>…</a> 換成 div。
function cardLinksToDivs(html) {
  return html.replace(
    /<a\s+class="card card-link"[^>]*>([\s\S]*?)<\/a>/g,
    '<div class="card card-link nolink">$1</div>',
  );
}

const PRINT_CSS = `
/* ================= 列印版覆寫 ================= */
@page { size: A4 portrait; margin: 14mm 11mm 16mm; }

@media print {
  /* 底色、狀態色、品牌色都是這份文件的內容，不是裝飾 —— 一定要印出來。 */
  *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}

html { scroll-behavior: auto; }
body { background-attachment: scroll; }
body::before { display: none; }

/* 網頁的導覽列在紙上沒有作用。 */
.topbar { display: none !important; }
main { max-width: none; padding-left: 0; padding-right: 0; padding-bottom: 0; }

/* 手機模擬：紙上沒有捲動，所以放開高度，讓整個畫面完整印出來。 */
.device-screen { height: auto !important; min-height: 0 !important; }
.app { height: auto !important; overflow: visible !important; }
.app-main { overflow: visible !important; padding-bottom: 1.5rem !important; }
.app-tabs { position: static !important; }
.device, .device.mini { break-inside: avoid; page-break-inside: avoid; }
.showcase-stage { position: static !important; }

/* 分頁規則：一塊完整的東西不要被切成兩半。 */
.card, .flow-step, .trio-item, .notes li, .macframe, .state, .tile, .pull, .annc, .noti { break-inside: avoid; page-break-inside: avoid; }
.section-head, .sh { break-after: avoid; page-break-after: avoid; }
h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
.tablewrap { break-inside: auto; overflow: visible; }
.table { min-width: 0; }
.table tr { break-inside: avoid; page-break-inside: avoid; }
.table thead { display: table-header-group; }

/* 版面在 A4 的寬度下一律單欄；並排的東西擠在 190mm 裡只會兩邊都難讀。 */
.showcase, .showcase.flip { grid-template-columns: minmax(0, 1fr) !important; gap: 2rem; }
.showcase.flip .showcase-copy, .showcase.flip .showcase-stage { order: initial; }
.hero-grid, .section-head { grid-template-columns: minmax(0, 1fr) !important; gap: 1.5rem; }
.cards.c3, .cards.c2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
/* 三支手機在 A4 上只能直排；兩支的段落（公告／訊息中心、請假審核／我的班）並排剛好。 */
.trio { grid-template-columns: minmax(0, 1fr) !important; gap: 2.5rem; max-width: none; }
.trio.two { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; max-width: none; gap: 1.5rem; }
.trio.two .device.mini { max-width: 320px; }
.trio-item > p { max-width: 34rem; }
.facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.fact { border-left: 0; padding-left: 0; border-top: 1px solid var(--line); }
.fact:nth-child(-n+2) { border-top: 0; }
.flow-step { grid-template-columns: 5.5rem minmax(0, 1fr); gap: 1rem; }
.flow-step .who { grid-column: 2; }
.admin { grid-template-columns: 12rem minmax(0, 1fr); min-height: 0; }
.device.mini { max-width: 340px; }

/* 頁尾的「下一頁」在 PDF 裡沒有意義。 */
.foot .nx { display: none; }
.foot { margin-top: 3rem; }

/* ================= 封面與分隔頁 ================= */
.pdf-cover {
  min-height: 250mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 4mm;
}
.pdf-cover .kicker { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.24em; color: var(--brand); }
.pdf-cover h1 { font-size: 3.6rem; font-weight: 700; margin-top: 1.25rem; line-height: 1.12; }
.pdf-cover h1 em { font-style: normal; color: var(--brand); }
.pdf-cover .tag { margin-top: 1.5rem; font-size: 1rem; line-height: 1.85; color: var(--ink-soft); max-width: 36rem; }
/* 封面直接把四句話講完，第一章因此不用再重複一次同樣的大標。 */
.pdf-cover .note { margin-top: 1.75rem; border-left: 2px solid var(--brand); padding-left: 1.1rem; }
.pdf-cover .note p { margin: 0.25rem 0; font-size: 0.9rem; line-height: 1.8; color: var(--ink-soft); }
.pdf-cover .note strong { color: var(--ink); }
.pdf-cover .toc { margin-top: 2.5rem; border-top: 2px solid var(--ink); }
/* 直接子代：漏掉 > 的話裡面那層 div 也會變成 grid，標題就被塞進 3rem 的欄位裡折成三行。 */
.pdf-cover .toc > div { display: grid; grid-template-columns: 2.6rem minmax(0, 1fr); gap: 0.9rem; padding: 0.7rem 0; border-bottom: 1px solid var(--line); align-items: baseline; }
.pdf-cover .toc i { font-style: normal; font-family: var(--serif); font-size: 1rem; font-weight: 700; color: var(--brand); }
.pdf-cover .toc b { font-family: var(--serif); font-size: 1.1rem; font-weight: 700; }
.pdf-cover .toc span { display: block; font-size: 0.8125rem; color: var(--ink-soft); margin-top: 0.15rem; }
.pdf-cover .fine { margin-top: 2rem; font-size: 0.75rem; line-height: 1.8; color: var(--ink-mute); }

/* 第一章的 hero 與封面是同一段話，印兩次只是浪費一頁。 */
.pdf-chapter.is-first .hero { display: none; }

.pdf-divider {
  break-before: page; page-break-before: always;
  padding: 6mm 4mm 0;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--ink);
}
.pdf-divider p { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.2em; color: var(--brand); }
.pdf-divider h2 { font-size: 2.1rem; font-weight: 700; margin-top: 0.5rem; }
.pdf-divider span { display: block; margin: 0.5rem 0 1rem; font-size: 0.8125rem; color: var(--ink-soft); }

/* 每一章的第一個 .hero 在 PDF 裡已經有分隔頁了，不需要再留一大塊上緣空白。 */
.pdf-chapter .hero { padding-top: 0.5rem; }
.pdf-chapter > main > .section:first-of-type { padding-top: 2rem; }
`;

// 紙上一頁放得下多高的東西（A4 297mm − 上下邊界 30mm ≈ 1009px，留一點餘裕）。
const PAGE_FIT_PX = 930;
// zoom 會重排，重排後通常比「原高 × 倍率」再高一點點（換行位置變了），所以先留 4% 餘裕。
const REFLOW_SLACK = 0.96;
// 縮到比這更小，紙上的字就真的看不清楚了；最長的那兩支會停在這裡。
const MIN_ZOOM = 0.45;

// 量每一支手機展開後的實際高度。
//
// 螢幕版的框是「固定高度 + 可捲動」，紙上沒有捲動，所以列印時放開成完整高度 ——
// 但那樣多數手機會超過一頁，被攔腰切成兩半。這裡先用同一份 HTML 量一次高度，
// 再針對超高的那幾支寫一條 zoom，讓它剛好落在一頁裡。
//
// 用 zoom 不用 transform：transform 不改變版面高度，分頁時瀏覽器看到的還是原本那麼高，
// 等於白縮。zoom 會真的重排，分頁才跟著變。
async function measureDevices(chrome, printHtmlPath) {
  const probe = printHtmlPath.replace(/dm-print\.html$/, 'dm-measure.html');
  const html = await readFile(printHtmlPath, 'utf8');
  const inject = `<script>
    for (const d of document.querySelectorAll('.device')) {
      d.setAttribute('data-h', Math.ceil(d.getBoundingClientRect().height));
    }
  </` + `script>`;
  await writeFile(probe, html.replace('</body>', `${inject}\n</body>`), 'utf8');

  // 視窗寬度對齊列印時的內容寬度（A4 210mm − 左右 22mm ≈ 711px），版面才會一樣。
  const { stdout } = await run(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--virtual-time-budget=15000',
      '--window-size=711,1200',
      '--dump-dom',
      `file:///${probe.replace(/\\/g, '/')}`,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return [...stdout.matchAll(/data-h="(\d+)"/g)].map((m) => Number(m[1]));
}

function zoomCss(heights) {
  const rules = heights.map((h, i) => {
    const fit = (PAGE_FIT_PX * REFLOW_SLACK) / h;
    const zoom = h > PAGE_FIT_PX ? Math.max(MIN_ZOOM, Math.floor(fit * 100) / 100) : 1;
    return zoom < 1 ? `.device[data-i="${i}"] { zoom: ${zoom}; }` : null;
  });
  return rules.filter(Boolean).join('\n');
}

async function main() {
  const htmlOnly = process.argv.includes('--html');

  const sources = await Promise.all(
    PAGES.map(async (p) => ({ ...p, html: await readFile(join(SRC_DIR, p.file), 'utf8') })),
  );
  const css = await readFile(join(SRC_DIR, 'dm.css'), 'utf8');

  // 圖示 sprite 只要一份（五頁裡是同一組）。
  const sprite = between(sources[0].html, /<svg width="0"/, '</defs></svg>');

  const chapters = sources
    .map((p) => {
      let main = between(p.html, /<main>/, '</main>');
      main = cardLinksToDivs(main);
      main = deadenLinks(main);
      return `
<section class="pdf-chapter${p.no === '01' ? ' is-first' : ''}">
  <div class="pdf-divider">
    <p>${p.no}</p>
    <h2>${p.title}</h2>
    <span>${p.sub}</span>
  </div>
  ${main}
</section>`;
    })
    .join('\n');

  // 給每一支手機一個編號，量完高度之後才有辦法單獨對它寫 zoom。
  let devIdx = 0;
  // 只認手機外框本身。`[^"]*` 會連 device-screen / device-notch 一起吃掉，
  // 編號就跟量到的 17 支對不起來了。
  const body = chapters.replace(
    /<div class="device( mini| short)?"/g,
    (_m, rest = '') => `<div class="device${rest ?? ''}" data-i="${devIdx++}"`,
  );

  const toc = PAGES.map(
    (p) => `<div><i>${p.no}</i><div><b>${p.title}</b><span>${p.sub}</span></div></div>`,
  ).join('\n');

  const document = (extraCss) => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>Sproutin — 園所簡介</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
${css}
${PRINT_CSS}
${extraCss}
</style>
</head>
<body>
${sprite}
<div class="wrap">
<main>

  <section class="pdf-cover">
    <p class="kicker">幼兒園校務管理與家長溝通平台</p>
    <h1>家長不必<br />再裝<em>一個 App</em>。</h1>
    <p class="tag">
      Sproutin 直接住在 LINE 裡。家長點開園所的官方帳號就是完整的親師介面 ——
      不用下載、不用註冊、不用記密碼、不用教長輩怎麼用。
      園所這一端則是一套真正的校務系統：學生、班級、出缺勤、請假、聯絡簿、娃娃車、公告、群發、權限與稽核。
    </p>
    <div class="note">
      <p><strong>入口</strong>　LINE 官方帳號 + LIFF，家長零安裝</p>
      <p><strong>核心</strong>　以「學生」為單一資料來源，改一次全園同步</p>
      <p><strong>介面</strong>　家長、老師、園長各一套殼，不是同一頁貼標籤</p>
      <p><strong>資料</strong>　每所園獨立資料庫，操作全程留稽核</p>
    </div>
    <div class="toc">
      ${toc}
    </div>
    <p class="fine">
      本文件中的手機與後台畫面為產品實際版型與實際文案，園名（晴光幼兒園）、班級、姓名與數字為示範內容；
      園名、代表色、園徽、封面圖與家長首頁顯示哪些功能，由各園所在後台自行設定。
    </p>
  </section>

${body}

</main>
</div>
</body>
</html>
`;

  const printHtml = join(HERE, 'dm-print.html');
  await writeFile(printHtml, document(''), 'utf8');
  console.log('已產生', printHtml);
  if (htmlOnly) return;

  let chrome = null;
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate);
      chrome = candidate;
      break;
    } catch {
      /* 試下一個 */
    }
  }
  if (!chrome) {
    console.error('找不到 Chrome / Edge，請手動用瀏覽器開 dm-print.html 後列印成 PDF。');
    process.exitCode = 1;
    return;
  }

  // 第二輪：量完高度再寫一次，超過一頁的手機帶上自己的 zoom。
  const heights = await measureDevices(chrome, printHtml);
  const zoom = zoomCss(heights);
  await writeFile(printHtml, document(zoom), 'utf8');
  console.log(
    `量到 ${heights.length} 支手機，其中 ${zoom.split('\n').filter(Boolean).length} 支需要縮小才放得進一頁`,
  );

  const pdf = join(HERE, 'Sproutin-園所簡介.pdf');
  await run(chrome, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    // 字體要從 Google Fonts 抓，給它一點時間再列印。
    '--virtual-time-budget=20000',
    `--print-to-pdf=${pdf}`,
    `file:///${printHtml.replace(/\\/g, '/')}`,
  ]);
  console.log('已輸出', pdf);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
