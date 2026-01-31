
-- sql/migration_optional_columns.sql
-- 既存テーブルに UI 依存の列を追加（任意）

ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS position integer;

-- Realtime 用に PK/IDX を整備しておくと良い
-- CREATE INDEX IF NOT EXISTS memos_user_updated_idx ON public.memos(user_id, updated_at DESC);
