/* 标题粒子效果：粒子从四周飘散处缓缓汇聚，最终凝成文字
 * 用法：<h1 class="fx-title" data-fx>文字</h1>，调用 LSLFX.particleTitle(el)
 */
(function (global) {
  'use strict';

  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function particleTitle(el, opts) {
    opts = opts || {};
    if (!el || el.__fx) return;
    el.__fx = true;
    if (reduce) { el.classList.add('fx-done'); return; }

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var rect = el.getBoundingClientRect();
    var w = Math.ceil(rect.width), h = Math.ceil(rect.height);
    if (!w || !h) { el.classList.add('fx-done'); return; }

    var pad = opts.pad || 40;
    var canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.width = (w + pad * 2) * dpr;
    canvas.height = (h + pad * 2) * dpr;
    canvas.style.width = (w + pad * 2) + 'px';
    canvas.style.height = (h + pad * 2) + 'px';
    canvas.style.left = -pad + 'px';
    canvas.style.top = -pad + 'px';
    el.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // 1. 用与标题相同的字体，把每一行文字绘制到离屏画布上取样
    var cs = global.getComputedStyle(el);
    var off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    var octx = off.getContext('2d');
    octx.scale(dpr, dpr);
    octx.fillStyle = '#fff';
    octx.textBaseline = 'alphabetic';
    octx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var lines = el.querySelectorAll('.fx-line');
    var base = el.getBoundingClientRect();
    (lines.length ? Array.prototype.slice.call(lines) : [el]).forEach(function (ln) {
      var r = ln.getBoundingClientRect();
      var lcs = global.getComputedStyle(ln);
      octx.font = lcs.fontWeight + ' ' + lcs.fontSize + ' ' + lcs.fontFamily;
      var size = parseFloat(lcs.fontSize);
      var txt = ln.getAttribute('data-text') || ln.textContent;
      var ls = parseFloat(lcs.letterSpacing) || 0;
      var x = r.left - base.left + pad, y = r.top - base.top + pad + r.height / 2 + size * 0.36;
      for (var i = 0; i < txt.length; i++) {
        octx.fillText(txt[i], x, y);
        x += octx.measureText(txt[i]).width + ls;
      }
    });

    // 2. 取样像素生成粒子目标点
    var img = octx.getImageData(0, 0, off.width, off.height).data;
    var step = Math.max(2, Math.round((opts.step || 3) * dpr));
    var colors = opts.colors || ['#141414', '#141414', '#141414', '#ea5520', '#8fc31f'];
    var pts = [];
    for (var y = 0; y < off.height; y += step) {
      for (var x = 0; x < off.width; x += step) {
        if (img[(y * off.width + x) * 4 + 3] > 128) {
          var ang = Math.random() * Math.PI * 2;
          var dist = (0.6 + Math.random() * 0.9) * Math.max(canvas.width, canvas.height) * 0.55;
          pts.push({
            tx: x, ty: y,
            sx: canvas.width / 2 + Math.cos(ang) * dist,
            sy: canvas.height / 2 + Math.sin(ang) * dist * 0.6,
            delay: Math.random() * 0.45,
            r: (0.8 + Math.random() * 0.9) * dpr,
            c: colors[(Math.random() * colors.length) | 0],
            wob: Math.random() * Math.PI * 2
          });
        }
      }
    }

    var dur = opts.duration || 2600; // 汇聚时长（毫秒），缓慢成形
    var start = null;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }

    function frame(ts) {
      if (start === null) start = ts;
      var p = (ts - start) / dur;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < pts.length; i++) {
        var q = pts[i];
        var t = Math.min(1, Math.max(0, (p - q.delay) / (1 - q.delay)));
        var e = ease(t);
        var drift = (1 - e) * 14 * dpr;
        var x = q.sx + (q.tx - q.sx) * e + Math.sin(ts / 420 + q.wob) * drift;
        var y = q.sy + (q.ty - q.sy) * e + Math.cos(ts / 380 + q.wob) * drift;
        ctx.globalAlpha = 0.25 + 0.75 * e;
        ctx.fillStyle = q.c;
        ctx.beginPath();
        ctx.arc(x, y, q.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p < 1.05) {
        global.requestAnimationFrame(frame);
      } else {
        // 3. 粒子到位后，真实文字淡入、粒子淡出
        el.classList.add('fx-done');
        canvas.style.opacity = '0';
        setTimeout(function () { canvas.remove(); }, 900);
      }
    }
    el.classList.add('fx-run');
    global.requestAnimationFrame(frame);
  }

  function run(root) {
    var list = (root || document).querySelectorAll('[data-fx]');
    var go = function () { list.forEach(function (el) { particleTitle(el); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  global.LSLFX = { particleTitle: particleTitle, run: run };
})(window);
