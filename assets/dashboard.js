// assets/dashboard.js - add static fallback so UI always shows anime even if AniList/API blocked
// - FALLBACK_ANIME: small curated list with placeholder images so the dashboard is never empty
// - If initial AniList lookups fail, we fall back to FALLBACK_ANIME immediately

(function(){
  const DEFAULT_TITLES = [
    'Solo Leveling','Attack on Titan','Demon Slayer','Jujutsu Kaisen','One Piece','Chainsaw Man'
  ];

  // Built-in fallback to guarantee visible content when AniList/API is blocked or rate-limited
  const FALLBACK_ANIME = [
    { id: 100001, title: 'Attack on Titan', img:'https://placehold.co/320x180/111427/ff7ab6?text=Attack+on+Titan', genres:['Action'], score:0, trailer:{ site:'youtube', id:'MGRm4IzK1SQ' } },
    { id: 100002, title: 'Fullmetal Alchemist: Brotherhood', img:'https://placehold.co/320x180/111427/ff7ab6?text=FMA+B', genres:['Adventure'], score:0, trailer:{ site:'youtube', id:'dZ0a3m0ShtU' } },
    { id: 100003, title: 'Death Note', img:'https://placehold.co/320x180/111427/ff7ab6?text=Death+Note', genres:['Mystery'], score:0, trailer:{ site:'youtube', id:'N8fI2fZ6xk4' } },
    { id: 100004, title: 'Naruto', img:'https://placehold.co/320x180/111427/ff7ab6?text=Naruto', genres:['Action'], score:0, trailer:{ site:'youtube', id:'lL0j2H2m7mY' } },
    { id: 100005, title: 'Naruto: Shippuden', img:'https://placehold.co/320x180/111427/ff7ab6?text=Shippuden', genres:['Action'], score:0, trailer:{ site:'youtube', id:'z5S2fV1uF2s' } },
    { id: 100006, title: 'One Piece', img:'https://placehold.co/320x180/111427/ff7ab6?text=One+Piece', genres:['Adventure'], score:0, trailer:{ site:'youtube', id:'1Ew6rX1qG2M' } },
    { id: 100007, title: 'My Hero Academia', img:'https://placehold.co/320x180/111427/ff7ab6?text=My+Hero', genres:['Action'], score:0, trailer:{ site:'youtube', id:'6t5qE4ZfVvA' } },
    { id: 100008, title: 'Hunter x Hunter', img:'https://placehold.co/320x180/111427/ff7ab6?text=HxH', genres:['Adventure'], score:0, trailer:{ site:'youtube', id:'IrFv3qzYVyo' } },
    { id: 100009, title: 'Demon Slayer', img:'https://placehold.co/320x180/111427/ff7ab6?text=Demon+Slayer', genres:['Action'], score:0, trailer:{ site:'youtube', id:'VQGCKyvzIM4' } },
    { id: 100010, title: 'Jujutsu Kaisen', img:'https://placehold.co/320x180/111427/ff7ab6?text=Jujutsu+Kaisen', genres:['Action'], score:0, trailer:{ site:'youtube', id:'SXihh2mQ2f0' } },
    { id: 100011, title: 'Spirited Away', img:'https://placehold.co/320x180/111427/ff7ab6?text=Spirited+Away', genres:['Fantasy'], score:0, trailer:{ site:'youtube', id:'ByXuk9QqQkk' } },
    { id: 100012, title: 'Cowboy Bebop', img:'https://placehold.co/320x180/111427/ff7ab6?text=Cowboy+Bebop', genres:['Sci-Fi'], score:0, trailer:{ site:'youtube', id:'Q1c6Sx3gcpI' } },
    { id: 100013, title: 'Steins;Gate', img:'https://placehold.co/320x180/111427/ff7ab6?text=SteinsGate', genres:['Sci-Fi'], score:0, trailer:{ site:'youtube', id:'s1bXb2YmLhU' } },
    { id: 100014, title: 'Clannad', img:'https://placehold.co/320x180/111427/ff7ab6?text=Clannad', genres:['Romance'], score:0, trailer:{ site:'youtube', id:'z4f9r6Kf7J0' } },
    { id: 100015, title: 'Your Lie in April', img:'https://placehold.co/320x180/111427/ff7ab6?text=Your+Lie+in+April', genres:['Romance'], score:0, trailer:{ site:'youtube', id:'6M0w6Z2G8U4' } },
    { id: 100016, title: 'Code Geass', img:'https://placehold.co/320x180/111427/ff7ab6?text=Code+Geass', genres:['Mecha'], score:0, trailer:{ site:'youtube', id:'1k6zjYt3b3c' } },
    { id: 100017, title: 'Violet Evergarden', img:'https://placehold.co/320x180/111427/ff7ab6?text=Violet+Evergarden', genres:['Drama'], score:0, trailer:{ site:'youtube', id:'YB1yqQ2rKQk' } },
    { id: 100018, title: 'Mob Psycho 100', img:'https://placehold.co/320x180/111427/ff7ab6?text=Mob+Psycho', genres:['Action'], score:0, trailer:{ site:'youtube', id:'ZqGJpngdeTM' } },
    { id: 100019, title: 'Sword Art Online', img:'https://placehold.co/320x180/111427/ff7ab6?text=SAO', genres:['Sci-Fi'], score:0, trailer:{ site:'youtube', id:'Q2waD9YhF18' } },
    { id: 100020, title: 'Haikyuu!!', img:'https://placehold.co/320x180/111427/ff7ab6?text=Haikyuu', genres:['Sports'], score:0, trailer:{ site:'youtube', id:'h4Vr9G1x9z8' } }
  ];

  const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));

  function getCurrent(){ return JSON.parse(localStorage.getItem('li_current') || 'null'); }
  function requireAuth(){ const cur=getCurrent(); if(!cur){ window.location.href='login.html'; return null; } return cur; }

  async function fetchAniList(title){
    const query = `query ($search: String) { Media(search: $search, type: ANIME) { id title { romaji native english } coverImage { large medium } bannerImage description(asHtml: false) genres episodes duration averageScore format status siteUrl trailer { id site } } }`;
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
    const query = `query ($page: Int, $perPage: Int) { Page(page: $page, perPage: $perPage) { media(type: ANIME, sort: POPULARITY_DESC) { id title { romaji english native } coverImage { large medium } trailer { id site } averageScore genres } } }`;
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
  function getCachedMeta(title){ try{ const cache = JSON.parse(localStorage.getItem('li_meta_cache') || '{}'); const entry = cache[title]; if(!entry) return null; if(Date.now() - entry.ts > 24*60*60*1000) return null; return entry.meta; }catch(e){ return null; } }

  function buildAnimeFromMeta(meta){ if(!meta) return null; return {
    id: meta.id,
    title: meta.title && (meta.title.english || meta.title.romaji || meta.title.native) || 'Unknown',
    img: (meta.coverImage && (meta.coverImage.large || meta.coverImage.medium)) || '',
    banner: meta.bannerImage || '',
    genres: meta.genres || [],
    score: meta.averageScore || 0,
    trailer: meta.trailer || null
  }; }

  function renderCardHTML(a, showDownload){
    // poster image only; no play button. Tapping the image opens the modal player.
    return `
      <div class="anime-card" data-anime-id="${a.id}">
        <div class="thumb-player" aria-hidden="true"></div>
        <img src="${a.img}" alt="${escapeHtml(a.title)}" loading="lazy" />
        <div class="overlay-controls">
          ${showDownload?`<a class="download-btn" data-action="download" data-id="${a.id}" title="Download">⤓</a>`:''}
        </div>
        <div class="meta">
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml((a.genres||[]).slice(0,2).join(', '))}</p>
          <div class="btn-row">
            <button class="btn btn-plain" data-action="details" data-id="${a.id}">Details</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderGrid(target, list, showDownload=false){ const el = document.getElementById(target); if(!el) return; el.innerHTML=''; list.forEach(a=>{ const wrapper = document.createElement('div'); wrapper.innerHTML = renderCardHTML(a, showDownload); const node = wrapper.firstElementChild; node.dataset.animeId = a.id; el.appendChild(node); }); initThumbnailPlayers(); }

  function createThumbIframeForCard(card){ try{
      const id = Number(card.dataset.animeId);
      const meta = APP_ANIME.find(x=>x.id===id);
      if(!meta || !meta.trailer || !meta.trailer.site) return;
      if((meta.trailer.site||'').toLowerCase() !== 'youtube') return;
      const tp = card.querySelector('.thumb-player'); if(!tp) return;
      if(tp.querySelector('iframe')) return; // already present

      const src = `https://www.youtube-nocookie.com/embed/${meta.trailer.id}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1`;
      const iframe = document.createElement('iframe');
      iframe.setAttribute('frameborder','0');
      iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
      iframe.setAttribute('src','');
      iframe.style.width='100%'; iframe.style.height='100%'; iframe.style.border='0'; iframe.style.pointerEvents='none';
      iframe.style.opacity = '0'; iframe.style.transition = 'opacity .25s ease'; iframe.style.background = 'transparent';

      let loaded = false;
      iframe.onload = function(){
        loaded = true;
        try{ iframe.style.opacity = '1'; const img = card.querySelector('img'); if(img){ img.style.transition = 'opacity .25s ease'; img.style.opacity = '0'; } }catch(e){}
      };

      const failTimeout = setTimeout(()=>{ if(!loaded){ try{ if(tp.contains(iframe)) tp.removeChild(iframe); }catch(e){} } }, 2500);

      tp.appendChild(iframe);
      iframe.src = src;

    }catch(e){ console.warn('createThumbIframeForCard',e);} }

  function removeThumbIframeForCard(card){ try{ const tp = card.querySelector('.thumb-player'); if(!tp) return; const ifr = tp.querySelector('iframe'); if(ifr) ifr.remove(); const img = card.querySelector('img'); if(img){ img.style.opacity = '1'; } }catch(e){} }

  function initThumbnailPlayers(){ const cards = document.querySelectorAll('.anime-card'); cards.forEach(c=>{ removeThumbIframeForCard(c); createThumbIframeForCard(c); }); }

  // New: fetch catalog of anime titles (paginated) until at least TARGET_COUNT items collected
  async function fetchCatalog(targetCount){
    const perPage = 50; // AniList supports up to 50
    let page = 1;
    const collected = [];
    while(collected.length < targetCount && page <= 40){ // cap pages to avoid infinite loops (50*40=2000)
      const medias = await fetchCatalogPage(page, perPage);
      if(!medias || !medias.length) break;
      medias.forEach(m => {
        const built = buildAnimeFromMeta(m);
        if(built) collected.push(built);
      });
      page++;
      // small pause to be kind to API (and avoid being rate-limited)
      await new Promise(r => setTimeout(r, 120));
    }
    return collected;
  }

  let APP_ANIME = [];
  async function loadDefaults(){
    // FIRST: render a small default curated set immediately so the UI isn't empty
    const results = [];
    for(const t of DEFAULT_TITLES){
      const cached = getCachedMeta(t);
      if(cached){ results.push(buildAnimeFromMeta(cached)); continue; }
      try{ const meta = await fetchAniList(t); if(meta){ cacheMeta(t, meta); results.push(buildAnimeFromMeta(meta)); } }catch(e){ /* swallow */ }
    }
    APP_ANIME = results.filter(Boolean);

    // If AniList lookups failed and we have no items, use the built-in fallback immediately
    if(!APP_ANIME.length){ APP_ANIME = FALLBACK_ANIME.slice(); }

    // Render initial sections using the small set so the user sees content immediately
    renderGrid('newReleases', APP_ANIME.slice(0,4));
    renderGrid('classics', APP_ANIME.slice(4,7));
    renderGrid('topPicks', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('trending', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('recommended', APP_ANIME.filter(x=>x.genres.map(g=>g.toLowerCase()).includes('romance')).slice(0,4));
    renderGrid('browseGrid', APP_ANIME, false);
    renderWatchlist(); renderFavorites();

    // SECOND: in the background try to fetch a much larger catalog and merge it in when available
    (async function backgroundCatalog(){
      try{
        const TARGET = 1000;
        const catalog = await fetchCatalog(TARGET);
        if(catalog && catalog.length){
          // merge, de-duplicate by id, but keep initial APP_ANIME order at the front
          const byId = new Map();
          APP_ANIME.forEach(a=> byId.set(a.id, a));
          catalog.forEach(a=>{ if(!byId.has(a.id)) byId.set(a.id, a); });
          // rebuild APP_ANIME preserving existing front items
          const merged = Array.from(byId.values());
          APP_ANIME = merged;
          // refresh browse grid and other lists that rely on the larger catalog
          renderGrid('browseGrid', APP_ANIME, false);
          // Optionally update other collections with larger data
          try{ renderGrid('trending', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4)); renderGrid('topPicks', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4)); }catch(e){}
        }
      }catch(e){ console.warn('backgroundCatalog', e); }
    })();
  }

  function getList(key){ try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ return []; } }
  function saveList(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  function renderWatchlist(){ const list = getList('li_watchlist'); const el = $('#watchlist'); if(!el) return; el.innerHTML=''; if(!list.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">No items in watchlist</div>'; return; } list.forEach(id=>{ const a = APP_ANIME.find(x=>String(x.id)===String(id)); if(!a) return; const node = document.createElement('div'); node.textContent = a.title; el.appendChild(node); }); }
  function renderFavorites(){ const list = getList('li_favorites'); const el = $('#favorites'); if(!el) return; el.innerHTML=''; if(!list.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">No favorites yet</div>'; return; } list.forEach(id=>{ const a = APP_ANIME.find(x=>String(x.id)===String(id)); if(!a) return; const node = document.createElement('div'); node.textContent = a.title; el.appendChild(node); }); }

  // --- video modal open/close + unmute support ---
  function openVideoModalById(id){
    const meta = APP_ANIME.find(a => Number(a.id) === Number(id));
    if(!meta) return;
    const vm = document.getElementById('videoModal');
    const holder = document.getElementById('videoHolder');
    const pf = document.getElementById('playerFrame');
    const unmuteBtn = document.getElementById('unmuteBtn');

    // reset
    holder.innerHTML = '';
    if(pf) pf.src = '';
    if(pf) pf.style.display = 'block';
    if(unmuteBtn) unmuteBtn.style.display = 'none';

    if(meta.trailer && (meta.trailer.site||'').toLowerCase() === 'youtube' && meta.trailer.id){
      const src = `https://www.youtube-nocookie.com/embed/${meta.trailer.id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
      if(pf) pf.src = src;
      if(unmuteBtn) unmuteBtn.style.display = '';
    } else {
      const img = document.createElement('img');
      img.src = meta.img || '';
      img.alt = meta.title || '';
      img.style.width = '100%';
      img.style.height = '360px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      if(pf) pf.style.display = 'none';
      holder.appendChild(img);
    }

    if(vm) vm.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal(){
    const vm = document.getElementById('videoModal');
    const holder = document.getElementById('videoHolder');
    const pf = document.getElementById('playerFrame');
    const unmuteBtn = document.getElementById('unmuteBtn');
    if(pf){ pf.src = ''; pf.style.display = 'block'; }
    if(holder) holder.innerHTML = '';
    if(vm) vm.hidden = true;
    if(unmuteBtn) unmuteBtn.style.display = 'none';
    document.body.style.overflow = '';
  }

  function unmuteModalPlayer(){
    const pf = document.getElementById('playerFrame');
    if(!pf || !pf.src) return;
    let src = pf.src;
    src = src.replace(/([?&])mute=1(&|$)/, '$1mute=0$2');
    if(!/mute=/.test(src)) {
      src = src + (src.indexOf('?') === -1 ? '?' : '&') + 'mute=0';
    }
    pf.src = src + '&autoplay=1';
  }

  // Delegated click handling: open modal when poster/thumb clicked; close via close button or overlay
  document.addEventListener('click', function(e){
    const card = e.target.closest && e.target.closest('.anime-card');
    if(card && (e.target.closest('img') || e.target.closest('.thumb-player'))) {
      const id = card.dataset.animeId;
      if(id) openVideoModalById(id);
      return;
    }

    if(e.target && (e.target.id === 'videoClose' || e.target.id === 'modalClose')) {
      closeVideoModal();
      return;
    }
  });

  window.addEventListener('load', function(){
    const vm = document.getElementById('videoModal');
    if(vm) vm.addEventListener('click', function(e){
      if(e.target === vm) closeVideoModal();
    });
    const vc = document.getElementById('videoClose');
    if(vc) vc.addEventListener('click', closeVideoModal);
    const ub = document.getElementById('unmuteBtn');
    if(ub) ub.addEventListener('click', unmuteModalPlayer);

    // kick off defaults load
    try{ loadDefaults(); }catch(e){ console.warn('init loadDefaults', e); }
  });

})();
