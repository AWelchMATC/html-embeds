(function(){
  const state = {
    terms: [],
    filtered: [],
    categories: new Set(),
    quickTag: '',
    exists: new Map(),        // slug -> true/false
    urlSlug: null             // from ?term=...
  };

  // DOM
  const az   = document.getElementById('az');
  const q    = document.getElementById('q');
  const cat  = document.getElementById('category');
  const count= document.getElementById('results-count');
  document.getElementById('year').textContent = new Date().getFullYear();

  // --- URL param helpers ---
  const params = new URLSearchParams(location.search);
  state.urlSlug = params.get('term');
  function setParam(name, value){
    const url = new URL(location.href);
    if (value) url.searchParams.set(name, value);
    else       url.searchParams.delete(name);
    history.replaceState({term:value||null}, '', url.toString());
  }
  function getParam(name){
    return new URLSearchParams(location.search).get(name);
  }

  // --- HEAD/GET check if a term page exists (cached) ---
  async function pageExists(slug){
    if (state.exists.has(slug)) return state.exists.get(slug);
    const url = `terms/${slug}.html`;
    let ok = false;
    try {
      let r = await fetch(url, { method:'HEAD', cache:'no-store' });
      if (!r.ok) {
        // Fallback: some CDNs don’t allow HEAD; try GET without caching
        r = await fetch(url, { method:'GET', cache:'no-store' });
      }
      ok = r.ok;
    } catch (e) {
      ok = false;
    }
    state.exists.set(slug, ok);
    return ok;
  }

  // Load data
  fetch('terms.json', {cache:'no-store'})
    .then(r => r.json())
    .then(data => {
      state.terms = (data.terms || []).slice().sort((a,b)=>a.title.localeCompare(b.title));
      state.terms.forEach(t => state.categories.add(t.category));
      renderCategories();
      applyFilters();
      bindChips();

      // If URL has ?term=slug, expand it after first render
      if (state.urlSlug) {
        // Clear filters so the term is visible
        q.value = '';
        cat.value = '';
        state.quickTag = '';
        applyFilters();
        expandBySlug(state.urlSlug);
      }
    })
    .catch(err => {
      console.error('Failed to load terms.json', err);
      az.innerHTML = '<div class="preview">Failed to load glossary data. Check terms.json.</div>';
    });

  function renderCategories(){
    const cats = Array.from(state.categories).sort();
    for (const c of cats){
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c; cat.appendChild(opt);
    }
  }

  function applyFilters(){
    const query = (q.value || '').toLowerCase().trim();
    const category = cat.value;
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

  function renderAZ(){
    const groups = groupAZ(state.filtered);
    const letters = Object.keys(groups);
    const total = state.filtered.length;
    count.textContent = total + ' result' + (total!==1?'s':'');
    const frag = document.createDocumentFragment();
    az.innerHTML = '';

    for (const letter of letters){
      const items = groups[letter];
      if (!items.length) continue;

      const section = document.createElement('section');
      section.className = 'az-section';

      const h = document.createElement('div');
      h.className = 'az-header';
      h.textContent = (letter==='#'?'0–9':letter) + ' · ' + items.length;

      const ul = document.createElement('ul');
      ul.className = 'term-list';

      for (const t of items){
        const li = document.createElement('li');
        li.className = 'term-item';

        const a = document.createElement('a');
        a.className = 'term-link';
        a.href = 'terms/' + t.slug + '.html';
        a.dataset.slug = t.slug;
        a.innerHTML = `<span>${escapeHtml(t.title)}</span><span class="term-right">${escapeHtml(t.category)}</span>`;

        // If we already know existence from cache, annotate now
        const known = state.exists.get(t.slug);
        if (known === false) a.dataset.exists = 'no';
        if (known === true)  a.dataset.exists = 'yes';

        a.addEventListener('click', async (ev)=>{
          if (activeSlug !== t.slug){
            // First click: show preview; prevent navigation
            ev.preventDefault();
            showPreview(li, t);
            activeSlug = t.slug;
            setParam('term', t.slug);

            // Check existence and update UI/behavior
            const exists = await pageExists(t.slug);
            a.dataset.exists = exists ? 'yes' : 'no';
            updatePreviewOpenButton(exists, t);
          } else {
            // Second click: navigate only if page exists
            const ex = state.exists.get(t.slug);
            if (ex === true) {
              // allow default navigation
            } else {
              ev.preventDefault();
              // optional: brief visual feedback could be added here
            }
          }
        });

        li.appendChild(a);
        ul.appendChild(li);
      }

      section.appendChild(h);
      section.appendChild(ul);
      frag.appendChild(section);
    }

    az.appendChild(frag);
  }

  function showPreview(li, t){
    // remove existing preview
    if (activePreviewEl && activePreviewEl.parentElement){
      activePreviewEl.parentElement.removeChild(activePreviewEl);
    }
    activePreviewEl = null;
    activeOpenBtn = null;

    const div = document.createElement('div');
    div.className = 'preview';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.title;

    const meta = document.createElement('div');
    meta.innerHTML = `<span class="category-pill">${escapeHtml(t.category)}</span>`;

    const p = document.createElement('p');
    p.textContent = t.summary || '';

    const tags = document.createElement('div');
    tags.className = 'tags';
    for (const tag of (t.tags || [])){
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tags.appendChild(span);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';

    const openBtn = document.createElement('button');
    openBtn.className = 'btn';
    openBtn.textContent = 'Checking page…';
    openBtn.disabled = true;
    activeOpenBtn = openBtn; // keep a reference so we can update after async check

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn secondary';
    closeBtn.textContent = 'Close preview';
    closeBtn.addEventListener('click', ()=>{
      if (activePreviewEl && activePreviewEl.parentElement){
        activePreviewEl.parentElement.removeChild(activePreviewEl);
      }
      activePreviewEl = null;
      activeSlug = '';
      setParam('term', null);
    });

    actions.appendChild(openBtn);
    actions.appendChild(closeBtn);

    div.appendChild(title);
    div.appendChild(meta);
    if (p.textContent) div.appendChild(p);
    if (tags.children.length) div.appendChild(tags);
    div.appendChild(actions);

    li.appendChild(div);
    activePreviewEl = div;

    // Trigger async existence check
    pageExists(t.slug).then(exists => updatePreviewOpenButton(exists, t));
  }

  function updatePreviewOpenButton(exists, t){
    if (!activeOpenBtn) return;
    if (exists){
      activeOpenBtn.disabled = false;
      activeOpenBtn.textContent = 'Open term page →';
      activeOpenBtn.onclick = ()=> { window.location.href = `terms/${t.slug}.html`; };
    } else {
      activeOpenBtn.disabled = true;
      activeOpenBtn.textContent = 'Term page coming soon';
      activeOpenBtn.onclick = null;
    }
  }

  function expandBySlug(slug){
    // Ensure it’s visible
    applyFilters();
    const a = document.querySelector(`a.term-link[data-slug="${CSS.escape(slug)}"]`);
    if (a){
      // First click shows preview (we prevent default)
      a.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
      // Annotate URL parameter (in case the click was blocked by some browsers)
      setParam('term', slug);
      // Also scroll it into view
      a.scrollIntoView({behavior:'smooth', block:'center'});
    }
  }

  // Keep preview in sync with history back/forward
  window.addEventListener('popstate', ()=>{
    const s = getParam('term');
    if (!s){
      // close preview if open
      if (activePreviewEl && activePreviewEl.parentElement){
        activePreviewEl.parentElement.removeChild(activePreviewEl);
      }
      activePreviewEl = null;
      activeSlug = '';
      return;
    }
    if (s !== activeSlug){
      expandBySlug(s);
    }
  });

  function bindChips(){
    const chips = Array.from(document.querySelectorAll('.chip'));
    for (const chip of chips){
      chip.addEventListener('click', ()=>{
        const val = chip.dataset.tag;
        if (state.quickTag === val){
          state.quickTag = '';
          chip.classList.remove('active');
        } else {
          state.quickTag = val;
          chips.forEach(c=>c.classList.remove('active'));
          chip.classList.add('active');
        }
        activeSlug = '';
        applyFilters();
        // Clear deep-link if filters changed
        setParam('term', null);
      });
    }
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  q.addEventListener('input', ()=>{ activeSlug=''; setParam('term', null); applyFilters(); });
  cat.addEventListener('change', ()=>{ activeSlug=''; setParam('term', null); applyFilters(); });
})();
