
# PATCH_INSTRUCTIONS: 既存ファイルへの最小変更

以下は **`memo-pwa-main/` 直下**にある既存ファイルに対して最小限の追記のみを行う手順です。

---
## 1) `index.html` にスクリプトを追加
`</body>` の**直前**に次の 4 行を追加してください（順序厳守）。

```html
<!-- Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- Supabase init (あなたの URL / anon key を直書き) -->
<script src="./scripts/supabase-init.js"></script>
<!-- 認証 UI と状態反映 -->
<script src="./scripts/auth.js"></script>
<!-- Supabase 用の CRUD + Realtime -->
<script src="./scripts/storage-supabase.js"></script>
```

### 1-1) ログインボタン（ヘッダーなど）を追加（任意）
`<body>` 内の適切な場所（ヘッダーの右側など）に下記のボタン群を追加すると便利です。

```html
<div id="authArea" style="display:flex; gap:8px; align-items:center;">
  <input id="loginEmail" type="email" placeholder="メールアドレス" style="padding:6px;" />
  <button id="sendLinkBtn" class="btn sm">ログインリンクを送信</button>
  <button id="logoutBtn" class="btn sm" style="display:none;">ログアウト</button>
  <span id="whoami" class="hint"></span>
</div>
```

---
## 2) `app.js` にセッション連動フックを追加
`app.js` の **先頭付近**（グローバル変数定義の直後）に次を貼り付けてください。

```js
// ==== Cloud / Local ストレージ切替（追加）====
let useCloud = false;
let currentUser = null;

async function bootstrapStorage() {
  if (window.supabase) {
    const { data: sess } = await supabase.auth.getSession();
    currentUser = sess?.session?.user ?? null;
    useCloud = !!currentUser;

    if (useCloud) {
      // Realtime 購読を開始し、DB 側の変更を検知したら一覧を再取得
      subscribeMemosRealtime(currentUser.id, () => {
        fetchAndRenderFromCloud();
      });
      await fetchAndRenderFromCloud();
    } else {
      // 従来どおりローカルを描画
      renderList();
    }
  } else {
    // Supabase 未読込ならローカルのみ
    renderList();
  }
}

async function fetchAndRenderFromCloud() {
  const { data, error } = await fetchMemosCloud(currentUser.id);
  if (!error) {
    // DB 行 → 既存 UI が扱うメモ構造にマッピング
    memos = (data || []).map(row => ({
      id: row.id,
      title: row.title || (row.content ? (row.content.split('
')[0].slice(0, 30) || '無題') : '無題'),
      content: row.content || '',
      color: row.color || 'gray',
      fontSize: row.font_size || 16,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      position: row.position || 0,
    }));
    renderList();
  }
}

// 画面初期化タイミングで呼ぶ
window.addEventListener('DOMContentLoaded', () => {
  bootstrapStorage();
});
```

---
## 3) 既存の「追加 / 更新 / 削除」処理をクラウド対応
`memoForm.addEventListener('submit', ...)` などの CRUD ハンドラ内で、
`useCloud === true` のときは Supabase API を呼ぶように条件分岐を追加してください。

### 3-1) 追加（新規作成）
**編集開始〜保存**の処理部分で、`editingId` がないときに以下の分岐を入れます。

```js
if (useCloud) {
  const now = new Date();
  const payload = {
    user_id: currentUser.id,
    title,
    content,
    color,
    font_size: fontSize,
  };
  const { error } = await addMemoCloud(payload);
  if (error) {
    alert('保存に失敗しました: ' + error.message);
  } else {
    await fetchAndRenderFromCloud();
  }
} else {
  // 既存のローカル保存ロジック（そのまま）
}
```

### 3-2) 更新
```js
if (useCloud) {
  const { error } = await updateMemoCloud(editingId, { title, content, color, font_size: fontSize });
  if (error) alert('更新に失敗: ' + error.message); else await fetchAndRenderFromCloud();
} else {
  // 既存ロジック
}
```

### 3-3) 削除
```js
if (useCloud) {
  const { error } = await deleteMemoCloud(id);
  if (error) alert('削除に失敗: ' + error.message); else await fetchAndRenderFromCloud();
} else {
  // 既存ロジック
}
```

### 3-4) 並び替え（任意）
DB に `position integer` 列を追加した場合のみ、並び替え結果を反映します。
`sql/migration_optional_columns.sql` を参照してください。

---
## 4) UI：未ログイン時は編集を抑止（任意）
フォーム送信直前に以下を追加すると安全です。

```js
if (!currentUser) {
  alert('保存するにはログインしてください');
  return;
}
```

---
## 5) 動作確認
1. 画面右上の入力欄にメールを入れて「ログインリンクを送信」→ メールのリンクを開く
2. ログイン完了後、メモの追加 / 更新 / 削除がクラウドに反映
3. 別端末でも同じアカウントでログイン → Realtime で同期

