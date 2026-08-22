// assets/dashboard.js - Comprehensive anime dashboard with full functionality
(function(){
  const DEFAULT_TITLES = [
    'Solo Leveling','Attack on Titan','Demon Slayer','Jujutsu Kaisen','One Piece','Chainsaw Man'
  ];

  // Built-in fallback to guarantee visible content when AniList/API is blocked or rate-limited
  const FALLBACK_ANIME = [
    { id: 100001, title: 'Attack on Titan', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Attack+on+Titan', genres: ['Action'], score: 9, trailer: null },
    { id: 100002, title: 'Fullmetal Alchemist: Brotherhood', img: 'https://placehold.co/320x180/111427/ff7ab6?text=FMA+B', genres: ['Adventure'], score: 9, trailer: null },
    { id: 100003, title: 'Death Note', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Death+Note', genres: ['Mystery'], score: 8, trailer: null },
    { id: 100004, title: 'Naruto', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Naruto', genres: ['Action'], score: 8, trailer: null },
    { id: 100005, title: 'Naruto: Shippuden', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Shippuden', genres: ['Action'], score: 8, trailer: null },
    { id: 100006, title: 'One Piece', img: 'https://placehold.co/320x180/111427/ff7ab6?text=One+Piece', genres: ['Adventure'], score: 8, trailer: null },
    { id: 100007, title: 'My Hero Academia', img: 'https://placehold.co/320x180/111427/ff7ab6?text=My+Hero', genres: ['Action'], score: 8, trailer: null },
    { id: 100008, title: 'Hunter x Hunter', img: 'https://placehold.co/320x180/111427/ff7ab6?text=HxH', genres: ['Adventure'], score: 8, trailer: null },
    { id: 100009, title: 'Demon Slayer', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Demon+Slayer', genres: ['Action'], score: 9, trailer: null },
    { id: 100010, title: 'Jujutsu Kaisen', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Jujutsu+Kaisen', genres: ['Action'], score: 8, trailer: null },
    { id: 100011, title: 'Spirited Away', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Spirited+Away', genres: ['Fantasy'], score: 9, trailer: null },
    { id: 100012, title: 'Cowboy Bebop', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Cowboy+Bebop', genres: ['Sci-Fi'], score: 9, trailer: null },
    { id: 100013, title: 'Steins;Gate', img: 'https://placehold.co/320x180/111427/ff7ab6?text=SteinsGate', genres: ['Sci-Fi'], score: 9, trailer: null },
    { id: 100014, title: 'Clannad', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Clannad', genres: ['Romance'], score: 8, trailer: null },
    { id: 100015, title: 'Your Lie in April', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Your+Lie+in+April', genres: ['Romance'], score: 8, trailer: null },
    { id: 100016, title: 'Code Geass', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Code+Geass', genres: ['Mecha'], score: 8, trailer: null },
    { id: 100017, title: 'Violet Evergarden', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Violet+Evergarden', genres: ['Drama'], score: 8, trailer: null },
    { id: 100018, title: 'Mob Psycho 100', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Mob+Psycho', genres: ['Action'], score: 8, trailer: null },
    { id: 100019, title: 'Sword Art Online', img: 'https://placehold.co/320x180/111427/ff7ab6?text=SAO', genres: ['Sci-Fi'], score: 7, trailer: null },
    { id: 100020, title: 'Haikyuu!!', img: 'https://placehold.co/320x180/111427/ff7ab6?text=Haikyuu', genres: ['Sports'], score: 8, trailer: null }
  ];

  const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));

  function getCurrent(){ return JSON.parse(localStorage.getItem('li_current') || 'null'); }
  function requireAuth(){ const cur=getCurrent(); if(!cur){ window.location.href='login.html'; return null; } return cur; }

  async function fetchAniList(title){
    const query = `query ($search: String) { Media(search: $search, type: ANIME) { id title { romaji native english } coverImage { large medium } bannerImage description(asHtml: false) genres episodes averageScore trailer { id site } } }`;
    try{
      const resp = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search: title } })
      });
      if(!resp.ok) throw new Error('AniList request failed');
      const data = await resp.json();
      return data.data && data.data.Media ? data.data.Media : null;
    }catch(err){ console.warn('AniList fetch error for', title, err); return null; }
  }

  async function fetchCatalogPage(page, perPage){
    const query = `query ($page: Int, $perPage: Int) { Page(page: $page, perPage: $perPage) { media(type: ANIME, sort: POPULARITY_DESC) { id title { romaji english native } coverImage { large medium } bannerImage description(asHtml: false) genres episodes averageScore trailer { id site } } } }`;
    try{
      const resp = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { page, perPage } })
      });
      if(!resp.ok) throw new Error('AniList page fetch failed');
      const data = await resp.json();
      return data.data && data.data.Page && data.data.Page.media ? data.data.Page.media : [];
    }catch(err){ console.warn('fetchCatalogPage', err); return []; }
  }

  function cacheMeta(title, meta){ try{ const cache = JSON.parse(localStorage.getItem('li_meta_cache') || '{}'); cache[title] = { meta, ts: Date.now() }; localStorage.setItem('li_meta_cache', JSON.stringify(cache)); }catch(e){} }
  function getCachedMeta(title){ try{ const cache = JSON.parse(localStorage.getItem('li_meta_cache') || '{}'); const entry = cache[title]; if(!entry) return null; if(Date.now() - entry.ts > 24*60*60*1000) { delete cache[title]; localStorage.setItem('li_meta_cache', JSON.stringify(cache)); return null; } return entry.meta; }catch(e){ return null; } }

  function buildAnimeFromMeta(meta){ if(!meta) return null; return {
    id: meta.id,
    title: meta.title && (meta.title.english || meta.title.romaji || meta.title.native) || 'Unknown',
    img: (meta.coverImage && (meta.coverImage.large || meta.coverImage.medium)) || '',
    banner: meta.bannerImage || '',
    genres: meta.genres || [],
    score: meta.averageScore || 0,
    trailer: meta.trailer || null,
    description: meta.description || ''
  }; }

  function escapeHtml(text){ const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}; return text.replace(/[&<>"']/g, m => map[m]); }

  function renderCardHTML(a, showDownload){
    return `
      <div class="anime-card" data-anime-id="${a.id}">
        <div class="thumb-player" aria-hidden="true"></div>
        <img src="${a.img}" alt="${escapeHtml(a.title)}" loading="lazy" style="cursor:pointer;" />
        <div class="overlay-controls">
          ${showDownload?`<a class="download-btn" data-action="download" data-id="${a.id}" title="Download">⤓</a>`:''}
        </div>
        <div class="meta">
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml((a.genres||[]).slice(0,2).join(', '))} ${a.score ? '⭐ '+a.score : ''}</p>
          <div class="btn-row">
            <button class="btn btn-plain" data-action="details" data-id="${a.id}">Details</button>
            <button class="btn btn-plain" data-action="watchlist" data-id="${a.id}" title="Add to watchlist">📌</button>
            <button class="btn btn-plain" data-action="favorite" data-id="${a.id}" title="Add to favorites">❤️</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderGrid(target, list, showDownload=false){ 
    const el = document.getElementById(target); 
    if(!el) return; 
    el.innerHTML=''; 
    if(!list.length){ 
      el.innerHTML = '<div style="color:var(--muted); padding:20px; text-align:center;">No anime found</div>'; 
      return; 
    }
    list.forEach(a=>{ 
      const wrapper = document.createElement('div'); 
      wrapper.innerHTML = renderCardHTML(a, showDownload); 
      el.appendChild(wrapper.firstElementChild); 
    });
    attachCardEventListeners();
    initThumbnailPlayers();
  }

  function createThumbIframeForCard(card){ 
    try{
      const id = Number(card.dataset.animeId);
      const meta = APP_ANIME.find(x=>x.id===id);
      if(!meta || !meta.trailer || !meta.trailer.site) return;
      if((meta.trailer.site||'').toLowerCase() !== 'youtube') return;
      const tp = card.querySelector('.thumb-player'); 
      if(!tp) return;
      if(tp.querySelector('iframe')) return;

      tp.classList.add('active');
      const src = `https://www.youtube-nocookie.com/embed/${meta.trailer.id}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1`;
      const iframe = document.createElement('iframe');
      iframe.setAttribute('frameborder','0');
      iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
      iframe.style.width='100%'; 
      iframe.style.height='100%'; 
      iframe.style.border='0'; 
      iframe.style.pointerEvents='none';
      iframe.style.opacity = '0'; 
      iframe.style.transition = 'opacity .25s ease'; 
      iframe.style.background = 'transparent';

      let loaded = false;
      iframe.onload = function(){
        loaded = true;
        try{ iframe.style.opacity = '1'; const img = card.querySelector('img'); if(img){ img.style.transition = 'opacity .25s ease'; img.style.opacity = '0'; } }catch(e){}
      };

      const failTimeout = setTimeout(()=>{ if(!loaded){ try{ if(tp.contains(iframe)) tp.removeChild(iframe); tp.classList.remove('active'); }catch(e){} } }, 2500);

      tp.appendChild(iframe);
      iframe.src = src;

    }catch(e){ console.warn('createThumbIframeForCard',e);} 
  }

  function removeThumbIframeForCard(card){ 
    try{ 
      const tp = card.querySelector('.thumb-player'); 
      if(!tp) return; 
      const ifr = tp.querySelector('iframe'); 
      if(ifr) ifr.remove(); 
      tp.classList.remove('active');
      const img = card.querySelector('img'); 
      if(img){ img.style.opacity = '1'; } 
    }catch(e){} 
  }

  function initThumbnailPlayers(){ 
    const cards = document.querySelectorAll('.anime-card'); 
    cards.forEach(c=>{ 
      removeThumbIframeForCard(c); 
      createThumbIframeForCard(c); 
    }); 
  }

  async function fetchCatalog(targetCount){
    const perPage = 50;
    let page = 1;
    const collected = [];
    while(collected.length < targetCount && page <= 40){
      const medias = await fetchCatalogPage(page, perPage);
      if(!medias || !medias.length) break;
      medias.forEach(m => {
        const built = buildAnimeFromMeta(m);
        if(built) collected.push(built);
      });
      page++;
      await new Promise(r => setTimeout(r, 120));
    }
    return collected;
  }

  let APP_ANIME = [];
  
  async function loadDefaults(){
    const results = [];
    for(const t of DEFAULT_TITLES){
      const cached = getCachedMeta(t);
      if(cached){ results.push(buildAnimeFromMeta(cached)); continue; }
      try{ const meta = await fetchAniList(t); if(meta){ cacheMeta(t, meta); results.push(buildAnimeFromMeta(meta)); } }catch(e){ /* swallow */ }
    }
    APP_ANIME = results.filter(Boolean);

    if(!APP_ANIME.length){ APP_ANIME = FALLBACK_ANIME.slice(); }

    renderGrid('newReleases', APP_ANIME.slice(0,4));
    renderGrid('classics', APP_ANIME.slice(4,7));
    renderGrid('topPicks', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('trending', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('recommended', APP_ANIME.filter(x=>x.genres.map(g=>g.toLowerCase()).includes('romance')).slice(0,4));
    renderGrid('browseGrid', APP_ANIME, false);
    renderWatchlist(); 
    renderFavorites();

    (async function backgroundCatalog(){
      try{
        const TARGET = 1000;
        const catalog = await fetchCatalog(TARGET);
        if(catalog && catalog.length){
          const byId = new Map();
          APP_ANIME.forEach(a=> byId.set(a.id, a));
          catalog.forEach(a=>{ if(!byId.has(a.id)) byId.set(a.id, a); });
          const merged = Array.from(byId.values());
          APP_ANIME = merged;
          renderGrid('browseGrid', APP_ANIME, false);
          try{ renderGrid('trending', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4)); renderGrid('topPicks', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4)); }catch(e){}
        }
      }catch(e){ console.warn('backgroundCatalog', e); }
    })();
  }

  function getList(key){ try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ return []; } }
  function saveList(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  function renderWatchlist(){ 
    const list = getList('li_watchlist'); 
    const el = $('#watchlist'); 
    if(!el) return; 
    el.innerHTML=''; 
    if(!list.length){ 
      el.innerHTML = '<div class="empty-message">No items yet</div>'; 
      return; 
    }
    list.forEach(title=>{ 
      const div = document.createElement('div'); 
      div.className = 'watchlist-item'; 
      div.innerHTML = `<span>${escapeHtml(title)}</span><button data-remove-watchlist="${title}">✕</button>`; 
      el.appendChild(div); 
    });
  }

  function renderFavorites(){ 
    const list = getList('li_favorites'); 
    const el = $('#favorites'); 
    if(!el) return; 
    el.innerHTML=''; 
    if(!list.length){ 
      el.innerHTML = '<div class="empty-message">No items yet</div>'; 
      return; 
    }
    list.forEach(title=>{ 
      const div = document.createElement('div'); 
      div.className = 'favorite-item'; 
      div.innerHTML = `<span>${escapeHtml(title)}</span><button data-remove-favorite="${title}">✕</button>`; 
      el.appendChild(div); 
    });
  }

  function attachCardEventListeners(){
    document.addEventListener('click', e => {
      const card = e.target.closest('.anime-card');
      if(!card) return;

      const id = Number(card.dataset.animeId);
      const anime = APP_ANIME.find(a => a.id === id);
      if(!anime) return;

      // Click on image to show details/video
      if(e.target.tagName === 'IMG'){
        showDetailsModal(anime);
        return;
      }

      const action = e.target.dataset.action;
      if(action === 'details'){
        showDetailsModal(anime);
      } else if(action === 'watchlist'){
        const list = getList('li_watchlist');
        if(!list.includes(anime.title)){
          list.push(anime.title);
          saveList('li_watchlist', list);
          renderWatchlist();
        }
      } else if(action === 'favorite'){
        const list = getList('li_favorites');
        if(!list.includes(anime.title)){
          list.push(anime.title);
          saveList('li_favorites', list);
          renderFavorites();
        }
      } else if(action === 'download'){
        console.log('Download:', anime.title);
      }
    });

    document.addEventListener('click', e => {
      if(e.target.dataset.removeWatchlist){
        const title = e.target.dataset.removeWatchlist;
        let list = getList('li_watchlist');
        list = list.filter(t => t !== title);
        saveList('li_watchlist', list);
        renderWatchlist();
      }
      if(e.target.dataset.removeFavorite){
        const title = e.target.dataset.removeFavorite;
        let list = getList('li_favorites');
        list = list.filter(t => t !== title);
        saveList('li_favorites', list);
        renderFavorites();
      }
    });
  }

  function showDetailsModal(anime){
    const modal = $('#modal');
    const content = $('#modalContent');
    if(!modal || !content) return;

    let videoHTML = '';
    if(anime.trailer && anime.trailer.site && anime.trailer.site.toLowerCase() === 'youtube'){
      videoHTML = `<div style="margin-top:16px;"><button id="playVideoBtn" class="btn">▶ Play Trailer</button></div>`;
    }

    content.innerHTML = `
      <img src="${anime.img}" alt="${escapeHtml(anime.title)}" />
      <div>
        <h2>${escapeHtml(anime.title)}</h2>
        <p><strong>Genres:</strong> ${escapeHtml((anime.genres||[]).join(', '))}</p>
        <p><strong>Rating:</strong> ⭐ ${anime.score}/10</p>
        <p>${escapeHtml(anime.description||'No description available')}</p>
        ${videoHTML}
      </div>
    `;

    modal.hidden = false;

    const playBtn = content.querySelector('#playVideoBtn');
    if(playBtn){
      playBtn.addEventListener('click', () => showVideoModal(anime));
    }
  }

  function showVideoModal(anime){
    const videoModal = $('#videoModal');
    const playerFrame = $('#playerFrame');
    if(!videoModal || !playerFrame) return;

    const src = `https://www.youtube-nocookie.com/embed/${anime.trailer.id}?autoplay=1&mute=0&playsinline=1&controls=1`;
    playerFrame.src = src;
    videoModal.hidden = false;
  }

  // Initialize on page load
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init(){
    const user = requireAuth();
    if(!user) return;

    $('#greeting').textContent = `Welcome, ${escapeHtml(user.username)}!`;
    $('#profileCard').innerHTML = `<div>${escapeHtml(user.username)}</div><div style="font-size:12px;color:var(--muted);">${escapeHtml(user.email)}</div>`;

    // Logout
    $('#btnLogout').addEventListener('click', () => {
      localStorage.removeItem('li_current');
      window.location.href = 'login.html';
    });

    // Search
    $('#searchInput').addEventListener('input', e => {
      const query = e.target.value.toLowerCase();
      if(!query){
        renderGrid('browseGrid', APP_ANIME);
        return;
      }
      const results = APP_ANIME.filter(a => a.title.toLowerCase().includes(query) || a.genres.some(g => g.toLowerCase().includes(query)));
      renderGrid('browseGrid', results);
    });

    // Filter buttons
    document.querySelectorAll('.filters button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        if(filter === 'all'){
          renderGrid('browseGrid', APP_ANIME);
        } else {
          const filtered = APP_ANIME.filter(a => a.genres.map(g => g.toLowerCase()).includes(filter));
          renderGrid('browseGrid', filtered);
        }
      });
    });

    // Modal close handlers
    $('#modalClose').addEventListener('click', () => {
      $('#modal').hidden = true;
    });

    $('#videoClose').addEventListener('click', () => {
      $('#videoModal').hidden = true;
      $('#playerFrame').src = '';
    });

    // Close modals on background click
    $('#modal').addEventListener('click', e => {
      if(e.target.id === 'modal') $('#modal').hidden = true;
    });

    $('#videoModal').addEventListener('click', e => {
      if(e.target.id === 'videoModal') {
        $('#videoModal').hidden = true;
        $('#playerFrame').src = '';
      }
    });

    loadDefaults();
  }
})();
