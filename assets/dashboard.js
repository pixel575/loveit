// assets/dashboard.js - client-side demo dashboard functionality
(function(){
  // Sample anime data (demo). In a real app this would come from an API (Jikan/MAL/Tastedive etc.)
  const ANIME = [
    {id:1,title:'Starlight Samurai',year:2023,episodes:12,score:8.6,genres:['Action','Sci-Fi'],synopsis:'A mech pilot fights to save a floating city.',img:'https://placehold.co/400x240/1b1330/ff7ab6?text=Starlight+Samurai'},
    {id:2,title:'Cherry Blossom Promises',year:2021,episodes:24,score:8.2,genres:['Romance','Slice of Life'],synopsis:'Two childhood friends rediscover each other across seasons.',img:'https://placehold.co/400x240/111427/ffd9ee?text=Cherry+Blossom'},
    {id:3,title:'Neon Nights: Tokyo Drift',year:2024,episodes:10,score:8.9,genres:['Action','Sci-Fi'],synopsis:'Underground racers in a neon metropolis uncover conspiracy.',img:'https://placehold.co/400x240/0f1226/9ff7ff?text=Neon+Nights'},
    {id:4,title:'Kitsune Tales',year:2019,episodes:26,score:7.9,genres:['Fantasy','Slice of Life'],synopsis:'A young fox spirit learns about humans and friendship.',img:'https://placehold.co/400x240/2a1b3b/ffb3e0?text=Kitsune+Tales'},
    {id:5,title:'Samurai of the Dawn',year:2018,episodes:50,score:9.1,genres:['Action','Historical'],synopsis:'Epic period tale of honor and revenge.',img:'https://placehold.co/400x240/1d2633/ffd1e6?text=Samurai+of+Dawn'},
    {id:6,title:'Galactic Bakery',year:2022,episodes:12,score:7.5,genres:['Comedy','Slice of Life'],synopsis:'A bakery crew run a shop that serves aliens and humans alike.',img:'https://placehold.co/400x240/2b2e4a/ffd9a6?text=Galactic+Bakery'},
  ];

  // State helpers
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

  // render greeting and profile
  function renderProfile(){
    const cur = requireAuth();
    if(!cur) return;
    $('#greeting').textContent = `Welcome, ${cur.username}`;
    $('#subGreeting').textContent = `Browse new anime and manage your watchlist, ${cur.username}.`;
    const pc = document.getElementById('profileCard');
    pc.innerHTML = `<div style="font-weight:700;color:var(--accent)">${cur.username}</div><div style="color:var(--muted);font-size:13px">${cur.email}</div>`;
  }

  // storage for user lists
  function getList(key){
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  function saveList(key, arr){
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function renderGrid(target, list){
    const el = document.getElementById(target);
    el.innerHTML = '';
    list.forEach(a => {
      const d = document.createElement('div'); d.className='anime-card';
      d.innerHTML = `<img src="${a.img}" alt="${a.title}"><div class="meta"><h3>${a.title}</h3><p>${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><div class="btn-row"><button class="btn" data-id="${a.id}" data-action="details">Details</button><button class="btn-plain" data-id="${a.id}" data-action="watch">Watchlist</button></div></div>`;
      el.appendChild(d);
    });
  }

  function renderBrowse(){
    renderGrid('browseGrid', ANIME);
    renderGrid('trending', ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('recommended', ANIME.slice().filter(x=>x.genres.includes('Romance')).slice(0,4));
  }

  function renderWatchlist(){
    const ids = getList('li_watchlist');
    const items = ANIME.filter(a=>ids.includes(a.id));
    const el = $('#watchlist'); el.innerHTML='';
    items.forEach(a=>{const div=document.createElement('div');div.className='mini';div.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><img src="${a.img}" style="width:56px;height:36px;object-fit:cover;border-radius:6px"><div><strong>${a.title}</strong><div style="font-size:12px;color:var(--muted)">${a.year} • ⭐ ${a.score}</div></div><div style="margin-left:auto"><button class=btn data-id="${a.id}" data-action="remove-watch">Remove</button></div></div>`;el.appendChild(div);});
  }
  function renderFavorites(){
    const ids = getList('li_favorites');
    const items = ANIME.filter(a=>ids.includes(a.id));
    const el = $('#favorites'); el.innerHTML='';
    items.forEach(a=>{const div=document.createElement('div');div.className='mini';div.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><img src="${a.img}" style="width:56px;height:36px;object-fit:cover;border-radius:6px"><div><strong>${a.title}</strong><div style="font-size:12px;color:var(--muted)">${a.year}</div></div></div>`;el.appendChild(div);});
  }

  // modal
  function openDetails(id){
    const a = ANIME.find(x=>x.id==id);
    if(!a) return;
    const modal = $('#modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `<div class="modal-content"><img src="${a.img}"><h2 style="color:var(--accent)">${a.title}</h2><p style="color:var(--muted)">${a.genres.join(' • ')} • ${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><p style="clear:left">${a.synopsis}</p><div style="margin-top:12px"><button class="btn" data-id="${a.id}" data-action="fav">Favorite</button><button class="btn-plain" data-id="${a.id}" data-action="watch">Add to Watchlist</button></div></div>`;
    modal.hidden = false;
  }

  function closeModal(){
    $('#modal').hidden = true;
  }

  // interactions
  document.addEventListener('click', e=>{
    const t = e.target;
    const action = t.getAttribute('data-action');
    if(action==='details') openDetails(t.getAttribute('data-id'));
    if(action==='watch'){
      const id = Number(t.getAttribute('data-id'));
      const list = getList('li_watchlist');
      if(!list.includes(id)) list.push(id); else {
        // if clicked from watchlist buttons we may want to remove
      }
      saveList('li_watchlist', list);
      renderWatchlist();
      t.textContent = 'Added';
    }
    if(action==='remove-watch'){
      const id = Number(t.getAttribute('data-id'));
      const list = getList('li_watchlist').filter(x=>x!==id);
      saveList('li_watchlist', list);
      renderWatchlist();
      renderBrowse();
    }
    if(action==='fav'){
      const id = Number(t.getAttribute('data-id'));
      const list = getList('li_favorites');
      if(!list.includes(id)) list.push(id);
      saveList('li_favorites', list);
      renderFavorites();
      alert('Added to favorites');
    }
  });

  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });

  // search
  $('#searchInput').addEventListener('input', e=>{
    const q = e.target.value.trim().toLowerCase();
    if(!q){ renderBrowse(); return; }
    const res = ANIME.filter(a=> (a.title+ ' ' + a.genres.join(' ')).toLowerCase().includes(q) );
    renderGrid('browseGrid', res);
  });

  // filters
  $all('.filters button').forEach(btn=>btn.addEventListener('click', ()=>{
    const f = btn.getAttribute('data-filter');
    if(f==='all') renderGrid('browseGrid', ANIME);
    else renderGrid('browseGrid', ANIME.filter(a=>a.genres.map(g=>g.toLowerCase()).includes(f)));
  }));

  // logout
  $('#btnLogout').addEventListener('click', ()=>{
    localStorage.removeItem('li_current');
    window.location.href = 'login.html';
  });

  // require auth and initial render
  (function init(){
    const cur = requireAuth(); if(!cur) return;
    renderProfile();
    renderBrowse();
    renderWatchlist();
    renderFavorites();
  })();

})();
