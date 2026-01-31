(function(){
  if (!window.sb) return;
  const $ = (sel) => document.querySelector(sel);
  const emailInput = $('#loginEmail');
  const sendLinkBtn = $('#sendLinkBtn');
  const logoutBtn = $('#logoutBtn');
  const whoami = $('#whoami');

  function setAuthUI(session){
    const user = session?.user || null;
    if (user){
      if (emailInput) emailInput.style.display = 'none';
      if (sendLinkBtn) sendLinkBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (whoami) whoami.textContent = user.email || user.id;
    } else {
      if (emailInput) emailInput.style.display = 'inline-block';
      if (sendLinkBtn) sendLinkBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (whoami) whoami.textContent = '';
    }
  }

  window.addEventListener('DOMContentLoaded', async () => {
    const { data } = await sb.auth.getSession();
    setAuthUI(data.session);
  });

  sendLinkBtn && sendLinkBtn.addEventListener('click', async () => {
    const email = emailInput?.value?.trim();
    if (!email) return alert('メールアドレスを入力してください');
    const { error } = await sb.auth.signInWithOtp({ email });
    if (error) alert(error.message); else alert('ログインリンクを送信しました。メールを確認してください。');
  });

  logoutBtn && logoutBtn.addEventListener('click', async () => { await sb.auth.signOut(); });

  sb.auth.onAuthStateChange((_evt, session) => { setAuthUI(session); if (window.onSupabaseAuthState) window.onSupabaseAuthState(session); });
})();
