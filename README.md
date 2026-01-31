
# Mymo Supabase Overlay (for static PWA)

このオーバーレイ ZIP は、`memo-pwa-main`（静的 PWA）に **Supabase Auth + Realtime 同期** を追加するための追補ファイルです。

## できること
- Magic Link（メール）でログイン / ログアウト
- ログイン時はクラウド保存（Supabase）に自動切替
- 追加 / 更新 / 削除は **Realtime** で他端末に反映
- 未ログイン時は従来どおりローカル保存

## 前提
- Supabase の `memos` テーブル（id / user_id / content / color / font_size / timestamps）が存在し、RLS が有効
- Vercel にデプロイ中（ただし本リポジトリは **静的サイト** のため、Vercel の環境変数は自動注入されません）

## 導入手順（最短）
1. この ZIP を展開し、`scripts/` と `sql/` と `PATCH_INSTRUCTIONS.md`、`README.md` を **既存の `memo-pwa-main/` の直下**にコピーします。
2. `scripts/supabase-init.js` を開き、`SUPABASE_URL` と `SUPABASE_ANON_KEY` に **あなたの値**を貼り付けて保存します（anon key は公開前提のため直書きで問題ありません）。
3. `PATCH_INSTRUCTIONS.md` の手順に沿って、`index.html` と `app.js` を最小変更で統合します（コピペのみ）。
4. GitHub に push すると、Vercel が自動で再ビルド → クラウド同期が動作します。

## 既知の注意点
- DB スキーマに `title` と `position` が無い場合は、タイトルは「内容の先頭 30 文字」を自動生成、並び替え（手動）はセッション間で保持されません。必要なら `sql/migration_optional_columns.sql` を適用してください。

