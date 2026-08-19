import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrast, mix, parseHex, resolveTokens, type Rgb } from './contrast';

// 設計系統的第二道守門：**色彩對比**。
//
// 第一道（eslint 的 design-system/no-retired-styles）擋的是「用錯顏色」；
// 這一道擋的是「顏色本身就看不見」。兩者都是為了同一件事 ——
// 規則寫在文件裡不會自己執行，而調色盤最容易在某一次微調時悄悄退步。
//
// 這條測試第一次跑起來就抓到四個不合格的值（全部是既有的，不是深色模式帶來的）：
//   --ink-soft   4.43（差一點就是不合格，而它是全站的次要字）
//   --ink-mute   2.51（用在 11px 的時間戳與提示，等於看不見）
//   --line-strong 1.57（設計系統說它的意思是「這一塊可以點」，那是介面元件的邊界）
//   深色的 --ink-mute 4.15
// 這正是 Human Owner 說的「長輩在戶外看不見」——只是先前沒有人把它量出來。
//
// 門檻依 WCAG 2.1 AA：
//   一般文字 4.5:1；介面元件與狀態的邊界 3:1（1.4.11）。
// 純裝飾（--line 這種只是分隔的細線、狀態塊裡的 edge）不在規範內，也就不在這裡量。

const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const DARK_MARKER = '@media (prefers-color-scheme: dark)';

// 淺色＝深色區塊之前的所有宣告；深色＝整份（後面的宣告蓋掉前面的，與 CSS 同一個規則）。
const LIGHT = resolveTokens(CSS.slice(0, CSS.indexOf(DARK_MARKER)));
const DARK = resolveTokens(CSS);

const TEXT_MIN = 4.5;
const UI_MIN = 3;

function color(tokens: Map<string, Rgb | null>, name: string): Rgb {
  const value = tokens.get(name);
  if (!value) throw new Error(`token ${name} 解不出顏色（是不是改成 rgba 或新的語法了？）`);
  return value;
}

/** 文字色 × 它會被放上去的每一種底色。 */
const TEXT_PAIRS: [fg: string, bgs: string[]][] = [
  ['--ink', ['--bg', '--surface', '--surface-sunk']],
  ['--ink-soft', ['--bg', '--surface', '--surface-sunk']],
  ['--ink-mute', ['--bg', '--surface']],
  ['--good-text', ['--good-wash']],
  ['--wait-text', ['--wait-wash']],
  ['--note-text', ['--note-wash']],
  ['--stop-text', ['--stop-wash']],
  // 品牌色當文字用（Button 的 text、Badge 的 brand、Tile 的圖示）。
  ['--brand-primary', ['--surface', '--brand-wash']],
  // 實心品牌底上的字。**這一條只保證預設的森綠**：--brand-primary 是 per-school 的，
  // 園所挑一個很淺的主色時白字一樣會不見 —— 那要在「園所外觀」擋，不是在這裡。
  ['--brand-contrast', ['--brand-primary']],
];

/** 介面元件的邊界（WCAG 1.4.11）。--line 是純分隔線，不在此列。 */
const UI_PAIRS: [fg: string, bgs: string[]][] = [
  ['--line-strong', ['--bg', '--surface']],
];

function check(
  mode: string,
  tokens: Map<string, Rgb | null>,
  pairs: [string, string[]][],
  min: number,
): void {
  for (const [fg, bgs] of pairs) {
    for (const bg of bgs) {
      const ratio = contrast(color(tokens, fg), color(tokens, bg));
      expect(
        Number(ratio.toFixed(2)),
        `${mode}：${fg} 放在 ${bg} 上只有 ${ratio.toFixed(2)}:1（要 ${min}:1）`,
      ).toBeGreaterThanOrEqual(min);
    }
  }
}

describe('清葉 token 的色彩對比', () => {
  it('淺色：文字全部通過 WCAG AA', () => {
    check('淺色', LIGHT, TEXT_PAIRS, TEXT_MIN);
  });

  it('淺色：可以點的邊界看得出來', () => {
    check('淺色', LIGHT, UI_PAIRS, UI_MIN);
  });

  it('深色：文字全部通過 WCAG AA', () => {
    check('深色', DARK, TEXT_PAIRS, TEXT_MIN);
  });

  it('深色：可以點的邊界看得出來', () => {
    check('深色', DARK, UI_PAIRS, UI_MIN);
  });

  // 三層字色是設計系統的一部分（ink > ink-soft > ink-mute）。
  // 全部拉到 4.5 之後階差被壓縮得很小，但**順序不能反過來** ——
  // 反過來的話「淡掉的東西」會比正文還搶眼。
  it('三層字色的深淺順序不能亂', () => {
    for (const [mode, tokens] of [
      ['淺色', LIGHT],
      ['深色', DARK],
    ] as const) {
      const onSurface = (name: string): number =>
        contrast(color(tokens, name), color(tokens, '--surface'));
      expect(onSurface('--ink'), `${mode}：ink 要比 ink-soft 明顯`).toBeGreaterThan(
        onSurface('--ink-soft'),
      );
      expect(onSurface('--ink-soft'), `${mode}：ink-soft 要比 ink-mute 明顯`).toBeGreaterThan(
        onSurface('--ink-mute'),
      );
    }
  });
});

// 解析器本身也要有測試 —— 它算錯的話，上面那些門檻就只是在量假的數字。
describe('token 解析', () => {
  it('展得開 var() 與 color-mix()', () => {
    const tokens = resolveTokens(`
      :root {
        --a: #ffffff;
        --b: var(--a);
        --c: color-mix(in srgb, #000000 50%, var(--a));
      }
    `);
    expect(tokens.get('--b')).toEqual({ r: 255, g: 255, b: 255 });
    expect(tokens.get('--c')).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('後面的宣告蓋掉前面的（深色區塊就是這樣生效的）', () => {
    const tokens = resolveTokens(':root{--x:#ffffff;} @media x {:root{--x:#000000;}}');
    expect(tokens.get('--x')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('黑白的對比是 21，同色是 1', () => {
    const white = parseHex('#ffffff')!;
    const black = parseHex('#000000')!;
    expect(Math.round(contrast(white, black))).toBe(21);
    expect(contrast(white, white)).toBe(1);
  });

  it('mix 是逐通道的線性內插', () => {
    expect(mix({ r: 200, g: 100, b: 0 }, { r: 0, g: 0, b: 100 }, 25)).toEqual({
      r: 50,
      g: 25,
      b: 75,
    });
  });
});
