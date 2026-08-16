-- Phase 9 階段2 刀4：每日聯絡簿（每生每日一筆）。
-- Expand-only（ADR-003）：只新增 enum 與一張新表，**完全不觸碰既有表與既有欄位**，
-- 因此回滾＝直接 DROP，對線上零風險（既有功能不依賴本表）。

CREATE TYPE "MealAmount" AS ENUM ('ALL', 'MOST', 'HALF', 'LITTLE', 'NONE');
CREATE TYPE "NapQuality" AS ENUM ('WELL', 'SHORT', 'NONE');
CREATE TYPE "ToiletState" AS ENUM ('NORMAL', 'LOOSE', 'HARD', 'NONE');
CREATE TYPE "Mood" AS ENUM ('HAPPY', 'CALM', 'SLEEPY', 'LOW');
CREATE TYPE "HealthSymptom" AS ENUM ('COUGH', 'RUNNY_NOSE', 'SORE_THROAT', 'DIARRHEA', 'VOMITING', 'POOR_APPETITE', 'LOW_ENERGY', 'RASH');
CREATE TYPE "PickupMethod" AS ENUM ('FAMILY', 'SCHOOL_BUS');

CREATE TABLE "CommunicationBookEntry" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TEXT,
    "lunch" "MealAmount",
    "snack" "MealAmount",
    "nap" "NapQuality",
    "toilet" "ToiletState",
    "mood" "Mood",
    "symptoms" "HealthSymptom"[],
    "temperature" DOUBLE PRECISION,
    "pickup" "PickupMethod",
    "teacherNote" TEXT,
    "filledBy" TEXT,
    "filledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationBookEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationBookEntry_studentId_date_key" ON "CommunicationBookEntry"("studentId", "date");
CREATE INDEX "CommunicationBookEntry_date_idx" ON "CommunicationBookEntry"("date");

ALTER TABLE "CommunicationBookEntry"
    ADD CONSTRAINT "CommunicationBookEntry_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
