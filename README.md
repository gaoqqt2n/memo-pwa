# メモ帳 v2（PWA 対応／Android 最適化）

## 使い方
- そのまま `index.html` を開けば動作（localStorage 保存）
- 公開する場合は、Vercel/Netlify/GitHub Pages などにそのまま配置
- 初回オンラインアクセス後、オフラインでも起動

## 構成
- `index.html` `styles.css` `app.js` `service-worker.js` `manifest.webmanifest` `icons/`
- Android: ホーム画面に追加（A2HS）対応済み

## 既知の仕様
- 並び替えは「手動」のとき、長押し→ドラッグで可能
- 文字サイズは入力中に即時反映
- カードは色リボン＋淡色背景＋カラー名バッジで視認性向上
