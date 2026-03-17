(function(){
  const state = {
    terms: [],
    filtered: [],
    categories: new Set(),
    quickTag: '',
    exists: new Map(),        // cache: slug -> true/false
    urlSlug: null             // from ?term=...
  };

  // DOM references
  const az    = document.getElementById('az');
  const q     = document.getElementById('q');
  const cat   = document.getElementById('category');
  const count = document.getElementById('results-count');
  const yearEl= document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --- URL param helpers ---
  function setParam(name, value){
    const url = new URL(location.href);
    if (value) url.searchParams.set(name, value);
    else       url.searchParams.delete(name);
    history.replaceState({term:value||null}, '', url.toString());
  }
  function getParam(name){
    return new URLSearchParams(location.search).get(name);
  }
  state.urlSlug = getParam('term');

  // --- HEAD/GET check if a term page exists (cached) ---
  async function pageExists(slug){
    if (state.exists.has(slug)) return state.exists.get(slug);
    const url = `terms/${slug}.html`;
    let ok = false;
    try {
      // Try HEAD first (fast), then GET fallback for hosts that don't allow HEAD
      let r = await fetch(url, { method:'HEAD', cache:'no-store' });
      if (!r.ok) {
        r = await fetch(url, { method:'GET', cache:'no-store' });
      }
      ok = r.ok;
    } catch (e) {
      ok = false;
    }
    state.exists.set(slug, ok);
    return ok;
  }

  // Load glossary data
  fetch('terms.json', {cache:'no-store'})
    .then(r => r.json())
    .then(data => {
      state.terms = (data.terms || []).slice().sort((a,b)=>a.title.localeCompare(b.title));
      state.terms.forEach(t => state.categories.add(t.category));
      renderCategories();
      applyFilters();
      bindChips();

      // Restore deep link (?term=slug) after first render
      if (state.urlSlug) {
        // Clear filters so the term is visible
        if (q)   q.value = '';
        if (cat) cat.value = '';
        state.quickTag = '';
        applyFilters();
        expandBySlug(state.urlSlug);
      }
    })
    .catch(err => {
      console.error('Failed to load terms.json', err);
      if (az) az.innerHTML = '<div class="preview">Failed to load glossary data. Check terms.json.</div>';
    });

  function renderCategories(){
    if (!cat) return;
    const cats = Array.from(state.categories).sort();
    for (const c of cats){
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      cat.appendChild(opt);
    }
  }

  function applyFilters(){
    const query = (q?.value || '').toLowerCase().trim();
    const category = cat?.value || '';
    const quickTag = state.quickTag;

    state.filtered = state.terms.filter(t => {
      const matchCat = !category || t.category === category;
      const hay = (t.title + ' ' + (t.summary||'') + ' ' + (t.tags||[]).join(' ')).toLowerCase();
      const matchQ = !query || hay.includes(query);
      const matchTag = !quickTag || (t.tags||[]).includes(quickTag);
      return matchCat && matchQ && matchTag;
    });
    renderAZ();
  }

  function groupAZ(list){
    const groups = {};
    for (let i=0;i<26;i++){ groups[String.fromCharCode(65+i)] = []; }
    groups['#'] = [];
    for (const t of list){
      const ch = t.title.trim().charAt(0).toUpperCase();
      const key = ch >= 'A' && ch <= 'Z' ? ch : '#';
      groups[key].push(t);
    }
    return groups;
  }

  let activeSlug = '';
  let activePreviewEl = null;
  let activeOpenBtn = null;

  function closePreview() {
    if (activePreviewEl && activePreviewEl.parentElement) {
      activePreviewEl.parentElement.removeChild(activePreviewEl);
    }
    activePreviewEl = null;
    activeOpenBtn = null;
    activeSlug = '';
    setParam('term', null);   // clear deep link
  }

  function renderAZ(){
    const groups = groupAZ(state.filtered);
    const letters = Object.keys(groups);
    const total = state.filtered.length;
    if (count) count.textContent = total + ' result' + (total!==1?'s':'');
