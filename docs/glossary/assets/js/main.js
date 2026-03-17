(function(){
  const state = { terms: [], filtered: [], categories: new Set(), quickTag: '' };
  const az = document.getElementById('az');
  const q = document.getElementById('q');
  const cat = document.getElementById('category');
  const count = document.getElementById('results-count');
  document.getElementById('year').textContent = new Date().getFullYear();

  // Load data
  fetch('terms.json', {cache:'no-store'})
    .then(r => r.json())
    .then(data => {
      state.terms = (data.terms || []).slice().sort((a,b)=>a.title.localeCompare(b.title));
      state.terms.forEach(t => state.categories.add(t.category));
      renderCategories();
      applyFilters();
      bindChips();
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

  function renderAZ(){
    const groups = groupAZ(state.filtered);
    const letters = Object.keys(groups);
    // Count total
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

        a.addEventListener('click', (ev)=>{
          // First click shows preview; second click navigates
          if (activeSlug !== t.slug){
            ev.preventDefault();
            showPreview(li, t);
            activeSlug = t.slug;
          } else {
            // allow navigation (second click)
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
    openBtn.textContent = 'Open term page →';
    openBtn.addEventListener('click', ()=>{
      window.location.href = 'terms/' + t.slug + '.html';
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn secondary';
    closeBtn.textContent = 'Close preview';
    closeBtn.addEventListener('click', ()=>{
      if (activePreviewEl && activePreviewEl.parentElement){
        activePreviewEl.parentElement.removeChild(activePreviewEl);
      }
      activePreviewEl = null;
      activeSlug = '';
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
  }

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
      });
    }
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  q.addEventListener('input', ()=>{ activeSlug=''; applyFilters(); });
  cat.addEventListener('change', ()=>{ activeSlug=''; applyFilters(); });
})();
