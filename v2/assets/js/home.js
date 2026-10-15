/* Главная: счётчики разделов, популярные издания, лицензии ITU. */
(function () {
  'use strict';
  var POPULAR = ['solas', 'stcw', 'colreg-cniimf', 'ism', 'isps', 'imdg', 'lsa', 'iamsar'];
  var ITU = ['itu-list-iv', 'itu-list-v', 'itu-maritime-manual'];

  MP.loadCatalog().then(function (items) {
    var bySlug = {}, counts = {};
    items.forEach(function (it) {
      bySlug[it.slug] = it;
      counts[it.group] = (counts[it.group] || 0) + 1;
    });

    var tiles = document.querySelectorAll('.tile[data-group]');
    for (var i = 0; i < tiles.length; i++) {
      var n = counts[tiles[i].getAttribute('data-group')] || 0;
      tiles[i].querySelector('[data-count]').textContent = n;
      tiles[i].querySelector('[data-count-word]').textContent = MP.plural(n, ['издание', 'издания', 'изданий']);
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
})();
