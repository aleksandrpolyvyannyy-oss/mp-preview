/* Заявка: список позиций, итог, форма с проверкой, экран «Заявка принята». Ничего никуда не отправляется. */
(function () {
  'use strict';
  var root = document.getElementById('order-root');
  var bySlug = {};
  var els = {};
  var submitted = false;

  var FIELDS = [
    { id: 'company', label: 'Компания (заказчик)', req: true, type: 'text', auto: 'organization', msg: 'Укажите название компании' },
    { id: 'person', label: 'Контактное лицо', type: 'text', auto: 'name' },
    { id: 'email', label: 'Email', req: true, type: 'email', auto: 'email', msg: 'Укажите почту, например name@company.ru' },
    { id: 'phone', label: 'Телефон', req: true, type: 'tel', auto: 'tel', msg: 'Укажите телефон, например +7 000 000-00-00' },
    { id: 'place', label: 'Место доставки (порт, судно или адрес)', req: true, type: 'text', msg: 'Укажите порт, судно или адрес доставки', wide: true },
    { id: 'date', label: 'Желаемая дата доставки', req: true, type: 'date', msg: 'Укажите желаемую дату доставки' }
  ];

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function fieldHtml(f) {
    var star = f.req ? ' <span class="req" aria-hidden="true">*</span>' : '';
    return '<div class="field' + (f.wide ? ' span-2' : '') + '">' +
      '<label for="f-' + f.id + '">' + f.label + star + '</label>' +
      '<input class="input" id="f-' + f.id + '" name="' + f.id + '" type="' + f.type + '"' +
      (f.auto ? ' autocomplete="' + f.auto + '"' : '') +
      (f.type === 'date' ? ' min="' + todayIso() + '"' : '') +
      (f.req ? ' required aria-required="true"' : '') +
      ' aria-describedby="e-' + f.id + '">' +
      '<p class="error" id="e-' + f.id + '"></p></div>';
  }

  function skeleton() {
    root.innerHTML =
      '<div class="order" id="order">' +
        '<section class="order__list" aria-labelledby="list-title"><h2 id="list-title">Позиции в корзине</h2><div id="cart-list"></div></section>' +
        '<section class="order__form" aria-labelledby="form-title"><h2 id="form-title">Данные для счёта</h2>' +
          '<div class="totals" id="totals" aria-live="polite"></div>' +
          '<form id="order-form" novalidate>' +
            '<div class="form-grid form-grid--2">' +
              FIELDS.slice(0, 4).map(fieldHtml).join('') +
              fieldHtml(FIELDS[4]) + fieldHtml(FIELDS[5]) +
              '<div class="field">' +
                '<label for="f-inn">ИНН (для счёта) <span class="hint">поле по согласованию</span></label>' +
                '<input class="input" id="f-inn" name="inn" type="text" inputmode="numeric" autocomplete="off">' +
              '</div>' +
              '<div class="field span-2"><label for="f-comment">Комментарий</label><textarea class="textarea" id="f-comment" name="comment" rows="3"></textarea></div>' +
              '<div class="span-2"><div class="consent">' +
                '<input type="checkbox" id="f-consent" name="consent" aria-describedby="e-consent">' +
                '<label for="f-consent">Согласен на обработку персональных данных в соответствии с <a href="#">политикой обработки персональных данных</a></label>' +
              '</div><p class="error" id="e-consent"></p></div>' +
              '<div class="span-2"><button class="btn btn--signal btn--lg btn--block" type="submit">Отправить заявку</button>' +
              '<p class="error" id="e-form" role="alert"></p>' +
              '<p class="form-note">Счёт выставит бухгалтерия после получения заявки. Звёздочкой отмечены обязательные поля.</p></div>' +
            '</div>' +
          '</form>' +
        '</section>' +
      '</div>';
    els.list = document.getElementById('cart-list');
    els.totals = document.getElementById('totals');
    els.form = document.getElementById('order-form');
    els.formError = document.getElementById('e-form');
    els.form.addEventListener('submit', onSubmit);
    els.form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.getAttribute('aria-invalid') === 'true') clearError(t.id.replace('f-', ''));
    });
    els.form.addEventListener('change', function (e) {
      if (e.target.id === 'f-consent') clearError('consent');
    });
    els.list.addEventListener('click', onListClick);
    els.list.addEventListener('change', onListChange);
  }

  function emptyState() {
    root.innerHTML = '<div style="padding-block:32px 80px"><div class="empty-cart"><h2>В корзине пока пусто</h2>' +
      '<p>Добавьте издания из каталога. Цену и итог мы покажем здесь, счёт выставит бухгалтерия.</p>' +
      '<a class="btn btn--signal btn--lg" href="katalog.html">Перейти в каталог</a></div></div>';
    els = {};
  }

  function cartItems() {
    var c = MP.cart.all(), r = [];
    Object.keys(c).forEach(function (slug) { if (bySlug[slug]) r.push({ it: bySlug[slug], n: c[slug] }); });
    return r;
  }

  function renderList(focusSel) {
    var rows = cartItems();
    if (!rows.length) { emptyState(); return; }
    if (!els.list) skeleton();
    els.list.innerHTML = rows.map(function (r) {
      var it = r.it, name = MP.clean(it.name), meta = MP.metaLine(it), sum;
      if (it.price == null) sum = '<span class="price price--ask">Цена по запросу</span>';
      else sum = '<span class="price">' + MP.money(it.price * r.n) + '</span>' + (r.n > 1 ? '<small>' + r.n + ' × ' + MP.money(it.price) + '</small>' : '');
      return '<article class="cart-row" data-slug="' + MP.esc(it.slug) + '">' +
        '<div class="cart-row__cover"><img src="' + MP.esc(MP.cover(it)) + '" width="600" height="850" loading="lazy" alt="' + MP.esc(name) + '"></div>' +
        '<div class="cart-row__main">' +
          '<h3 class="cart-row__title"><a href="' + MP.href(it) + '">' + MP.esc(name) + '</a></h3>' +
          '<p class="cart-row__sku">' + MP.esc(it.sku) + (meta ? ', ' + MP.esc(meta) : '') + '</p>' +
          '<div class="cart-row__ctl">' +
            '<div class="qty" role="group" aria-label="Количество: ' + MP.esc(name) + '">' +
              '<button type="button" data-q="-1" aria-label="Уменьшить количество">−</button>' +
              '<input type="number" min="1" max="99" value="' + r.n + '" inputmode="numeric" aria-label="Количество">' +
              '<button type="button" data-q="1" aria-label="Увеличить количество">+</button>' +
            '</div>' +
            '<div class="cart-row__sum">' + sum + '</div>' +
            '<button class="link-btn" type="button" data-remove aria-label="Удалить из корзины: ' + MP.esc(name) + '">Удалить</button>' +
          '</div>' +
        '</div></article>';
    }).join('');

    var sum = 0, ask = 0;
    rows.forEach(function (r) { if (r.it.price == null) ask++; else sum += r.it.price * r.n; });
    var t = '<p>Сумма по позициям с ценой: <span class="big">' + MP.money(sum) + '</span></p>';
    if (ask) t += '<p>' + ask + ' ' + MP.plural(ask, ['позиция', 'позиции', 'позиций']) + ' по запросу, цену уточнит менеджер</p>';
    t += '<p>В корзине: ' + rows.length + ' ' + MP.plural(rows.length, ['позиция', 'позиции', 'позиций']) + '</p>';
    els.totals.innerHTML = t;

    if (focusSel) {
      var f = els.list.querySelector(focusSel);
      if (f) f.focus();
    }
  }

  function rowOf(el) { return el.closest('.cart-row'); }
  function onListClick(e) {
    var row = rowOf(e.target);
    if (!row) return;
    var slug = row.getAttribute('data-slug');
    var q = e.target.closest('[data-q]');
    if (q) {
      MP.cart.set(slug, MP.cart.qty(slug) + parseInt(q.getAttribute('data-q'), 10));
      renderList('.cart-row[data-slug="' + slug + '"] [data-q="' + q.getAttribute('data-q') + '"]');
      return;
    }
    if (e.target.closest('[data-remove]')) {
      var next = row.nextElementSibling || row.previousElementSibling;
      MP.cart.remove(slug);
      renderList(next ? '.cart-row[data-slug="' + next.getAttribute('data-slug') + '"] [data-remove]' : null);
      MP.say('Позиция удалена из корзины');
    }
  }
  function onListChange(e) {
    if (e.target.type !== 'number') return;
    var row = rowOf(e.target);
    if (!row) return;
    var slug = row.getAttribute('data-slug');
    MP.cart.set(slug, e.target.value);
    renderList('.cart-row[data-slug="' + slug + '"] input[type="number"]');
  }

  /* ---------- проверка формы ---------- */
  function setError(id, text) {
    var input = document.getElementById('f-' + id);
    var box = document.getElementById('e-' + id);
    if (!input || !box) return;
    box.textContent = text; box.classList.add('is-on');
    input.setAttribute('aria-invalid', 'true');
  }
  function clearError(id) {
    var input = document.getElementById('f-' + id);
    var box = document.getElementById('e-' + id);
    if (!input || !box) return;
    box.textContent = ''; box.classList.remove('is-on');
    input.removeAttribute('aria-invalid');
  }

  function validate() {
    var errs = [];
    function val(id) { return document.getElementById('f-' + id).value.trim(); }
    FIELDS.forEach(function (f) { clearError(f.id); });
    clearError('consent');
    els.formError.textContent = ''; els.formError.classList.remove('is-on');

    if (!val('company')) errs.push(['company', 'Укажите название компании']);
    var email = val('email');
    if (!email) errs.push(['email', 'Укажите почту, например name@company.ru']);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.push(['email', 'Почта указана с ошибкой, проверьте адрес']);
    var phone = val('phone'), digits = phone.replace(/\D/g, '');
    if (!phone) errs.push(['phone', 'Укажите телефон, например +7 000 000-00-00']);
    else if (digits.length < 10 || digits.length > 15 || /[^\d\s+()\-]/.test(phone)) errs.push(['phone', 'Телефон указан с ошибкой, проверьте номер']);
    if (!val('place')) errs.push(['place', 'Укажите порт, судно или адрес доставки']);
    var date = val('date');
    if (!date) errs.push(['date', 'Укажите желаемую дату доставки']);
    else if (date < todayIso()) errs.push(['date', 'Дата не может быть раньше сегодняшней']);
    if (!document.getElementById('f-consent').checked) errs.push(['consent', 'Без согласия на обработку персональных данных заявку отправить нельзя']);
    return errs;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitted) return;
    var errs = validate();
    if (errs.length) {
      errs.forEach(function (x) { setError(x[0], x[1]); });
      els.formError.textContent = 'Заявка не отправлена: исправьте ' + errs.length + ' ' + MP.plural(errs.length, ['поле', 'поля', 'полей']) + ' выше.';
      els.formError.classList.add('is-on');
      document.getElementById('f-' + errs[0][0]).focus();
      return;
    }
    var rows = cartItems();
    var data = {
      company: document.getElementById('f-company').value.trim(),
      place: document.getElementById('f-place').value.trim(),
      date: document.getElementById('f-date').value
    };
    var no = MP.nextOrderNo();
    submitted = true;
    MP.cart.clear();
    var d = data.date.split('-').reverse().join('.');
    root.innerHTML = '<div style="padding-block:32px 80px"><section class="done" aria-labelledby="done-title">' +
      '<h2 id="done-title" tabindex="-1">Заявка принята. Мы свяжемся с вами и пришлём счёт</h2>' +
      '<p class="done__no" aria-label="Номер заявки">' + MP.esc(no) + '</p>' +
      '<p>Позиций в заявке: ' + rows.length + '. Доставка: ' + MP.esc(data.place) + ', желаемая дата ' + MP.esc(d) + '. Компания: ' + MP.esc(data.company) + '.</p>' +
      '<p class="form-note" style="margin-top:14px">Это макет: данные никуда не передаются.</p>' +
      '<a class="btn btn--ink" href="katalog.html">Вернуться в каталог</a></section></div>';
    var h = document.getElementById('done-title');
    h.focus();
    window.scrollTo(0, 0);
  }

  document.addEventListener('mp:external', function () { if (!submitted && els.list) renderList(); });

  MP.loadCatalog().then(function (items) {
    items.forEach(function (it) { bySlug[it.slug] = it; });
    renderList();
  }).catch(function () { MP.catalogError(root); });
})();
