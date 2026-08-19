// 狀態語意色的 Tailwind 對照表（對應 globals.css 的 --good/--wait/--note/--stop）。
//
// 為什麼是寫死的表而不是樣板字串：Tailwind 只掃得到原始碼裡**完整出現過**的類別名，
// `bg-${tone}-wash` 這種組出來的字串它看不見，正式 build 會把那些樣式整組刪掉
// —— 開發時看起來好好的，上線變成沒有顏色。
//
// 狀態色全園固定、不隨園所品牌變：狀態講的是事實（到了沒、准了沒），不是身分。
// 園所把主色換成紅的，「缺席」還是得是紅的。品牌色請用 tone='brand'。

export type Tone = 'good' | 'wait' | 'note' | 'stop' | 'brand' | 'neutral';

export interface ToneClasses {
  /** 淡底 + 同色系邊 + 同色系字。整塊要有份量時用這個。 */
  block: string;
  /** 只有字的顏色。用在已經有底的容器裡。 */
  text: string;
  /** 實心底 + 反白字。整頁最多一處，通常是主要按鈕或數字徽章。 */
  solid: string;
}

export const TONE: Record<Tone, ToneClasses> = {
  good: {
    block: 'bg-good-wash border-good-edge text-good-text',
    text: 'text-good-text',
    solid: 'bg-good-text text-surface',
  },
  wait: {
    block: 'bg-wait-wash border-wait-edge text-wait-text',
    text: 'text-wait-text',
    solid: 'bg-wait-text text-surface',
  },
  note: {
    block: 'bg-note-wash border-note-edge text-note-text',
    text: 'text-note-text',
    solid: 'bg-note-text text-surface',
  },
  stop: {
    block: 'bg-stop-wash border-stop-edge text-stop-text',
    text: 'text-stop-text',
    solid: 'bg-stop-text text-surface',
  },
  brand: {
    block: 'bg-brand-wash border-brand-primary text-brand-primary',
    text: 'text-brand-primary',
    solid: 'bg-brand-primary text-white',
  },
  neutral: {
    block: 'bg-surface-sunk border-line text-ink-soft',
    text: 'text-ink-soft',
    solid: 'bg-ink text-surface',
  },
};
