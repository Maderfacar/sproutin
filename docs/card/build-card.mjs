// 名片：重新產生 QR、輸出印刷用 PDF 與預覽圖。
//
//   node docs/card/build-card.mjs            # QR + PDF + 預覽 PNG
//   node docs/card/build-card.mjs --qr-only  # 只重生 QR
//
// QR 用 npx 叫 `qrcode` 套件產生（不進專案相依）。
// **一定要真的掃一次再交出去** —— 印在紙上的 QR 掃不到是無法補救的錯誤，
// 而「看起來像 QR」跟「掃得出正確網址」是兩回事。若本機裝得到 jsqr 就自動驗；
// 裝不到就明講沒驗過，不要靜靜跳過。

import { access, readFile, writeFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// QR 掃進去要到哪裡。**改這裡就好**，card.html 上那行網址文字記得一起改。
const TARGET = 'https://sproutin-kb91-theta.vercel.app/_dm';

// 容錯等級 Q（可容忍 25% 髒污/磨損）。名片會被塞進口袋、被折到，M 太冒險；
// H 會把模組數推到 45（模組變小、更難印），Q 是這個網址長度下的甜蜜點。
const ECC = 'Q';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

async function findChrome() {
  for (const c of CHROME_CANDIDATES) {
    try {
      await access(c);
      return c;
    } catch {
      /* 下一個 */
    }
  }
  return null;
}

// 叫 npx 有兩個 Windows 上的坑，兩個都會讓這支腳本看起來「卡住」：
//   ① npx 是 .cmd，Node 20+ 不再直接 spawn 批次檔 → spawn EINVAL。所以走 shell。
//   ② 走 shell 之後若把 stdin 接成 pipe，npx 會一直等輸入 → 永遠不會結束。
//      stdin 必須明確 ignore。
function runNpx(args) {
  const line = ['npx', ...args].map((a) => (/[\s&|<>^"]/.test(a) ? `"${a}"` : a)).join(' ');
  return new Promise((resolve, reject) => {
    const child = spawn(line, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`npx 失敗（exit ${code}）：${err.trim()}`)),
    );
  });
}

async function makeQr() {
  const svgPath = join(HERE, 'qr.svg');
  await runNpx(['--yes', 'qrcode@1.5.4', '-t', 'svg', '-e', ECC, '-o', svgPath, TARGET]);

  // 把 QR 直接寫進 card.html 的兩個標記之間 —— 名片只有一個檔案才不會被搬到一半剩破圖。
  // 拿掉 XML 宣告與 DOCTYPE（那是給獨立 .svg 檔用的，內嵌時會讓部分瀏覽器整段忽略）。
  const svg = (await readFile(svgPath, 'utf8'))
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace('<svg ', '<svg role="img" aria-label="掃描前往 Sproutin 產品介紹" ')
    .trim();

  const cardPath = join(HERE, 'card.html');
  const card = await readFile(cardPath, 'utf8');
  const marked = card.replace(
    /(<!-- QR:START -->)[\s\S]*?(<!-- QR:END -->)/,
    `$1\n            ${svg}\n            $2`,
  );
  if (marked === card) {
    throw new Error('card.html 裡找不到 QR:START / QR:END 標記，QR 沒有更新。');
  }
  await writeFile(cardPath, marked, 'utf8');
  console.log('QR 已產生並內嵌：', svgPath, '→ card.html');
  return svgPath;
}

// 用另一套實作把 QR 讀回來。產生器與解碼器對得上才算數。
async function verifyQr() {
  let jsQR;
  let PNG;
  try {
    jsQR = require('jsqr').default ?? require('jsqr');
    ({ PNG } = require('pngjs'));
  } catch {
    console.warn(
      '⚠ 找不到 jsqr / pngjs，這次沒有掃描驗證。要驗的話：npm i -D jsqr pngjs，或用手機掃一次 docs/card/qr.svg。',
    );
    return false;
  }
  const png = join(HERE, '.qr-verify.png');
  await runNpx(['--yes', 'qrcode@1.5.4', '-t', 'png', '-e', ECC, '-w', '600', '-o', png, TARGET]);
  const img = PNG.sync.read(await readFile(png));
  const res = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
  if (!res || res.data !== TARGET) {
    throw new Error(`QR 驗證失敗：掃到「${res ? res.data : '(讀不到)'}」，預期「${TARGET}」`);
  }
  console.log('QR 掃描驗證通過 →', res.data);
  return true;
}

async function render(chrome) {
  const src = `file:///${join(HERE, 'card.html').replace(/\\/g, '/')}`;
  const pdf = join(HERE, 'Sproutin-名片-陳識翔.pdf');
  await run(chrome, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    '--virtual-time-budget=20000',
    `--print-to-pdf=${pdf}`,
    src,
  ]);
  console.log('印刷用 PDF：', pdf, '（96 × 60 mm，兩頁，含 3mm 出血）');

  // 預覽圖：直接截整頁（含說明與裁切線），給人看用的。
  const png = join(HERE, 'preview.png');
  await run(chrome, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--virtual-time-budget=20000',
    '--window-size=1100,1500',
    `--screenshot=${png}`,
    src,
  ]);
  console.log('預覽圖：', png);
}

async function main() {
  await makeQr();
  await verifyQr();
  if (process.argv.includes('--qr-only')) return;

  const chrome = await findChrome();
  if (!chrome) {
    console.error('找不到 Chrome / Edge。請手動開 docs/card/card.html 並「列印 → 另存 PDF」（紙張 96×60mm、邊界 0）。');
    process.exitCode = 1;
    return;
  }
  await render(chrome);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
