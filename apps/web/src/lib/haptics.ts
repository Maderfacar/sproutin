// 觸覺回饋。**只有一種：成功了震一下。**
//
// 為什麼要有：老師點名、隨車老師點上下車，這兩件事都是「同一個動作重複幾十次」，
// 而且做的時候眼睛多半不在螢幕上（一手扶車、一邊看著孩子）。畫面上的變化他不一定看到，
// 手上的一下他一定感覺得到 —— 這就是「再點一次」少掉的來源。
//
// **iOS 不支援 Vibration API，而且刻意不做替代品**（Human Owner 已知的平台限制）：
// 網頁在 iOS 上唯一能震的路是拿一個隱藏的 <input switch> 去騙 Taptic Engine，
// 那是取巧、會隨系統版本壞掉，而且壞掉的時候沒有人會發現。做不到就說做不到。
//
// 時間長度 10ms 是刻意的：那是「碰一下」的感覺，不是通知的震動。
// 超過 30ms 在手上會變成「嗡」的一聲，重複幾十次會很煩。
const TAP_MS = 10;

// 一次成功的操作。抓不到 API 就什麼都不做 —— 這是加分項，不是功能。
export function tapFeedback(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(TAP_MS);
  } catch {
    // 某些瀏覽器在使用者還沒與頁面互動過時會丟錯。震不出來不影響任何功能。
  }
}
