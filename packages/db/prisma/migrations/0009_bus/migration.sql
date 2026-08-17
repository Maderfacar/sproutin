-- Phase 9 ⑦ 娃娃車 / 接送 —— 刀 1（路線與接送點設定 + 隨車老師點名 + 家長今日狀態）。
--
-- **door-to-door**（Human Owner 更正 2026-08-18）：車子開到每個孩子的家門口，不是開到站牌。
-- 因此表名為 BusPoint（接送點）而非 BusStop —— 一個接送點通常就是一戶人家。
--
-- Expand-only（ADR-003）：只新增四張表與三個 enum，不觸碰既有表與欄位；回滾＝直接 DROP。
-- 既有的 Student / Leave / Attendance 一行都沒動 —— 請假自動移出乘車名單是「訂閱既有事件」
-- （docs/06 §4 Transportation 訂閱點），不是修改請假模組。
--
-- DDL 由 `prisma migrate diff --from-empty --to-schema-datamodel` 產生後逐段取出，
-- 確保與 schema.prisma 完全一致（沿用 0008 的做法）。

-- CreateEnum
CREATE TYPE "BusDirection" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "BusRideStatus" AS ENUM ('SCHEDULED', 'BOARDED', 'ALIGHTED', 'ABSENT');

-- CreateEnum
CREATE TYPE "BusRideSource" AS ENUM ('MANUAL', 'LEAVE_EVENT');

-- CreateTable
CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "morningDepart" TEXT,
    "afternoonDepart" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "busTeacherId" TEXT,
    "afternoonCustomOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusPoint" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "orderAm" INTEGER NOT NULL,
    "orderPm" INTEGER NOT NULL,
    "etaAm" TEXT,
    "etaPm" TEXT,

    CONSTRAINT "BusPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "morningPointId" TEXT,
    "afternoonPointId" TEXT,
    "ridesMorning" BOOLEAN NOT NULL DEFAULT true,
    "ridesAfternoon" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusRide" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "direction" "BusDirection" NOT NULL,
    "pointId" TEXT,
    "status" "BusRideStatus" NOT NULL DEFAULT 'SCHEDULED',
    "boardedAt" TIMESTAMP(3),
    "alightedAt" TIMESTAMP(3),
    "boardLat" DOUBLE PRECISION,
    "boardLng" DOUBLE PRECISION,
    "alightLat" DOUBLE PRECISION,
    "alightLng" DOUBLE PRECISION,
    "source" "BusRideSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusPoint_routeId_idx" ON "BusPoint"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "BusAssignment_studentId_key" ON "BusAssignment"("studentId");

-- CreateIndex
CREATE INDEX "BusAssignment_routeId_idx" ON "BusAssignment"("routeId");

-- CreateIndex
CREATE INDEX "BusRide_routeId_date_idx" ON "BusRide"("routeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BusRide_studentId_date_direction_key" ON "BusRide"("studentId", "date", "direction");

-- AddForeignKey
ALTER TABLE "BusPoint" ADD CONSTRAINT "BusPoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAssignment" ADD CONSTRAINT "BusAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAssignment" ADD CONSTRAINT "BusAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAssignment" ADD CONSTRAINT "BusAssignment_morningPointId_fkey" FOREIGN KEY ("morningPointId") REFERENCES "BusPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusAssignment" ADD CONSTRAINT "BusAssignment_afternoonPointId_fkey" FOREIGN KEY ("afternoonPointId") REFERENCES "BusPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRide" ADD CONSTRAINT "BusRide_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusRide" ADD CONSTRAINT "BusRide_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
