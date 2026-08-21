// assets/dashboard.js - client-side dashboard functionality (updated modal fail-safes)
(function(){
  // Sample anime data
  const ANIME = [
    {id:1,title:'Starlight Samurai',year:2023,episodes:12,score:8.6,genres:['Action','Sci-Fi'],synopsis:'A mech pilot fights to save a floating city.',img:'https://placehold.co/400x240/1b1330/ff7ab6?text=Starlight+Samurai'},
    {id:2,title:'Cherry Blossom Promises',year:2021,episodes:24,score:8.2,genres:['Romance','Slice of Life'],synopsis:'Two childhood friends rediscover each other across seasons.',img:'https://placehold.co/400x240/111427/ffd9ee?text=Cherry+Blossom'},
    {id:3,title:'Neon Nights: Tokyo Drift',year:2024,episodes:10,score:8.9,genres:['Action','Sci-Fi'],synopsis:'Underground racers in a neon metropolis uncover conspiracy.',img:'https://placehold.co/400x240/0f1226/9ff7ff?text=Neon+Nights'},
    {id:4,title:'Kitsune Tales',year:2019,episodes:26,score:7.9,genres:['Fantasy','Slice of Life'],synopsis:'A young fox spirit learns about humans and friendship.',img:'https://placehold.co/400x240/2a1b3b/ffb3e0?text=Kitsune+Tales'},
    {id:5,title:'Samurai of the Dawn',year:2018,episodes:50,score:9.1,genres:['Action','Historical'],synopsis:'Epic period tale of honor and revenge.',img:'https://placehold.co/400x240/1d2633/ffd1e6?text=Samurai+of+Dawn'},
    {id:6,title:'Galactic Bakery',year:2022,episodes:12,score:7.5,genres:['Comedy','Slice of Life'],synopsis:'A bakery crew run a shop that serves aliens and humans alike.',img:'https://placehold.co/400x240/2b2e4a/ffd9a6?text=Galactic+Bakery'},
  ];

  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));

  function getCurrent(){
    return JSON.parse(localStorage.getItem('li_current') || 'null');
  }

  function requireAuth(){
    const cur = getCurrent();
    if(!cur){
      window.location.href = 'login.html';
      return null;
    }
    return cur;
  }

  function renderProfile(){
    const cur = requireAuth();
    if(!cur) return;
    $('#greeting').textContent = `Welcome, ${cur.username}`;
    $('#subGreeting').textContent = `Browse new anime and manage your watchlist, ${cur.username}.`;
    const pc = document.getElementById('profileCard');
    pc.innerHTML = `<div style="font-weight:700;color:var(--accent)">${cur.username}</div><div style="color:var(--muted);font-size:13px">${cur.email}</div>`;
  }

  function getList(key){
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    if(key==='li_watchlist' && raw.length && typeof raw[0] === 'number'){
      const migrated = raw.map(id=>({id,progress:0,notes:''}));
      localStorage.setItem(key, JSON.stringify(migrated));
      return migrated;
    }
    return raw;
  }
  function saveList(key, arr){
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function renderGrid(target, list){
    const el = document.getElementById(target);
    el.innerHTML = '';
    list.forEach(a => {
      const d = document.createElement('div'); d.className='anime-card';
      d.innerHTML = `<img src="${a.img}" alt="${a.title}"><div class="meta"><h3>${a.title}</h3><p>${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><div class="btn-row"><button class="btn" data-id="${a.id}" data-action="details">Details</button><button class="btn-plain" data-id="${a.id}" data-action="watch">Add to Watchlist</button></div></div>`;
      el.appendChild(d);
    });
  }

  function renderBrowse(){
    renderGrid('browseGrid', ANIME);
    renderGrid('trending', ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('recommended', ANIME.slice().filter(x=>x.genres.includes('Romance')).slice(0,4));
  }

  function renderWatchlist(){
    const list = getList('li_watchlist');
    const el = $('#watchlist'); el.innerHTML='';
    if(!list.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px">Your watchlist is empty.</div>'; return; }
    list.forEach(entry=>{
      const a = ANIME.find(x=>x.id===entry.id);
      if(!a) return;
      const div = document.createElement('div'); div.className='mini card';
      div.style.marginBottom='8px';
      div.innerHTML = `<div style="display:flex;gap:8px;align-items:center">
        <img src="${a.img}" style="width:80px;height:56px;object-fit:cover;border-radius:6px">
        <div style="flex:1">
          <strong>${a.title}</strong>
          <div style="font-size:12px;color:var(--muted);margin-top:6px">Progress: <input data-action="progress" data-id="${a.id}" type="range" min="0" max="100" value="${entry.progress||0}" style="vertical-align:middle"> <span class="prog-val" data-id="${a.id}">${entry.progress||0}%</span></div>
          <div style="margin-top:8px"><textarea data-action="notes" data-id="${a.id}" placeholder="Notes" style="width:100%;height:56px;border-radius:6px;padding:8px">${entry.notes||''}</textarea></div>
        </div>
        <div style="margin-left:8px;display:flex;flex-direction:column;gap:6px">
          <button class="btn" data-action="details" data-id="${a.id}">Details</button>
          <button class="btn-plain" data-action="remove-watch" data-id="${a.id}">Remove</button>
        </div>
      </div>`;
      el.appendChild(div);
    });
  }

  function renderFavorites(){
    const ids = getList('li_favorites');
    const items = ANIME.filter(a=>ids.includes(a.id));
    const el = $('#favorites'); el.innerHTML='';
    if(!items.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px">No favorites yet.</div>'; return; }
    items.forEach(a=>{const div=document.createElement('div');div.className='mini';div.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><img src="${a.img}" style="width:56px;height:36px;object-fit:cover;border-radius:6px"><div><strong>${a.title}</strong><div style="font-size:12px;color:var(--muted)">${a.year}</div></div></div>`;el.appendChild(div);});
  }

  // modal
  function openDetails(id){
    const a = ANIME.find(x=>x.id==id);
    if(!a) return;
    const modal = $('#modal');
    const content = document.getElementById('modalContent');
    const wl = getList('li_watchlist');
    const entry = wl.find(x=>x.id===a.id) || {id:a.id,progress:0,notes:''};
    content.innerHTML = `<div class="modal-content"><img src="${a.img}"><h2 style="color:var(--accent)">${a.title}</h2><p style="color:var(--muted)">${a.genres.join(' • ')} • ${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><p style="clear:left">${a.synopsis}</p>
      <div style="margin-top:12px">
        <label>Progress: <input id="modalProgress" type="range" min="0" max="100" value="${entry.progress||0}"> <span id="modalProgVal">${entry.progress||0}%</span></label>
        <div style="margin-top:8px"><textarea id="modalNotes" placeholder="Notes about this anime" style="width:100%;height:80px;border-radius:6px;padding:8px">${entry.notes||''}</textarea></div>
        <div style="margin-top:10px;display:flex;gap:8px"><button id="modalSave" class="btn">Save to Watchlist</button><button id="modalFav" class="btn-plain">Favorite</button></div>
      </div></div>`;
    // show modal
    modal.hidden = false;

    // wire modal controls (re-bind each time)
    const mp = document.getElementById('modalProgress');
    if(mp){ mp.addEventListener('input', e=>{ document.getElementById('modalProgVal').textContent = e.target.value + '%'; }); }
    const save = document.getElementById('modalSave');
    if(save){ save.addEventListener('click', ()=>{ const progress = Number(document.getElementById('modalProgress').value); const notes = document.getElementById('modalNotes').value; addOrUpdateWatch(a.id, progress, notes); renderWatchlist(); closeModal(); }); }
    const fav = document.getElementById('modalFav');
    if(fav){ fav.addEventListener('click', ()=>{ addFavorite(a.id); renderFavorites(); alert('Added to favorites'); }); }
  }

  function closeModal(){
    const modal = $('#modal');
    if(modal) modal.hidden = true;
  }

  // interactions
  document.addEventListener('click', e=>{
    const t = e.target;
    const action = t.getAttribute && t.getAttribute('data-action');
    if(action==='details') openDetails(Number(t.getAttribute('data-id')));
    if(action==='watch'){
      const id = Number(t.getAttribute('data-id'));
      addOrUpdateWatch(id,0,'');
      renderWatchlist();
      t.textContent = 'Added';
    }
    if(action==='remove-watch'){
      const id = Number(t.getAttribute('data-id'));
      const list = getList('li_watchlist').filter(x=>x.id!==id);
      saveList('li_watchlist', list);
      renderWatchlist();
      renderBrowse();
    }
    if(action==='fav'){
      const id = Number(t.getAttribute('data-id'));
      addFavorite(id);
      renderFavorites();
      alert('Added to favorites');
    }
  });

  // handle input changes for progress and notes
  document.addEventListener('input', e=>{
    const t = e.target;
    const action = t.getAttribute && t.getAttribute('data-action');
    if(action==='progress'){
      const id = Number(t.getAttribute('data-id'));
      const list = getList('li_watchlist');
      const item = list.find(x=>x.id===id);
      if(item){ item.progress = Number(t.value); saveList('li_watchlist',list); const span = document.querySelector('.prog-val[data-id="'+id+'"]'); if(span) span.textContent = item.progress + '%'; }
    }
    if(action==='notes'){
      const id = Number(t.getAttribute('data-id'));
      const list = getList('li_watchlist');
      const item = list.find(x=>x.id===id);
      if(item){ item.notes = t.value; saveList('li_watchlist',list); }
    }
  });

  // modal close bindings + failsafe handlers (added)
  function bindModalControls(){
    const modalClose = document.getElementById('modalClose');
    const modal = document.getElementById('modal');
    if(modalClose) modalClose.addEventListener('click', closeModal);
    if(modal) modal.addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });

    // global fallback: if user taps outside modal-inner, close (useful on mobile when hit targets misbehave)
    document.addEventListener('touchstart', function(e){
      const m = document.getElementById('modal');
      if(!m || m.hidden) return;
      const inner = document.querySelector('.modal-inner');
      if(inner && !inner.contains(e.target)) closeModal();
    }, {passive:true});

    // keyboard escape to close
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });

    // additionally allow a click outside modal-inner to close (desktop)
    document.addEventListener('click', function(e){
      const m = document.getElementById('modal');
      if(!m || m.hidden) return;
      const inner = document.querySelector('.modal-inner');
      if(inner && !inner.contains(e.target)) closeModal();
    });
  }

  // search and other handlers
  $('#searchInput') && $('#searchInput').addEventListener && $('#searchInput').addEventListener('input', e=>{
    const q = e.target.value.trim().toLowerCase();
    if(!q){ renderBrowse(); return; }
    const res = ANIME.filter(a=> (a.title+ ' ' + a.genres.join(' ')).toLowerCase().includes(q) );
    renderGrid('browseGrid', res);
  });

  $all('.filters button').forEach(btn=>btn.addEventListener('click', ()=>{
    const f = btn.getAttribute('data-filter');
    if(f==='all') renderGrid('browseGrid', ANIME);
    else renderGrid('browseGrid', ANIME.filter(a=>a.genres.map(g=>g.toLowerCase()).includes(f)));
  }));

  $('#btnLogout') && $('#btnLogout').addEventListener('click', ()=>{
    localStorage.removeItem('li_current');
    window.location.href = 'login.html';
  });

  function addOrUpdateWatch(id, progress, notes){
    const list = getList('li_watchlist');
    const existing = list.find(x=>x.id===id);
    if(existing){ existing.progress = progress || existing.progress; existing.notes = notes!==undefined?notes:existing.notes; }
    else list.push({id,progress:progress||0,notes:notes||''});
    saveList('li_watchlist', list);
  }
  function addFavorite(id){
    const list = getList('li_favorites');
    if(!list.includes(id)) list.push(id);
    saveList('li_favorites', list);
  }

  // init
  (function init(){
    bindModalControls();
    const cur = requireAuth(); if(!cur) return;
    renderProfile();
    renderBrowse();
    renderWatchlist();
    renderFavorites();
  })();

})();
