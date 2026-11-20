/* 背景层：漂浮粒子 + 稀疏 π 数字 */
(function () {
  'use strict';

  var canvas = document.getElementById('bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1;
  var stars = [];
  var digits = [];
  var digitsStr = window.PI_DIGITS || '14159265358979';
  var raf = null;
  var last = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    var starCount = Math.min(120, Math.round((W * H) / 15000));
    stars = [];
    for (var i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.3 + 0.3,
        a: Math.random() * 0.5 + 0.15,
        v: Math.random() * 0.12 + 0.03
      });
    }

    var digitCount = Math.min(26, Math.round(W / 55));
    digits = [];
    for (var j = 0; j < digitCount; j++) {
      digits.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 16 + 11,
        a: Math.random() * 0.16 + 0.05,
        v: Math.random() * 0.24 + 0.06,
        ch: digitsStr.charAt(Math.floor(Math.random() * digitsStr.length))
      });
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(function (s) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(120, 220, 255, ' + s.a + ')';
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function loop(t) {
    if (!last) last = t;
    var dt = Math.min(48, t - last);
    last = t;

    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y -= s.v * dt * 0.06;
      if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
      ctx.beginPath();
      ctx.fillStyle = 'rgba(120, 220, 255, ' + s.a + ')';
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var k = 0; k < digits.length; k++) {
      var d = digits[k];
      d.y -= d.v * dt * 0.06;
      if (d.y < -30) {
        d.y = H + 30;
        d.x = Math.random() * W;
        d.ch = digitsStr.charAt(Math.floor(Math.random() * digitsStr.length));
      }
      ctx.font = d.size + 'px Consolas, monospace';
      ctx.fillStyle = 'rgba(55, 230, 255, ' + d.a + ')';
      ctx.fillText(d.ch, d.x, d.y);
    }

    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', function () {
    resize();
    if (reduced) drawStatic();
  });

  resize();
  if (reduced) {
    drawStatic();
  } else {
    raf = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (reduced) return;
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    }
  });
})();
