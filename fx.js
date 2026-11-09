/* 粒子效果：粒子从四周飘散处缓缓汇聚，最终凝成文字 / 数字
 *
 * 用法：
 *   <h1 data-fx data-fx-key="hero"><span class="fx-line">麓商联</span></h1>
 *   <span class="num" data-fx data-fx-key="annual-350"><span class="fx-line">350</span></span>
 *   然后调用 LSLFX.run(容器)
 *
 * 可选属性：
 *   data-fx-key       同一个 key 只播放一次（数值变了换个 key 就会重新汇聚）
 *   data-fx-colors    粒子颜色，逗号分隔
 *   data-fx-duration  汇聚时长（毫秒）
 *   data-fx-step      取样间距（像素，越小粒子越密）
 * 元素滚动进入可视区域后才开始播放。
 */
(function (global) {
  'use strict';

  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var played = {};
  var DEFAULT_COLORS = ['#141414', '#141414', '#141414', '#ea5520', '#8fc31f'];

  function done(el) { el.classList.add('fx-done'); }

  function particleTitle(el, opts) {
    opts = opts || {};
    if (!el || el.__fx) return;
    el.__fx = true;
    var key = el.getAttribute('data-fx-key');
    if (reduce || (key && played[key])) return done(el);
    if (key) played[key] = true;

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var rect = el.getBoundingClientRect();
    var w = Math.ceil(rect.width), h = Math.ceil(rect.height);
    if (!w || !h) return done(el);

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

    // 1. 用与页面相同的字体，把文字绘制到离屏画布上取样
    var off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    var octx = off.getContext('2d');
    octx.scale(dpr, dpr);
    octx.fillStyle = '#fff';
    octx.textBaseline = 'alphabetic';
    var lines = el.querySelectorAll('.fx-line');
    (lines.length ? Array.prototype.slice.call(lines) : [el]).forEach(function (ln) {
      var r = ln.getBoundingClientRect();
      var lcs = global.getComputedStyle(ln);
      octx.font = lcs.fontWeight + ' ' + lcs.fontSize + ' ' + lcs.fontFamily;
      var size = parseFloat(lcs.fontSize);
      var txt = ln.getAttribute('data-text') || ln.textContent;
      var ls = parseFloat(lcs.letterSpacing) || 0;
      // 基线位置：行盒高度减去字体上下高度后居中（与浏览器排版一致）
      var m = octx.measureText(txt);
      var asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      var baseY = (asc != null && desc != null) ? (r.height - asc - desc) / 2 + asc : r.height / 2 + size * 0.36;
      var x = r.left - rect.left + pad, y = r.top - rect.top + pad + baseY;
      for (var i = 0; i < txt.length; i++) {
        octx.fillText(txt[i], x, y);
        x += octx.measureText(txt[i]).width + ls;
      }
    });

    // 2. 取样像素生成粒子目标点
    var img = octx.getImageData(0, 0, off.width, off.height).data;
    var step = Math.max(2, Math.round(Number(el.getAttribute('data-fx-step') || opts.step || 3) * dpr));
    var colorAttr = el.getAttribute('data-fx-colors');
    var colors = colorAttr ? colorAttr.split(',') : (opts.colors || DEFAULT_COLORS);
    var spread = Math.max(canvas.width, canvas.height, 260 * dpr) * 0.55;
    var pts = [];
    for (var y = 0; y < off.height; y += step) {
      for (var x = 0; x < off.width; x += step) {
        if (img[(y * off.width + x) * 4 + 3] > 128) {
          var ang = Math.random() * Math.PI * 2;
          var dist = (0.6 + Math.random() * 0.9) * spread;
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

    var dur = Number(el.getAttribute('data-fx-duration')) || opts.duration || 2600;
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
        var px = q.sx + (q.tx - q.sx) * e + Math.sin(ts / 420 + q.wob) * drift;
        var py = q.sy + (q.ty - q.sy) * e + Math.cos(ts / 380 + q.wob) * drift;
        ctx.globalAlpha = 0.25 + 0.75 * e;
        ctx.fillStyle = q.c;
        ctx.beginPath();
        ctx.arc(px, py, q.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p < 1.05) {
        global.requestAnimationFrame(frame);
      } else {
        // 3. 粒子到位后，真实文字淡入、粒子淡出
        done(el);
        canvas.style.opacity = '0';
        setTimeout(function () { canvas.remove(); }, 900);
      }
    }
    el.classList.add('fx-run');
    global.requestAnimationFrame(frame);
  }

  // 进入可视区域再播放（页面滚动到哪，数字就在哪汇聚）
  var io = ('IntersectionObserver' in global) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { io.unobserve(en.target); particleTitle(en.target); }
    });
  }, { threshold: 0.6 }) : null;

  /* ---------- 滚动进场：.rv 元素依次滑入，进度条从 0 生长 ---------- */
  var rio = ('IntersectionObserver' in global) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { rio.unobserve(en.target); en.target.classList.add('in'); }
    });
  }, { threshold: 0.12 }) : null;

  function reveal(root, instant) {
    var els = Array.prototype.slice.call((root || document).querySelectorAll('.rv'));
    if (instant || reduce || !rio) { els.forEach(function (el) { el.classList.add('in', 'no-anim'); }); return; }
    var seen = [];
    els.forEach(function (el) {
      // 同一父元素下的兄弟元素错开 0.07s 依次出现
      var idx = 0, sib = el.previousElementSibling;
      while (sib) { if (sib.classList.contains('rv')) idx++; sib = sib.previousElementSibling; }
      el.style.setProperty('--d', Math.min(idx, 6) * 0.07 + 's');
      rio.observe(el);
    });
  }

  function run(root, opts) {
    opts = opts || {};
    reveal(root, opts.instant);
    var list = Array.prototype.slice.call((root || document).querySelectorAll('[data-fx]'));
    // 已播放过的直接显示，避免重新渲染时闪烁
    list.forEach(function (el) { var k = el.getAttribute('data-fx-key'); if (reduce || (k && played[k])) { el.__fx = true; done(el); } });
    var go = function () {
      list.forEach(function (el) {
        if (el.__fx) return;
        if (io) io.observe(el); else particleTitle(el);
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  /* ---------- 彩纸礼花：兑换 / 申报成功时在容器中迸发 ---------- */
  function burst(container) {
    if (reduce || !container) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var W = container.clientWidth, H = container.clientHeight;
    var c = document.createElement('canvas');
    c.className = 'fx-burst';
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    container.appendChild(c);
    var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    var colors = ['#c8f04a', '#ea5520', '#141414', '#1597a6', '#f2ede1'];
    var ps = [];
    for (var i = 0; i < 140; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 6 + Math.random() * 9;
      ps.push({ x: W / 2, y: H * 0.62, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 4 + Math.random() * 6, h: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length] });
    }
    var t0 = null;
    (function tick(ts) {
      if (t0 === null) t0 = ts;
      var el = ts - t0;
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - el / 2200);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (el < 2200) global.requestAnimationFrame(tick); else c.remove();
    })(performance.now());
  }

  global.LSLFX = { particleTitle: particleTitle, run: run, reveal: reveal, burst: burst };
})(window);
