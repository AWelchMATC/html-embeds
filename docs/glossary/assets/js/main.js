(function(){
  const state = { terms: [], filtered: [], categories: new Set() };
  const grid = document.getElementById('grid');
  const q = document.getElementById('q');
  const cat = document.getElementById('category');
  const count = document.getElementById('results-count');
  document.getElementById('year').textContent = new Date().getFullYear();

  fetch('terms.json', {cache:'no-store'})
    .then(r => r.json())
    .then(data => {
      state.terms = data.terms || [];
      state.terms.forEach(t => state.categories.add(t.category));
      renderCategories();
      applyFilters();
    })
    .catch(err => {
      console.error('Failed to load terms.json', err);
      grid.innerHTML = '<div class="card">Failed to load glossary data. Check terms.json.</div>';
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
    state.filtered = state.terms.filter(t => {
      const matchCat = !category || t.category === category;
      const hay = (t.title + ' ' + (t.summary||'') + ' ' + (t.tags||[]).join(' ')).toLowerCase();
      const matchQ = !query || hay.includes(query);
      return matchCat && matchQ;
    });
    renderGrid();
  }

  function renderGrid(){
    if (!state.filtered.length){
      count.textContent = '0 results';
      grid.innerHTML = '<div class="card">No results. Try a different search or category.</div>';
      return;
    }
    count.textContent = state.filtered.length + ' result' + (state.filtered.length!==1?'s':'');
    const frag = document.createDocumentFragment();
    grid.innerHTML = '';
    for (const t of state.filtered){
      const card = document.createElement('article');
      card.className = 'card';
      const h = document.createElement('h3');
      const a = document.createElement('a');
      a.href = 'terms/' + t.slug + '.html';
      a.textContent = t.title;
      h.appendChild(a);

      const meta = document.createElement('div');
      meta.className = 'category-pill';
      meta.textContent = t.category;

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

      card.appendChild(h);
      card.appendChild(meta);
      if (p.textContent) card.appendChild(p);
      if (tags.children.length) card.appendChild(tags);
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  q.addEventListener('input', applyFilters);
  cat.addEventListener('change', applyFilters);
})();
