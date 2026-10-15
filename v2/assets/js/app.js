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
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { set(false); burger.focus(); }
    });
    var links = header.querySelectorAll('.nav a');
    for (var i = 0; i < links.length; i++) links[i].addEventListener('click', function () { set(false); });
  }

  function init() { initHeader(); MP.updateCount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
