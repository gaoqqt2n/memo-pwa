// ====== データ層（ローカル） ======
const STORAGE_KEY = 'memos_v1';
function loadMemos(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):[]}catch(e){console.error('Failed to load memos:',e);return[]}}
function saveMemos(m){localStorage.setItem(STORAGE_KEY,JSON.stringify(m))}
function uid(){return 'm_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

// ====== 状態 ======
let memos = loadMemos();
let editingId = null;

// ====== Cloud/Local 切替 ======
let useCloud = false;
let currentUser = null;
let rtChannel = null;

async function fetchAndRenderFromCloud(){
  if(!currentUser) return;
  try{
    const { data, error } = await fetchMemosCloud(currentUser.id);
    if(error){ console.error(error); return; }
    memos = (data || []).map(row => ({
      id: row.id,
      title: row.title || (row.content ? (row.content.split('
')[0].slice(0,30) || '無題') : '無題'),
      content: row.content || '',
      color: row.color || 'gray',
      fontSize: row.font_size || 16,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      position: row.position || 0,
    }));
    renderList();
  }catch(e){ console.error(e); }
}

function subscribeCloudRealtime(){
  if(!currentUser || !window.sb) return;
  if(rtChannel){ try{ sb.removeChannel(rtChannel); }catch(_e){} rtChannel=null; }
  rtChannel = subscribeMemosRealtime(currentUser.id, () => { fetchAndRenderFromCloud(); });
}

async function bootstrapStorage(){
  if(!window.sb){ setTimeout(bootstrapStorage, 200); return; }
  try{
    const { data: sess } = await sb.auth.getSession();
    currentUser = sess?.session?.user ?? null;
    useCloud = !!currentUser;
    if(useCloud){ subscribeCloudRealtime(); await fetchAndRenderFromCloud(); }
    else { renderList(); }
  }catch(e){ console.error(e); renderList(); }
}

window.onSupabaseAuthState = (session) => {
  currentUser = session?.user ?? null;
  useCloud = !!currentUser;
  if(useCloud){ subscribeCloudRealtime(); fetchAndRenderFromCloud(); }
  else { renderList(); }
};

// ====== 要素参照 ======
const memoForm = document.getElementById('memoForm');
const memoId = document.getElementById('memoId');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const colorSelect = document.getElementById('color');
const fontSizeSelect = document.getElementById('fontSize');
const charCountSpan = document.getElementById('charCount');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryToggle = document.getElementById('summaryToggle');
const sortBySelect = document.getElementById('sortBy');
const memoList = document.getElementById('memoList');
const emptyNote = document.getElementById('emptyNote');
const formTitle = document.getElementById('form-title');
const editorCard = document.getElementById('editorCard');
const editorContainer = document.getElementById('editorContainer');

// Side panel
const sidePanel = document.getElementById('sidePanel');
const openPanelBtn = document.getElementById('openPanelBtn');
const closePanelBtn = document.getElementById('closePanelBtn');
const backdrop = document.getElementById('backdrop');

// ====== ユーティリティ ======
function formatDate(ts){const d=new Date(ts);const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');const hh=String(d.getHours()).padStart(2,'0');const mm=String(d.getMinutes()).padStart(2,'0');return `${y}/${m}/${day} ${hh}:${mm}`}
function colorClass(c){const v=['yellow','blue','green','pink','purple','gray'].includes(c)?c:'gray';return v}

// ====== 文字数カウント ======
function updateCharCount(){charCountSpan.textContent=contentInput.value.length.toString()}
contentInput?.addEventListener('input',updateCharCount);

// ====== 入力中文字サイズ反映 ======
function applyEditorFontSize(px){contentInput.style.fontSize=`${px}px`}
fontSizeSelect?.addEventListener('change',()=>{const px=parseInt(fontSizeSelect.value,10)||16;applyEditorFontSize(px)});

// ====== 色プレビュー（エディタ） ======
function applyEditorColorPreview(color){const c=colorClass(color);editorCard.classList.remove('color-yellow','color-blue','color-green','color-pink','color-purple','color-gray');editorCard.classList.add(`color-${c}`)}
colorSelect?.addEventListener('change',()=>applyEditorColorPreview(colorSelect.value));

// ====== エディタ高さボタン ======
document.querySelectorAll('[data-editor-height]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const mode=btn.getAttribute('data-editor-height');
    switch(mode){
      case 'small': contentInput.style.height='25vh'; break;
      case 'medium': contentInput.style.height='40vh'; break;
      case 'large': contentInput.style.height='70vh'; break;
    }
  });
});

// ====== フルスクリーン ======
const fullscreenBtn=document.getElementById('fullscreenBtn');
function isFullscreen(){return document.fullscreenElement!=null}
async function enterFS(){ if(editorContainer.requestFullscreen){await editorContainer.requestFullscreen();} }
async function exitFS(){ if(document.exitFullscreen){await document.exitFullscreen();} }
fullscreenBtn?.addEventListener('click',async()=>{
  try{ if(!isFullscreen()) await enterFS(); else await exitFS(); }
  catch(e){ editorContainer.classList.toggle('pseudo-fs'); }
});

// ====== フォーム操作 ======
function resetForm(){editingId=null;memoId.value='';titleInput.value='';contentInput.value='';colorSelect.value='yellow';fontSizeSelect.value='16';applyEditorFontSize(16);applyEditorColorPreview('yellow');updateCharCount();saveBtn.textContent='保存';formTitle.textContent='新規メモ'}
resetBtn?.addEventListener('click',resetForm);

memoForm?.addEventListener('submit',async(e)=>{e.preventDefault();const title=titleInput.value.trim();const content=contentInput.value;const color=colorSelect.value;const fontSize=parseInt(fontSizeSelect.value,10)||16;if(!title||!content){alert('タイトルと内容は必須です。');return}
  if(useCloud){
    try{
      if(editingId){ const { error } = await updateMemoCloud(editingId,{ title, content, color, font_size: fontSize }); if(error) return alert('更新に失敗: '+error.message); }
      else { const { error } = await addMemoCloud({ user_id: currentUser.id, title, content, color, font_size: fontSize }); if(error) return alert('保存に失敗しました: '+error.message); }
      resetForm(); await fetchAndRenderFromCloud();
    }catch(err){ console.error(err); alert('通信に失敗しました'); }
  }else{
    const now=Date.now();
    if(editingId){memos=memos.map(m=>m.id===editingId?{...m,title,content,color,fontSize,updatedAt:now}:m)}
    else{const maxPos=memos.length?Math.max(...memos.map(m=>m.position??0)):0;memos.push({id:uid(),title,content,color,fontSize,createdAt:now,updatedAt:now,position:maxPos+1})}
    saveMemos(memos);resetForm();renderList();
  }
});

// ====== 一覧表示 ======
function renderList(){const sortBy=sortBySelect.value;const summary=summaryToggle.checked;let list=[...memos];switch(sortBy){case 'updatedAt':list.sort((a,b)=>b.updatedAt-a.updatedAt);break;case 'createdAt':list.sort((a,b)=>b.createdAt-a.createdAt);break;case 'title':list.sort((a,b)=>a.title.localeCompare(b.title,'ja'));break;case 'color':list.sort((a,b)=>a.color.localeCompare(b.color,'ja'));break;case 'manual':default:list.sort((a,b)=>(a.position??0)-(b.position??0));break}
  memoList.innerHTML='';if(list.length===0){emptyNote.classList.remove('hidden');return}else{emptyNote.classList.add('hidden')}
  const manual=sortBy==='manual';
  list.forEach(m=>{const li=document.createElement('li');li.className=`memo-item ${colorClass(m.color)}`;li.dataset.id=m.id;li.title='長押ししてドラッグで並び替え';
    if(manual){li.draggable=true;li.addEventListener('dragstart',onDragStart);li.addEventListener('dragover',onDragOver);li.addEventListener('dragleave',onDragLeave);li.addEventListener('drop',onDrop);li.addEventListener('dragend',onDragEnd)}
    const handle=document.createElement('div');handle.className='handle';handle.textContent='⋮⋮';
    const main=document.createElement('div');main.className='memo-main';
    const title=document.createElement('h3');title.className='memo-title';title.textContent=m.title;
    const colorBadge=document.createElement('span');colorBadge.className='color-badge';const colorName={yellow:'黄色',blue:'青',green:'緑',pink:'ピンク',purple:'紫',gray:'グレー'}[colorClass(m.color)]||'グレー';colorBadge.textContent=`色: ${colorName}`;
    const content=document.createElement('p');content.className='memo-content';content.textContent=m.content;content.style.fontSize=`${m.fontSize||16}px`;
    const meta=document.createElement('div');meta.className='meta';meta.innerHTML=`<span class="badge">作成: ${formatDate(m.createdAt)}</span><span class="badge">更新: ${formatDate(m.updatedAt)}</span><span class="badge">文字数: ${m.content.length}</span><span class="badge">文字サイズ: ${m.fontSize||16}px</span>`;
    main.appendChild(title);main.appendChild(colorBadge);if(!summary){main.appendChild(content);main.appendChild(meta)}
    const controls=document.createElement('div');controls.className='controls';
    const editBtn=document.createElement('button');editBtn.className='btn';editBtn.textContent='編集';editBtn.addEventListener('click',()=>startEdit(m.id));
    const delBtn=document.createElement('button');delBtn.className='btn danger';delBtn.textContent='削除';delBtn.addEventListener('click',()=>deleteMemo(m.id));
    controls.appendChild(editBtn);controls.appendChild(delBtn);
    li.appendChild(handle);li.appendChild(main);li.appendChild(controls);
    memoList.appendChild(li)
  })
}

// ====== 編集/削除 ======
function startEdit(id){const m=memos.find(x=>x.id===id);if(!m)return;editingId=id;memoId.value=id;titleInput.value=m.title;contentInput.value=m.content;colorSelect.value=m.color;fontSizeSelect.value=String(m.fontSize||16);applyEditorFontSize(parseInt(fontSizeSelect.value,10)||16);applyEditorColorPreview(colorSelect.value);updateCharCount();saveBtn.textContent='更新';formTitle.textContent='メモを編集';window.scrollTo({top:0,behavior:'smooth'})}
async function deleteMemo(id){if(useCloud){const { error } = await deleteMemoCloud(id);if(error) alert('削除に失敗: '+error.message); else await fetchAndRenderFromCloud();} else {const m=memos.find(x=>x.id===id);if(!m)return;if(!confirm(`「${m.title}」を削除しますか？`))return;memos=memos.filter(x=>x.id!==id);saveMemos(memos);renderList();if(editingId===id)resetForm()}}

document.getElementById('deleteAllBtn')?.addEventListener('click', async ()=>{if(memos.length===0)return;if(!confirm('すべてのメモを削除します。よろしいですか？'))return; if(useCloud){ const { error } = await sb.from('memos').delete().eq('user_id', currentUser.id); if(error) alert('一括削除に失敗: ' + error.message); else { await fetchAndRenderFromCloud(); resetForm(); } } else { memos=[];saveMemos(memos);renderList();resetForm(); } });

// ====== 並び替え（ドラッグ＆ドロップ） ======
let dragSrcEl=null;
function onDragStart(e){dragSrcEl=this;this.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',this.dataset.id)}
function onDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';this.style.borderColor='#93c5fd'}
function onDragLeave(){this.style.borderColor='var(--border)'}
async function onDrop(e){e.stopPropagation();this.style.borderColor='var(--border)';const srcId=e.dataTransfer.getData('text/plain');const tgtId=this.dataset.id;if(!srcId||srcId===tgtId)return;const listEls=Array.from(memoList.children);const srcEl=listEls.find(li=>li.dataset.id===srcId);const tgtEl=listEls.find(li=>li.dataset.id===tgtId);const rect=this.getBoundingClientRect();const before=(e.clientY-rect.top)<rect.height/2;if(before){memoList.insertBefore(srcEl,tgtEl)}else{memoList.insertBefore(srcEl,tgtEl.nextSibling)}const orderedIds=Array.from(memoList.children).map(li=>li.dataset.id);memos.forEach(m=>m.position=orderedIds.indexOf(m.id)+1);saveMemos(memos);/* if(useCloud){ for(const m of memos){ await sb.from('memos').update({position:m.position}).eq('id', m.id);} } */}
function onDragEnd(){this.classList.remove('dragging')}

sortBySelect?.addEventListener('change',renderList);
summaryToggle?.addEventListener('change',renderList);

// ====== サイドパネル開閉 & スワイプ ======
function openPanel(){sidePanel.classList.add('open');openPanelBtn?.setAttribute('aria-expanded','true');backdrop.hidden=false;sidePanel.setAttribute('aria-hidden','false')}
function closePanel(){sidePanel.classList.remove('open');openPanelBtn?.setAttribute('aria-expanded','false');backdrop.hidden=true;sidePanel.setAttribute('aria-hidden','true')}
openPanelBtn?.addEventListener('click',openPanel);
closePanelBtn?.addEventListener('click',closePanel);
backdrop?.addEventListener('click',closePanel);

let touchStartX=null,touchStartY=null,trackingEdge=false;
window.addEventListener('touchstart',(e)=>{const t=e.touches[0];touchStartX=t.clientX; touchStartY=t.clientY;trackingEdge = (!sidePanel.classList.contains('open') && (window.innerWidth - touchStartX) < 24);},{passive:true});
window.addEventListener('touchmove',(e)=>{if(touchStartX==null) return;const t=e.touches[0];const dx=t.clientX - touchStartX; const dy=Math.abs(t.clientY - touchStartY);if(trackingEdge && Math.abs(dx) > 40 && dy < 40){ if(dx < -40){ openPanel(); touchStartX = null; trackingEdge=false; } }},{passive:true});
sidePanel.addEventListener('touchstart',(e)=>{const t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY;},{passive:true});
sidePanel.addEventListener('touchmove',(e)=>{if(touchStartX==null) return;const t=e.touches[0]; const dx=t.clientX - touchStartX; const dy=Math.abs(t.clientY - touchStartY); if(Math.abs(dx) > 40 && dy < 40){ if(dx > 40){ closePanel(); touchStartX=null; } }},{passive:true});

// ====== 初期化 ======
function initEditorHeights(){contentInput.style.height='40vh'}
function init(){resetForm();renderList();initEditorHeights();}
init();
(function waitAndBootstrap(){ if(document.readyState === 'complete'){ bootstrapStorage(); } else { window.addEventListener('load', bootstrapStorage, { once:true }); } })();
