
// scripts/storage-supabase.js
// Supabase 側の CRUD + Realtime 購読

async function fetchMemosCloud(userId){
  return await sb.from('memos')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
}

async function addMemoCloud(payload){
  // payload: { user_id, title?, content, color?, font_size? }
  return await sb.from('memos').insert(payload);
}

async function updateMemoCloud(id, patch){
  return await sb.from('memos').update(patch).eq('id', id);
}

async function deleteMemoCloud(id){
  return await sb.from('memos').delete().eq('id', id);
}

function subscribeMemosRealtime(userId, onChange){
  const channel = sb.channel('realtime-memos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memos', filter: `user_id=eq.${userId}` }, () => {
      try { onChange && onChange(); } catch (e) { console.error(e); }
    })
    .subscribe();
  // ページ離脱でクリーンアップ
  window.addEventListener('beforeunload', () => { sb.removeChannel(channel); });
  return channel;
}

// ページ側から参照しやすいよう window にも公開
window.fetchMemosCloud = fetchMemosCloud;
window.addMemoCloud = addMemoCloud;
window.updateMemoCloud = updateMemoCloud;
window.deleteMemoCloud = deleteMemoCloud;
window.subscribeMemosRealtime = subscribeMemosRealtime;
