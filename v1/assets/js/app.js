/* Морские публикации, v1. Каталог из ../data/catalog.json, заявка в localStorage (mp_cart_v1). Без библиотек. */
(function () {
  'use strict';

  var CART_KEY = 'mp_cart_v1';
  var ORDER_KEY = 'mp_order_seq_v1';
  var memoryCart = [];
  var memorySeq = 0;
  var page = document.body.getAttribute('data-page');

  /* ---------- утилиты ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cleanName(s) { return String(s).replace(/[\u2013\u2014]/g, '-'); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' руб'; }
  function priceHtml(item, cls) {
    cls = cls || '';
    if (item.price == null) return '<span class="price price--ask ' + cls + '">Цена по запросу</span>';
    return '<span class="price ' + cls + '">' + money(item.price) + '</span>';
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function facts(item) {
    var a = [];
    if (item.edition) a.push(item.edition);
    if (item.format) a.push(item.format);
    return a.join(', ');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function coverSrc(item) { return '../' + item.cover; }
  function cardUrl(item) { return 'kartochka.html?slug=' + encodeURIComponent(item.slug); }
  var CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ARROW = '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  /* ---------- данные ---------- */
  var catalogPromise = null;
  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('../data/catalog.json').then(function (r) {
        if (!r.ok) throw new Error('catalog ' + r.status);
        return r.json();
      });
    }
    return catalogPromise;
  }
  function bySlug(list, slug) {
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  /* ---------- тексты из ../data/content (файлов может не быть) ---------- */
  var contentCache = {};
  function loadOpt(path) {
    if (!contentCache[path]) {
      contentCache[path] = fetch('../data/content/' + path).then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; });
    }
    return contentCache[path];
  }
  var SECTION_SLUGS = {
    'ITU': 'itu', 'IMO: конвенции': 'imo-konvencii', 'IMO: кодексы': 'imo-kodeksy', 'IMO: руководства': 'imo-rukovodstva',
    'Контроль государства порта': 'kontrol-gosudarstva-porta', 'Радиосвязь РФ': 'radiosvyaz', 'Судовые журналы': 'sudovye-zhurnaly',
    'Admiralty': 'admiralty', 'OCIMF и ICS': 'ocimf-ics'
  };
  var PUBLISHER_SLUGS = { 'ЦНИИМФ': 'cniimf', 'IMO': 'imo', 'ITU': 'itu' };
  var RAZDELY = null, IZDATELI = null;
  /* json может быть объектом {ключ: {...}} или массивом; приводим к списку {key, ...поля} */
  function entries(data) {
    if (!data) return [];
    if (!Array.isArray(data)) {
      var keys = Object.keys(data);
      if (keys.length === 1 && data[keys[0]] && typeof data[keys[0]] === 'object' && (Array.isArray(data[keys[0]]) || !data[keys[0]].slug)) data = data[keys[0]];
    }
    var out = [];
    if (Array.isArray(data)) {
      data.forEach(function (e) { if (e && typeof e === 'object') { var c = {}; for (var k in e) c[k] = e[k]; c.key = e.key || e.section || e.publisher || e.name || ''; out.push(c); } });
    } else {
      Object.keys(data).forEach(function (k) {
        var e = data[k];
        if (e && typeof e === 'object') { var c = {}; for (var kk in e) c[kk] = e[kk]; c.key = k; out.push(c); }
      });
    }
    return out;
  }
  function findEntry(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  function sectionSlug(section) {
    var e = findEntry(entries(RAZDELY), section);
    return (e && e.slug) || SECTION_SLUGS[section] || '';
  }
  function sectionUrl(section) { return 'razdel.html?slug=' + encodeURIComponent(sectionSlug(section)); }
  function publisherUrl(pub) { return 'izdatel.html?slug=' + encodeURIComponent(PUBLISHER_SLUGS[pub] || ''); }
  function paras(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  /* markdown-ссылки [текст](адрес) в безопасный html: весь остальной текст экранируется */
  function md(text) {
    var out = esc(text);
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      var raw = u.replace(/&amp;/g, '&');
      if (/^(kartochka|stranica|razdel|izdatel)\.html\?slug=[a-z0-9-]+$/.test(raw) || /^(katalog|index|korzina)\.html(\?[A-Za-z0-9=&%._-]*)?(#[a-z0-9-]+)?$/.test(raw)) {
        return '<a href="' + esc(raw) + '">' + t + '</a>';
      }
      if (/^https:\/\/[^\s"'<>]+$/.test(raw)) return '<a href="' + esc(raw) + '" target="_blank" rel="noopener">' + t + '</a>';
      return t;
    });
    return out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
    return m ? (parseInt(m[3], 10) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1]) : String(v);
  }
  function pick(o, names) {
    if (!o) return null;
    for (var i = 0; i < names.length; i++) if (o[names[i]] != null) return o[names[i]];
    return null;
  }
  function plain(text, max) {
    var t = String(text || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '');
    if (t.length <= max) return t;
    var cut = t.slice(0, max), dot = cut.lastIndexOf('. ');
    if (dot > max * 0.5) return cut.slice(0, dot + 1);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }

  /* ---------- заявка ---------- */
  function readCart() {
    try {
      var raw = window.localStorage.getItem(CART_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (l) { return l && typeof l.slug === 'string' && l.qty > 0; })
        .map(function (l) { return { slug: l.slug, qty: Math.min(99, Math.floor(l.qty)) }; });
    } catch (e) {
      return memoryCart.slice();
    }
  }
  function writeCart(arr) {
    memoryCart = arr.slice();
    try { window.localStorage.setItem(CART_KEY, JSON.stringify(arr)); } catch (e) { /* хранилище недоступно, держим в памяти */ }
    updateCount();
  }
  function cartQty(slug) {
    var c = readCart();
    for (var i = 0; i < c.length; i++) if (c[i].slug === slug) return c[i].qty;
    return 0;
  }
  function addToCart(slug, qty) {
    var c = readCart(), found = false;
    qty = qty || 1;
    c.forEach(function (l) { if (l.slug === slug) { l.qty = Math.min(99, l.qty + qty); found = true; } });
    if (!found) c.push({ slug: slug, qty: Math.min(99, qty) });
    writeCart(c);
  }
  function setQty(slug, qty) {
    var c = readCart();
    c = c.map(function (l) { return l.slug === slug ? { slug: slug, qty: Math.max(1, Math.min(99, qty)) } : l; });
    writeCart(c);
  }
  function removeFromCart(slug) {
    writeCart(readCart().filter(function (l) { return l.slug !== slug; }));
  }
  function updateCount() {
    var total = readCart().reduce(function (s, l) { return s + l.qty; }, 0);
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = total;
      el.setAttribute('data-zero', total === 0 ? 'true' : 'false');
    });
    $$('.cart-link').forEach(function (a) {
      a.setAttribute('aria-label', 'Корзина, позиций: ' + total);
    });
  }
  function nextOrderNo() {
    var n;
    try { n = parseInt(window.localStorage.getItem(ORDER_KEY) || '0', 10) || 0; } catch (e) { n = memorySeq; }
    n += 1; memorySeq = n;
    try { window.localStorage.setItem(ORDER_KEY, String(n)); } catch (e) { /* ничего */ }
    return 'Z-2026-' + ('0000' + n).slice(-4);
  }

  /* ---------- кнопка «В корзину» ---------- */
  function addSlot(slug) {
    return '<span class="add-slot" data-slot="' + esc(slug) + '">' + addControl(slug) + '</span>';
  }
  function addControl(slug) {
    if (cartQty(slug) > 0) {
      return '<a class="btn btn--added" href="korzina.html">В корзине ' + CHECK + '</a>';
    }
    return '<button type="button" class="btn btn--primary" data-add="' + esc(slug) + '">В корзину</button>';
  }
  function refreshSlots() {
    $$('.add-slot').forEach(function (slot) {
      slot.innerHTML = addControl(slot.getAttribute('data-slot'));
    });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-add]') : null;
    if (!btn) return;
    var slug = btn.getAttribute('data-add');
    var slot = btn.closest('.add-slot');
    addToCart(slug, 1);
    refreshSlots();
    if (slot && slot.firstElementChild) slot.firstElementChild.focus();
    var live = $('#live');
    if (live) live.textContent = 'Издание добавлено в корзину';
  });

  /* ---------- шапка ---------- */
  function initHeader() {
    var burger = $('.burger'), nav = $('#nav');
    if (burger && nav) {
      burger.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
          nav.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
          burger.setAttribute('aria-label', 'Открыть меню');
          burger.focus();
        }
      });
    }
    /* выпадающие списки меню: кнопки-шевроны, на компьютере ещё наведение и фокус (в css) */
    function closeSubs(except) {
      $$('.nav .has-sub.is-open').forEach(function (li) {
        if (li === except) return;
        li.classList.remove('is-open');
        var b = li.querySelector('.sub-toggle, .nav-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.sub-toggle, .nav-btn') : null;
      if (btn) {
        var li = btn.closest('.has-sub');
        var open = li.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        closeSubs(li);
        return;
      }
      if (!(e.target.closest && e.target.closest('.has-sub'))) closeSubs(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var openLi = $('.nav .has-sub.is-open');
        if (openLi) { var b = openLi.querySelector('.sub-toggle, .nav-btn'); closeSubs(null); if (b) b.focus(); }
      }
    });
    var here = window.location.pathname.split('/').pop() + window.location.search;
    $$('.nav a').forEach(function (a) { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });
    updateCount();
    window.addEventListener('storage', function (e) { if (e.key === CART_KEY) { updateCount(); refreshSlots(); } });
  }

  /* ---------- карточки изданий ---------- */
  function pubCard(item, lazy) {
    var f = facts(item);
    return '<article class="pub">' +
      '<a class="cover" href="' + cardUrl(item) + '" tabindex="-1" aria-hidden="true"><img src="' + coverSrc(item) + '" alt="' + esc(cleanName(item.name)) + '" width="600" height="850"' + (lazy ? ' loading="lazy"' : '') + '></a>' +
      '<div class="pub-body"><span class="sku">' + esc(item.sku) + '</span>' +
      '<h3 class="pub-title"><a href="' + cardUrl(item) + '">' + esc(cleanName(item.name)) + '</a></h3>' +
      (f ? '<p class="pub-facts">' + esc(f) + '</p>' : '') + '</div>' +
      '<div class="pub-buy">' + priceHtml(item) + addSlot(item.slug) + '</div></article>';
  }

  /* строка списка изданий (каталог, разделы, издатели) */
  function listRow(it, lazy) {
    var f = facts(it);
    return '<article class="row">' +
      '<a class="cover row-cover" href="' + cardUrl(it) + '" tabindex="-1" aria-hidden="true"><img src="' + coverSrc(it) + '" alt="' + esc(cleanName(it.name)) + '" width="600" height="850"' + (lazy ? ' loading="lazy"' : '') + '></a>' +
      '<div class="row-main"><p class="row-meta"><span class="sku">' + esc(it.sku) + '</span><span class="row-section">' + esc(it.section) + '</span></p>' +
      '<h3 class="row-title"><a href="' + cardUrl(it) + '">' + esc(cleanName(it.name)) + '</a></h3>' +
      (f || it.publisher ? '<p class="row-facts">' + esc([f, it.publisher].filter(Boolean).join(', ')) + '</p>' : '') + '</div>' +
      '<div class="row-buy">' + priceHtml(it) + addSlot(it.slug) + '</div></article>';
  }

  /* ---------- главная ---------- */
  var POPULAR = ['itu-list-v', 'solas', 'stcw', 'colreg', 'ism', 'isps', 'imdg', 'lsa'];
  function listOf(v) {
    if (v && !Array.isArray(v) && typeof v === 'object') {
      var inner = pick(v, ['cards', 'items', 'list']);
      if (Array.isArray(inner)) return inner;
    }
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') return Object.keys(v).map(function (k) { var o = v[k]; return typeof o === 'object' ? Object.assign({ slug: k }, o) : { slug: k, title: String(o) }; });
    return [];
  }
  function soon(text) { return '<p class="soon">' + (text || 'Раздел готовится.') + '</p>'; }
  var USEFUL_FALLBACK = [
    { slug: 'licenzii-itu', title: 'Электронные лицензии ITU' },
    { slug: 'novye-redakcii-2026', title: 'Новые редакции 2026' },
    { slug: 'obyazatelnye-publikacii', title: 'Обязательные публикации на борту' }
  ];
  function initHome(list, glavnaya) {
    var tiles = $('#tiles');
    if (tiles) {
      var secs = [], smap = {};
      list.forEach(function (it) {
        if (!smap[it.section]) { smap[it.section] = { name: it.section, count: 0, pubs: [] }; secs.push(smap[it.section]); }
        var g = smap[it.section];
        g.count++;
        if (it.publisher && g.pubs.indexOf(it.publisher) === -1) g.pubs.push(it.publisher);
      });
      tiles.innerHTML = secs.map(function (g) {
        return '<a class="tile" href="' + sectionUrl(g.name) + '">' +
          '<h3>' + esc(g.name) + '</h3>' +
          '<p class="tile-sub">' + (g.pubs.length ? 'Издатель: ' + esc(g.pubs.join(', ')) : '&nbsp;') + '</p>' +
          '<span class="tile-foot"><span>' + g.count + ' ' + plural(g.count, 'издание', 'издания', 'изданий') + '</span>' + ARROW + '</span></a>';
      }).join('');
    }
    var pubsEl = $('#publishers');
    if (pubsEl) {
      var izd = entries(IZDATELI);
      pubsEl.innerHTML = ['ЦНИИМФ', 'IMO', 'ITU'].map(function (name) {
        var n = list.filter(function (it) { return it.publisher === name; }).length;
        var e = findEntry(izd, name);
        var sub = e ? plain(paras(e.intro)[0], 140) : '';
        return '<a class="tile" href="' + publisherUrl(name) + '"><h3>' + esc(name) + '</h3>' +
          '<p class="tile-sub">' + (sub ? esc(sub) : '&nbsp;') + '</p>' +
          '<span class="tile-foot"><span>' + n + ' ' + plural(n, 'издание', 'издания', 'изданий') + '</span>' + ARROW + '</span></a>';
      }).join('');
    }
    var useful = $('#useful');
    if (useful) {
      var ul = listOf(pick(glavnaya, ['poleznoe', 'polezno', 'poleznoe_sudovladelcu', 'useful', 'pages', 'cards', 'anonsy', 'anons']));
      if (!ul.length) ul = USEFUL_FALLBACK;
      useful.innerHTML = ul.slice(0, 3).map(function (u) {
        var t = pick(u, ['text', 'description', 'desc', 'anons', 'lead', 'summary']);
        return '<a class="useful-card" href="stranica.html?slug=' + encodeURIComponent(u.slug || '') + '"><h3>' + esc(pick(u, ['title', 'name', 'h1']) || '') + '</h3>' +
          (t ? '<p>' + esc(plain(t, 220)) + '</p>' : '') +
          '<span class="tile-foot"><span>Читать</span>' + ARROW + '</span></a>';
      }).join('');
    }
    var why = $('#why');
    if (why) {
      var wl = listOf(pick(glavnaya, ['pochemu', 'pochemu_my', 'why', 'preimushchestva', 'advantages', 'reasons'])).slice(0, 4);
      why.innerHTML = wl.length ? '<ol class="why-list">' + wl.map(function (w, i) {
        var title = typeof w === 'string' ? '' : pick(w, ['title', 'name', 'h3', 'head']);
        var text = typeof w === 'string' ? w : pick(w, ['text', 'description', 'desc', 'p']);
        return '<li class="why-item"><span class="why-n" aria-hidden="true">' + ('0' + (i + 1)).slice(-2) + '</span>' +
          (title ? '<h3>' + esc(title) + '</h3>' : '') + (text ? '<p>' + md(text) + '</p>' : '') + '</li>';
      }).join('') + '</ol>' : soon();
    }
    var pops = $('#popular');
    if (pops) {
      pops.innerHTML = POPULAR.map(function (s) { return bySlug(list, s); }).filter(Boolean).map(function (it) { return pubCard(it, true); }).join('');
    }
    var itu = $('#itu-list');
    if (itu) {
      itu.innerHTML = ['itu-list-iv', 'itu-list-v', 'itu-maritime-manual'].map(function (s) { return bySlug(list, s); }).filter(Boolean).map(function (it) {
        var short = it.slug === 'itu-maritime-manual' ? 'Maritime Manual' : it.name.split(',')[0];
        return '<li><a href="' + cardUrl(it) + '"><strong>' + esc(short) + ' ' + esc(it.edition) + '</strong>' + priceHtml(it) + '<span class="sku">' + esc(it.sku) + '</span></a></li>';
      }).join('');
    }
    var cnt = $$('[data-total]');
    cnt.forEach(function (el) { el.textContent = list.length + ' ' + plural(list.length, 'издание', 'издания', 'изданий'); });
  }

  /* ---------- каталог ---------- */
  function initCatalog(list) {
    var form = $('#cat-form');
    var q = $('#q'), sort = $('#sort');
    var state = { q: '', group: '', publisher: '', sort: 'sections' };
    var params = new URLSearchParams(window.location.search);
    state.q = params.get('q') || '';
    state.group = params.get('group') || '';
    state.publisher = params.get('publisher') || '';
    if (['sections', 'asc', 'desc'].indexOf(params.get('sort')) > -1) state.sort = params.get('sort');
    var groups = [], pubs = [];
    list.forEach(function (it) {
      if (groups.indexOf(it.group) === -1) groups.push(it.group);
      if (it.publisher && pubs.indexOf(it.publisher) === -1) pubs.push(it.publisher);
    });
    if (groups.indexOf(state.group) === -1) state.group = '';
    if (pubs.indexOf(state.publisher) === -1) state.publisher = '';
    q.value = state.q; sort.value = state.sort;

    function matches(it, skip) {
      if (skip !== 'group' && state.group && it.group !== state.group) return false;
      if (skip !== 'publisher' && state.publisher && it.publisher !== state.publisher) return false;
      var t = state.q.trim().toLowerCase();
      if (t && (it.name + ' ' + it.sku + ' ' + it.slug).toLowerCase().indexOf(t) === -1) return false;
      return true;
    }
    function countFor(field, value) {
      return list.filter(function (it) { return matches(it, field) && (value === '' || it[field] === value); }).length;
    }
    function renderFilters() {
      function block(field, title, values, allLabel) {
        var opts = [''].concat(values).map(function (v) {
          var id = field + '-' + (v === '' ? 'all' : values.indexOf(v));
          return '<label class="opt" for="' + id + '"><input type="radio" name="' + field + '" id="' + id + '" value="' + esc(v) + '"' + (state[field] === v ? ' checked' : '') + '>' +
            '<span>' + esc(v === '' ? allLabel : v) + '</span><span class="cnt">' + countFor(field, v) + '</span></label>';
        }).join('');
        return '<fieldset class="filter-block"><legend>' + title + '</legend>' + opts + '</fieldset>';
      }
      $('#filters-body').innerHTML = block('group', 'Раздел', groups, 'Все разделы') + block('publisher', 'Издатель', pubs, 'Все издатели') +
          (state.publisher && PUBLISHER_SLUGS[state.publisher] ? '<p class="filter-more"><a href="' + publisherUrl(state.publisher) + '">Все издания ' + esc(state.publisher) + '</a></p>' : '');
    }
    function syncUrl() {
      var p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.group) p.set('group', state.group);
      if (state.publisher) p.set('publisher', state.publisher);
      if (state.sort !== 'sections') p.set('sort', state.sort);
      var s = p.toString();
      try { window.history.replaceState(null, '', window.location.pathname + (s ? '?' + s : '')); } catch (e) { /* ничего */ }
    }
    var row = listRow;
    function render() {
      var res = list.filter(function (it) { return matches(it); });
      if (state.sort === 'asc' || state.sort === 'desc') {
        res = res.slice().sort(function (a, b) {
          if (a.price == null && b.price == null) return 0;
          if (a.price == null) return 1;
          if (b.price == null) return -1;
          return state.sort === 'asc' ? a.price - b.price : b.price - a.price;
        });
      }
      var out = '', i = 0;
      if (state.sort === 'sections') {
        var cur = null, buf = [];
        var flush = function () {
          if (cur !== null) out += '<h2 class="sec-head"><a href="' + sectionUrl(cur) + '">' + esc(cur) + '</a><span class="cnt">' + buf.length + '</span></h2><div class="rows">' + buf.join('') + '</div>';
        };
        res.forEach(function (it) {
          if (it.section !== cur) { flush(); cur = it.section; buf = []; }
          buf.push(row(it, i++ > 5));
        });
        flush();
      } else {
        out = '<div class="rows">' + res.map(function (it) { return row(it, i++ > 5); }).join('') + '</div>';
      }
      $('#results').innerHTML = out;
      $('#empty').hidden = res.length !== 0;
      $('#count').innerHTML = res.length === list.length
        ? 'Всего изданий: <strong>' + list.length + '</strong>'
        : 'Найдено: <strong>' + res.length + '</strong> из ' + list.length;
      var active = (state.group ? 1 : 0) + (state.publisher ? 1 : 0);
      $('#filters-n').textContent = active ? ' (' + active + ')' : '';
      renderFilters();
      syncUrl();
    }
    q.addEventListener('input', function () { state.q = q.value; render(); });
    sort.addEventListener('change', function () { state.sort = sort.value; render(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $('#filters-body').addEventListener('change', function (e) {
      if (e.target.name === 'group') state.group = e.target.value;
      if (e.target.name === 'publisher') state.publisher = e.target.value;
      var name = e.target.name, val = e.target.value;
      render();
      var again = $('#filters-body input[name="' + name + '"][value="' + val + '"]');
      if (again) again.focus();
    });
    function reset() { state.q = ''; state.group = ''; state.publisher = ''; q.value = ''; render(); }
    $$('[data-reset]').forEach(function (b) { b.addEventListener('click', reset); });
    var tg = $('#filters-toggle'), fl = $('#filters');
    tg.addEventListener('click', function () {
      var open = fl.classList.toggle('is-open');
      tg.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    render();
  }

  /* ---------- карточка издания ---------- */
  function setMeta(title, desc) {
    document.title = title;
    var m = $('meta[name="description"]');
    if (m) m.setAttribute('content', desc);
  }
  function initProduct(list) {
    var slug = new URLSearchParams(window.location.search).get('slug') || '';
    var it = bySlug(list, slug);
    var root = $('#product');
    if (!it) {
      setMeta('Издание не найдено | Морские публикации', 'Такого издания нет в каталоге.');
      root.innerHTML = '<div class="empty"><h1 class="h-page">Издание не найдено</h1><p>Проверьте ссылку или найдите издание в каталоге.</p><a class="btn btn--primary" href="katalog.html">Перейти в каталог</a></div>';
      return;
    }
    var name = cleanName(it.name);
    setMeta(name + ' купить | Морские публикации',
      name + (it.publisher ? ', издатель ' + it.publisher : '') + '. Артикул ' + it.sku + '. Закажите через заявку, счёт выставит бухгалтерия.');
    $('#crumb-group').innerHTML = '<a href="' + sectionUrl(it.section) + '">' + esc(it.section) + '</a>';
    $('#crumb-name').textContent = name.length > 60 ? name.slice(0, 57) + '...' : name;

    var spec = [['Артикул', '<dd class="sku">' + esc(it.sku) + '</dd>']];
    spec.push(['Раздел', '<dd>' + esc(it.section) + '</dd>']);
    if (it.publisher) spec.push(['Издатель', '<dd>' + (PUBLISHER_SLUGS[it.publisher] ? '<a href="' + publisherUrl(it.publisher) + '">' + esc(it.publisher) + '</a>' : esc(it.publisher)) + '</dd>']);
    if (it.edition) spec.push(['Год издания', '<dd>' + esc(it.edition) + '</dd>']);
    if (it.language) spec.push(['Язык', '<dd>' + esc(it.language) + '</dd>']);
    if (it.format) spec.push(['Формат', '<dd>' + esc(it.format) + '</dd>']);
    if (it.pages) spec.push(['Страниц', '<dd>' + esc(it.pages) + '</dd>']);

    var related = list.filter(function (x) { return x.group === it.group && x.slug !== it.slug; });
    related.sort(function (a, b) {
      var sa = a.section === it.section ? 0 : 1, sb = b.section === it.section ? 0 : 1;
      var ra = a.cover_is_placeholder ? 1 : 0, rb = b.cover_is_placeholder ? 1 : 0;
      return sa - sb || ra - rb;
    });
    related = related.slice(0, 4);

    root.innerHTML =
      '<div class="product">' +
        '<div class="product-cover"><div class="cover"><img src="' + coverSrc(it) + '" alt="' + esc(name) + '" width="600" height="850"></div></div>' +
        '<div class="product-info">' +
          '<h1 class="h-page">' + esc(name) + '</h1>' +
          '<dl class="specs">' + spec.map(function (s) { return '<div><dt>' + s[0] + '</dt>' + s[1] + '</div>'; }).join('') + '</dl>' +
          '<div class="buybox">' +
            (it.price == null ? '<p class="price-big price--ask">Цена по запросу</p><p class="small muted">Издание можно добавить в корзину, цену уточнит менеджер.</p>' : '<p class="price-big">' + money(it.price) + '</p>') +
            '<div class="buy-row"><div class="qty" role="group" aria-label="Количество">' +
              '<button type="button" data-q="-1" aria-label="Уменьшить количество">&minus;</button>' +
              '<input type="number" id="qty" min="1" max="99" value="1" inputmode="numeric" aria-label="Количество экземпляров">' +
              '<button type="button" data-q="1" aria-label="Увеличить количество">+</button></div>' +
              '<button type="button" class="btn btn--primary btn--lg" id="add-main">Добавить в корзину</button></div>' +
            '<p class="buy-status" id="buy-status" role="status"></p>' +
          '</div>' +
          (it.license_note ? '<div class="plaque"><strong>Электронная лицензия</strong><p>' + esc(it.license_note.charAt(0).toUpperCase() + it.license_note.slice(1)) + '</p></div>' : '') +
          (it.publisher === 'ITU' || it.license_note ? '<p class="itu-more"><a href="stranica.html?slug=licenzii-itu">Как работают электронные лицензии ITU</a></p>' : '') +
          '<div class="howto"><h2 class="block-title howto-head">Как заказать</h2><ol>' +
            '<li>Добавьте издание в корзину.</li><li>Укажите порт или адрес и желаемую дату доставки.</li><li>Бухгалтерия выставит счёт.</li></ol></div>' +
          (it.description ? '<div class="desc"><h2 class="block-title">Описание</h2><p>' + esc(it.description) + '</p></div>' : '') +
        '</div></div>' +
      (related.length ? '<section class="related" aria-labelledby="rel-h"><div class="section-head"><h2 class="h-section" id="rel-h">Из того же раздела</h2></div><div class="pubs">' + related.map(function (r) { return pubCard(r, true); }).join('') + '</div></section>' : '');

    var qty = $('#qty'), status = $('#buy-status');
    function clamp() { var v = parseInt(qty.value, 10); if (!(v >= 1)) v = 1; if (v > 99) v = 99; qty.value = v; return v; }
    $$('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () { qty.value = clamp() + parseInt(b.getAttribute('data-q'), 10); clamp(); });
    });
    qty.addEventListener('change', clamp);
    $('#add-main').addEventListener('click', function () {
      addToCart(it.slug, clamp());
      var n = cartQty(it.slug);
      status.innerHTML = 'В корзине: ' + n + ' шт. <a href="korzina.html">Открыть корзину</a>';
      refreshSlots();
    });
    var n0 = cartQty(it.slug);
    if (n0) status.innerHTML = 'В корзине: ' + n0 + ' шт. <a href="korzina.html">Открыть корзину</a>';
  }

  /* ---------- заявка: страница ---------- */
  function initCart(list) {
    var root = $('#cart-root');

    function lines() {
      return readCart().map(function (l) { return { item: bySlug(list, l.slug), qty: l.qty }; }).filter(function (l) { return l.item; });
    }
    function totalsHtml(ls) {
      var sum = 0, ask = 0;
      ls.forEach(function (l) { if (l.item.price == null) ask++; else sum += l.item.price * l.qty; });
      var s = '<p class="total-main">Сумма по позициям с ценой: ' + (sum > 0 ? '<span class="nowrap">' + money(sum) + '</span>' : '<span class="nowrap">0 руб</span>') + '</p>';
      if (ask) s += '<p class="total-ask">' + ask + ' ' + plural(ask, 'позиция', 'позиции', 'позиций') + ' по запросу, цену уточнит менеджер.</p>';
      return s;
    }
    function listHtml(ls) {
      return ls.map(function (l) {
        var it = l.item;
        var lineP = it.price == null ? '<span class="price--ask">Цена по запросу</span>' :
          '<span class="nowrap">' + money(it.price * l.qty) + '</span>' + (l.qty > 1 ? '<small>' + money(it.price) + ' за шт.</small>' : '');
        return '<li class="cart-row" data-slug="' + esc(it.slug) + '">' +
          '<a class="cover" href="' + cardUrl(it) + '" tabindex="-1" aria-hidden="true"><img src="' + coverSrc(it) + '" alt="' + esc(cleanName(it.name)) + '" width="600" height="850" loading="lazy"></a>' +
          '<div class="cart-main"><span class="sku">' + esc(it.sku) + '</span><a href="' + cardUrl(it) + '">' + esc(cleanName(it.name)) + '</a>' +
            (facts(it) ? '<span class="small muted">' + esc(facts(it)) + '</span>' : '') + '</div>' +
          '<div class="cart-ctl"><div class="qty" role="group" aria-label="Количество: ' + esc(cleanName(it.name)) + '">' +
            '<button type="button" data-step="-1" aria-label="Уменьшить количество">&minus;</button>' +
            '<input type="number" min="1" max="99" value="' + l.qty + '" inputmode="numeric" aria-label="Количество">' +
            '<button type="button" data-step="1" aria-label="Увеличить количество">+</button></div>' +
            '<p class="line-price">' + lineP + '</p>' +
            '<button type="button" class="link-btn" data-remove>Удалить</button></div></li>';
      }).join('');
    }

    function renderEmpty() {
      root.innerHTML = '<div class="empty"><h2>В корзине пока пусто</h2><p>Добавьте издания из каталога, затем вернитесь сюда, чтобы указать порт и дату доставки.</p><a class="btn btn--primary btn--lg" href="katalog.html">Перейти в каталог</a></div>';
    }

    function renderCart(keepFocus) {
      var ls = lines();
      if (!ls.length) { renderEmpty(); return; }
      if (!root.querySelector('.cart-layout')) {
        root.innerHTML =
          '<div class="cart-layout"><div><ul class="cart-list" id="cart-list"></ul><div class="totals" id="totals" aria-live="polite"></div>' +
          '<p style="margin-top:16px"><a href="katalog.html">Добавить ещё издания</a></p></div>' + formHtml_() + '</div>';
        bindForm();
      }
      $('#cart-list').innerHTML = listHtml(ls);
      $('#totals').innerHTML = totalsHtml(ls);
      if (keepFocus) {
        var el = keepFocus.slug ? $('.cart-row[data-slug="' + keepFocus.slug + '"] ' + keepFocus.sel) : null;
        if (el) el.focus();
        else { var h = $('#cart-title'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
      }
    }

    function field(id, label, opts) {
      opts = opts || {};
      var cls = opts.textarea ? 'textarea' : 'input';
      var input = opts.textarea
        ? '<textarea class="' + cls + '" id="' + id + '" name="' + id + '" rows="4"' + (opts.ac ? ' autocomplete="' + opts.ac + '"' : '') + '></textarea>'
        : '<input class="' + cls + '" id="' + id + '" name="' + id + '" type="' + (opts.type || 'text') + '"' + (opts.ac ? ' autocomplete="' + opts.ac + '"' : '') +
          (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : '') + (opts.ph ? ' placeholder="' + opts.ph + '"' : '') + (opts.min ? ' min="' + opts.min + '"' : '') +
          (opts.req ? ' aria-required="true"' : '') + '>';
      return '<div class="field"><label for="' + id + '">' + label + (opts.req ? '<span class="req" aria-hidden="true">*</span>' : '') + (opts.hint ? '<span class="hint">' + opts.hint + '</span>' : '') + '</label>' +
        input + '<p class="field-error" id="' + id + '-err"></p></div>';
    }
    function todayIso() {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function formHtml_() {
      return '<form class="cart-form" id="order-form" novalidate aria-labelledby="form-h">' +
        '<h2 id="form-h">Данные для заявки</h2>' +
        '<p class="form-note">Поля со звёздочкой обязательны. Оплаты на сайте нет, счёт выставит бухгалтерия.</p>' +
        '<div class="form-grid">' +
          field('company', 'Компания (заказчик)', { req: true, ac: 'organization' }) +
          field('person', 'Контактное лицо', { ac: 'name' }) +
          '<div class="form-grid form-grid--2">' + field('email', 'Email', { req: true, type: 'email', ac: 'email' }) + field('phone', 'Телефон', { req: true, type: 'tel', ac: 'tel', ph: '+7' }) + '</div>' +
          field('place', 'Место доставки (порт, судно или адрес)', { req: true }) +
          field('date', 'Желаемая дата доставки', { req: true, type: 'date', min: todayIso() }) +
          field('inn', 'ИНН (для счёта)', { hint: 'поле по согласованию', inputmode: 'numeric' }) +
          field('comment', 'Комментарий', { textarea: true }) +
        '</div>' +
        '<div class="consent"><label for="consent"><input type="checkbox" id="consent" name="consent" aria-required="true"><span>Согласен(на) на обработку персональных данных в соответствии с <a href="#">политикой обработки персональных данных</a></span></label><p class="field-error" id="consent-err"></p></div>' +
        '<button type="submit" class="btn btn--primary btn--lg btn--block">Отправить заявку</button>' +
        '</form>';
    }

    var RULES = [
      { id: 'company', msg: 'Укажите название компании', test: function (v) { return v.trim().length > 1; } },
      { id: 'email', msg: 'Укажите почту в формате name@company.ru', test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
      { id: 'phone', msg: 'Укажите телефон, не меньше 7 цифр', test: function (v) { return v.replace(/\D/g, '').length >= 7 && /^[\d\s()+\-.]+$/.test(v.trim()); } },
      { id: 'place', msg: 'Укажите порт, судно или адрес доставки', test: function (v) { return v.trim().length > 2; } },
      { id: 'date', msg: 'Выберите желаемую дату доставки', test: function (v) { return !!v; } },
      { id: 'date', msg: 'Дата не может быть раньше сегодняшней', test: function (v) { return !v || v >= todayIso(); } }
    ];
    function setError(id, msg) {
      var input = $('#' + id), err = $('#' + id + '-err');
      if (!err) return;
      err.textContent = msg || '';
      if (input) {
        if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id + '-err'); }
        else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
      }
    }
    function validate() {
      var firstBad = null, seen = {};
      RULES.forEach(function (r) {
        if (seen[r.id]) return;
        var v = $('#' + r.id).value;
        if (!r.test(v)) { seen[r.id] = true; setError(r.id, r.msg); if (!firstBad) firstBad = $('#' + r.id); }
        else setError(r.id, '');
      });
      var c = $('#consent');
      if (!c.checked) {
        $('#consent-err').textContent = 'Отметьте согласие на обработку персональных данных, без него заявку отправить нельзя';
        c.setAttribute('aria-invalid', 'true'); c.setAttribute('aria-describedby', 'consent-err');
        if (!firstBad) firstBad = c;
      } else {
        $('#consent-err').textContent = ''; c.removeAttribute('aria-invalid'); c.removeAttribute('aria-describedby');
      }
      return firstBad;
    }
    function bindForm() {
      var form = $('#order-form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = validate();
        if (bad) { bad.focus(); return; }
        done(nextOrderNo());
      });
      form.addEventListener('input', function (e) {
        var id = e.target.id;
        if (e.target.getAttribute('aria-invalid') === 'true') {
          if (id === 'consent') { if (e.target.checked) validate(); return; }
          var r = RULES.filter(function (x) { return x.id === id; });
          var ok = r.every(function (x) { return x.test(e.target.value); });
          if (ok) setError(id, '');
        }
      });
    }
    function done(no) {
      var ls = lines();
      var sumLines = ls.map(function (l) {
        return '<li><span>' + esc(cleanName(l.item.name)) + '</span><span>' + l.qty + ' шт.</span></li>';
      }).join('');
      var totals = totalsHtml(ls);
      writeCart([]);
      root.innerHTML = '<div class="done" id="done" tabindex="-1" role="status"><h2>Заявка принята</h2>' +
        '<p>Мы свяжемся с вами и пришлём счёт.</p>' +
        '<p><span class="order-no">Номер заявки: ' + esc(no) + '</span></p>' +
        '<ul>' + sumLines + '</ul><div class="totals">' + totals + '</div>' +
        '<p class="small muted">Это демонстрационный макет: заявка никуда не отправлена.</p>' +
        '<div class="done-actions"><a class="btn btn--primary" href="katalog.html">Вернуться в каталог</a><a class="btn" href="index.html">На главную</a></div></div>';
      var d = $('#done'); if (d) d.focus();
      window.scrollTo(0, 0);
    }

    root.addEventListener('click', function (e) {
      var row = e.target.closest('.cart-row');
      if (!row) return;
      var slug = row.getAttribute('data-slug');
      var step = e.target.closest('[data-step]');
      if (step) {
        var cur = cartQty(slug);
        setQty(slug, cur + parseInt(step.getAttribute('data-step'), 10));
        renderCart({ slug: slug, sel: '[data-step="' + step.getAttribute('data-step') + '"]' });
        return;
      }
      if (e.target.closest('[data-remove]')) {
        var next = row.nextElementSibling || row.previousElementSibling;
        removeFromCart(slug);
        renderCart(next ? { slug: next.getAttribute('data-slug'), sel: '[data-remove]' } : {});
      }
    });
    root.addEventListener('change', function (e) {
      if (e.target.matches('.qty input')) {
        var row = e.target.closest('.cart-row'), slug = row.getAttribute('data-slug');
        var v = parseInt(e.target.value, 10); if (!(v >= 1)) v = 1;
        setQty(slug, v);
        renderCart({ slug: slug, sel: '.qty input' });
      }
    });
    renderCart();
  }

  /* ---------- разделы, издатели, информационные страницы ---------- */
  function txt(b) {
    var v = pick(b, ['text', 'content', 'value', 'body', 'title']);
    return v == null ? '' : v;
  }
  function faqHtml(items) {
    items = listOf(items);
    if (!items.length) return '';
    return '<div class="faq">' + items.map(function (f) {
      var q = pick(f, ['q', 'question', 'title']) || '';
      var a = paras(pick(f, ['a', 'answer', 'text']) || '');
      return '<details><summary>' + esc(q) + '</summary><div>' + a.map(function (x) { return '<p>' + md(x) + '</p>'; }).join('') + '</div></details>';
    }).join('') + '</div>';
  }
  function setNotFound(root, what) {
    setMeta(what + ' не найден | Морские публикации', 'Такой страницы нет на сайте.');
    var cn = $('#crumb-name'); if (cn) cn.textContent = 'Не найдено';
    root.innerHTML = '<div class="empty"><h1 class="h-page">' + what + ' не найден</h1><p>Проверьте ссылку или откройте каталог.</p><a class="btn btn--primary" href="katalog.html">Перейти в каталог</a></div>';
  }
  /* общая посадочная: раздел или издатель */
  function landing(root, o) {
    var e = o.entry;
    var h1 = (e && e.h1) || o.name;
    var intro = e ? paras(e.intro) : [];
    setMeta((e && e.title) || (o.name + ' | Морские публикации'),
      (e && e.description) || ('Издания каталога: ' + o.name + '. Добавьте издания в корзину, счёт выставит бухгалтерия.'));
    $('#crumb-name').textContent = o.name;
    var n = o.items.length;
    var faq = e ? faqHtml(e.faq) : '';
    root.innerHTML =
      '<article class="landing">' +
        '<header class="landing-head"><h1 class="h-page">' + esc(h1) + '</h1>' +
          (intro.length ? '<div class="landing-intro">' + intro.map(function (x) { return '<p>' + md(x) + '</p>'; }).join('') + '</div>' : soon('Раздел готовится: описание появится позже.')) +
        '</header>' +
        '<section class="landing-items" aria-labelledby="items-h">' +
          '<div class="section-head"><h2 class="h-section" id="items-h">' + esc(o.itemsTitle) + '</h2><p>' + n + ' ' + plural(n, 'издание', 'издания', 'изданий') + '</p></div>' +
          (n ? '<div class="rows" id="items">' + o.items.map(function (it, i) { return listRow(it, i > 3); }).join('') + '</div>' : '<p class="muted">Пока нет изданий.</p>') +
          (o.catalogUrl ? '<p class="landing-more"><a href="' + o.catalogUrl + '">' + esc(o.catalogText) + '</a></p>' : '') +
        '</section>' +
        (faq ? '<section class="landing-faq" aria-labelledby="faq-h2"><div class="section-head"><h2 class="h-section" id="faq-h2">Частые вопросы</h2></div>' + faq + '</section>' : '') +
        '<nav class="landing-sib" aria-labelledby="sib-h"><div class="section-head"><h2 class="h-section" id="sib-h">' + esc(o.sibTitle) + '</h2></div>' +
          '<ul class="sib-list">' + o.siblings.map(function (x) {
            return '<li><a href="' + x.href + '"><span>' + esc(x.name) + '</span><span class="cnt">' + x.count + '</span></a></li>';
          }).join('') + '</ul></nav>' +
      '</article>';
  }
  function initSection(list) {
    var slug = new URLSearchParams(window.location.search).get('slug') || '';
    var root = $('#page-root');
    var ents = entries(RAZDELY), entry = null, name = '';
    ents.forEach(function (e) { if (e.slug === slug) { entry = e; name = e.key; } });
    if (!entry) Object.keys(SECTION_SLUGS).forEach(function (k) { if (SECTION_SLUGS[k] === slug) name = k; });
    if (!name || !list.some(function (it) { return it.section === name; })) { setNotFound(root, 'Раздел'); return; }
    var all = [];
    list.forEach(function (it) { if (all.indexOf(it.section) === -1) all.push(it.section); });
    landing(root, {
      entry: entry, name: name, itemsTitle: 'Издания раздела',
      items: list.filter(function (it) { return it.section === name; }),
      siblings: all.filter(function (x) { return x !== name; }).map(function (x) {
        return { name: x, href: sectionUrl(x), count: list.filter(function (it) { return it.section === x; }).length };
      }),
      sibTitle: 'Другие разделы'
    });
    root.classList.add('is-section');
  }
  function initPublisher(list) {
    var slug = new URLSearchParams(window.location.search).get('slug') || '';
    var root = $('#page-root');
    var name = '';
    Object.keys(PUBLISHER_SLUGS).forEach(function (k) { if (PUBLISHER_SLUGS[k] === slug) name = k; });
    if (!name) { setNotFound(root, 'Издатель'); return; }
    landing(root, {
      entry: findEntry(entries(IZDATELI), name), name: name, itemsTitle: 'Издания ' + name,
      items: list.filter(function (it) { return it.publisher === name; }),
      catalogUrl: 'katalog.html?publisher=' + encodeURIComponent(name), catalogText: 'Открыть в каталоге с поиском и сортировкой',
      siblings: Object.keys(PUBLISHER_SLUGS).filter(function (x) { return x !== name; }).map(function (x) {
        return { name: 'Издания ' + x, href: publisherUrl(x), count: list.filter(function (it) { return it.publisher === x; }).length };
      }),
      sibTitle: 'Другие издатели'
    });
  }

  var KNOWN_PAGES = {
    'licenzii-itu': 'Электронные лицензии ITU', 'novye-redakcii-2026': 'Новые редакции 2026', 'obyazatelnye-publikacii': 'Обязательные публикации на борту',
    'oplata-i-dostavka': 'Оплата и доставка', 'o-kompanii': 'О компании', 'kontakty': 'Контакты'
  };
  function cellHtml(c) { return md(c == null ? '' : c); }
  function itemHtml(x) {
    if (typeof x === 'string') return md(x);
    var t = pick(x, ['title', 'name', 'head']), b = pick(x, ['text', 'description', 'desc']);
    return (t ? '<strong>' + esc(t) + '</strong>' : '') + (t && b ? ' ' : '') + (b ? md(b) : '');
  }
  function blockHtml(b, list, ctx) {
    var type = pick(b, ['type', 't', 'kind']);
    var items = pick(b, ['items', 'list']) || [];
    switch (type) {
      case 'h2':
        ctx.h2.push(txt(b));
        return '<h2 class="doc-h2" id="sec-' + ctx.h2.length + '">' + esc(txt(b)) + '</h2>';
      case 'h3': return '<h3 class="doc-h3">' + esc(txt(b)) + '</h3>';
      case 'p': return '<p>' + md(txt(b)) + '</p>';
      case 'list': return '<ul class="doc-list">' + items.map(function (x) { return '<li>' + itemHtml(x) + '</li>'; }).join('') + '</ul>';
      case 'steps': return '<ol class="doc-steps">' + items.map(function (x) { return '<li>' + itemHtml(x) + '</li>'; }).join('') + '</ol>';
      case 'table':
        var head = b.head || b.header || [], rows = b.rows || [];
        return '<div class="table-wrap" role="region" tabindex="0" aria-label="' + esc(b.caption || 'Таблица, прокручивается по горизонтали') + '"><table class="doc-table">' +
          (head.length ? '<thead><tr>' + head.map(function (h) { return '<th scope="col">' + cellHtml(h) + '</th>'; }).join('') + '</tr></thead>' : '') +
          '<tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + cellHtml(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      case 'faq': return faqHtml(items);
      case 'products':
        var found = (b.slugs || items || []).map(function (sl) { return bySlug(list, typeof sl === 'string' ? sl : sl && sl.slug); }).filter(Boolean);
        return found.length ? '<div class="pubs pubs--mini">' + found.map(function (it) { return pubCard(it, true); }).join('') + '</div>' : '';
      case 'note':
        return '<div class="plaque">' + (b.title ? '<strong>' + esc(b.title) + '</strong>' : '') + '<p>' + md(pick(b, ['text', 'content', 'value', 'body']) || '') + '</p></div>';
      case 'placeholder':
        return '<div class="placeholder" role="note"><p>' + md(pick(b, ['text', 'content', 'value', 'body', 'title']) || 'Заполним по данным заказчика.') + '</p></div>';
      default: return '';
    }
  }
  function docCta() {
    return '<section class="cta" aria-labelledby="cta-h"><div><h2 id="cta-h">Нужны издания?</h2><p>Выберите в каталоге и добавьте в корзину, счёт выставит бухгалтерия.</p></div>' +
      '<a class="btn btn--primary btn--lg" href="katalog.html">Перейти в каталог</a></section>';
  }
  function initPage(list, page) {
    var slug = new URLSearchParams(window.location.search).get('slug') || '';
    var root = $('#page-root');
    if (!/^[a-z0-9-]+$/.test(slug) || (!page && !KNOWN_PAGES[slug])) { setNotFound(root, 'Страница'); return; }
    if (!page || typeof page !== 'object') {
      var nm = KNOWN_PAGES[slug];
      setMeta(nm + ' | Морские публикации', 'Страница готовится.');
      $('#crumb-name').textContent = nm;
      root.innerHTML = '<article class="doc"><header class="doc-head"><h1 class="h-page">' + esc(nm) + '</h1></header>' + soon() + docCta() + '</article>';
      return;
    }
    var h1 = page.h1 || page.title || KNOWN_PAGES[slug] || '';
    setMeta(page.title || (h1 + ' | Морские публикации'), page.description || (h1 + '. Информация для покупателей морских изданий.'));
    $('#crumb-name').textContent = plain(KNOWN_PAGES[slug] || h1, 60);
    var ctx = { h2: [] };
    var body = (page.blocks || []).map(function (b) { return blockHtml(b, list, ctx); }).join('');
    var toc = ctx.h2.length >= 3 ? '<nav class="doc-toc" aria-label="На странице"><p class="doc-toc-h">На странице</p><ol>' + ctx.h2.map(function (t, i) {
      return '<li><a href="#sec-' + (i + 1) + '">' + esc(t) + '</a></li>';
    }).join('') + '</ol></nav>' : '';
    var srcs = listOf(page.sources).map(function (x) {
      var url = typeof x === 'string' ? x : pick(x, ['url', 'href', 'link']);
      var title = typeof x === 'string' ? x : pick(x, ['title', 'text', 'name']) || url;
      if (!url || !/^https?:\/\/[^\s"'<>]+$/.test(url)) return '';
      return '<li><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(title) + '<span class="visually-hidden"> (откроется в новой вкладке)</span></a></li>';
    }).join('');
    var upd = page.updated ? '<p class="updated">Обновлено ' + esc(fmtDate(String(page.updated).replace(/^Обновлено\s*/i, ''))) + '</p>' : '';
    root.innerHTML =
      '<article class="doc' + (toc ? ' doc--toc' : '') + '">' +
        '<header class="doc-head"><h1 class="h-page">' + esc(h1) + '</h1>' +
          (page.lead ? '<p class="lead">' + md(page.lead) + '</p>' : '') + upd + '</header>' +
        (toc ? '<aside class="doc-aside">' + toc + '</aside>' : '') +
        '<div class="doc-body">' + body +
          (srcs ? '<section class="doc-sources" aria-labelledby="src-h"><h2 class="doc-h2" id="src-h">Источники</h2><ul>' + srcs + '</ul></section>' : '') +
          docCta() +
        '</div></article>';
  }

  /* ---------- запуск ---------- */
  initHeader();
  var PAGES = ['home', 'catalog', 'product', 'cart', 'section', 'publisher', 'info'];
  if (PAGES.indexOf(page) > -1) {
    var qslug = new URLSearchParams(window.location.search).get('slug') || '';
    var needsText = page !== 'cart';
    Promise.all([
      loadCatalog(),
      needsText ? loadOpt('razdely.json') : null,
      needsText ? loadOpt('izdateli.json') : null,
      page === 'home' ? loadOpt('glavnaya.json') : null,
      page === 'info' && /^[a-z0-9-]+$/.test(qslug) ? loadOpt('pages/' + qslug + '.json') : null
    ]).then(function (r) {
      var list = r[0];
      RAZDELY = r[1]; IZDATELI = r[2];
      if (page === 'home') initHome(list, r[3]);
      if (page === 'catalog') initCatalog(list);
      if (page === 'product') initProduct(list);
      if (page === 'cart') initCart(list);
      if (page === 'section') initSection(list);
      if (page === 'publisher') initPublisher(list);
      if (page === 'info') initPage(list, r[4]);
      updateCount();
    }).catch(function (err) {
      var m = $('#main');
      if (window.console && console.warn) console.warn(err);
      if (m) m.insertAdjacentHTML('afterbegin', '<div class="container"><p class="field-error" role="alert">Не удалось загрузить каталог. Откройте макет через локальный сервер.</p></div>');
    });
  }
})();
