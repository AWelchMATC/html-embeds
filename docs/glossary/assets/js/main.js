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
    const frag = document.createDocumentFragment();
    if (az) az.innerHTML = '';

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

        // TOGGLE BEHAVIOR: 1st click opens preview, 2nd click closes preview (always).
        a.addEventListener('click', async (ev)=>{
          if (activeSlug !== t.slug){
            // ---- OPEN ----
            ev.preventDefault();           // no navigation on row click
            showPreview(li, t);
            activeSlug = t.slug;
            setParam('term', t.slug);      // deep link for sharing

            // Check existence and update preview button + link styling
            const exists = await pageExists(t.slug);
            a.dataset.exists = exists ? 'yes' : 'no';
            updatePreviewOpenButton(exists, t);
          } else {
            // ---- CLOSE ----
            ev.preventDefault();           // no navigation on row click
            closePreview();
          }
        });

        li.appendChild(a);
        ul.appendChild(li);
      }

      section.appendChild(h);
      section.appendChild(ul);
      frag.appendChild(section);
    }

    if (az) az.appendChild(frag);
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
    activeOpenBtn = openBtn;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn secondary';
    closeBtn.textContent = 'Close preview';
    closeBtn.addEventListener('click', closePreview);

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
    // Ensure a fresh render with filters cleared already happened
    const sel = `a.term-link[data-slug="${CSS && CSS.escape ? CSS.escape(slug) : slug}"]`;
    const a = document.querySelector(sel);
    if (a){
      // First click opens preview (preventDefault in handler)
      a.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
      // Make sure the param is present and scroll into view
      setParam('term', slug);
      a.scrollIntoView({behavior:'smooth', block:'center'});
    }
  }

  // Keep preview in sync with history back/forward
  window.addEventListener('popstate', ()=>{
    const s = getParam('term');
    if (!s){
      closePreview();
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
        closePreview();
        applyFilters();
      });
    }
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  if (q)   q.addEventListener('input', ()=>{ closePreview(); applyFilters(); });
  if (cat) cat.addEventListener('change', ()=>{ closePreview(); applyFilters(); });

})();
