// 園所外觀的內建素材（打包於 web，站內相對路徑；後端 IMAGE_REF 允許 "/" 開頭）。
// 園所可直接選用，或改上傳自己的圖（Vercel Blob）/貼外部網址。

export interface ImagePreset {
  id: string;
  label: string;
  url: string;
}

export const LOGO_PRESETS: readonly ImagePreset[] = [
  { id: 'leaf', label: '葉', url: '/presets/logo-leaf.svg' },
  { id: 'sprout', label: '芽', url: '/presets/logo-sprout.svg' },
  { id: 'sun', label: '朝陽', url: '/presets/logo-sun.svg' },
  { id: 'bird', label: '小鳥', url: '/presets/logo-bird.svg' },
] as const;

export const BANNER_PRESETS: readonly ImagePreset[] = [
  { id: 'leaves', label: '綠意', url: '/presets/banner-leaves.svg' },
  { id: 'morning', label: '晨光', url: '/presets/banner-morning.svg' },
  { id: 'paper', label: '紙感', url: '/presets/banner-paper.svg' },
] as const;

// 建議色票（清葉調性；園所仍可用色票選擇器自訂任意顏色）。
export interface ColorPreset {
  label: string;
  primary: string;
  secondary: string;
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  { label: '森綠', primary: '#2f6b4f', secondary: '#74b48a' },
  { label: '暖陽', primary: '#c8874a', secondary: '#e8c39a' },
  { label: '晴空', primary: '#3f6f8f', secondary: '#8fb8d0' },
  { label: '花瓣', primary: '#b25a72', secondary: '#e0a9b6' },
  { label: '墨竹', primary: '#3d5a45', secondary: '#8fa88f' },
] as const;
