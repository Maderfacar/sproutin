// 從圖片位元組讀出寬高（只支援 PNG / JPEG —— LINE 也只收這兩種）。
//
// 為什麼要在伺服器端讀：LINE 要求**上傳的底圖尺寸必須與選單宣告的尺寸完全一致**。
// 若寫死 2500×1686，園所就得剛好湊出那個尺寸，否則 LINE 直接拒絕（且錯誤訊息很難懂）。
// 讀出實際尺寸後直接拿它當選單尺寸，園所上傳什麼比例就用什麼比例（仍須符合 LINE 的下限）。

export interface ImageSize {
  width: number;
  height: number;
}

function readPng(view: DataView): ImageSize | null {
  // PNG：8 bytes 簽章 + IHDR（長度4 + 型別4）後即為 width(4) height(4)，big-endian。
  if (view.byteLength < 24) return null;
  const signatureOk =
    view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a;
  if (!signatureOk) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpeg(view: DataView): ImageSize | null {
  // JPEG：從 SOI(0xFFD8) 之後逐段掃描，找 SOF 段，其中 height 在 +5、width 在 +7。
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1; // 填充位元組，往前挪一格再看
      continue;
    }
    const marker = view.getUint8(offset + 1);
    // SOF0–SOF3 / SOF5–SOF7 / SOF9–SOF11 / SOF13–SOF15 才帶尺寸；
    // 0xC4(DHT)、0xC8(JPG)、0xCC(DAC) 不是 SOF。
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    const segmentLength = view.getUint16(offset + 2);
    if (segmentLength < 2) return null; // 壞掉的檔案，別無限迴圈
    offset += 2 + segmentLength;
  }
  return null;
}

export function readImageSize(bytes: ArrayBuffer, contentType: string): ImageSize | null {
  const view = new DataView(bytes);
  const size = contentType === 'image/png' ? readPng(view) : readJpeg(view);
  if (!size || size.width <= 0 || size.height <= 0) return null;
  return size;
}

// LINE 對底圖的硬性限制（查證自 Messaging API reference，2026-08-17）。
export const IMAGE_MIN_WIDTH = 800;
export const IMAGE_MAX_WIDTH = 2500;
export const IMAGE_MIN_HEIGHT = 250;
export const IMAGE_MIN_RATIO = 1.45;

export function imageSizeProblem(size: ImageSize): string | null {
  if (size.width < IMAGE_MIN_WIDTH || size.width > IMAGE_MAX_WIDTH) {
    return 'rich_menu_image_width';
  }
  if (size.height < IMAGE_MIN_HEIGHT) {
    return 'rich_menu_image_height';
  }
  if (size.width / size.height < IMAGE_MIN_RATIO) {
    return 'rich_menu_image_ratio';
  }
  return null;
}
