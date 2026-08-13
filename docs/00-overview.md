# 00 — 產品概觀與核心原則

## 產品定位

**Sproutin** 是以 **LINE Official Account + LIFF** 為主要入口的幼兒園校務管理與家長溝通 SaaS 平台。

核心理念：讓幼兒園**不需要要求家長另外下載 App**，直接透過 LINE 進入 Sproutin，完成日常校務、親師溝通與學生資訊管理。

Sproutin 不是「電子聯絡簿」，而是以 **Student 為核心資料單位**的校務平台。

## 核心資料關係

```text
School → Class → Student → Parents/Guardians
                    ↑
                 Teachers

Student 衍生資料：
Attendance · Leave · Message · Announcement
Health(保留) · Bus(保留) · Daily Communication
```

## 四大資料原則

### 1. Single Source of Truth (§3)
同一份核心資料只有一個主要來源。學生資料只維護一次。家長請假後，系統**自動連動**出缺勤、娃娃車名單、Dashboard、通知 —— 老師**不需手動重複修改**。

### 2. Event-driven (§4)
跨模組連動一律走事件，不硬編碼互相依賴。未來新模組可訂閱既有事件。

### 3. Config-driven (§24–26)
UI、權限、功能、品牌都不寫死，由設定驅動。Feature Flag 必須內建於架構。

### 4. Backend-authoritative (§18)
權限判斷全在後端。Frontend 只負責顯示，不做授權決策。

## MVP 三分法 (§5–6, §27–28)

| 分類 | 定義 | 架構要求 |
|------|------|----------|
| **A. MVP 必做** | 第一版真正完成 | 完整實作 |
| **B. Architecture Reserved** | MVP 不實作，但 schema / module boundary / API / event 必須允許未來加入 | 建 boundary、預留錨點 |
| **C. Future Roadmap** | 未來版本再做 | 不得設計出阻礙其加入的架構 |

> **關鍵**：「MVP 不做」≠「未來不做」。不得因某功能不在 MVP 就設計出阻礙它未來加入的架構。

## 平衡點

**不要過度工程化**（不要一開始就 Microservices、不要建過多服務、不要實作所有未來功能）
**也不要破壞架構**（不要把資料 / 權限 / UI / 功能寫死，不要讓未來模組無法加入）
