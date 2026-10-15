/* Каталог: фильтр по разделу и издателю, поиск, сортировка, счётчик, пустое состояние. */
(function () {
  'use strict';
  var root = document.getElementById('catalog');
  var resultsEl = document.getElementById('results');
  var statusEl = document.getElementById('status');
  var qEl = document.getElementById('f-q');
  var sortEl = document.getElementById('f-sort');
  var groupBox = document.getElementById('f-group');
  var pubBox = document.getElementById('f-publisher');
  var pubLinkEl = document.getElementById('f-pub-link');
  var resetEl = document.getElementById('f-reset');
  var toggle = document.querySelector('.filters-toggle');
  var badge = document.querySelector('[data-filter-badge]');
  var items = [];
  var state = { q: '', group: '', publisher: '', sort: 'sections' };

  function readUrl() {
    var p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.group = p.get('group') || '';
    state.publisher = p.get('publisher') || '';
    var s = p.get('sort');
    state.sort = s === 'asc' || s === 'desc' ? s : 'sections';
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.group) p.set('group', state.group);
    if (state.publisher) p.set('publisher', state.publisher);
    if (state.sort !== 'sections') p.set('sort', state.sort);
    var qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* не страшно */ }
  }

  function radio(name, value, label, count, checked) {
    return '<label class="radio"><input type="radio" name="' + name + '" value="' + MP.esc(value) + '"' + (checked ? ' checked' : '') + '>' +
      '<span>' + MP.esc(label) + '</span>' + (count != null ? '<small>' + count + '</small>' : '') + '</label>';
  }

  function buildFilters() {
    var groups = [], gcount = {}, pubs = [];
    items.forEach(function (it) {
      if (!(it.group in gcount)) { gcount[it.group] = 0; groups.push(it.group); }
      gcount[it.group]++;
      if (it.publisher && pubs.indexOf(it.publisher) < 0) pubs.push(it.publisher);
    });
    var order = ['ITU', 'IMO'];
    pubs.sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      return ia - ib;
    });
    groupBox.innerHTML = radio('group', '', 'Все разделы', items.length, !state.group) +
      groups.map(function (g) { return radio('group', g, g, gcount[g], state.group === g); }).join('');
    pubBox.innerHTML = radio('publisher', '', 'Все издатели', null, !state.publisher) +
      pubs.map(function (p) { return radio('publisher', p, p, null, state.publisher === p); }).join('');
  }

  function syncControls() {
    qEl.value = state.q;
    sortEl.value = state.sort;
    var g = groupBox.querySelectorAll('input'), p = pubBox.querySelectorAll('input'), i;
    for (i = 0; i < g.length; i++) g[i].checked = g[i].value === state.group;
    for (i = 0; i < p.length; i++) p[i].checked = p[i].value === state.publisher;
  }

  function matches(it) {
    if (state.group && it.group !== state.group) return false;
    if (state.publisher && it.publisher !== state.publisher) return false;
    var q = MP.norm(state.q).trim();
    if (q) {
      var hay = MP.norm(it.name + ' ' + it.sku + ' ' + it.slug);
      var words = q.split(/\s+/);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }

  function render() {
    var list = items.filter(matches);
    var active = (state.group ? 1 : 0) + (state.publisher ? 1 : 0);
    badge.textContent = active ? 'выбрано: ' + active : '';
    statusEl.innerHTML = 'Найдено: <b>' + list.length + '</b> из ' + items.length;
    /* ссылка на страницу выбранного издателя */
    pubLinkEl.innerHTML = state.publisher && MP.publisherSlug(state.publisher)
      ? '<a class="textlink" href="' + MP.publisherHref(state.publisher) + '">Все издания ' + MP.esc(state.publisher) + '</a>' : '';

    if (!list.length) {
      resultsEl.innerHTML = '<div class="empty"><h2>Ничего не нашли</h2><p>Проверьте написание или уберите часть условий. Можно искать по названию, артикулу вида MP-007 или слову из названия.</p><button class="btn btn--ink" type="button" id="empty-reset">Сбросить фильтры</button></div>';
      document.getElementById('empty-reset').addEventListener('click', reset);
      return;
    }

    var html = '';
    if (state.sort === 'sections') {
      var sections = [], map = {};
      list.forEach(function (it) {
        if (!map[it.section]) { map[it.section] = []; sections.push(it.section); }
        map[it.section].push(it);
      });
      sections.forEach(function (s) {
        html += '<section class="cat-group"><h2><a href="' + MP.sectionHref(s) + '">' + MP.esc(s) + '</a><small>' + map[s].length + '</small></h2>' +
          '<ul class="pubs pubs--cat pubs--list">' + map[s].map(function (it) { return MP.card(it); }).join('') + '</ul></section>';
      });
    } else {
      list = list.slice().sort(function (a, b) {
        var pa = a.price == null ? Infinity : a.price, pb = b.price == null ? Infinity : b.price;
        if (pa === pb) return a.sku < b.sku ? -1 : 1;
        return state.sort === 'asc' ? pa - pb : (pa === Infinity ? 1 : pb === Infinity ? -1 : pb - pa);
      });
      html = '<ul class="pubs pubs--cat pubs--list">' + list.map(function (it) { return MP.card(it); }).join('') + '</ul>';
    }
    resultsEl.innerHTML = html;
  }

  function update() { writeUrl(); render(); }
  function reset() {
    state.q = ''; state.group = ''; state.publisher = ''; state.sort = 'sections';
    syncControls(); update();
  }

  qEl.addEventListener('input', function () { state.q = qEl.value; update(); });
  sortEl.addEventListener('change', function () { state.sort = sortEl.value; update(); });
  groupBox.addEventListener('change', function (e) { if (e.target.name === 'group') { state.group = e.target.value; update(); } });
  pubBox.addEventListener('change', function (e) { if (e.target.name === 'publisher') { state.publisher = e.target.value; update(); } });
  resetEl.addEventListener('click', reset);
  toggle.addEventListener('click', function () {
    var open = !root.classList.contains('is-filters-open');
    root.classList.toggle('is-filters-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  readUrl();
  MP.loadCatalog().then(function (data) {
    items = data;
    buildFilters();
    syncControls();
    render();
    if (state.group || state.publisher) {
      /* на телефоне показать, что фильтр уже выбран */
      root.classList.add('is-filters-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  }).catch(function () {
    resultsEl.innerHTML = '<div class="empty"><h2>Каталог не загрузился</h2><p>Обновите страницу. Если макет открыт с диска, запустите его через локальный сервер.</p></div>';
  });
})();
