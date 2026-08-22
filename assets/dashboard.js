// assets/dashboard.js - updated: improved thumbnail behavior and robust YouTube embed handling
// - Thumbnails now show poster image by default
// - Muted autoplay iframe is created but kept hidden until it successfully loads to avoid black frames
// - Tapping the card (or play button) opens the larger video modal with unmuted playback
// - Fallback: if a trailer embed fails to load, poster remains visible

(function(){
  const DEFAULT_TITLES = [
    'Solo Leveling','Attack on Titan','Demon Slayer','Jujutsu Kaisen','One Piece','Chainsaw Man'
  ];
  const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));

  function getCurrent(){ return JSON.parse(localStorage.getItem('li_current') || 'null'); }
  function requireAuth(){ const cur=getCurrent(); if(!cur){ window.location.href='login.html'; return null; } return cur; }

  async function fetchAniList(title){
    const query = `query ($search: String) { Media(search: $search, type: ANIME) { id title { romaji native english } coverImage { large medium } bannerImage description(asHtml: false) genres episodes duration averageScore siteUrl trailer { id site } } }`;
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
    // Creates a consistent card structure used throughout the grids
    // data-action="play" on the play button and card image triggers openVideo
    return `
      <div class="anime-card" data-anime-id="${a.id}">
        <div class="thumb-player" aria-hidden="true"></div>
        <img src="${a.img}" alt="${escapeHtml(a.title)}" loading="lazy" />
        <div class="overlay-controls">
          <button class="play-btn" data-action="play" data-id="${a.id}" aria-label="Play trailer">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" fill="#081026"/></svg>
          </button>
          ${showDownload?`<a class="download-btn" data-action="download" data-id="${a.id}" title="Download">⤓</a>`:''}
        </div>
        <div class="meta">
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml((a.genres||[]).slice(0,2).join(', '))}</p>
          <div class="btn-row">
            <button class="btn btn-plain" data-action="details" data-id="${a.id}">Details</button>
            <button class="btn" data-action="play" data-id="${a.id}">Watch</button>
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

      // build privacy-enhanced YouTube embed URL, muted so autoplay works
      const src = `https://www.youtube-nocookie.com/embed/${meta.trailer.id}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1`;
      const iframe = document.createElement('iframe');
      iframe.setAttribute('frameborder','0');
      iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
      iframe.setAttribute('src',''); // start empty
      iframe.style.width='100%'; iframe.style.height='100%'; iframe.style.border='0'; iframe.style.pointerEvents='none';
      iframe.style.opacity = '0'; iframe.style.transition = 'opacity .25s ease'; iframe.style.background = 'transparent';

      // on successful load, fade iframe in and fade poster out
      let loaded = false;
      iframe.onload = function(){
        loaded = true;
        try{ iframe.style.opacity = '1'; const img = card.querySelector('img'); if(img){ img.style.transition = 'opacity .25s ease'; img.style.opacity = '0'; } }catch(e){}
      };

      // if embed doesn't load in a short time, remove it to avoid black frames
      const failTimeout = setTimeout(()=>{ if(!loaded){ try{ if(tp.contains(iframe)) tp.removeChild(iframe); }catch(e){} } }, 2500);

      tp.appendChild(iframe);

      // finally set src (after onload handler attached)
      // set src last so onload reliably fires
      iframe.src = src;

    }catch(e){ console.warn('createThumbIframeForCard',e);} }

  function removeThumbIframeForCard(card){ try{ const tp = card.querySelector('.thumb-player'); if(!tp) return; const ifr = tp.querySelector('iframe'); if(ifr) ifr.remove(); const img = card.querySelector('img'); if(img){ img.style.opacity = '1'; } }catch(e){} }

  function initThumbnailPlayers(){ const cards = document.querySelectorAll('.anime-card'); cards.forEach(c=>{ removeThumbIframeForCard(c); createThumbIframeForCard(c); }); }

  let APP_ANIME = [];
  async function loadDefaults(){
    const results = [];
    for(const t of DEFAULT_TITLES){
      const cached = getCachedMeta(t);
      if(cached){ results.push(buildAnimeFromMeta(cached)); continue; }
      const meta = await fetchAniList(t);
      if(meta){ cacheMeta(t, meta); results.push(buildAnimeFromMeta(meta)); }
    }
    APP_ANIME = results.filter(Boolean);
    renderGrid('newReleases', APP_ANIME.slice(0,4));
    renderGrid('classics', APP_ANIME.slice(4,7));
    renderGrid('topPicks', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('trending', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('recommended', APP_ANIME.filter(x=>x.genres.map(g=>g.toLowerCase()).includes('romance')).slice(0,4));
    renderGrid('browseGrid', APP_ANIME, false);
    renderWatchlist(); renderFavorites();
  }

  function getList(key){ try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ return []; } }
  function saveList(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  function renderWatchlist(){ const list = getList('li_watchlist'); const el = $('#watchlist'); if(!el) return; el.innerHTML=''; if(!list.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">No items in watchlist</div>'; return; } list.forEach(i=>{ const a = APP_ANIME.find(x=>x.id===i.id); if(!a) return; const div = document.createElement('div'); div.textContent = a.title; el.appendChild(div); }); }
  function renderFavorites(){ const ids = getList('li_favorites'); const items = APP_ANIME.filter(a=>ids.includes(a.id)); const el = $('#favorites'); if(!el) return; el.innerHTML=''; if(!items.length){ el.innerHTML='<div style="color:var(--muted);font-size:13px">No favorites</div>'; return; } items.forEach(a=>{ const d = document.createElement('div'); d.textContent = a.title; el.appendChild(d); }); }

  function openDetails(id){ const a = APP_ANIME.find(x=>x.id==id); if(!a) return; const modal = $('#modal'); const content = document.getElementById('modalContent'); if(!modal || !content) return; content.innerHTML = `<div class="modal-content"><img src="${a.img}" alt="${escapeHtml(a.title)}"/><h2>${escapeHtml(a.title)}</h2><p>${escapeHtml((a.genres||[]).join(', '))}</p></div>`; modal.hidden = false; }
  function closeModal(){ const modal = $('#modal'); if(modal) modal.hidden = true; }

  function openVideo(id){ const a = APP_ANIME.find(x=>x.id==id); if(!a) return alert('Trailer not available'); if(!a.trailer) return alert('Trailer not available'); const vm = document.getElementById('videoModal'); const frame = document.getElementById('playerFrame'); if(!vm || !frame) return alert('Video player not ready');
    const card = document.querySelector(`.anime-card[data-anime-id="${id}"]`);
    if(card){ removeThumbIframeForCard(card); }
    if(a.trailer.site.toLowerCase()==='youtube'){
      // load unmuted embed so user can hear sound in big modal
      frame.src = `https://www.youtube-nocookie.com/embed/${a.trailer.id}?autoplay=1&rel=0&modestbranding=1`;
      vm.hidden=false;
      const unmuteBtn = document.getElementById('unmuteBtn'); if(unmuteBtn) unmuteBtn.style.display='none';
    } else { alert('Trailer site not supported for embedding.'); }
  }

  function closeVideo(){ const vm=document.getElementById('videoModal'); const frame=document.getElementById('playerFrame'); if(frame){ try{ frame.src = ''; }catch(e){} } if(vm) vm.hidden=true; setTimeout(()=>{ initThumbnailPlayers(); },300); }

  function bindUnmute(){ const btn = document.getElementById('unmuteBtn'); if(!btn) return; btn.addEventListener('click', ()=>{ const frame = document.getElementById('playerFrame'); if(!frame) return; // attempt to append &mute=0 by reloading without mute param
    const src = frame.src || ''; if(!src) return; if(src.indexOf('mute=1')>-1) frame.src = src.replace('mute=1','mute=0'); }); }

  function bindModalControls(){ const modalClose = document.getElementById('modalClose'); const modal = document.getElementById('modal'); if(modalClose) modalClose.addEventListener('click', closeModal); const videoClose = document.getElementById('videoClose'); if(videoClose) videoClose.addEventListener('click', closeVideo); }

  function addOrUpdateWatch(id,progress,notes){ const list=getList('li_watchlist'); const existing=list.find(x=>x.id===id); if(existing){ existing.progress=progress||existing.progress; existing.notes=notes||existing.notes; } else { list.push({id,progress:progress||0,notes:notes||''}); } saveList('li_watchlist',list); }
  function addFavorite(id){ const list=getList('li_favorites'); if(!list.includes(id)) list.push(id); saveList('li_favorites',list); }

  function bindHeaderControls(){ const search = document.getElementById('searchInput'); if(search){ search.addEventListener('input', (e)=>{ const q = e.target.value.trim().toLowerCase(); if(!q){ // reset
        renderGrid('browseGrid', APP_ANIME); return; }
      const matches = APP_ANIME.filter(a=> a.title.toLowerCase().includes(q) || (a.genres||[]).join(' ').toLowerCase().includes(q)); renderGrid('browseGrid', matches); }); }
    const logout = document.getElementById('btnLogout'); if(logout){ logout.addEventListener('click', ()=>{ localStorage.removeItem('li_current'); window.location.href='login.html'; }); }
  }

  // global click handler for data-action attributes
  document.addEventListener('click', e=>{
    const t = e.target.closest('[data-action]'); if(!t) return; const action = t.getAttribute('data-action'); const id = Number(t.getAttribute('data-id'));
    if(action==='details') openDetails(id);
    else if(action==='play') openVideo(id);
    else if(action==='download') downloadAnime(id);
  });

  async function downloadAnime(id){ const downloads = JSON.parse(localStorage.getItem('li_downloads') || '{}'); const url = downloads[id]; if(!url) return alert('No downloadable asset available for this title.'); window.open(url, '_blank'); }

  function escapeHtml(str){ return (str||'').replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;','\'':'&#39;','<':'&lt;','>':'&gt;'}[c])); }

  (async function init(){ bindModalControls(); bindHeaderControls(); bindUnmute(); const cur=requireAuth(); if(!cur) return; $('#greeting').textContent = `Welcome, ${cur.username}`; $('#subGreeting').textContent = 'Discover anime, watch trailers and save titles to your watchlist.'; await loadDefaults(); })();

})();
