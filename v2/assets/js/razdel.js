/* Посадочная раздела: razdel.html?slug=... Тексты из data/content/razdely.json, издания из catalog.json. */
(function () {
  'use strict';
  var host = document.getElementById('content');
  var slug = new URLSearchParams(location.search).get('slug') || '';

  function notFound() {
    MP.setMeta('Раздел не найден | Морские публикации', 'Такого раздела нет в каталоге.');
    MP.head([['Главная', 'index.html'], ['Каталог', 'katalog.html'], ['Раздел не найден', null]], 'Раздел не найден');
    host.innerHTML = '<div class="wrap" style="padding-block:40px 80px"><div class="empty"><h2>Такого раздела нет</h2><p>Ссылка устарела или в адресе опечатка. Откройте каталог и выберите раздел из списка.</p><a class="btn btn--ink" href="katalog.html">Перейти в каталог</a></div></div>';
  }

  function countBy(items, field) {
    var order = [], map = {};
    items.forEach(function (it) {
      var v = it[field];
      if (v == null || v === '') return;
      if (!(v in map)) { map[v] = 0; order.push(v); }
      map[v]++;
    });
    return order.map(function (v) { return { name: v, n: map[v] }; });
  }
  function itemsWord(n) { return MP.plural(n, ['издание', 'издания', 'изданий']); }

  function render(catalog, content) {
    var found = MP.findBySlug(content, slug);
    var stat = MP.sectionBySlug(slug);
    if (!found && !stat) return notFound();

    var key = null;
    [found && found.key, stat && stat.key].forEach(function (k) {
      if (key || !k) return;
      if (catalog.some(function (it) { return it.section === k; })) key = k;
    });
    if (!key) key = (found && found.key) || stat.key;
    var rec = found ? found.rec : null;
    var items = catalog.filter(function (it) { return it.section === key; });
    var group = items.length ? items[0].group : '';

    var h1 = (rec && (rec.h1 || rec.title)) || key;
    MP.setMeta((rec && rec.title) || (key + ' купить | Морские публикации'),
      (rec && rec.description) || ('Раздел «' + key + '» каталога морских нормативных публикаций. Добавьте издания в корзину, счёт выставит бухгалтерия.'));
    MP.head([['Главная', 'index.html'], ['Каталог', 'katalog.html'], [key, null]], h1,
      items.length + ' ' + itemsWord(items.length) + ' в разделе');

    /* вводный текст и справка */
    var intro = MP.paras(rec && rec.intro);
    var pubs = countBy(items, 'publisher');
    var facts = '<aside class="facts" aria-label="Коротко о разделе">' +
      '<p class="facts__n"><b>' + items.length + '</b> ' + itemsWord(items.length) + '</p>' +
      (group ? '<p class="facts__row"><span>Группа каталога</span><a href="katalog.html?group=' + encodeURIComponent(group) + '">' + MP.esc(group) + '</a></p>' : '') +
      (pubs.length ? '<div class="facts__row"><span>Издатели</span><ul>' + pubs.map(function (p) {
        return '<li><a href="' + MP.publisherHref(p.name) + '">' + MP.esc(p.name) + '</a> <small class="mono">' + p.n + '</small></li>';
      }).join('') + '</ul></div>' : '') +
      '<a class="btn btn--outline btn--block" href="#izdaniya">К изданиям раздела</a></aside>';

    var introHtml = intro.length
      ? '<div class="prose">' + intro.map(function (p) { return '<p>' + MP.rich(p) + '</p>'; }).join('') + '</div>'
      : '<div class="soon soon--inline"><h2>Описание раздела готовится</h2><p>Издания раздела уже можно добавить в корзину.</p></div>';

    var html = '<section class="section section--sheet section--tight" aria-label="О разделе"><div class="wrap sect-intro">' + introHtml + facts + '</div></section>';

    html += '<section class="section section--paper" id="izdaniya" aria-labelledby="list-title"><div class="wrap">' +
      '<div class="section__head section__head--row"><h2 id="list-title">Издания раздела</h2><a class="textlink" href="katalog.html">Весь каталог</a></div>' +
      (items.length ? '<ul class="pubs pubs--4 pubs--list">' + items.map(function (it) { return MP.card(it); }).join('') + '</ul>'
        : '<div class="empty"><h2>В разделе пока нет изданий</h2><p>Откройте весь каталог.</p><a class="btn btn--ink" href="katalog.html">Перейти в каталог</a></div>') +
      '</div></section>';

    var faq = MP.faqHtml(rec && rec.faq);
    if (faq) html += '<section class="section section--sheet" id="faq" aria-labelledby="faq-title"><div class="wrap"><div class="section__head"><h2 id="faq-title">Вопросы и ответы</h2></div>' + faq + '</div></section>';

    /* соседние разделы */
    var counts = {};
    catalog.forEach(function (it) { counts[it.section] = (counts[it.section] || 0) + 1; });
    var others = MP.SECTIONS.filter(function (s) { return s.key !== key && counts[s.key]; });
    if (others.length) {
      html += '<section class="section section--paper section--tight" aria-labelledby="oth-title"><div class="wrap">' +
        '<div class="section__head"><h2 id="oth-title">Другие разделы каталога</h2></div>' +
        '<ul class="seclinks">' + others.map(function (s) {
          return '<li><a href="razdel.html?slug=' + encodeURIComponent(s.slug) + '"><span>' + MP.esc(s.key) + '</span><small class="mono">' + counts[s.key] + '</small></a></li>';
        }).join('') + '</ul></div></section>';
    }
    host.innerHTML = html;
  }

  Promise.all([MP.loadCatalog(), MP.loadContent('razdely.json')]).then(function (r) {
    render(r[0], MP.contentMap(r[1], ['section', 'key']));
  }).catch(function () { MP.catalogError(host); });
})();
