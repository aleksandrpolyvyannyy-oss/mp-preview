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
      a.setAttribute('aria-label', 'Заявка, позиций: ' + total);
    });
  }
  function nextOrderNo() {
    var n;
    try { n = parseInt(window.localStorage.getItem(ORDER_KEY) || '0', 10) || 0; } catch (e) { n = memorySeq; }
    n += 1; memorySeq = n;
    try { window.localStorage.setItem(ORDER_KEY, String(n)); } catch (e) { /* ничего */ }
    return 'Z-2026-' + ('0000' + n).slice(-4);
  }

  /* ---------- кнопка «В заявку» ---------- */
  function addSlot(slug) {
    return '<span class="add-slot" data-slot="' + esc(slug) + '">' + addControl(slug) + '</span>';
  }
  function addControl(slug) {
    if (cartQty(slug) > 0) {
      return '<a class="btn btn--added" href="korzina.html">В заявке ' + CHECK + '</a>';
    }
    return '<button type="button" class="btn btn--primary" data-add="' + esc(slug) + '">В заявку</button>';
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
    if (live) live.textContent = 'Издание добавлено в заявку';
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

  /* ---------- главная ---------- */
  var POPULAR = ['itu-list-v', 'solas', 'stcw', 'colreg', 'ism', 'isps', 'imdg', 'lsa'];
  function initHome(list) {
    var tiles = $('#tiles');
    if (tiles) {
      var groups = [], map = {};
      list.forEach(function (it) {
        if (!map[it.group]) { map[it.group] = { name: it.group, count: 0, sections: [] }; groups.push(map[it.group]); }
        var g = map[it.group];
        g.count++;
        if (it.section !== it.group) {
          var s = it.section.replace(/^[^:]+:\s*/, '');
          if (g.sections.indexOf(s) === -1) g.sections.push(s);
        }
      });
      tiles.innerHTML = groups.map(function (g) {
        return '<a class="tile" href="katalog.html?group=' + encodeURIComponent(g.name) + '">' +
          '<h3>' + esc(g.name) + '</h3>' +
          '<p class="tile-sub">' + (g.sections.length ? esc(g.sections.join(', ')) : '&nbsp;') + '</p>' +
          '<span class="tile-foot"><span>' + g.count + ' ' + plural(g.count, 'издание', 'издания', 'изданий') + '</span>' + ARROW + '</span></a>';
      }).join('');
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
      $('#filters-body').innerHTML = block('group', 'Раздел', groups, 'Все разделы') + block('publisher', 'Издатель', pubs, 'Все издатели');
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
    function row(it, lazy) {
      var f = facts(it);
      return '<article class="row">' +
        '<a class="cover row-cover" href="' + cardUrl(it) + '" tabindex="-1" aria-hidden="true"><img src="' + coverSrc(it) + '" alt="' + esc(cleanName(it.name)) + '" width="600" height="850"' + (lazy ? ' loading="lazy"' : '') + '></a>' +
        '<div class="row-main"><p class="row-meta"><span class="sku">' + esc(it.sku) + '</span><span class="row-section">' + esc(it.section) + '</span></p>' +
        '<h3 class="row-title"><a href="' + cardUrl(it) + '">' + esc(cleanName(it.name)) + '</a></h3>' +
        (f || it.publisher ? '<p class="row-facts">' + esc([f, it.publisher].filter(Boolean).join(', ')) + '</p>' : '') + '</div>' +
        '<div class="row-buy">' + priceHtml(it) + addSlot(it.slug) + '</div></article>';
    }
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
          if (cur !== null) out += '<h2 class="sec-head"><span>' + esc(cur) + '</span><span class="cnt">' + buf.length + '</span></h2><div class="rows">' + buf.join('') + '</div>';
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
    $('#crumb-group').innerHTML = '<a href="katalog.html?group=' + encodeURIComponent(it.group) + '">' + esc(it.group) + '</a>';
    $('#crumb-name').textContent = name.length > 60 ? name.slice(0, 57) + '...' : name;

    var spec = [['Артикул', '<dd class="sku">' + esc(it.sku) + '</dd>']];
    spec.push(['Раздел', '<dd>' + esc(it.section) + '</dd>']);
    if (it.publisher) spec.push(['Издатель', '<dd>' + esc(it.publisher) + '</dd>']);
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
            (it.price == null ? '<p class="price-big price--ask">Цена по запросу</p><p class="small muted">Издание можно добавить в заявку, цену уточнит менеджер.</p>' : '<p class="price-big">' + money(it.price) + '</p>') +
            '<div class="buy-row"><div class="qty" role="group" aria-label="Количество">' +
              '<button type="button" data-q="-1" aria-label="Уменьшить количество">&minus;</button>' +
              '<input type="number" id="qty" min="1" max="99" value="1" inputmode="numeric" aria-label="Количество экземпляров">' +
              '<button type="button" data-q="1" aria-label="Увеличить количество">+</button></div>' +
              '<button type="button" class="btn btn--primary btn--lg" id="add-main">Добавить в заявку</button></div>' +
            '<p class="buy-status" id="buy-status" role="status"></p>' +
          '</div>' +
          (it.license_note ? '<div class="plaque"><strong>Электронная лицензия</strong><p>' + esc(it.license_note.charAt(0).toUpperCase() + it.license_note.slice(1)) + '</p></div>' : '') +
          '<div class="howto"><h2 class="block-title howto-head">Как заказать</h2><ol>' +
            '<li>Добавьте издание в заявку.</li><li>Укажите порт или адрес и желаемую дату доставки.</li><li>Бухгалтерия выставит счёт.</li></ol></div>' +
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
      status.innerHTML = 'В заявке: ' + n + ' шт. <a href="korzina.html">Открыть заявку</a>';
      refreshSlots();
    });
    var n0 = cartQty(it.slug);
    if (n0) status.innerHTML = 'В заявке: ' + n0 + ' шт. <a href="korzina.html">Открыть заявку</a>';
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
      root.innerHTML = '<div class="empty"><h2>В заявке пока пусто</h2><p>Добавьте издания из каталога, затем вернитесь сюда, чтобы указать порт и дату доставки.</p><a class="btn btn--primary btn--lg" href="katalog.html">Перейти в каталог</a></div>';
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

  /* ---------- запуск ---------- */
  initHeader();
  if (page === 'home' || page === 'catalog' || page === 'product' || page === 'cart') {
    loadCatalog().then(function (list) {
      if (page === 'home') initHome(list);
      if (page === 'catalog') initCatalog(list);
      if (page === 'product') initProduct(list);
      if (page === 'cart') initCart(list);
      updateCount();
    }).catch(function () {
      var m = $('#main');
      if (m) m.insertAdjacentHTML('afterbegin', '<div class="container"><p class="field-error" role="alert">Не удалось загрузить каталог. Откройте макет через локальный сервер.</p></div>');
    });
  }
})();
