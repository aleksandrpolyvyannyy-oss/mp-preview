/* Главная: счётчики разделов и издателей, популярные издания, лицензии ITU, блоки из glavnaya.json. */
(function () {
  'use strict';
  var POPULAR = ['solas', 'stcw', 'colreg-cniimf', 'ism', 'isps', 'imdg', 'lsa', 'iamsar'];
  var ITU = ['itu-list-iv', 'itu-list-v', 'itu-maritime-manual'];
  var PUB_COVERS = 3;

  function num(n) { return n < 10 ? '0' + n : String(n); }

  /* варианты разметки glavnaya.json: ищем два списка, анонсы страниц и преимущества */
  function lists(d) {
    var out = [];
    if (!d || typeof d !== 'object') return out;
    Object.keys(d).forEach(function (k) {
      var v = d[k], items = null, title = null;
      if (Array.isArray(v)) items = v;
      else if (v && typeof v === 'object') {
        title = v.title || v.h2 || null;
        ['items', 'cards', 'points', 'list', 'pages'].forEach(function (f) { if (!items && Array.isArray(v[f])) items = v[f]; });
      }
      if (items && items.length) out.push({ key: k, title: title, items: items });
    });
    return out;
  }
  function hasLink(it) { return it && typeof it === 'object' && (it.slug || it.href || it.url); }
  function splitLists(d) {
    var ls = lists(d), useful = null, why = null;
    ls.forEach(function (l) {
      if (!useful && (/polez|useful|anons|pages|stranic|articles/i.test(l.key) || (!/pochem|why|advant|preim|udobn/i.test(l.key) && l.items.every(hasLink)))) useful = l;
      else if (!why && (/pochem|why|advant|preim|udobn|points/i.test(l.key) || !l.items.every(hasLink))) why = l;
    });
    return { useful: useful, why: why };
  }
  function itemParts(it) {
    if (typeof it === 'string') return { title: '', text: it };
    return {
      title: it.title || it.h3 || it.name || it.heading || '',
      text: it.text || it.description || it.lead || it.desc || it.body || '',
      href: it.slug ? 'stranica.html?slug=' + encodeURIComponent(it.slug) : (/^(stranica|razdel|izdatel|katalog|kartochka)\.html/.test(it.href || it.url || '') ? (it.href || it.url) : '')
    };
  }
  function renderUseful(l) {
    var el = document.getElementById('useful');
    if (!el || !l) return;
    el.innerHTML = l.items.slice(0, 6).map(function (it, i) {
      var p = itemParts(it);
      if (!p.title && !p.text) return '';
      var inner = '<span class="useful__n mono" aria-hidden="true">' + num(i + 1) + '</span>' +
        '<h3>' + MP.esc(MP.clean(p.title)) + '</h3>' +
        (p.text ? '<p>' + MP.esc(MP.clean(p.text)) + '</p>' : '') +
        (p.href ? '<span class="useful__go">Читать</span>' : '');
      return '<li>' + (p.href ? '<a class="useful__card" href="' + MP.esc(p.href) + '">' + inner + '</a>' : '<div class="useful__card">' + inner + '</div>') + '</li>';
    }).join('');
  }
  function renderWhy(l) {
    var el = document.getElementById('why');
    if (!el || !l) return;
    el.innerHTML = l.items.slice(0, 6).map(function (it, i) {
      var p = itemParts(it);
      if (!p.title && !p.text) return '';
      return '<li><span class="why__n mono" aria-hidden="true">' + num(i + 1) + '</span>' +
        (p.title ? '<h3>' + MP.esc(MP.clean(p.title)) + '</h3>' : '') +
        (p.text ? '<p>' + MP.esc(MP.clean(p.text)) + '</p>' : '') + '</li>';
    }).join('');
  }

  MP.loadCatalog().then(function (items) {
    var bySlug = {}, bySection = {}, byPub = {};
    items.forEach(function (it) {
      bySlug[it.slug] = it;
      bySection[it.section] = (bySection[it.section] || 0) + 1;
      if (it.publisher) (byPub[it.publisher] = byPub[it.publisher] || []).push(it);
    });

    function setCount(root, n) {
      root.querySelector('[data-count]').textContent = n;
      root.querySelector('[data-count-word]').textContent = MP.plural(n, ['издание', 'издания', 'изданий']);
    }
    var tiles = document.querySelectorAll('.tile[data-section]');
    for (var i = 0; i < tiles.length; i++) setCount(tiles[i], bySection[tiles[i].getAttribute('data-section')] || 0);

    var pts = document.querySelectorAll('.pubtile[data-publisher]');
    for (var j = 0; j < pts.length; j++) {
      var list = byPub[pts[j].getAttribute('data-publisher')] || [];
      setCount(pts[j], list.length);
      var real = list.filter(function (x) { return !x.cover_is_placeholder; }).slice(0, PUB_COVERS);
      pts[j].querySelector('[data-covers]').innerHTML = real.map(function (x) {
        return '<img src="' + MP.esc(MP.cover(x)) + '" width="600" height="850" loading="lazy" alt="">';
      }).join('');
    }

    function fill(id, slugs, opts) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = slugs.map(function (s) { return bySlug[s] ? MP.card(bySlug[s], opts) : ''; }).join('');
    }
    fill('popular', POPULAR);
    fill('itu-cards', ITU, { dark: true });
  }).catch(function () {
    var el = document.getElementById('popular');
    if (el) el.innerHTML = '<li class="status">Издания не загрузились. Обновите страницу.</li>';
  });

  MP.loadContent('glavnaya.json').then(function (d) {
    var s = splitLists(d);
    renderUseful(s.useful);
    renderWhy(s.why);
  });
})();
