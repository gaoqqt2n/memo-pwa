// Supabase 側の CRUD + Realtime 購読
async function fetchMemosCloud(userId){
  return await sb.from('memos').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
}
async function addMemoCloud(payload){ return await sb.from('memos').insert(payload); }
async function updateMemoCloud(id, patch){ return await sb.from('memos').update(patch).eq('id', id); }
async function deleteMemoCloud(id){ return await sb.from('memos').delete().eq('id', id); }
function subscribeMemosRealtime(userId, onChange){
  const channel = sb.channel('realtime-memos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memos', filter: `user_id=eq.${userId}` }, () => { try{ onChange && onChange(); }catch(e){ console.error(e); } })
    .subscribe();
  window.addEventListener('beforeunload', () => { sb.removeChannel(channel); });
  return channel;
}
window.fetchMemosCloud = fetchMemosCloud;
window.addMemoCloud = addMemoCloud;
window.updateMemoCloud = updateMemoCloud;
window.deleteMemoCloud = deleteMemoCloud;
window.subscribeMemosRealtime = subscribeMemosRealtime;
