
// ====== データ層（ローカル） ======
var STORAGE_KEY='memos_v1';
function loadMemos(){try{var raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):[]}catch(e){console.error('Failed to load memos:',e);return[]}}
function saveMemos(m){localStorage.setItem(STORAGE_KEY,JSON.stringify(m))}
function uid(){return 'm_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

// ====== 状態 ======
var memos=loadMemos();
var editingId=null;
var useCloud=false;var currentUser=null;var rtChannel=null;

// ====== 要素 ======
var memoForm=document.getElementById('memoForm');
var memoId=document.getElementById('memoId');
var titleInput=document.getElementById('title');
var contentInput=document.getElementById('content');
var colorSelect=document.getElementById('color');
var fontSizeSelect=document.getElementById('fontSize');
var charCountSpan=document.getElementById('charCount');
var saveBtn=document.getElementById('saveBtn');
var resetBtn=document.getElementById('resetBtn');
var summaryToggle=document.getElementById('summaryToggle');
var sortBySelect=document.getElementById('sortBy');
var memoList=document.getElementById('memoList');
var emptyNote=document.getElementById('emptyNote');
var formTitle=document.getElementById('form-title');
var editorCard=document.getElementById('editorCard');
var editorContainer=document.getElementById('editorContainer');
var sidePanel=document.getElementById('sidePanel');
var openPanelBtn=document.getElementById('openPanelBtn');
var closePanelBtn=document.getElementById('closePanelBtn');
var backdrop=document.getElementById('backdrop');
var mainWrapper=document.getElementById('mainWrapper');

// ====== ユーティリティ ======
function pad2(n){return(n<10?'0':'')+n}
function formatDate(ts){var d=new Date(ts);var y=d.getFullYear();var m=pad2(d.getMonth()+1);var day=pad2(d.getDate());var hh=pad2(d.getHours());var mm=pad2(d.getMinutes());return y+'/'+m+'/'+day+' '+hh+':'+mm}
function colorClass(c){var a={'yellow':1,'blue':1,'green':1,'pink':1,'purple':1,'gray':1};return a[c]?c:'gray'}

// ====== 文字数カウント ======
function updateCharCount(){ if(charCountSpan&&contentInput){ charCountSpan.textContent=String(contentInput.value.length); } }
if(contentInput){ contentInput.addEventListener('input',updateCharCount); }

// ====== 入力中文字サイズ反映 ======
function applyEditorFontSize(px){ if(contentInput){ contentInput.style.fontSize=String(px)+'px'; } }
if(fontSizeSelect){ fontSizeSelect.addEventListener('change',function(){ var px=parseInt(fontSizeSelect.value,10)||16; applyEditorFontSize(px); }); }

// ====== 色プレビュー（エディタ） ======
function applyEditorColorPreview(color){ if(!editorCard) return; var c=colorClass(color); editorCard.classList.remove('color-yellow','color-blue','color-green','color-pink','color-purple','color-gray'); editorCard.classList.add('color-'+c); }
if(colorSelect){ colorSelect.addEventListener('change',function(){ applyEditorColorPreview(colorSelect.value); }); }

// ====== エディタ高さボタン ======
var heightBtns=document.querySelectorAll('[data-editor-height]');
for(var i=0;i<heightBtns.length;i++){
  heightBtns[i].addEventListener('click',function(){
    var mode=this.getAttribute('data-editor-height');
    if(mode==='small') contentInput.style.height='25vh';
    else if(mode==='medium') contentInput.style.height='40vh';
    else if(mode==='large') contentInput.style.height='70vh';
  });
}

// ====== フルスクリーン ======
var fullscreenBtn=document.getElementById('fullscreenBtn');
function isFullscreen(){return document.fullscreenElement!=null}
function enterFS(){ if(editorContainer&&editorContainer.requestFullscreen){ return editorContainer.requestFullscreen(); } }
function exitFS(){ if(document.exitFullscreen){ return document.exitFullscreen(); } }
if(fullscreenBtn){ fullscreenBtn.addEventListener('click',function(){ try{ if(!isFullscreen()) enterFS(); else exitFS(); } catch(e){ if(editorContainer) editorContainer.classList.toggle('pseudo-fs'); } }); }

// ====== Cloud / Local 切替 ======
function fetchAndRenderFromCloud(){ if(!currentUser) return Promise.resolve(); return fetchMemosCloud(currentUser.id).then(function(res){ var data=res&&res.data; var error=res&&res.error; if(error){ console.error(error); return; } memos=(data||[]).map(function(row){ return { id:row.id, title: row.title || (row.content?(row.content.split('
')[0].slice(0,30)||'無題'):'無題'), content: row.content||'', color: row.color||'gray', fontSize: row.font_size||16, createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(), updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(), position: row.position||0 }; }); renderList(); }).catch(function(e){ console.error(e); }); }
function subscribeCloudRealtime(){ if(!currentUser||!window.sb) return; if(rtChannel){ try{ sb.removeChannel(rtChannel);}catch(e){} rtChannel=null; } rtChannel=subscribeMemosRealtime(currentUser.id,function(){ fetchAndRenderFromCloud(); }); }
function bootstrapStorage(){ if(!window.sb){ setTimeout(bootstrapStorage,200); return; } sb.auth.getSession().then(function(resp){ var sess=resp&&resp.data; sess=sess&&sess.session; currentUser=(sess&&sess.user)?sess.user:null; useCloud=!!currentUser; if(useCloud){ subscribeCloudRealtime(); fetchAndRenderFromCloud(); } else { renderList(); } }).catch(function(e){ console.error(e); renderList(); }); }
window.onSupabaseAuthState=function(session){ currentUser=(session&&session.user)?session.user:null; useCloud=!!currentUser; if(useCloud){ subscribeCloudRealtime(); fetchAndRenderFromCloud(); } else { renderList(); } };

// ====== フォーム操作 ======
function resetForm(){ editingId=null; if(!memoId) return; memoId.value=''; if(titleInput) titleInput.value=''; if(contentInput) contentInput.value=''; if(colorSelect) colorSelect.value='yellow'; if(fontSizeSelect) fontSizeSelect.value='16'; applyEditorFontSize(16); applyEditorColorPreview('yellow'); updateCharCount(); if(saveBtn) saveBtn.textContent='保存'; if(formTitle) formTitle.textContent='新規メモ'; }
if(resetBtn){ resetBtn.addEventListener('click',resetForm); }
if(saveBtn){
  // iOS Safari: タップずれ対策
  saveBtn.addEventListener('touchstart', function(){ saveBtn.click(); });
}
if(memoForm){ memoForm.addEventListener('submit',function(e){ e.preventDefault(); var title=titleInput.value.trim(); var content=contentInput.value; var color=colorSelect.value; var fontSize=parseInt(fontSizeSelect.value,10)||16; if(!title||!content){ alert('タイトルと内容は必須です。'); return; }
  if(contentInput){ contentInput.blur(); } // iOSレイアウト安定化
  if(useCloud){ if(editingId){ updateMemoCloud(editingId,{ title:title, content:content, color:color, font_size: fontSize }).then(function(r){ if(r&&r.error) alert('更新に失敗: '+r.error.message); else { resetForm(); fetchAndRenderFromCloud(); } }); } else { addMemoCloud({ user_id: currentUser.id, title:title, content:content, color:color, font_size: fontSize }).then(function(r){ if(r&&r.error) alert('保存に失敗しました: '+r.error.message); else { resetForm(); fetchAndRenderFromCloud(); } }); } } else { var now=Date.now(); if(editingId){ for(var i=0;i<memos.length;i++){ if(memos[i].id===editingId){ memos[i].title=title; memos[i].content=content; memos[i].color=color; memos[i].fontSize=fontSize; memos[i].updatedAt=now; break; } } } else { var maxPos=memos.length?Math.max.apply(null, memos.map(function(m){return m.position||0;})):0; memos.push({ id:uid(), title:title, content:content, color:color, fontSize:fontSize, createdAt:now, updatedAt:now, position:maxPos+1 }); } saveMemos(memos); resetForm(); renderList(); }
}); }

// ====== 一覧表示 ======
function renderList(){ if(!sortBySelect||!summaryToggle||!memoList||!emptyNote) return; var sortBy=sortBySelect.value; var summary=summaryToggle.checked; var list=memos.slice(); if(sortBy==='updatedAt'){ list.sort(function(a,b){return b.updatedAt-a.updatedAt}); } else if(sortBy==='createdAt'){ list.sort(function(a,b){return b.createdAt-a.createdAt}); } else if(sortBy==='title'){ list.sort(function(a,b){return a.title.localeCompare(b.title,'ja')}); } else if(sortBy==='color'){ list.sort(function(a,b){return a.color.localeCompare(b.color,'ja')}); } else { list.sort(function(a,b){return (a.position||0)-(b.position||0)}); }
  memoList.innerHTML=''; if(list.length===0){ emptyNote.classList.remove('hidden'); return; } else { emptyNote.classList.add('hidden'); }
  var manual=(sortBy==='manual');
  for(var i=0;i<list.length;i++){
    var m=list[i];
    var li=document.createElement('li'); li.className='memo-item '+colorClass(m.color); li.dataset.id=m.id; li.title='長押ししてドラッグで並び替え';
    if(manual){ li.draggable=true; li.addEventListener('dragstart',onDragStart); li.addEventListener('dragover',onDragOver); li.addEventListener('dragleave',onDragLeave); li.addEventListener('drop',onDrop); li.addEventListener('dragend',onDragEnd); }
    var handle=document.createElement('div'); handle.className='handle'; handle.textContent='⋮⋮';
    var main=document.createElement('div'); main.className='memo-main';
    var title=document.createElement('h3'); title.className='memo-title'; title.textContent=m.title;
    var colorBadge=document.createElement('span'); colorBadge.className='color-badge'; var colorName={'yellow':'黄色','blue':'青','green':'緑','pink':'ピンク','purple':'紫','gray':'グレー'}[colorClass(m.color)]||'グレー'; colorBadge.textContent='色: '+colorName;
    var content=document.createElement('p'); content.className='memo-content'; content.textContent=m.content; content.style.fontSize=String(m.fontSize||16)+'px';
    var meta=document.createElement('div'); meta.className='meta'; meta.innerHTML='<span class="badge">作成: '+formatDate(m.createdAt)+'</span><span class="badge">更新: '+formatDate(m.updatedAt)+'</span><span class="badge">文字数: '+m.content.length+'</span><span class="badge">文字サイズ: '+(m.fontSize||16)+'px</span>';
    main.appendChild(title); main.appendChild(colorBadge); if(!summary){ main.appendChild(content); main.appendChild(meta); }
    var controls=document.createElement('div'); controls.className='controls';
    var editBtn=document.createElement('button'); editBtn.className='btn'; editBtn.textContent='編集'; editBtn.addEventListener('click', (function(id){ return function(){ startEdit(id); };})(m.id));
    var delBtn=document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='削除'; delBtn.addEventListener('click', (function(id){ return function(){ deleteMemo(id); };})(m.id));
    controls.appendChild(editBtn); controls.appendChild(delBtn);
    li.appendChild(handle); li.appendChild(main); li.appendChild(controls);
    memoList.appendChild(li);
  }
}

// ====== 編集/削除 ======
function startEdit(id){ var m=null; for(var i=0;i<memos.length;i++){ if(memos[i].id===id){ m=memos[i]; break; } } if(!m) return; editingId=id; memoId.value=id; titleInput.value=m.title; contentInput.value=m.content; colorSelect.value=m.color; fontSizeSelect.value=String(m.fontSize||16); applyEditorFontSize(parseInt(fontSizeSelect.value,10)||16); applyEditorColorPreview(colorSelect.value); updateCharCount(); saveBtn.textContent='更新'; formTitle.textContent='メモを編集'; window.scrollTo({top:0,behavior:'smooth'}); }
function deleteMemo(id){ if(useCloud){ deleteMemoCloud(id).then(function(r){ if(r&&r.error) alert('削除に失敗: '+r.error.message); else fetchAndRenderFromCloud(); }); } else { var m=null; for(var i=0;i<memos.length;i++){ if(memos[i].id===id){ m=memos[i]; break; } } if(!m) return; if(!confirm('「'+m.title+'」を削除しますか？')) return; memos=memos.filter(function(x){ return x.id!==id; }); saveMemos(memos); renderList(); if(editingId===id) resetForm(); } }
var deleteAllBtn=document.getElementById('deleteAllBtn');
if(deleteAllBtn){ deleteAllBtn.addEventListener('click', function(){ if(memos.length===0) return; if(!confirm('すべてのメモを削除します。よろしいですか？')) return; if(useCloud){ sb.from('memos').delete().eq('user_id', currentUser.id).then(function(r){ if(r&&r.error) alert('一括削除に失敗: '+r.error.message); else { fetchAndRenderFromCloud(); resetForm(); } }); } else { memos=[]; saveMemos(memos); renderList(); resetForm(); } }); }

// ====== 並び替え DnD（Safari対策） ======
var dragSrcEl=null;
function onDragStart(e){ e.preventDefault(); e.stopPropagation(); dragSrcEl=this; this.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', this.dataset.id); }
function onDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; this.style.borderColor='#93c5fd'; }
function onDragLeave(){ this.style.borderColor='var(--border)'; }
function onDrop(e){ e.stopPropagation(); this.style.borderColor='var(--border)'; var srcId=e.dataTransfer.getData('text/plain'); var tgtId=this.dataset.id; if(!srcId||srcId===tgtId) return; var listEls=Array.prototype.slice.call(memoList.children); var srcEl=null,tgtEl=null; for(var i=0;i<listEls.length;i++){ if(listEls[i].dataset.id===srcId) srcEl=listEls[i]; if(listEls[i].dataset.id===tgtId) tgtEl=listEls[i]; }
  var rect=this.getBoundingClientRect(); var before=(e.clientY-rect.top)<rect.height/2; if(before){ memoList.insertBefore(srcEl,tgtEl); } else { memoList.insertBefore(srcEl,tgtEl.nextSibling); } var orderedIds=Array.prototype.map.call(memoList.children,function(li){return li.dataset.id}); for(var j=0;j<memos.length;j++){ var m=memos[j]; m.position=orderedIds.indexOf(m.id)+1; } saveMemos(memos); }
function onDragEnd(){ this.classList.remove('dragging'); }

if(sortBySelect){ sortBySelect.addEventListener('change',renderList); }
if(summaryToggle){ summaryToggle.addEventListener('change',renderList); }

// ====== フルスクリーン・パネル操作（100% takeover） ======
function openPanel(){ sidePanel.classList.add('open'); if(backdrop) backdrop.hidden=false; if(openPanelBtn) openPanelBtn.setAttribute('aria-expanded','true'); sidePanel.setAttribute('aria-hidden','false'); if(mainWrapper){ mainWrapper.style.transform='translateX(-100%)'; } }
function closePanel(){ sidePanel.classList.remove('open'); if(backdrop) backdrop.hidden=true; if(openPanelBtn) openPanelBtn.setAttribute('aria-expanded','false'); sidePanel.setAttribute('aria-hidden','true'); if(mainWrapper){ mainWrapper.style.transform='translateX(0)'; } }
if(openPanelBtn){ openPanelBtn.addEventListener('click', openPanel); }
if(closePanelBtn){ closePanelBtn.addEventListener('click', closePanel); }
if(backdrop){ backdrop.addEventListener('click', closePanel); }

// スワイプ判定：
var touchStartX=null, touchStartY=null, trackingEdge=false;
window.addEventListener('touchstart', function(e){ var t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY; trackingEdge = (!sidePanel.classList.contains('open') && (window.innerWidth - touchStartX) < window.innerWidth * 0.30); }, {passive:true});
window.addEventListener('touchmove', function(e){ if(touchStartX==null) return; var t=e.touches[0]; var dx=t.clientX - touchStartX; var dy=Math.abs(t.clientY - touchStartY); if(trackingEdge && Math.abs(dx) > 40 && dy < 40){ if(dx < -40){ openPanel(); touchStartX=null; trackingEdge=false; } } }, {passive:true});
// 閉じる：左から右へスワイプ
sidePanel.addEventListener('touchstart', function(e){ var t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY; }, {passive:true});
sidePanel.addEventListener('touchmove', function(e){ if(touchStartX==null) return; var t=e.touches[0]; var dx=t.clientX - touchStartX; var dy=Math.abs(t.clientY - touchStartY); if(Math.abs(dx) > 40 && dy < 40){ if(dx > 40){ closePanel(); touchStartX=null; } } }, {passive:true});

// ====== 初期化 ======
function initEditorHeights(){ if(contentInput) contentInput.style.height='40vh'; }
function init(){ resetForm(); renderList(); initEditorHeights(); }
init();
(function(){ if(document.readyState==='complete'){ bootstrapStorage(); } else { window.addEventListener('load', bootstrapStorage, {once:true}); } })();
