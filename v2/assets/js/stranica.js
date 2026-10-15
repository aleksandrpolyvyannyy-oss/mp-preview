/* Информационная страница: stranica.html?slug=... Тексты из data/content/pages/<slug>.json. */
(function () {
  'use strict';
  var host = document.getElementById('content');
  var slug = new URLSearchParams(location.search).get('slug') || '';
  var valid = /^[a-z0-9-]+$/.test(slug);
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* подсветка пункта меню */
  function markMenu() {
    var sel = null;
    if (slug === 'kontakty') sel = 'a[href="stranica.html?slug=kontakty"]';
    else if (slug === 'oplata-i-dostavka') sel = '.nav__list > li > a[href="stranica.html?slug=oplata-i-dostavka"]';
    else if (MP.PAGES[slug]) sel = '[data-useful-root]';
    var el = sel && document.querySelector('.site-header ' + sel);
    if (el) el.setAttribute('aria-current', 'page');
  }

  function dateText(u) {
    if (!u) return '';
    var s = String(u).trim(), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return 'Обновлено ' + parseInt(m[3], 10) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
    return /^обновлен/i.test(s) ? s : 'Обновлено ' + s;
  }
  function text(b) { return b.text != null ? b.text : (b.content != null ? b.content : (b.value != null ? b.value : '')); }

  function notFound() {
    MP.setMeta('Страница не найдена | Морские публикации', 'Такой страницы нет.');
    MP.head([['Главная', 'index.html'], ['Страница не найдена', null]], 'Страница не найдена');
    host.innerHTML = '<div class="wrap" style="padding-block:40px 80px"><div class="empty"><h2>Такой страницы нет</h2><p>Ссылка устарела или в адресе опечатка. Откройте каталог или вернитесь на главную.</p><a class="btn btn--ink" href="katalog.html">Перейти в каталог</a></div></div>';
  }
  function soon() {
    var name = MP.PAGES[slug];
    MP.setMeta(name + ' | Морские публикации', 'Информационная страница магазина морских публикаций. Раздел готовится.');
    MP.head([['Главная', 'index.html'], [name, null]], name);
    host.innerHTML = '<div style="padding-block:40px 80px">' + MP.soon('Раздел') + '</div>';
  }

  function productsBlock(b, bySlug) {
    var list = (b.slugs || b.items || []).map(function (s) { return bySlug[s]; }).filter(Boolean);
    if (!list.length) return '';
    return (b.title ? '<h3 class="doc__sub">' + MP.esc(MP.clean(b.title)) + '</h3>' : '') +
      '<ul class="pubs pubs--3 pubs--list doc__products">' + list.map(function (it) { return MP.card(it); }).join('') + '</ul>';
  }
  function tableBlock(b, n) {
    var head = b.head || b.header || [], rows = b.rows || [];
    var label = b.caption || b.title || 'Таблица';
    return '<div class="tablewrap" role="region" tabindex="0" aria-label="' + MP.esc(MP.clean(label)) + '"><table>' +
      (b.caption ? '<caption>' + MP.esc(MP.clean(b.caption)) + '</caption>' : '') +
      (head.length ? '<thead><tr>' + head.map(function (h) { return '<th scope="col">' + MP.rich(h) + '</th>'; }).join('') + '</tr></thead>' : '') +
      '<tbody>' + rows.map(function (r) {
        return '<tr>' + (Array.isArray(r) ? r : [r]).map(function (c) { return '<td>' + MP.rich(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function blocksHtml(blocks, bySlug, toc) {
    var n = 0;
    return (blocks || []).map(function (b) {
      if (!b || typeof b !== 'object') return '';
      switch (b.type) {
        case 'h2':
          n++;
          toc.push({ id: 's' + n, t: text(b) });
          return '<h2 id="s' + n + '">' + MP.esc(MP.clean(text(b))) + '</h2>';
        case 'p':
          return MP.paras(text(b)).map(function (p) { return '<p>' + MP.rich(p) + '</p>'; }).join('');
        case 'list':
          return '<ul class="doc__list">' + (b.items || []).map(function (i) { return '<li>' + MP.rich(i) + '</li>'; }).join('') + '</ul>';
        case 'steps':
          return '<ol class="doc__steps">' + (b.items || []).map(function (i) {
            if (i && typeof i === 'object') return '<li>' + (i.title ? '<b>' + MP.rich(i.title) + '</b> ' : '') + MP.rich(i.text || i.body || '') + '</li>';
            return '<li>' + MP.rich(i) + '</li>';
          }).join('') + '</ol>';
        case 'table':
          return tableBlock(b);
        case 'faq':
          return MP.faqHtml(b.items);
        case 'products':
          return productsBlock(b, bySlug);
        case 'note':
          return '<aside class="note">' + (b.title ? '<p class="note__t">' + MP.esc(MP.clean(b.title)) + '</p>' : '') +
            MP.paras(text(b)).map(function (p) { return '<p>' + MP.rich(p) + '</p>'; }).join('') + '</aside>';
        case 'placeholder':
          return '<div class="placeholder" role="note"><p>' + MP.rich(text(b) || 'Заполним по данным заказчика') + '</p></div>';
        default:
          return '';
      }
    }).join('');
  }

  function sourcesHtml(src) {
    if (!src || !src.length) return '';
    var lis = src.map(function (s) {
      var title, url;
      if (typeof s === 'string') { title = s; url = /^https:\/\//.test(s) ? s : ''; }
      else { title = s.title || s.text || s.name || s.url || s.href || ''; url = s.url || s.href || ''; }
      if (!title) return '';
      if (/^https:\/\/[^\s"'<>]+$/.test(url)) return '<li><a href="' + MP.esc(url) + '" target="_blank" rel="noopener">' + MP.esc(MP.clean(title)) + '</a></li>';
      return '<li>' + MP.esc(MP.clean(title)) + '</li>';
    }).join('');
    return lis ? '<section class="sources" aria-labelledby="src-title"><h2 id="src-title">Источники</h2><ul>' + lis + '</ul></section>' : '';
  }

  function render(rec, catalog) {
    var bySlug = {};
    catalog.forEach(function (it) { bySlug[it.slug] = it; });
    var h1 = rec.h1 || rec.title || MP.PAGES[slug] || slug;
    MP.setMeta(rec.title || (h1 + ' | Морские публикации'), rec.description || (h1 + '. Информация для покупателей морских нормативных публикаций.'));
    var upd = dateText(rec.updated);
    MP.head([['Главная', 'index.html'], [h1, null]], h1, rec.lead,
      upd ? '<p class="pagehead__date mono">' + MP.esc(upd) + '</p>' : '');

    var toc = [];
    var body = blocksHtml(rec.blocks, bySlug, toc);
    var tocHtml = toc.length >= 3
      ? '<details class="doc__toc" id="toc"><summary>Содержание</summary><ol>' +
        toc.map(function (t) { return '<li><a href="#' + t.id + '">' + MP.esc(MP.clean(t.t)) + '</a></li>'; }).join('') + '</ol></details>'
      : '';
    var html = '<section class="section section--sheet section--tight"><div class="wrap doc' + (tocHtml ? ' doc--toc' : '') + '">' + tocHtml +
      '<article class="doc__body">' + (body || '<div class="soon soon--inline"><h2>Текст готовится</h2></div>') + sourcesHtml(rec.sources) + '</article></div></section>' +
      '<section class="section section--sheet cta" aria-labelledby="cta-title"><div class="wrap"><div class="cta__in chart-bg">' +
      '<div><h2 class="h2" id="cta-title">Нужны издания?</h2><p>Откройте каталог, добавьте издания в корзину и отправьте заявку. Счёт выставит бухгалтерия.</p></div>' +
      '<a class="btn btn--signal btn--lg" href="katalog.html">Перейти в каталог</a></div></div></section>';
    host.innerHTML = html;
    var tocEl = document.getElementById('toc');
    if (tocEl && window.matchMedia && matchMedia('(min-width:1100px)').matches) tocEl.open = true;
  }

  markMenu();
  if (!valid) { notFound(); return; }
  Promise.all([
    MP.loadContent('pages/' + slug + '.json'),
    MP.loadCatalog().catch(function () { return []; })
  ]).then(function (r) {
    var rec = r[0];
    if (rec && typeof rec === 'object' && !Array.isArray(rec)) return render(rec, r[1]);
    if (MP.PAGES[slug]) return soon();
    notFound();
  });
})();
