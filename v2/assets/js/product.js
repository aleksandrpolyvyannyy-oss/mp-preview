/* Карточка издания: kartochka.html?slug=... */
(function () {
  'use strict';
  var host = document.getElementById('product');
  var headEl = document.getElementById('product-head');
  var slug = new URLSearchParams(location.search).get('slug') || '';

  function setMeta(title, desc) {
    document.title = title;
    var m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', desc);
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function row(label, value, mono) {
    if (value == null || value === '') return '';
    return '<div><dt>' + label + '</dt><dd' + (mono ? ' class="mono"' : '') + '>' + MP.esc(value) + '</dd></div>';
  }
  function rowLink(label, value, href) {
    if (value == null || value === '') return '';
    if (!href) return row(label, value);
    return '<div><dt>' + label + '</dt><dd><a class="spec-link" href="' + MP.esc(href) + '">' + MP.esc(value) + '</a></dd></div>';
  }
  function shortName(s) { return s.length > 60 ? s.slice(0, 57).replace(/[\s,(]+$/, '') + '...' : s; }

  function notFound() {
    setMeta('Издание не найдено | Морские публикации', 'Такого издания нет в каталоге.');
    host.innerHTML = '<div class="wrap" style="padding-block:40px 80px"><div class="empty"><h2>Такого издания нет</h2><p>Ссылка устарела или в адресе опечатка. Откройте каталог и найдите издание по названию или артикулу.</p><a class="btn btn--ink" href="katalog.html">Перейти в каталог</a></div></div>';
  }

  function render(items) {
    var it = null;
    items.forEach(function (x) { if (x.slug === slug) it = x; });
    if (!it) return notFound();

    var name = MP.clean(it.name);
    setMeta(name + ' купить | Морские публикации',
      name + (it.edition ? ', ' + it.edition : '') + '. Артикул ' + it.sku + (it.price != null ? ', цена ' + MP.money(it.price) : ', цена по запросу') + '. Добавьте издание в корзину, счёт выставит бухгалтерия.');

    /* шапка страницы: крошки и заголовок */
    var crumbs = headEl.querySelector('.crumbs');
    crumbs.innerHTML = '<li><a href="index.html">Главная</a></li>' +
      '<li><a href="katalog.html">Каталог</a></li>' +
      '<li><a href="' + MP.sectionHref(it.section) + '">' + MP.esc(it.section) + '</a></li>' +
      '<li><span aria-current="page" title="' + MP.esc(name) + '">' + MP.esc(shortName(name)) + '</span></li>';
    var h1 = headEl.querySelector('h1');
    if (h1) h1.remove();
    headEl.firstElementChild.classList.add('pagehead--slim');

    var specs = row('Артикул', it.sku, true) +
      rowLink('Издатель', it.publisher, it.publisher && MP.publisherSlug(it.publisher) ? MP.publisherHref(it.publisher) : '') +
      row('Год', it.edition) + row('Язык', it.language) + row('Формат', it.format) + row('Страниц', it.pages) +
      rowLink('Раздел', it.section, MP.sectionHref(it.section));
    var isItu = it.publisher === 'ITU' || !!it.license_note;

    var same = items.filter(function (x) { return x.group === it.group && x.slug !== it.slug; });
    same.sort(function (a, b) {
      var sa = a.section === it.section ? 0 : 1, sb = b.section === it.section ? 0 : 1;
      if (sa !== sb) return sa - sb;
      var ca = a.cover_is_placeholder ? 1 : 0, cb = b.cover_is_placeholder ? 1 : 0;
      return ca - cb;
    });
    same = same.slice(0, 4);

    host.innerHTML =
      '<div class="wrap prod">' +
        '<div class="prod__cover"><img src="' + MP.esc(MP.cover(it)) + '" width="600" height="850" alt="' + MP.esc(name) + '"></div>' +
        '<div class="prod__main">' +
          '<h1 id="prod-title">' + MP.esc(name) + '</h1>' +
          '<dl class="specs">' + specs + '</dl>' +
          '<div class="buy">' +
            MP.priceHtml(it, 'buy__price') +
            '<div class="buy__row">' +
              '<div class="field"><span class="label" id="qty-label">Количество</span>' +
              '<div class="qty" role="group" aria-labelledby="qty-label">' +
                '<button type="button" id="q-minus" aria-label="Уменьшить количество">−</button>' +
                '<input id="q-val" type="number" min="1" max="99" value="1" inputmode="numeric" aria-labelledby="qty-label">' +
                '<button type="button" id="q-plus" aria-label="Увеличить количество">+</button>' +
              '</div></div>' +
              '<button class="btn btn--signal btn--lg" type="button" id="p-add">Добавить в корзину</button>' +
            '</div>' +
            '<p class="buy__status" id="p-status" role="status" aria-live="polite"></p>' +
          '</div>' +
          '<section class="howto" aria-labelledby="howto-title"><h2 id="howto-title">Как заказать</h2>' +
            '<ol><li>Добавьте издание в корзину.</li><li>Укажите порт и дату доставки.</li><li>Получите счёт от бухгалтерии.</li></ol></section>' +
          (it.description ? '<section class="prod__desc" aria-labelledby="desc-title"><h2 id="desc-title">Описание</h2><p>' + MP.esc(MP.clean(it.description)) + '</p></section>' : '') +
          (it.license_note ? '<section class="licnote" aria-labelledby="lic-title"><h2 id="lic-title">Электронная лицензия</h2><p>' + MP.esc(cap(it.license_note)) + '</p></section>' : '') +
          (isItu ? '<p class="prod__more"><a class="textlink" href="stranica.html?slug=licenzii-itu">Как работают электронные лицензии ITU</a></p>' : '') +
        '</div>' +
      '</div>' +
      (same.length ? '<section class="same" aria-labelledby="same-title"><div class="wrap"><h2 id="same-title">Из того же раздела</h2><ul class="pubs pubs--4 pubs--list">' +
        same.map(function (x) { return MP.card(x); }).join('') + '</ul></div></section>' : '');

    var val = document.getElementById('q-val');
    var status = document.getElementById('p-status');
    function q() { var n = parseInt(val.value, 10); return isNaN(n) || n < 1 ? 1 : Math.min(n, 99); }
    document.getElementById('q-minus').addEventListener('click', function () { val.value = Math.max(1, q() - 1); });
    document.getElementById('q-plus').addEventListener('click', function () { val.value = Math.min(99, q() + 1); });
    val.addEventListener('change', function () { val.value = q(); });
    document.getElementById('p-add').addEventListener('click', function () {
      var n = q();
      MP.cart.add(it.slug, n);
      var total = MP.cart.qty(it.slug);
      status.innerHTML = 'Добавлено в корзину, всего: ' + total + ' шт. <a href="korzina.html">Перейти в корзину</a>';
    });
    if (MP.cart.has(it.slug)) {
      status.innerHTML = 'Уже в корзине: ' + MP.cart.qty(it.slug) + ' шт. <a href="korzina.html">Перейти в корзину</a>';
    }
  }

  MP.loadCatalog().then(render).catch(function () { MP.catalogError(host); });
})();
