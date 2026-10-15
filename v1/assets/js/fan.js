/* Веер популярных изданий по кругу: обложки плывут по дуге вокруг точки под картинкой.
   Решение заказчика 15.10.2026: движение показываем всем, в том числе при «уменьшить движение».
   Останавливается при наведении и фокусе, когда первый экран не виден или вкладка скрыта. */
(function () {
  'use strict';
  var fan = document.querySelector('.fan');
  if (!fan || !window.requestAnimationFrame) return;
  var cards = Array.prototype.slice.call(fan.querySelectorAll('a'));
  var N = cards.length;
  var STEP = 20;                 // градусов между обложками
  var SPAN = N * STEP;           // весь круг обложек
  var SPEED = 5;                 // градусов в секунду
  var theta = 0, last = 0, raf = 0, running = false, hold = false, onScreen = true;
  var W, H, cardH, pivotY, R;

  fan.classList.add('fan--wheel');
  function measure() {
    W = fan.clientWidth; H = fan.clientHeight;
    cardH = cards[0].offsetHeight || W * 0.43;
    pivotY = H + W * 0.30;                 // точка вращения ниже картинки
    R = pivotY - cardH - W * 0.10;         // верхняя обложка с отступом сверху, боковые ниже по дуге
  }
  function place() {
    for (var i = 0; i < N; i++) {
      var a = ((theta + i * STEP) % SPAN + SPAN) % SPAN - SPAN / 2;   // от -SPAN/2 до +SPAN/2
      var k = Math.abs(a);
      var s = 1 - Math.min(k, 70) / 70 * 0.18;                         // к краям чуть меньше
      var o = k < 24 ? 1 : Math.max(0, 1 - (k - 24) / 14);             // и тают раньше, чем коснутся рамки: обрезанных уголков нет
      var c = cards[i];
      c.style.transform = 'translate(-50%,' + (pivotY - cardH).toFixed(1) + 'px) rotate(' + a.toFixed(2) + 'deg) translateY(' + (-R).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
      c.style.opacity = o.toFixed(3);
      c.style.zIndex = String(100 - Math.round(k));
      c.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      c.tabIndex = o < 0.5 ? -1 : 0;
    }
  }
  function frame(t) {
    if (!running) return;
    if (!last) last = t;
    var dt = Math.min(0.1, (t - last) / 1000); last = t;
    theta += SPEED * dt;
    place();
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    var go = onScreen && !document.hidden && !hold;
    if (go && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    if (!go && running) { running = false; cancelAnimationFrame(raf); }
  }
  fan.addEventListener('mouseenter', function () { hold = true; sync(); });
  fan.addEventListener('mouseleave', function () { hold = false; sync(); });
  fan.addEventListener('focusin', function () { hold = true; sync(); });
  fan.addEventListener('focusout', function () { hold = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; sync(); }).observe(fan);
  }
  window.addEventListener('resize', function () { measure(); place(); });
  measure(); place(); sync();
})();
