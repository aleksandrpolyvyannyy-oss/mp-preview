/* Посадочная издателя: izdatel.html?slug=cniimf|imo|itu. Тексты из data/content/izdateli.json. */
(function () {
  'use strict';
  var host = document.getElementById('content');
  var slug = new URLSearchParams(location.search).get('slug') || '';

  function notFound() {
    MP.setMeta('Издатель не найден | Морские публикации', 'Такого издателя нет в каталоге.');
    MP.head([['Главная', 'index.html'], ['Каталог', 'katalog.html'], ['Издатель не найден', null]], 'Издатель не найден');
    host.innerHTML = '<div class="wrap" style="padding-block:40px 80px"><div class="empty"><h2>Такого издателя нет</h2><p>Ссылка устарела или в адресе опечатка. Откройте каталог и выберите издателя в фильтре.</p><a class="btn btn--ink" href="katalog.html">Перейти в каталог</a></div></div>';
  }
  function itemsWord(n) { return MP.plural(n, ['издание', 'издания', 'изданий']); }

  function render(catalog, content) {
    var found = MP.findBySlug(content, slug);
    var stat = MP.publisherBySlug(slug);
    if (!found && !stat) return notFound();

    var key = null;
    [found && found.key, stat && stat.key].forEach(function (k) {
      if (key || !k) return;
      if (catalog.some(function (it) { return it.publisher === k; })) key = k;
    });
    if (!key) key = (found && found.key) || stat.key;
    var rec = found ? found.rec : null;
    var items = catalog.filter(function (it) { return it.publisher === key; });

    var h1 = (rec && (rec.h1 || rec.title)) || ('Издания ' + key);
    MP.setMeta((rec && rec.title) || ('Издания ' + key + ' купить | Морские публикации'),
      (rec && rec.description) || ('Издания ' + key + ' в каталоге морских нормативных публикаций. Добавьте издания в корзину, счёт выставит бухгалтерия.'));
    MP.head([['Главная', 'index.html'], ['Каталог', 'katalog.html'], [key, null]], h1,
      items.length + ' ' + itemsWord(items.length) + ' в каталоге');

    /* разделы, где есть издания издателя */
    var order = [], bySec = {};
    items.forEach(function (it) {
      if (!bySec[it.section]) { bySec[it.section] = []; order.push(it.section); }
      bySec[it.section].push(it);
    });

    var intro = MP.paras(rec && rec.intro);
    var introHtml = intro.length
      ? '<div class="prose">' + intro.map(function (p) { return '<p>' + MP.rich(p) + '</p>'; }).join('') + '</div>'
      : '<div class="soon soon--inline"><h2>Описание издателя готовится</h2><p>Издания уже можно добавить в корзину.</p></div>';
    var facts = '<aside class="facts" aria-label="Коротко об издателе">' +
      '<p class="facts__n"><b>' + items.length + '</b> ' + itemsWord(items.length) + '</p>' +
      (order.length ? '<div class="facts__row"><span>Разделы</span><ul>' + order.map(function (s) {
        return '<li><a href="' + MP.sectionHref(s) + '">' + MP.esc(s) + '</a> <small class="mono">' + bySec[s].length + '</small></li>';
      }).join('') + '</ul></div>' : '') +
      '<a class="btn btn--outline btn--block" href="katalog.html?publisher=' + encodeURIComponent(key) + '">Открыть в каталоге с фильтром</a></aside>';

    var html = '<section class="section section--sheet section--tight" aria-label="Об издателе"><div class="wrap sect-intro">' + introHtml + facts + '</div></section>';

    html += '<section class="section section--paper" id="izdaniya" aria-labelledby="list-title"><div class="wrap">' +
      '<div class="section__head section__head--row"><h2 id="list-title">Издания ' + MP.esc(key) + '</h2><a class="textlink" href="katalog.html?publisher=' + encodeURIComponent(key) + '">Фильтр в каталоге</a></div>';
    if (items.length) {
      html += order.map(function (s) {
        return '<section class="cat-group"><h3><a href="' + MP.sectionHref(s) + '">' + MP.esc(s) + '</a><small>' + bySec[s].length + '</small></h3>' +
          '<ul class="pubs pubs--4 pubs--list">' + bySec[s].map(function (it) { return MP.card(it); }).join('') + '</ul></section>';
      }).join('');
    } else {
      html += '<div class="empty"><h2>Изданий пока нет</h2><p>Откройте весь каталог.</p><a class="btn btn--ink" href="katalog.html">Перейти в каталог</a></div>';
    }
    html += '</div></section>';

    var faq = MP.faqHtml(rec && rec.faq);
    if (faq) html += '<section class="section section--sheet" id="faq" aria-labelledby="faq-title"><div class="wrap"><div class="section__head"><h2 id="faq-title">Вопросы и ответы</h2></div>' + faq + '</div></section>';

    var counts = {};
    catalog.forEach(function (it) { if (it.publisher) counts[it.publisher] = (counts[it.publisher] || 0) + 1; });
    var others = MP.PUBLISHERS.filter(function (p) { return p.key !== key && counts[p.key]; });
    if (others.length) {
      html += '<section class="section section--paper section--tight" aria-labelledby="oth-title"><div class="wrap">' +
        '<div class="section__head"><h2 id="oth-title">Другие издатели</h2></div>' +
        '<ul class="seclinks">' + others.map(function (p) {
          return '<li><a href="izdatel.html?slug=' + encodeURIComponent(p.slug) + '"><span>' + MP.esc(p.key) + '</span><small class="mono">' + counts[p.key] + '</small></a></li>';
        }).join('') + '</ul></div></section>';
    }
    host.innerHTML = html;
  }

  Promise.all([MP.loadCatalog(), MP.loadContent('izdateli.json')]).then(function (r) {
    render(r[0], MP.contentMap(r[1], ['publisher', 'key']));
  }).catch(function () { MP.catalogError(host); });
})();
