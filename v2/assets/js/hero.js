/* Живой первый экран: сетка карты и подписи координат плывут по курсу 047°, табло координат меняется.
   Решение заказчика 15.10.2026: движение показываем всем, в том числе при «уменьшить движение» в системе.
   Пока первый экран не виден или вкладка скрыта, всё стоит. */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  if (!hero || !window.requestAnimationFrame) return;
  var lon = hero.querySelector('.hero__lon');
  var lat = hero.querySelector('.hero__lat');
  var scale = hero.querySelector('.hero__scale');
  var fixLat = hero.querySelector('[data-fix-lat]');
  var fixLon = hero.querySelector('[data-fix-lon]');

  var LON0 = 14, LAT0 = 64;            // подпись первой линии сетки, как в разметке
  var POS_LAT = 59 + 56.4 / 60;        // стартовое место на табло
  var POS_LON = 30 + 18.2 / 60;
  var SPEED = 14;                      // пикселей в секунду по курсу
  var HEAD = 47 * Math.PI / 180;
  var vx = Math.sin(HEAD) * SPEED, vy = Math.cos(HEAD) * SPEED;

  // широта: перед первой подписью добавляем ещё одну, чтобы при сдвиге вниз сверху не было пусто
  var latSpans = [];
  if (lat) {
    var extra = document.createElement('span');
    lat.insertBefore(extra, lat.firstChild);
    latSpans = Array.prototype.slice.call(lat.children);
  }
  var lonSpans = lon ? Array.prototype.slice.call(lon.children) : [];

  var ox = 0, oy = 0, kx = 0, ky = 0, last = 0, raf = 0, shownAt = 0, running = false;

  function cell() { return parseFloat(getComputedStyle(hero).getPropertyValue('--cell')) || 96; }
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function fmt(deg, w, side) {
    var d = Math.floor(deg), m = (deg - d) * 60;
    if (m >= 59.95) { d += 1; m = 0; }
    return pad(d, w) + '°' + pad(m.toFixed(1), 4).replace('.', ',') + '′ ' + side;
  }
  function relabel() {
    for (var i = 0; i < lonSpans.length; i++) lonSpans[i].textContent = (LON0 + 2 * (i + kx)) + '°E';
    for (var j = 0; j < latSpans.length; j++) {
      var line = j - 1;                // номер линии сетки, к которой привязана подпись
      latSpans[j].textContent = line >= 1 || (line === 0 && oy > 34) ? (LAT0 - 2 * (line - 1) + 2 * ky) + '°N' : '';
    }
  }
  function frame(t) {
    if (!running) return;
    if (!last) last = t;
    var dt = Math.min(0.1, (t - last) / 1000); last = t;
    var c = cell();
    ox += vx * dt; oy += vy * dt;
    var re = false;
    if (ox >= c) { ox -= c; kx++; re = true; }
    if (oy >= c) { oy -= c; ky++; re = true; }
    if (re || (oy > 34) !== (latSpans[1] && latSpans[1].textContent !== '')) relabel();
    hero.style.backgroundPosition = (-ox).toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
    if (scale) scale.style.backgroundPosition = (-ox).toFixed(1) + 'px 0';
    if (lon) lon.style.transform = 'translateX(' + (-ox).toFixed(1) + 'px)';
    if (lat) lat.style.transform = 'translateY(' + (oy - c).toFixed(1) + 'px)';
    if (t - shownAt > 250) {            // табло 4 раза в секунду: 0,2° на клетку сетки, чтобы цифры шли спокойно
      shownAt = t;
      if (fixLat) fixLat.textContent = fmt(POS_LAT + (ky * c + oy) / c * 0.2, 2, 'N');
      if (fixLon) fixLon.textContent = fmt(POS_LON + (kx * c + ox) / c * 0.2, 3, 'E');
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = 0; hero.classList.remove('is-paused'); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); hero.classList.add('is-paused'); }

  relabel();
  var onScreen = true;
  function sync() { (onScreen && !document.hidden) ? start() : stop(); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; sync(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  sync();
})();
