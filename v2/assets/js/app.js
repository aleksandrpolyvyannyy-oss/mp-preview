/* Общий код варианта v2: корзина (localStorage, ключ mp_cart_v2), шапка, карточки изданий. */
(function () {
  'use strict';

  var KEY = 'mp_cart_v2';
  var SEQ_KEY = 'mp_seq_v2';
  var MP = (window.MP = {});
  var memory = {};

  /* ---------- утилиты ---------- */
  MP.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* в данных встречается длинное тире, в текстах его не показываем */
  MP.clean = function (s) { return String(s == null ? '' : s).replace(/[\u2013\u2014]/g, '-'); };
  MP.money = function (n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' руб';
  };
  MP.plural = function (n, forms) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  };
  MP.priceHtml = function (item, cls) {
    cls = cls ? ' ' + cls : '';
    if (item.price == null) return '<span class="price price--ask' + cls + '">Цена по запросу</span>';
    return '<span class="price' + cls + '">' + MP.money(item.price) + '</span>';
  };
  MP.metaLine = function (item) {
    return [item.edition, item.format].filter(function (v) { return v != null && v !== ''; }).join(', ');
  };
  MP.cover = function (item) { return '../' + item.cover; };
  MP.href = function (item) { return 'kartochka.html?slug=' + encodeURIComponent(item.slug); };
  MP.norm = function (s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); };

  /* ---------- каталог ---------- */
  var catalogPromise = null;
  MP.loadCatalog = function () {
    if (!catalogPromise) {
      catalogPromise = fetch('../data/catalog.json').then(function (r) {
        if (!r.ok) throw new Error('catalog ' + r.status);
        return r.json();
      });
    }
    return catalogPromise;
  };
  MP.catalogError = function (el) {
    el.innerHTML = '<div class="wrap"><div class="empty"><h2>Каталог не загрузился</h2><p>Обновите страницу. Если макет открыт с диска, запустите его через локальный сервер.</p></div></div>';
  };

  /* ---------- разделы и издатели: адреса страниц ---------- */
  /* порядок как в меню; ключ = поле section из catalog.json, slug совпадает с razdely.json */
  MP.SECTIONS = [
    { key: 'Судовые журналы', slug: 'sudovye-zhurnaly' },
    { key: 'ITU', slug: 'itu' },
    { key: 'IMO: конвенции', slug: 'imo-konvencii' },
    { key: 'IMO: кодексы', slug: 'imo-kodeksy' },
    { key: 'IMO: руководства', slug: 'imo-rukovodstva' },
    { key: 'Контроль государства порта', slug: 'kontrol-gosudarstva-porta' },
    { key: 'Радиосвязь РФ', slug: 'radiosvyaz' },
    { key: 'Admiralty', slug: 'admiralty' },
    { key: 'OCIMF и ICS', slug: 'ocimf-ics' }
  ];
  MP.PUBLISHERS = [
    { key: 'ЦНИИМФ', slug: 'cniimf' },
    { key: 'IMO', slug: 'imo' },
    { key: 'ITU', slug: 'itu' }
  ];
  function lookup(list, field, value) {
    for (var i = 0; i < list.length; i++) if (list[i][field] === value) return list[i];
    return null;
  }
  MP.sectionSlug = function (key) { var r = lookup(MP.SECTIONS, 'key', key); return r ? r.slug : ''; };
  MP.sectionBySlug = function (slug) { return lookup(MP.SECTIONS, 'slug', slug); };
  MP.sectionHref = function (key) { var s = MP.sectionSlug(key); return s ? 'razdel.html?slug=' + encodeURIComponent(s) : 'katalog.html'; };
  MP.publisherSlug = function (key) { var r = lookup(MP.PUBLISHERS, 'key', key); return r ? r.slug : ''; };
  MP.publisherBySlug = function (slug) { return lookup(MP.PUBLISHERS, 'slug', slug); };
  MP.publisherHref = function (key) { var s = MP.publisherSlug(key); return s ? 'izdatel.html?slug=' + encodeURIComponent(s) : 'katalog.html'; };

  /* ---------- тексты: data/content/*.json ---------- */
  var contentCache = {};
  /* null, если файла ещё нет или он не разобрался: страница покажет «Раздел готовится» */
  MP.loadContent = function (path) {
    if (!contentCache[path]) {
      contentCache[path] = fetch('../data/content/' + path).then(function (r) {
        if (!r.ok) return null;
        return r.json().catch(function () { return null; });
      }).catch(function () { return null; });
    }
    return contentCache[path];
  };
  /* словарь {ключ: запись} из объекта или из массива записей */
  MP.contentMap = function (data, keyFields) {
    var map = {};
    if (!data || typeof data !== 'object') return map;
    if (!Array.isArray(data)) {
      var names = Object.keys(data);
      if (names.length === 1 && data[names[0]] && typeof data[names[0]] === 'object' && !('slug' in data[names[0]])) {
        var inner = data[names[0]];
        if (Array.isArray(inner) || Object.keys(inner).some(function (k) { return inner[k] && inner[k].slug; })) data = inner;
      }
    }
    if (Array.isArray(data)) {
      data.forEach(function (rec) {
        if (!rec || typeof rec !== 'object') return;
        for (var i = 0; i < keyFields.length; i++) if (rec[keyFields[i]]) { map[rec[keyFields[i]]] = rec; return; }
        if (rec.slug) map[rec.slug] = rec;
      });
    } else {
      Object.keys(data).forEach(function (k) { if (data[k] && typeof data[k] === 'object') map[k] = data[k]; });
    }
    return map;
  };
  MP.findBySlug = function (map, slug) {
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) if (map[keys[i]].slug === slug) return { key: keys[i], rec: map[keys[i]] };
    return null;
  };
  /* текст с markdown-ссылками [текст](адрес) и **жирным**: всё остальное экранируется */
  var INTERNAL = /^(kartochka|stranica|razdel|izdatel|katalog|korzina|index)\.html(\?[\w%=&.\-]*)?(#[\w\-]*)?$/;
  MP.rich = function (text) {
    var s = String(text == null ? '' : text), out = '', last = 0, m;
    var re = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*/g;
    function plain(t) { return MP.esc(MP.clean(t)); }
    while ((m = re.exec(s))) {
      out += plain(s.slice(last, m.index));
      if (m[3] != null) out += '<strong>' + plain(m[3]) + '</strong>';
      else if (INTERNAL.test(m[2])) out += '<a href="' + MP.esc(m[2]) + '">' + plain(m[1]) + '</a>';
      else if (/^https:\/\/[^\s"'<>]+$/.test(m[2])) out += '<a href="' + MP.esc(m[2]) + '" target="_blank" rel="noopener">' + plain(m[1]) + '</a>';
      else out += plain(m[1]);
      last = re.lastIndex;
    }
    return out + plain(s.slice(last));
  };
  MP.paras = function (v) {
    if (v == null || v === '') return [];
    return (Array.isArray(v) ? v : String(v).split(/\n{2,}/)).filter(function (x) { return x != null && String(x).trim() !== ''; });
  };
  MP.setMeta = function (title, desc) {
    if (title) document.title = MP.clean(title);
    var m = document.querySelector('meta[name="description"]');
    if (m && desc) m.setAttribute('content', MP.clean(desc));
  };
  MP.soon = function (what) {
    return '<div class="wrap"><div class="soon"><h2>' + MP.esc(what || 'Раздел') + ' готовится</h2><p>Текст появится здесь после согласования. Каталог и корзина работают как обычно.</p><a class="btn btn--ink" href="katalog.html">Перейти в каталог</a></div></div>';
  };
  MP.faqHtml = function (items) {
    var rows = (items || []).map(function (f) {
      var q = f && (f.q || f.question), a = f && (f.a || f.answer);
      if (!q) return '';
      return '<details><summary>' + MP.esc(MP.clean(q)) + '</summary>' + MP.paras(a).map(function (p) { return '<p>' + MP.rich(p) + '</p>'; }).join('') + '</details>';
    }).join('');
    return rows ? '<div class="faq">' + rows + '</div>' : '';
  };

  /* названия информационных страниц, пока их json не загружен */
  MP.PAGES = {
    'licenzii-itu': 'Электронные лицензии ITU',
    'novye-redakcii-2026': 'Новые редакции 2026',
    'obyazatelnye-publikacii': 'Обязательные публикации на борту',
    'oplata-i-dostavka': 'Оплата и доставка',
    'o-kompanii': 'О компании',
    'kontakty': 'Контакты'
  };
  /* тёмная шапка страницы: крошки [[текст, адрес или null], ...], заголовок, подзаголовок */
  MP.head = function (crumbs, h1, lead, extra) {
    var el = document.getElementById('page-head');
    if (!el) return;
    var c = crumbs.map(function (x) {
      return x[1] ? '<li><a href="' + MP.esc(x[1]) + '">' + MP.esc(x[0]) + '</a></li>'
        : '<li><span aria-current="page" title="' + MP.esc(x[0]) + '">' + MP.esc(x[0]) + '</span></li>';
    }).join('');
    el.innerHTML = '<section class="pagehead chart-bg chart-edge"><div class="wrap">' +
      '<nav aria-label="Хлебные крошки"><ol class="crumbs">' + c + '</ol></nav>' +
      '<h1 id="page-title">' + MP.esc(MP.clean(h1)) + '</h1>' +
      (lead ? '<p class="pagehead__lead">' + MP.esc(MP.clean(lead)) + '</p>' : '') +
      (extra || '') + '</div></section>';
  };

  /* ---------- корзина ---------- */
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var o = raw ? JSON.parse(raw) : {};
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch (e) { return memory; }
  }
  function write(o) {
    memory = o;
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* хранилище недоступно, держим в памяти */ }
  }
  function clamp(n) { n = parseInt(n, 10); if (isNaN(n) || n < 1) return 1; return n > 99 ? 99 : n; }
  function changed() {
    MP.updateCount();
    document.dispatchEvent(new CustomEvent('mp:cart'));
  }
  MP.cart = {
    all: function () {
      var o = read(), r = {};
      Object.keys(o).forEach(function (k) { var n = parseInt(o[k], 10); if (n > 0) r[k] = clamp(n); });
      return r;
    },
    has: function (slug) { return !!this.all()[slug]; },
    qty: function (slug) { return this.all()[slug] || 0; },
    add: function (slug, n) {
      var o = this.all(); o[slug] = clamp((o[slug] || 0) + (n || 1)); write(o); changed();
    },
    set: function (slug, n) {
      var o = this.all(); o[slug] = clamp(n); write(o); changed();
    },
    remove: function (slug) {
      var o = this.all(); delete o[slug]; write(o); changed();
    },
    clear: function () { write({}); changed(); },
    count: function () { return Object.keys(this.all()).length; }
  };
  MP.nextOrderNo = function () {
    var n = 0;
    try { n = parseInt(localStorage.getItem(SEQ_KEY), 10) || 0; } catch (e) { n = 0; }
    n += 1;
    try { localStorage.setItem(SEQ_KEY, String(n)); } catch (e) { /* без хранилища номер всегда первый */ }
    return 'Z-2026-' + ('0000' + n).slice(-4);
  };

  MP.updateCount = function () {
    var n = MP.cart.count();
    var els = document.querySelectorAll('[data-cart-count]');
    for (var i = 0; i < els.length; i++) els[i].textContent = n;
    var link = document.querySelector('.cartlink');
    if (link) link.setAttribute('aria-label', 'Корзина, ' + n + ' ' + MP.plural(n, ['позиция', 'позиции', 'позиций']));
  };

  /* ---------- озвучка действий ---------- */
  var live;
  MP.say = function (text) {
    if (!live) {
      live = document.createElement('div');
      live.className = 'sr-only';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 30);
  };

  /* ---------- карточка издания в списке ---------- */
  MP.actionHtml = function (slug) {
    if (MP.cart.has(slug)) return '<a class="btn btn--done" href="korzina.html">В корзине <span class="tick" aria-hidden="true">✓</span></a>';
    return '<button class="btn btn--signal" type="button" data-add="' + MP.esc(slug) + '">В корзину</button>';
  };
  MP.card = function (item, opts) {
    opts = opts || {};
    var meta = MP.metaLine(item);
    var name = MP.clean(item.name);
    return '<li><article class="pub' + (opts.dark ? ' pub--dark' : '') + '">' +
      '<div class="pub__cover"><img src="' + MP.esc(MP.cover(item)) + '" width="600" height="850" loading="' + (opts.eager ? 'eager' : 'lazy') + '" alt="' + MP.esc(name) + '">' +
      (item.publisher ? '<span class="pub__tag">' + MP.esc(item.publisher) + '</span>' : '') + '</div>' +
      '<div class="pub__body">' +
      '<h3 class="pub__title"><a href="' + MP.href(item) + '" title="' + MP.esc(name) + '">' + MP.esc(name) + '</a></h3>' +
      (meta ? '<p class="pub__meta">' + MP.esc(meta) + '</p>' : '') +
      '<p class="pub__sku">' + MP.esc(item.sku) + '</p>' +
      '<div class="pub__foot">' + MP.priceHtml(item) +
      '<span class="pub__act" data-act="' + MP.esc(item.slug) + '">' + MP.actionHtml(item.slug) + '</span></div>' +
      '</div></article></li>';
  };
  MP.refreshActions = function () {
    var slots = document.querySelectorAll('[data-act]');
    for (var i = 0; i < slots.length; i++) {
      var slug = slots[i].getAttribute('data-act');
      var inCart = !!slots[i].querySelector('a');
      if (inCart !== MP.cart.has(slug)) slots[i].innerHTML = MP.actionHtml(slug);
    }
  };

  /* ---------- события страницы ---------- */
  document.addEventListener('click', function (e) {
    var add = e.target.closest ? e.target.closest('[data-add]') : null;
    if (add) {
      var slug = add.getAttribute('data-add');
      var slot = add.closest('[data-act]');
      var name = '';
      var art = add.closest('article');
      if (art) { var t = art.querySelector('.pub__title'); name = t ? t.textContent : ''; }
      MP.cart.add(slug, 1);
      MP.refreshActions();
      if (slot) { var a = slot.querySelector('a'); if (a) a.focus(); }
      MP.say('Добавлено в корзину: ' + name);
    }
  });
  document.addEventListener('mp:cart', MP.refreshActions);
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { MP.updateCount(); MP.refreshActions(); document.dispatchEvent(new CustomEvent('mp:external')); }
  });

  /* ---------- шапка: бургер ---------- */
  function initHeader() {
    var header = document.querySelector('.site-header');
    var burger = document.querySelector('.burger');
    if (!header || !burger) return;
    function set(open) {
      header.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }
    burger.addEventListener('click', function () { set(!header.classList.contains('is-open')); });

    /* выпадающие списки: на компьютере открываются и по наведению (CSS), и кнопкой со стрелкой */
    var subs = header.querySelectorAll('.nav__item--sub');
    function toggleSub(li, open) {
      var b = li.querySelector('.nav__more');
      li.classList.toggle('is-open', open);
      if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function closeSubs(except) {
      for (var i = 0; i < subs.length; i++) if (subs[i] !== except) toggleSub(subs[i], false);
    }
    Array.prototype.forEach.call(subs, function (li) {
      var b = li.querySelector('.nav__more');
      if (!b) return;
      b.addEventListener('click', function () {
        var open = !li.classList.contains('is-open');
        closeSubs(li);
        toggleSub(li, open);
      });
      li.addEventListener('focusout', function (e) {
        if (e.relatedTarget && !li.contains(e.relatedTarget)) toggleSub(li, false);
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.nav__item--sub')) closeSubs(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openSub = header.querySelector('.nav__item--sub.is-open');
      if (openSub) { var btn = openSub.querySelector('.nav__more'); closeSubs(null); if (btn) btn.focus(); return; }
      if (header.classList.contains('is-open')) { set(false); burger.focus(); }
    });
    var links = header.querySelectorAll('.nav a');
    for (var i = 0; i < links.length; i++) links[i].addEventListener('click', function () { set(false); });
  }

  /* Telegram: адрес один на весь сайт, берём из glavnaya.json (final.telegram); пока там заглушка «#» */
  MP.tgHref = function (v) {
    return typeof v === 'string' && /^(#|https:\/\/(t|telegram)\.me\/[\w\-.\/?=&%]*)$/.test(v) ? v : '#';
  };
  MP.applyTelegram = function (root, href) {
    var els = (root || document).querySelectorAll('[data-tg]');
    for (var i = 0; i < els.length; i++) els[i].setAttribute('href', MP.tgHref(href));
  };
  function initTelegram() {
    MP.loadContent('glavnaya.json').then(function (d) {
      if (d && d.final) MP.applyTelegram(document, d.final.telegram);
    });
  }

  function init() { initHeader(); MP.updateCount(); initTelegram(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
