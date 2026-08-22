// assets/dashboard.js - client-side dashboard functionality (collections, play and download)
(function(){
  // Extended anime data with video URLs (public sample video used for demo)
  const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
  const ANIME = [
    {id:1,title:'Starlight Samurai',year:2023,episodes:12,score:8.6,genres:['Action','Sci-Fi'],synopsis:'A mech pilot fights to save a floating city.',img:'https://placehold.co/400x240/1b1330/ff7ab6?text=Starlight+Samurai',video:SAMPLE_VIDEO},
    {id:2,title:'Cherry Blossom Promises',year:2021,episodes:24,score:8.2,genres:['Romance','Slice of Life'],synopsis:'Two childhood friends rediscover each other across seasons.',img:'https://placehold.co/400x240/111427/ffd9ee?text=Cherry+Blossom',video:SAMPLE_VIDEO},
    {id:3,title:'Neon Nights: Tokyo Drift',year:2024,episodes:10,score:8.9,genres:['Action','Sci-Fi'],synopsis:'Underground racers in a neon metropolis uncover conspiracy.',img:'https://placehold.co/400x240/0f1226/9ff7ff?text=Neon+Nights',video:SAMPLE_VIDEO},
    {id:4,title:'Kitsune Tales',year:2019,episodes:26,score:7.9,genres:['Fantasy','Slice of Life'],synopsis:'A young fox spirit learns about humans and friendship.',img:'https://placehold.co/400x240/2a1b3b/ffb3e0?text=Kitsune+Tales',video:SAMPLE_VIDEO},
    {id:5,title:'Samurai of the Dawn',year:2018,episodes:50,score:9.1,genres:['Action','Historical'],synopsis:'Epic period tale of honor and revenge.',img:'https://placehold.co/400x240/1d2633/ffd1e6?text=Samurai+of+Dawn',video:SAMPLE_VIDEO},
    {id:6,title:'Galactic Bakery',year:2022,episodes:12,score:7.5,genres:['Comedy','Slice of Life'],synopsis:'A bakery crew run a shop that serves aliens and humans alike.',img:'https://placehold.co/400x240/2b2e4a/ffd9a6?text=Galactic+Bakery',video:SAMPLE_VIDEO},
    {id:7,title:'Moonlit Academy',year:2025,episodes:13,score:8.7,genres:['Fantasy','Romance'],synopsis:'Students at a magical academy uncover a mystery.',img:'https://placehold.co/400x240/2b1f3c/ffd1f0?text=Moonlit+Academy',video:SAMPLE_VIDEO},
    {id:8,title:'Blade of the River',year:2016,episodes:26,score:8.8,genres:['Action','Historical'],synopsis:'Riverside ronin navigate politics and war.',img:'https://placehold.co/400x240/102233/ffd9b3?text=Blade+of+the+River',video:SAMPLE_VIDEO},
    {id:9,title:'Solar Drift',year:2020,episodes:12,score:8.0,genres:['Sci-Fi','Action'],synopsis:'A salvage team drifts into a solar mystery.',img:'https://placehold.co/400x240/001122/9ff7ff?text=Solar+Drift',video:SAMPLE_VIDEO},
  ];

  // Helper selectors
  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));

  function getCurrent(){ return JSON.parse(localStorage.getItem('li_current') || 'null'); }
  function requireAuth(){ const cur=getCurrent(); if(!cur){ window.location.href='login.html'; return null;} return cur; }

  // Renderers
  function renderGrid(target, list){
    const el = document.getElementById(target); if(!el) return;
    el.innerHTML = '';
    list.forEach(a => {
      const d = document.createElement('div'); d.className='anime-card';
      d.innerHTML = `<img src="${a.img}" alt="${a.title}"><div class="meta"><h3>${a.title}</h3><p>${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><div class="btn-row"><button class="btn" data-id="${a.id}" data-action="details">Details</button><button class="btn-plain" data-id="${a.id}" data-action="watch">Add to Watchlist</button></div></div><div class="overlay-controls"><button class="play-btn" data-action="play" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3v18l15-9L5 3z" fill="#081026"/></svg>Play</button><button class="download-btn" data-action="download" data-id="${a.id}"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v10" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11l4 4 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21H3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Download</button></div>`;
      el.appendChild(d);
    });
  }

  function renderBrowse(){ renderGrid('browseGrid', ANIME); renderGrid('newReleases', ANIME.slice(0,4)); renderGrid('classics', ANIME.slice(4,7)); renderGrid('topPicks', ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4)); renderGrid('trending', ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4)); renderGrid('recommended', ANIME.filter(x=>x.genres.includes('Romance')).slice(0,4)); }

  // watchlist/favorites
  function getList(key){ const raw = JSON.parse(localStorage.getItem(key) || '[]'); if(key==='li_watchlist' && raw.length && typeof raw[0] === 'number'){ const migrated = raw.map(id=>({id,progress:0,notes:''})); localStorage.setItem(key, JSON.stringify(migrated)); return migrated; } return raw; }
  function saveList(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  function renderWatchlist(){ const list = getList('li_watchlist'); const el = $('#watchlist'); if(!el) return; el.innerHTML=''; if(!list.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">Your watchlist is empty.</div>'; return; } list.forEach(entry=>{ const a = ANIME.find(x=>x.id===entry.id); if(!a) return; const div = document.createElement('div'); div.className='mini card'; div.style.marginBottom='8px'; div.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img src="${a.img}" style="width:80px;height:56px;object-fit:cover;border-radius:6px"><div style="flex:1"><strong>${a.title}</strong><div style="font-size:12px;color:var(--muted);margin-top:6px">Progress: <input data-action="progress" data-id="${a.id}" type="range" min="0" max="100" value="${entry.progress||0}" style="vertical-align:middle"> <span class="prog-val" data-id="${a.id}">${entry.progress||0}%</span></div><div style="margin-top:8px"><textarea data-action="notes" data-id="${a.id}" placeholder="Notes" style="width:100%;height:56px;border-radius:6px;padding:8px">${entry.notes||''}</textarea></div></div><div style="margin-left:8px;display:flex;flex-direction:column;gap:6px"><button class="btn" data-action="details" data-id="${a.id}">Details</button><button class="btn-plain" data-action="remove-watch" data-id="${a.id}">Remove</button></div></div>`; el.appendChild(div); }); }

  function renderFavorites(){ const ids = getList('li_favorites'); const items = ANIME.filter(a=>ids.includes(a.id)); const el = $('#favorites'); if(!el) return; el.innerHTML=''; if(!items.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">No favorites yet.</div>'; return; } items.forEach(a=>{ const div=document.createElement('div'); div.className='mini'; div.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><img src="${a.img}" style="width:56px;height:36px;object-fit:cover;border-radius:6px"><div><strong>${a.title}</strong><div style="font-size:12px;color:var(--muted)">${a.year}</div></div></div>`; el.appendChild(div); }); }

  // details modal
  function openDetails(id){ const a = ANIME.find(x=>x.id==id); if(!a) return; const modal = $('#modal'); const content = document.getElementById('modalContent'); const wl = getList('li_watchlist'); const entry = wl.find(x=>x.id===a.id) || {id:a.id,progress:0,notes:''}; content.innerHTML = `<div class="modal-content"><img src="${a.img}"><h2 style="color:var(--accent)">${a.title}</h2><p style="color:var(--muted)">${a.genres.join(' • ')} • ${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><p style="clear:left">${a.synopsis}</p><div style="margin-top:12px"><label>Progress: <input id="modalProgress" type="range" min="0" max="100" value="${entry.progress||0}"> <span id="modalProgVal">${entry.progress||0}%</span></label><div style="margin-top:8px"><textarea id="modalNotes" placeholder="Notes about this anime" style="width:100%;height:80px;border-radius:6px;padding:8px">${entry.notes||''}</textarea></div><div style="margin-top:10px;display:flex;gap:8px"><button id="modalSave" class="btn">Save to Watchlist</button><button id="modalFav" class="btn-plain">Favorite</button></div></div></div>`; modal.hidden=false; const mp=document.getElementById('modalProgress'); if(mp){ mp.addEventListener('input', e=>{ document.getElementById('modalProgVal').textContent = e.target.value + '%'; }); } const save=document.getElementById('modalSave'); if(save){ save.addEventListener('click', ()=>{ const progress = Number(document.getElementById('modalProgress').value); const notes = document.getElementById('modalNotes').value; addOrUpdateWatch(a.id, progress, notes); renderWatchlist(); closeModal(); }); } const fav=document.getElementById('modalFav'); if(fav){ fav.addEventListener('click', ()=>{ addFavorite(a.id); renderFavorites(); alert('Added to favorites'); }); } }
  function closeModal(){ const modal = $('#modal'); if(modal) modal.hidden = true; }

  // video player modal
  function openVideo(id){ const a = ANIME.find(x=>x.id==id); if(!a) return; const vm = document.getElementById('videoModal'); const player = document.getElementById('player'); vm.hidden=false; player.src = a.video || SAMPLE_VIDEO; player.currentTime = 0; player.play().catch(()=>{}); }
  function closeVideo(){ const vm=document.getElementById('videoModal'); const player=document.getElementById('player'); if(player){ try{ player.pause(); player.removeAttribute('src'); player.load(); }catch(e){} } if(vm) vm.hidden=true; }

  // download - fetch then save as blob to force download
  async function downloadAnime(id){ const a = ANIME.find(x=>x.id==id); if(!a) return alert('Asset not found'); const url = a.video || SAMPLE_VIDEO; try{ const resp = await fetch(url); if(!resp.ok) throw new Error('Network error'); const blob = await resp.blob(); const blobUrl = URL.createObjectURL(blob); const aEl = document.createElement('a'); aEl.href = blobUrl; aEl.download = `${a.title.replace(/[^a-z0-9]/gi,'_')}.mp4`; document.body.appendChild(aEl); aEl.click(); aEl.remove(); setTimeout(()=>URL.revokeObjectURL(blobUrl), 60000); }catch(err){ alert('Download failed: '+err.message); } }

  // interactions
  document.addEventListener('click', e=>{ const t = e.target; const action = t.getAttribute && t.getAttribute('data-action'); if(action==='details') openDetails(Number(t.getAttribute('data-id'))); if(action==='watch'){ const id=Number(t.getAttribute('data-id')); addOrUpdateWatch(id,0,''); renderWatchlist(); t.textContent='Added'; } if(action==='remove-watch'){ const id=Number(t.getAttribute('data-id')); const list=getList('li_watchlist').filter(x=>x.id!==id); saveList('li_watchlist',list); renderWatchlist(); renderBrowse(); } if(action==='fav'){ const id=Number(t.getAttribute('data-id')); addFavorite(id); renderFavorites(); alert('Added to favorites'); } if(action==='play'){ openVideo(Number(t.getAttribute('data-id'))); } if(action==='download'){ downloadAnime(Number(t.getAttribute('data-id'))); } });

  document.addEventListener('input', e=>{ const t=e.target; const action=t.getAttribute && t.getAttribute('data-action'); if(action==='progress'){ const id=Number(t.getAttribute('data-id')); const list=getList('li_watchlist'); const item=list.find(x=>x.id===id); if(item){ item.progress=Number(t.value); saveList('li_watchlist',list); const span=document.querySelector('.prog-val[data-id="'+id+'"]'); if(span) span.textContent = item.progress + '%'; } } if(action==='notes'){ const id=Number(t.getAttribute('data-id')); const list=getList('li_watchlist'); const item=list.find(x=>x.id===id); if(item){ item.notes=t.value; saveList('li_watchlist',list); } } });

  // modal controls and fallbacks
  function bindModalControls(){ const modalClose = document.getElementById('modalClose'); const modal = document.getElementById('modal'); if(modalClose) modalClose.addEventListener('click', closeModal); if(modal) modal.addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); }); const vmc = document.getElementById('videoClose'); const vm = document.getElementById('videoModal'); if(vmc) vmc.addEventListener('click', closeVideo); if(vm) vm.addEventListener('click', e=>{ if(e.target.id==='videoModal') closeVideo(); }); document.addEventListener('touchstart', function(e){ const m=document.getElementById('modal'); const v=document.getElementById('videoModal'); if(m && !m.hidden){ const inner=document.querySelector('.modal-inner'); if(inner && !inner.contains(e.target)) closeModal(); } if(v && !v.hidden){ const inner=document.querySelector('#videoModal .modal-inner'); if(inner && !inner.contains(e.target)) closeVideo(); } },{passive:true}); document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeModal(); closeVideo(); } }); }

  // helpers
  function addOrUpdateWatch(id,progress,notes){ const list=getList('li_watchlist'); const existing=list.find(x=>x.id===id); if(existing){ existing.progress=progress||existing.progress; existing.notes=notes!==undefined?notes:existing.notes; } else list.push({id,progress:progress||0,notes:notes||''}); saveList('li_watchlist',list); }
  function addFavorite(id){ const list=getList('li_favorites'); if(!list.includes(id)) list.push(id); saveList('li_favorites',list); }

  // init
  (function init(){ bindModalControls(); const cur=requireAuth(); if(!cur) return; $('#greeting').textContent = `Welcome, ${cur.username}`; $('#subGreeting').textContent = `Browse anime, watch trailers and download sample clips.`; renderBrowse(); renderWatchlist(); renderFavorites(); })();

})();
