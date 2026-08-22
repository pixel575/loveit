// assets/dashboard.js - client-side dashboard functionality (AniList trailers & posters)
// Updated: ensure trailer iframe uses playsinline parameter for mobile inline playback, add unmute fallback
(function(){
  // Default titles to fetch from AniList
  const DEFAULT_TITLES = [
    'Solo Leveling',
    'Attack on Titan',
    'Demon Slayer',
    'Jujutsu Kaisen',
    'One Piece',
    'Chainsaw Man'
  ];

  const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));

  function getCurrent(){ return JSON.parse(localStorage.getItem('li_current') || 'null'); }
  function requireAuth(){ const cur=getCurrent(); if(!cur){ window.location.href='login.html'; return null; } return cur; }

  async function fetchAniList(title){
    const query = `query ($search: String) { Media(search: $search, type: ANIME) { id title { romaji native english } coverImage { large medium } bannerImage description(asHtml: false) genres episodes seasonYear averageScore siteUrl trailer { id site } } }`;
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

  function cacheMeta(title, meta){
    try{ const cache = JSON.parse(localStorage.getItem('li_meta_cache') || '{}'); cache[title] = { meta, ts: Date.now() }; localStorage.setItem('li_meta_cache', JSON.stringify(cache)); }catch(e){}
  }
  function getCachedMeta(title){ try{ const cache = JSON.parse(localStorage.getItem('li_meta_cache') || '{}'); const entry = cache[title]; if(!entry) return null; if(Date.now() - entry.ts > 24*60*60*1000) return null; return entry.meta; }catch(e){ return null; } }

  function buildAnimeFromMeta(meta){ if(!meta) return null; const title = meta.title.romaji || meta.title.english || meta.title.native || 'Unknown'; const poster = meta.coverImage && (meta.coverImage.large || meta.coverImage.medium) ? (meta.coverImage.large || meta.coverImage.medium) : ''; const trailer = meta.trailer && meta.trailer.site && meta.trailer.id ? { site: meta.trailer.site, id: meta.trailer.id } : null; return { id: meta.id, title, year: meta.seasonYear || '', episodes: meta.episodes || 0, score: meta.averageScore || 0, genres: meta.genres || [], synopsis: (meta.description || '').replace(/<[^>]+>/g, '').slice(0, 400), img: poster, anilistUrl: meta.siteUrl || `https://anilist.co/anime/${meta.id}`, trailer }; }

  // Make the image itself tappable: data-action="play" on the <img>
  function renderCardHTML(a, showDownload){ const hasTrailer = !!(a.trailer && a.trailer.site && a.trailer.id); return `<img src="${a.img}" alt="${a.title}" data-action="play" data-id="${a.id}"><div class="meta"><h3>${a.title}</h3><p>${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><div class="btn-row"><button class="btn" data-id="${a.id}" data-action="details">Details</button><button class="btn-plain" data-id="${a.id}" data-action="watch">Add to Watchlist</button></div></div><div class="overlay-controls">${hasTrailer?'<!-- image is tappable, play button removed to avoid overlap -->':''}<a class="download-btn" ${showDownload?`data-action="download" data-id="${a.id}"`:'href="#" style="opacity:0.5;pointer-events:none;"'} aria-label="Download clip for ${a.title}"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v10" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11l4 4 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21H3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a><a class="download-btn" href="${a.anilistUrl}" target="_blank" rel="noopener" style="margin-left:8px">AniList</a></div>`; }

  function renderGrid(target, list, showDownload=false){ const el = document.getElementById(target); if(!el) return; el.innerHTML=''; list.forEach(a=>{ const d = document.createElement('div'); d.className='anime-card'; d.innerHTML = renderCardHTML(a, showDownload); el.appendChild(d); }); }

  let APP_ANIME = [];
  async function loadDefaults(){ const results = []; for(const t of DEFAULT_TITLES){ const cached = getCachedMeta(t); if(cached){ results.push(buildAnimeFromMeta(cached)); continue; } const meta = await fetchAniList(t); if(meta){ cacheMeta(t, meta); results.push(buildAnimeFromMeta(meta)); } }
    APP_ANIME = results.filter(Boolean);
    renderGrid('newReleases', APP_ANIME.slice(0,4));
    renderGrid('classics', APP_ANIME.slice(4,7));
    renderGrid('topPicks', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('trending', APP_ANIME.slice().sort((a,b)=>b.score-a.score).slice(0,4));
    renderGrid('recommended', APP_ANIME.filter(x=>x.genres.map(g=>g.toLowerCase()).includes('romance')).slice(0,4));
    renderGrid('browseGrid', APP_ANIME, false);
    renderWatchlist(); renderFavorites();
  }

  function getList(key){ const raw = JSON.parse(localStorage.getItem(key) || '[]'); if(key==='li_watchlist' && raw.length && typeof raw[0] === 'number'){ const migrated = raw.map(id=>({id,progress:0,notes:''})); localStorage.setItem(key, JSON.stringify(migrated)); return migrated; } return raw; }
  function saveList(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  function renderWatchlist(){ const list = getList('li_watchlist'); const el = $('#watchlist'); if(!el) return; el.innerHTML=''; if(!list.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">Your watchlist is empty.</div>'; return; } list.forEach(entry=>{ const a = APP_ANIME.find(x=>x.id===entry.id); if(!a) return; const div=document.createElement('div'); div.className='mini card'; div.style.marginBottom='8px'; div.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img src="${a.img}" style="width:80px;height:56px;object-fit:cover;border-radius:6px"><div style="flex:1"><strong>${a.title}</strong><div style="font-size:12px;color:var(--muted);margin-top:6px">Progress: <input data-action="progress" data-id="${a.id}" type="range" min="0" max="100" value="${entry.progress||0}" style="vertical-align:middle"> <span class="prog-val" data-id="${a.id}">${entry.progress||0}%</span></div><div style="margin-top:8px"><textarea data-action="notes" data-id="${a.id}" placeholder="Notes" style="width:100%;height:56px;border-radius:6px;padding:8px">${entry.notes||''}</textarea></div></div><div style="margin-left:8px;display:flex;flex-direction:column;gap:6px"><button class="btn" data-action="details" data-id="${a.id}">Details</button><button class="btn-plain" data-action="remove-watch" data-id="${a.id}">Remove</button></div></div>`; el.appendChild(div); }); }

  function renderFavorites(){ const ids = getList('li_favorites'); const items = APP_ANIME.filter(a=>ids.includes(a.id)); const el = $('#favorites'); if(!el) return; el.innerHTML=''; if(!items.length){ el.innerHTML = '<div style="color:var(--muted);font-size:13px">No favorites yet.</div>'; return; } items.forEach(a=>{ const div=document.createElement('div'); div.className='mini'; div.innerHTML=`<div style="display:flex;gap:8px;align-items:center"><img src="${a.img}" style="width:56px;height:36px;object-fit:cover;border-radius:6px"><div><strong>${a.title}</strong><div style="font-size:12px;color:var(--muted)">${a.year}</div></div></div>`; el.appendChild(div); }); }

  function openDetails(id){ const a = APP_ANIME.find(x=>x.id==id); if(!a) return; const modal = $('#modal'); const content = document.getElementById('modalContent'); const wl = getList('li_watchlist'); const entry = wl.find(x=>x.id===a.id) || {id:a.id,progress:0,notes:''}; content.innerHTML = `<div class="modal-content"><img src="${a.img}"><h2 style="color:var(--accent)">${a.title}</h2><p style="color:var(--muted)">${a.genres.join(' • ')} • ${a.year} • ${a.episodes} eps • ⭐ ${a.score}</p><p style="clear:left">${a.synopsis}</p><div style="margin-top:12px"><label>Progress: <input id="modalProgress" type="range" min="0" max="100" value="${entry.progress||0}"> <span id="modalProgVal">${entry.progress||0}%</span></label><div style="margin-top:8px"><textarea id="modalNotes" placeholder="Notes about this anime" style="width:100%;height:80px;border-radius:6px;padding:8px">${entry.notes||''}</textarea></div><div style="margin-top:10px;display:flex;gap:8px"><button id="modalSave" class="btn">Save to Watchlist</button><button id="modalFav" class="btn-plain">Favorite</button><a class="btn-plain" href="${a.anilistUrl}" target="_blank" rel="noopener">View on AniList</a></div></div></div>`; modal.hidden=false; const mp=document.getElementById('modalProgress'); if(mp){ mp.addEventListener('input', e=>{ document.getElementById('modalProgVal').textContent = e.target.value + '%'; }); } const save=document.getElementById('modalSave'); if(save){ save.addEventListener('click', ()=>{ const progress = Number(document.getElementById('modalProgress').value); const notes = document.getElementById('modalNotes').value; addOrUpdateWatch(a.id, progress, notes); renderWatchlist(); closeModal(); }); } const fav=document.getElementById('modalFav'); if(fav){ fav.addEventListener('click', ()=>{ addFavorite(a.id); renderFavorites(); alert('Added to favorites'); }); } }
  function closeModal(){ const modal = $('#modal'); if(modal) modal.hidden = true; }

  function openVideo(id){ const a = APP_ANIME.find(x=>x.id==id); if(!a) return alert('Trailer not available'); if(!a.trailer) return alert('Trailer not available'); const vm = document.getElementById('videoModal'); const frame = document.getElementById('playerFrame'); const unmuteBtn = document.getElementById('unmuteBtn'); // build embed with playsinline to allow inline playback on iOS/Android
    if(a.trailer.site.toLowerCase()==='youtube'){
      // Use playsinline=1 to encourage inline playback on mobile devices. Do not force mute here — user tap should allow sound.
      const src = `https://www.youtube.com/embed/${a.trailer.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
      frame.src = src;
      // show modal and hide unmute button by default
      vm.hidden=false;
      if(unmuteBtn) unmuteBtn.style.display='none';
      // after short timeout, if video seems to autoplay muted (some browsers mute), show unmute option
      setTimeout(()=>{
        try{
          // If visible and still audio-only concerns, reveal unmute control for user (they can click to reload iframe without playsinline mute params)
          if(unmuteBtn) unmuteBtn.style.display='inline-block';
        }catch(e){}
      },800);
    } else { alert('Trailer site not supported for embedding.'); }
  }
  function closeVideo(){ const vm=document.getElementById('videoModal'); const frame=document.getElementById('playerFrame'); if(frame){ try{ frame.src = ''; }catch(e){} } if(vm) vm.hidden=true; }

  // unmute handler: reload iframe without playsinline parameter (user requested sound)
  function bindUnmute(){ const btn = document.getElementById('unmuteBtn'); if(!btn) return; btn.addEventListener('click', ()=>{
    const frame = document.getElementById('playerFrame'); if(!frame) return; const src = frame.src; if(!src) return; // reload with same id but without playsinline param (keeps autoplay)
    const m = src.match(/embed\/([^?]+)/); if(!m) return; const id = m[1]; frame.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`; btn.style.display='none';
  }); }

  async function downloadAnime(id){ const downloads = JSON.parse(localStorage.getItem('li_downloads') || '{}'); const url = downloads[id]; if(!url) return alert('No downloadable asset available for this title.'); try{ const resp = await fetch(url); if(!resp.ok) throw new Error('Network error'); const blob = await resp.blob(); const blobUrl = URL.createObjectURL(blob); const aEl = document.createElement('a'); aEl.href = blobUrl; const a = APP_ANIME.find(x=>x.id===id); aEl.download = `${a.title.replace(/[^a-z0-9]/gi,'_')}.mp4`; document.body.appendChild(aEl); aEl.click(); aEl.remove(); setTimeout(()=>URL.revokeObjectURL(blobUrl),60000); }catch(err){ alert('Download failed: '+err.message); } }

  function bindModalControls(){ const modalClose = document.getElementById('modalClose'); const modal = document.getElementById('modal'); if(modalClose) modalClose.addEventListener('click', closeModal); if(modal) modal.addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); }); const vmc = document.getElementById('videoClose'); const vm = document.getElementById('videoModal'); if(vmc) vmc.addEventListener('click', closeVideo); if(vm) vm.addEventListener('click', e=>{ if(e.target.id==='videoModal') closeVideo(); }); document.addEventListener('touchstart', function(e){ const m=document.getElementById('modal'); const v=document.getElementById('videoModal'); if(m && !m.hidden){ const inner=document.querySelector('.modal-inner'); if(inner && !inner.contains(e.target)) closeModal(); } if(v && !v.hidden){ const inner=document.querySelector('#videoModal .modal-inner'); if(inner && !inner.contains(e.target)) closeVideo(); } },{passive:true}); document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeModal(); closeVideo(); } }); }

  function addOrUpdateWatch(id,progress,notes){ const list=getList('li_watchlist'); const existing=list.find(x=>x.id===id); if(existing){ existing.progress=progress||existing.progress; existing.notes=notes!==undefined?notes:existing.notes; } else list.push({id,progress:progress||0,notes:notes||''}); saveList('li_watchlist',list); }
  function addFavorite(id){ const list=getList('li_favorites'); if(!list.includes(id)) list.push(id); saveList('li_favorites',list); }

  // Search handler and logout
  function bindHeaderControls(){ const search = document.getElementById('searchInput'); if(search){ search.addEventListener('input', (e)=>{ const q = e.target.value.trim().toLowerCase(); if(!q){ renderBrowse(); return; } const res = APP_ANIME.filter(a=> (a.title+' '+a.genres.join(' ')+' '+(a.year||'')).toLowerCase().includes(q)); renderGrid('browseGrid', res); }); }
    const logout = document.getElementById('btnLogout'); if(logout){ logout.addEventListener('click', ()=>{ localStorage.removeItem('li_current'); window.location.href='login.html'; }); }
  }

  document.addEventListener('click', e=>{ const t = e.target.closest('[data-action]') || e.target; const action = t.getAttribute && t.getAttribute('data-action'); if(action==='details') openDetails(Number(t.getAttribute('data-id'))); if(action==='watch'){ const id=Number(t.getAttribute('data-id')); addOrUpdateWatch(id,0,''); renderWatchlist(); t.textContent='Added'; } if(action==='remove-watch'){ const id=Number(t.getAttribute('data-id')); const list=getList('li_watchlist').filter(x=>x.id!==id); saveList('li_watchlist',list); renderWatchlist(); renderBrowse(); } if(action==='fav'){ const id=Number(t.getAttribute('data-id')); addFavorite(id); renderFavorites(); alert('Added to favorites'); } if(action==='play'){ openVideo(Number(t.getAttribute('data-id'))); } if(action==='download'){ downloadAnime(Number(t.getAttribute('data-id'))); } });

  document.addEventListener('input', e=>{ const t=e.target; const action=t.getAttribute && t.getAttribute('data-action'); if(action==='progress'){ const id=Number(t.getAttribute('data-id')); const list=getList('li_watchlist'); const item=list.find(x=>x.id===id); if(item){ item.progress=Number(t.value); saveList('li_watchlist',list); const span=document.querySelector('.prog-val[data-id="'+id+'"]'); if(span) span.textContent = item.progress + '%'; } } if(action==='notes'){ const id=Number(t.getAttribute('data-id')); const list=getList('li_watchlist'); const item=list.find(x=>x.id===id); if(item){ item.notes=t.value; saveList('li_watchlist',list); } } });

  (async function init(){ bindModalControls(); bindHeaderControls(); bindUnmute(); const cur=requireAuth(); if(!cur) return; $('#greeting').textContent = `Welcome, ${cur.username}`; $('#subGreeting').textContent = `Browse anime, watch trailers and save titles.`; await loadDefaults(); })();

})();
