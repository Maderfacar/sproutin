-- AuditLog append-only 於 DB 權限層強制（ADR-005 / docs/03）。
--
-- 背景：Render 上 runtime 以資料庫 owner 連線，owner 無視 GRANT/REVOKE，故單純 REVOKE UPDATE/DELETE
-- 對 owner 無效。改以 **trigger** 在表本身擋下改/刪/清空——即使以 owner 連線，應用層也無法
-- UPDATE / DELETE / TRUNCATE 稽核紀錄（真正的 append-only）。INSERT / SELECT 不受影響。
-- 純 expand（只加 function + trigger、不動欄位/資料）→ ADR-003 image-rollback 安全。
-- 註：least-privilege app role 分離（防到 superuser 層級）屬未來 hardening，非本強制之必要條件。

CREATE OR REPLACE FUNCTION sproutin_auditlog_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

-- 擋「改某一筆 / 刪某一筆」（row-level）。
CREATE TRIGGER auditlog_block_update_delete
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION sproutin_auditlog_append_only();

-- 擋「一次清空整張」（statement-level；TRUNCATE 無 row-level）。
CREATE TRIGGER auditlog_block_truncate
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION sproutin_auditlog_append_only();
