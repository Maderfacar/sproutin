-- Phase 8: per-school 版型/主題模板。Expand-only（ADR-003）：新增兩欄，皆帶預設值，
-- 既有列自動取得預設（warm / grid），對線上零風險。
ALTER TABLE "SchoolConfig" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'warm';
ALTER TABLE "SchoolConfig" ADD COLUMN "dashboardLayout" TEXT NOT NULL DEFAULT 'grid';
