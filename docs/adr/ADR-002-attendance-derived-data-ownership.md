# ADR-002 — Attendance Derived Data Ownership & Override Policy

**Status:** Accepted (2026-08-11)

## Context

`LeaveApproved` → 投影 `Attendance(source=LEAVE_EVENT, sourceRef=Leave.id)`。Leave 為 SoT，此 Attendance 為 Derived。

Edge case：Derived Attendance 建立後，**老師手動修改**，之後**家長取消 Leave**。系統回滾 Derived Attendance 時，**不得覆蓋或刪除老師的人工結果**。

## Domain Rule（正式，v1.1）

1. **Leave** = 家長提出的請假意圖／請假事實的 **SoT**。
2. **Attendance** = 園方認定的實際出勤狀態的 **SoT**。
3. `LeaveApproved` 可產生 `Attendance(source=LEAVE_EVENT)` 的 **Derived Record**。
4. 教師人工修改後，Attendance ownership **轉為 MANUAL**。
5. `LeaveCancelled` **不得覆蓋 MANUAL Attendance**。
6. Leave 與 Attendance **可以合法地不一致**；**不以「強制永久一致」為目標**。
7. 衝突透過 **notification / audit / review** 浮現，**非靜默覆蓋**。

## Decision — Ownership 轉移 + 不破壞性回滾

1. **允許人工修改？** 允許。老師/行政可修改任何 Attendance。
2. **修改後 source 轉 MANUAL？** 是。當一筆 `source=LEAVE_EVENT` 的列被人工修改，視為 **override**：`source` 轉 `MANUAL`、記 `overriddenAt`/`overriddenBy`、保留 `derivedFrom`（原 Leave.id 血緣）。該列**所有權轉移給人工**，成為該列的新 SoT。
3. **轉 MANUAL 後 LeaveCancelled 能否回滾？** **不能**。事件只擁有仍為 `source=LEAVE_EVENT` 的列。
4. **不能回滾時如何處理？** `LeaveCancelled`/`LeaveRejected` 回滾邏輯：
   - 僅還原 `source=LEAVE_EVENT AND sourceRef=thisLeave` 的列（刪除或改回）。
   - 對已 override（`source=MANUAL AND derivedFrom=thisLeave`）的列**不觸碰**；改為發出 **Notification + AuditLog(result=SUCCESS, action="attendance.override_conflict")** 通知老師/行政「Leave 已取消，但該日出缺勤曾人工調整，請覆核」。→ 人工結果保留，衝突**浮出檯面**而非靜默覆蓋。
5. **需要的欄位**：Attendance 增 `derivedFrom (String?)`、`overriddenAt (DateTime?)`、`overriddenBy (String?)`；沿用 `source`、`sourceRef`。語意：
   - `source`：MANUAL | LEAVE_EVENT —— **當前擁有者**。
   - `sourceRef`：source=LEAVE_EVENT 時的 active 來源 Leave.id；MANUAL 時為 null。
   - `derivedFrom`：血緣標記，override 後**仍保留**，供衝突偵測與稽核。
   - `overriddenAt`/`overriddenBy`：override 發生時記錄。
6. **SSoT 如何不被破壞？** 每筆 Attendance 由 `source` 決定**唯一擁有者**。LEAVE_EVENT 列為 Leave 的投影（Leave=SoT）；一旦 override，所有權明確轉給 MANUAL（老師成為該列 SoT），且轉移可稽核、衝突可浮現。任何時刻一筆列只有一個 SoT —— 不存在雙寫。

再投影（如 Leave 重新核准）同樣尊重 override：不覆寫 MANUAL 列，改發衝突通知。

## Alternatives Considered

- **回滾一律刪除 Derived 列**：會清掉老師人工結果，違反需求。否決。
- **禁止修改 Derived 列**：不符實務（老師需更正）。否決。
- **雙 SoT（Leave 與 Attendance 同時權威）**：破壞 SSoT，衝突無解。否決。

## Consequences

- (+) 老師人工作業永不被事件靜默覆蓋。
- (+) SSoT 維持：單列單一擁有者，轉移可稽核。
- (−) 需衝突通知與覆核流程（人工介入）。
- 影響：Attendance schema 增 3 欄；事件 handler 增 source 判斷與衝突通知；API 標示 override 語意。
