/* Главная: счётчики разделов, популярные издания, лицензии ITU, тексты из glavnaya.json.
   Тексты первого экрана, полосы «Редакции 2026», «Как работаем» и финального блока лежат в html статически (для поиска),
   отсюда они только сверяются с json и обновляются, если в json текст изменился. */
(function () {
  'use strict';
  var POPULAR_FALLBACK = ['colreg-cniimf', 'colreg', 'deck-log', 'ism', 'solas', 'marpol', 'stcw', 'isps'];
  var ITU = ['itu-list-iv', 'itu-list-v', 'itu-maritime-manual'];

  function num(n) { return n < 10 ? '0' + n : String(n); }
  function $(sel) { return document.querySelector(sel); }
  function setText(sel, v) { var el = $(sel); if (el && typeof v === 'string' && v) el.textContent = MP.clean(v); }
  function internal(href) {
    return /^(stranica|razdel|izdatel|katalog|kartochka)\.html(\?[\w%=&.\-]*)?$/.test(href || '') ? href : '';
  }

  /* ---------- «Полезное судовладельцу» ---------- */
  function renderUseful(d) {
    var el = document.getElementById('useful');
    var block = d && d.poleznoe;
    var cards = block && Array.isArray(block.cards) ? block.cards : [];
    if (!el || !cards.length) return;
    el.innerHTML = cards.slice(0, 6).map(function (it, i) {
      if (!it || (!it.title && !it.text)) return '';
      var href = it.slug ? 'stranica.html?slug=' + encodeURIComponent(it.slug) : internal(it.href);
      var inner = '<span class="useful__n mono" aria-hidden="true">' + num(i + 1) + '</span>' +
        '<h3>' + MP.esc(MP.clean(it.title || '')) + '</h3>' +
        (it.text ? '<p>' + MP.esc(MP.clean(it.text)) + '</p>' : '') +
        (href ? '<span class="useful__go">Читать</span>' : '');
      return '<li>' + (href ? '<a class="useful__card" href="' + MP.esc(href) + '">' + inner + '</a>' : '<div class="useful__card">' + inner + '</div>') + '</li>';
    }).join('');
  }

  /* ---------- сверка статических блоков с json ---------- */
  function syncStatic(d) {
    if (!d) return;
    var h = d.hero;
    if (h && Array.isArray(h.facts)) {
      var lis = document.querySelectorAll('.hero__facts li');
      for (var i = 0; i < lis.length && i < h.facts.length; i++) lis[i].textContent = MP.clean(h.facts[i]);
    }
    if (h) setText('.hero__lead', h.lead);
    var s = d.redakcii_strip;
    if (s) {
      setText('.strip__label', s.label);
      setText('.strip__text', s.text);
      setText('.strip__cta', s.cta);
      var cta = $('.strip__cta');
      if (cta && internal(s.href)) cta.setAttribute('href', s.href);
    }
    var p = d.populyarnye;
    if (p) { setText('#pop-title', p.title); setText('.section__note', p.note); }
    var dv = d.doverie;
    if (dv) {
      setText('#doverie-title', dv.title);
      var li = document.querySelectorAll('#doverie .why > li');
      if (Array.isArray(dv.items)) {
        for (var j = 0; j < li.length && j < dv.items.length; j++) {
          var t = li[j].querySelector('h3'), x = li[j].querySelector('p');
          if (t) t.textContent = MP.clean(dv.items[j].title || '');
          if (x) x.textContent = MP.clean(dv.items[j].text || '');
        }
      }
    }
    var f = d.final;
    if (f) {
      setText('#final-title', f.title);
      setText('.final__text p', f.text);
      var ph = $('[data-final-phone]'), em = $('[data-final-email]');
      if (ph && f.phone) { ph.textContent = f.phone; ph.setAttribute('href', 'tel:+' + String(f.phone).replace(/\D/g, '')); }
      if (em && /^[\w.\-]+@[\w.\-]+$/.test(f.email || '')) { em.textContent = f.email; em.setAttribute('href', 'mailto:' + f.email); }
    }
  }

  Promise.all([MP.loadCatalog(), MP.loadContent('glavnaya.json')]).then(function (res) {
    var items = res[0], d = res[1];
    var bySlug = {}, bySection = {};
    items.forEach(function (it) {
      bySlug[it.slug] = it;
      bySection[it.section] = (bySection[it.section] || 0) + 1;
    });

    var tiles = document.querySelectorAll('.tile[data-section]');
    for (var i = 0; i < tiles.length; i++) {
      var n = bySection[tiles[i].getAttribute('data-section')] || 0;
      tiles[i].querySelector('[data-count]').textContent = n;
      tiles[i].querySelector('[data-count-word]').textContent = MP.plural(n, ['издание', 'издания', 'изданий']);
    }

    function fill(id, slugs, opts) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = slugs.map(function (s) { return bySlug[s] ? MP.card(bySlug[s], opts) : ''; }).join('');
    }
    var pop = d && d.populyarnye && Array.isArray(d.populyarnye.slugs) && d.populyarnye.slugs.length ? d.populyarnye.slugs : POPULAR_FALLBACK;
    fill('popular', pop);
    fill('itu-cards', ITU, { dark: true });

    syncStatic(d);
    renderUseful(d);
  }).catch(function () {
    var el = document.getElementById('popular');
    if (el) el.innerHTML = '<li class="status">Издания не загрузились. Обновите страницу.</li>';
  });
})();
