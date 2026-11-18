/* 麓商联 · 商户端（手机端 H5，后期接入麓湖+ 小程序） */
(function () {
  'use strict';

  var $page = document.getElementById('page');
  var $screen = document.getElementById('screen');
  var $title = document.getElementById('navTitle');
  var $back = document.getElementById('navBack');
  var $tabbar = document.getElementById('tabbar');

  /* ---------- 5 套视觉风格 ---------- */
  var THEMES = {
    sweat: { name: '热汗', desc: '当前版本 · 运动社群', sw: ['#ece9e0', '#141414', '#c8f04a', '#ea5520'], meta: '#ece9e0', shape: 'dot',
      fx: '#141414,#141414,#141414,#ea5520,#8fc31f', fxCard: '#c8f04a,#c8f04a,#c8f04a,#f2ede1,#ea5520',
      fxSec: { donation: '#ea5520,#ea5520,#141414', synergy: '#8fc31f,#c8f04a,#141414', community: '#1597a6,#1597a6,#141414' }, burst: ['#c8f04a', '#ea5520', '#141414', '#1597a6', '#f2ede1'] },
    ally: { name: 'Ally', desc: '深蓝琥珀 · 吉祥物', sw: ['#0b1730', '#f0a623', '#f4f5f8', '#ffffff'], meta: '#0b1730', shape: 'dot',
      fx: '#18181b,#18181b,#f0a623', fxCard: '#f0a623,#f0a623,#ffffff,#ffd27a',
      fxSec: { donation: '#f0a623,#e07b1a,#18181b', synergy: '#3b6fd8,#18181b', community: '#22a39f,#18181b' }, burst: ['#f0a623', '#ffd27a', '#0b1730', '#3b6fd8', '#ffffff'] },
    apple: { name: 'Apple', desc: '极简留白 · 大字', sw: ['#f5f5f7', '#1d1d1f', '#0071e3', '#ffffff'], meta: '#f5f5f7', shape: 'dot',
      fx: '#1d1d1f,#1d1d1f,#0071e3', fxCard: '#2997ff,#bf5af2,#ffffff,#ff9f0a',
      fxSec: { donation: '#ff6b35,#1d1d1f', synergy: '#0071e3,#1d1d1f', community: '#30b0c7,#1d1d1f' }, burst: ['#0071e3', '#bf5af2', '#ff9f0a', '#30d158', '#1d1d1f'] },
    court: { name: '线描', desc: '奶油底 · 线稿插画', sw: ['#f0ebe1', '#1d3d5c', '#7f9160', '#e8b95c'], meta: '#f0ebe1', shape: 'dot',
      fx: '#1d3d5c,#1d3d5c,#7f9160,#c4a074', fxCard: '#1d3d5c,#1d3d5c,#7f9160,#e8b95c',
      fxSec: { donation: '#c4a074,#e8b95c,#1d3d5c', synergy: '#7f9160,#1d3d5c', community: '#1d3d5c,#6b8fb3' }, burst: ['#7f9160', '#e8b95c', '#c4a074', '#1d3d5c', '#e8a7a0'] },
    pixel: { name: '像素', desc: '8-bit 游戏风', sw: ['#1a1c2c', '#ffcd75', '#a7f070', '#ef7d57'], meta: '#1a1c2c', shape: 'square',
      fx: '#f4f4f4,#ffcd75,#a7f070,#41a6f6', fxCard: '#ffcd75,#ffcd75,#a7f070,#f4f4f4',
      fxSec: { donation: '#ef7d57,#ffcd75', synergy: '#ffcd75,#a7f070', community: '#41a6f6,#73eff7' }, burst: ['#ffcd75', '#a7f070', '#ef7d57', '#41a6f6', '#f4f4f4'] },
    delaunay: { name: '晶格', desc: 'Delaunay 几何渐变', sw: ['#f0f1ee', '#33352f', '#9b5de5', '#3fb39a'], meta: '#f0f1ee', shape: 'dot',
      fx: '#7b4bc4,#d1499b,#3fb39a,#c7b23a,#111111', fxCard: '#7b4bc4,#d1499b,#3fb39a,#c7b23a',
      fxSec: { donation: '#d1499b,#c2417f,#111111', synergy: '#7b4bc4,#9b5de5,#111111', community: '#3fb39a,#2f9e8a,#111111' }, burst: ['#7b4bc4', '#d1499b', '#3fb39a', '#c7b23a', '#33352f'] }
  };
  var theme = 'sweat';

  var state = { tab: 'home', stack: [], filter: 'all', seg: 'courses', topic: '', bindPick: '', bindMode: 'code', leadDone: false };
  var lastSeen = { id: '', points: 0 };
  var carouselTimer = null;

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(ts) { var d = new Date(ts); return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
  function maskPhone(p) { return String(p || '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'); }
  function no(i) { return pad(i + 1); }
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $screen.appendChild(t); setTimeout(function () { t.remove(); }, 1900); }
  function chip(sec) { var s = LSL.section(sec); return s ? '<span class="chip ' + s.key + '">' + esc(s.name) + '</span>' : ''; }
  function secHead(n, total, label, right) {
    return '<div class="sec-head rv"><span class="mono"><b><i class="sn">' + pad(n) + '</i><i class="st"> / ' + pad(total) + '</i></b> · ' + esc(label) + '</span>' + (right ? '<span class="mono more">' + right + '</span>' : '') + '</div>';
  }
  function T() { return THEMES[theme]; }
  function fxa(key, kind) {
    var c = kind === 'card' ? T().fxCard : (kind && T().fxSec[kind]) || T().fx;
    return ' data-fx data-fx-key="' + esc(theme + ':' + key) + '" data-fx-step="2" data-fx-duration="2000" data-fx-colors="' + c + '"';
  }
  function fxNum(cls, val, key, kind) { return '<span class="' + cls + '"' + fxa(key, kind) + '><span class="fx-line">' + val + '</span></span>'; }
  function ava(name, color, photo) {
    return '<span class="ava" style="--c:' + esc(color || 'var(--accent)') + '">' + (photo ? '<img src="' + photo + '" alt="" />' : esc(String(name || '麓').slice(-1))) + '</span>';
  }
  function shortfall(m, r) {
    if (!r.active) return '<span class="muted">已下架</span>';
    if (r.stock <= 0) return '<span class="muted">已兑完</span>';
    if (!m) return '<span class="muted">登录后查看是否可兑换</span>';
    return m.points >= r.cost ? '<span class="ok-text">积分足够，可立即兑换</span>' : '<span class="lack-text">还差 ' + (r.cost - m.points) + ' 分</span>';
  }
  function staffOf(id) { return LSL.find('staff', id); }
  function mentorOf(id) { return LSL.db().academy.mentors.filter(function (x) { return x.id === id; })[0]; }

  /* ---------- 路由 ---------- */
  var TITLES = { home: '麓商联积分', tasks: '本月可参与', academy: '麓商学院', mall: '积分兑换', me: '我的',
    about: '关于我们', data: '我的数据', ledger: '积分明细', claims: '我的申报', orders: '我的兑换', signups: '我的报名',
    members: '门店成员', bind: '绑定门店', themes: '视觉风格' };
  function view() { return state.stack.length ? state.stack[state.stack.length - 1] : state.tab; }
  function go(tab) { state.tab = tab; state.stack = []; render(); $page.scrollTop = 0; }
  function push(v) { state.stack.push(v); render(); $page.scrollTop = 0; }
  function back() { state.stack.pop(); render(); $page.scrollTop = 0; }

  function render(opts) {
    opts = opts || {};
    var c = LSL.current();
    var v = view();
    $title.textContent = TITLES[v] || '麓商联积分';
    var sub = state.stack.length > 0;
    $tabbar.style.display = sub ? 'none' : '';
    $back.style.display = sub ? 'block' : 'none';
    Array.prototype.forEach.call($tabbar.children, function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === state.tab); });
    if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; }
    $page.innerHTML = VIEWS[v](c);
    LSLFX.run($page, { instant: !!opts.quiet });
    setupCarousel();
    setupMesh();
    if (c && c.merchant && v === 'home') lastSeen = { id: c.merchant.id, points: c.merchant.points };
  }

  // 需要登录 / 绑定门店的操作
  function need(fn) {
    var c = LSL.current();
    if (!c) return openLogin(function () { need(fn); });
    if (!c.merchant) { toast('请先绑定你的门店'); return push('bind'); }
    fn(c);
  }

  /* ---------- Hero（每种风格一个版本） ---------- */
  function titleFx(l1, l2, extra) {
    return '<h1 class="hero-title"' + fxa('hero-title') + '><span class="fx-line">' + esc(l1) + '</span><span class="fx-line">' + esc(l2) + (extra || '') + '</span></h1>';
  }
  // Ally 吉祥物「小麓」：白色小鹿 + 琥珀色卷曲鹿角（参照麓湖+ 标志）
  var MASCOT = '<svg class="mascot" viewBox="0 0 130 180" aria-hidden="true"><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9e2f1"/></linearGradient></defs>' +
    '<ellipse cx="65" cy="173" rx="34" ry="5" fill="rgba(0,0,0,.3)"/>' +
    '<g stroke="#f0a623" stroke-width="6" fill="none" stroke-linecap="round"><path d="M52 46C48 30 40 19 29 17C18 15 11 25 17 32C21 37 28 33 26 28"/><path d="M78 46C82 30 90 19 101 17C112 15 119 25 113 32C109 37 102 33 104 28"/></g>' +
    '<g stroke="#f0a623" stroke-width="4.5" fill="none" stroke-linecap="round"><path d="M41 25C37 17 39 9 45 7"/><path d="M89 25C93 17 91 9 85 7"/></g>' +
    '<path d="M51 150v16M79 150v16" stroke="#0e1a33" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M39 112C25 112 18 102 21 93M91 112C104 116 110 124 108 133" stroke="#eef2f8" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<rect x="36" y="96" width="58" height="62" rx="26" fill="url(#dg)"/><ellipse cx="65" cy="133" rx="15" ry="17" fill="#ffe7bf"/>' +
    '<circle cx="49" cy="110" r="3" fill="#f6c27a"/><circle cx="81" cy="106" r="2.5" fill="#f6c27a"/><circle cx="85" cy="119" r="2" fill="#f6c27a"/>' +
    '<g transform="rotate(-25 34 58)"><ellipse cx="34" cy="58" rx="14" ry="7" fill="#eef2f8"/><ellipse cx="34" cy="58" rx="8" ry="3.5" fill="#f6c27a"/></g>' +
    '<g transform="rotate(25 96 58)"><ellipse cx="96" cy="58" rx="14" ry="7" fill="#eef2f8"/><ellipse cx="96" cy="58" rx="8" ry="3.5" fill="#f6c27a"/></g>' +
    '<ellipse cx="65" cy="70" rx="30" ry="28" fill="url(#dg)"/><ellipse cx="65" cy="85" rx="15" ry="11" fill="#ffe7bf"/>' +
    '<ellipse cx="65" cy="79.5" rx="5" ry="3.5" fill="#0e1a33"/><path d="M59 88q6 6 12 0" stroke="#0e1a33" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="53" cy="66" rx="4" ry="5" fill="#0e1a33"/><circle cx="54.6" cy="64" r="1.4" fill="#fff"/><ellipse cx="77" cy="66" rx="4" ry="5" fill="#0e1a33"/><circle cx="78.6" cy="64" r="1.4" fill="#fff"/>' +
    '<ellipse cx="44" cy="78" rx="5" ry="3" fill="#f7a9a0" opacity=".75"/><ellipse cx="86" cy="78" rx="5" ry="3" fill="#f7a9a0" opacity=".75"/></svg>';
  var COIN = '<svg class="coin" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true"><path fill="#b86f50" d="M4 0h4v1h2v1h1v2h1v4h-1v2h-1v1h-2v1h-4v-1h-2v-1h-1v-2h-1v-4h1v-2h1v-1h2z"/><path fill="#ffcd75" d="M4 1h4v1h2v2h1v4h-1v2h-2v1h-4v-1h-2v-2h-1v-4h1v-2h2z"/><path fill="#fff4c2" d="M4 2h2v1h-2v1h-1v2h-1v-2h1v-1h1z"/><path fill="#b86f50" d="M5 3h2v6h-2z"/></svg>';
  var COURT_ART = '<svg class="hero-art" viewBox="0 0 340 170" fill="none" stroke="#2f2f2f" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="300" cy="40" r="16" fill="#e8b95c" stroke="none" class="fill"/>' +
    '<path d="M0 150H340"/><path d="M0 90H30V102H48V114H66V126H84V138H102V150"/>' +
    '<path d="M200 150V95A40 40 0 0 1 280 95V150"/><path d="M222 150V108A18 18 0 0 1 258 108V150"/><path d="M200 95H280M222 128H258"/>' +
    '<path d="M150 70L190 46L230 70"/><path d="M160 70H220"/>' +
    '<path d="M90 128H190M100 128L94 150M180 128L186 150"/>' +
    '<path d="M118 106H146L143 126H121Z" fill="#f0ebe1"/><path d="M146 110C155 110 155 121 144 121"/>' +
    '<path d="M126 100C122 94 130 90 126 84M136 100C132 94 140 90 136 84" stroke="#c4a074" stroke-width="2.4"/>' +
    '<path d="M60 150C60 120 58 100 52 80"/><path d="M56 100C40 96 32 84 34 74C46 78 54 88 56 100Z"/><path d="M58 116C74 110 82 98 80 88C68 92 60 104 58 116Z" fill="#7f9160" class="fill"/><path d="M53 86C46 72 48 60 56 54C62 64 60 76 53 86Z"/>' +
    '<path d="M300 150C304 128 318 114 332 104"/><path d="M306 128C312 110 326 104 338 108C330 122 318 130 306 128Z" fill="#7f9160" class="fill"/><path d="M314 116C304 104 304 92 310 84C318 94 318 106 314 116Z"/>' +
    '<circle cx="246" cy="60" r="2" fill="#2f2f2f"/><circle cx="256" cy="66" r="2" fill="#2f2f2f"/><circle cx="238" cy="70" r="2" fill="#2f2f2f"/></svg>';

  function hero(c) {
    var p = LSL.db().panel;
    var h = '<section class="hero hero-' + theme + '">';
    if (theme === 'sweat') {
      h += '<div class="brand-line"><span class="mono">LUSHANGLIAN · 麓山 / 麓湖</span><span class="mono">' + esc(p.month) + '</span></div><i class="dotgrid"></i>';
      h += titleFx('麓商联', '积分圈', '<i class="hero-band"></i>');
      h += '<div class="hero-tag">LET\'S GROW · TOGETHER</div>';
    } else if (theme === 'ally') {
      h += '<div class="kicker">麓商联 · 商户积分计划</div>';
      h += '<div class="ally-row"><div>' + titleFx('你的积分，', '做公益也做生意。') + '</div></div>';
      h += '<div class="bubble"><small>小麓 · 积分向导</small>嗨！完成活动就能攒积分，换曝光、换场地～</div>' + MASCOT;
    } else if (theme === 'apple') {
      h += '<div class="eyebrow">麓商联积分</div>';
      h += titleFx('攒积分。', '也攒好邻居。');
      h += '<p class="lede">参与公益、商圈与社区活动，换取曝光与经营权益。</p>';
      h += '<div class="links"><a data-go="tasks">了解怎么积分 ›</a><a data-go="mall">去兑换 ›</a></div>';
    } else if (theme === 'court') {
      h += '<svg class="arch-title" viewBox="0 0 300 150" aria-label="麓商联积分圈"><path id="archPath" d="M28 148A122 122 0 0 1 272 148" fill="none"/><text><textPath href="#archPath" startOffset="50%" text-anchor="middle">麓 商 联 · 积 分 圈</textPath></text></svg>';
      h += '<div class="court-sub">LUSHANG POINTS CLUB · ' + esc(p.month) + '</div>' + COURT_ART;
    } else if (theme === 'delaunay') {
      h += '<div class="dl-head"><span>LUSHANG</span><span>(00) POINTS CLUB · ' + esc(p.month) + '</span></div>';
      h += '<div class="dl-art"><canvas class="mesh"></canvas><i class="halftone"></i></div>';
      h += titleFx('麓商联', '积分圈');
      h += '<p class="dl-en">GROW WITH CONNECT</p>';
      h += '<p class="dl-copy">像德劳内三角网一样，每多一个点的连接，就多生出一个新的面。商户、社区与公益，在这里彼此连接。</p>';
      h += '<button class="dl-ring" data-go="tasks" aria-label="去参与"><svg viewBox="0 0 100 100"><defs><path id="ringPath" d="M50 50m-41 0a41 41 0 1 1 82 0a41 41 0 1 1-82 0"/></defs><text><textPath href="#ringPath">Let\'s connect and grow together · 一起连接 · 一起生长 · </textPath></text></svg><span>去参与 ↗</span></button>';
    } else if (theme === 'pixel') {
      h += '<div class="px-top"><span>1UP · 麓商联</span><span>' + esc(p.month) + '</span></div>';
      h += '<div class="px-row">' + titleFx('麓商联', '积分大冒险') + COIN + '</div>';
      h += '<div class="press">▶ PRESS START</div>';
    }
    h += c && c.merchant ? pointsCard(c) : guestCard(c);
    h += '<div class="hero-actions rv"><button class="btn" data-go="tasks">去参与赚分</button><button class="btn green" data-go="mall">去兑换权益</button></div>';
    return h + '</section>';
  }

  function pointsCard(c) {
    var m = c.merchant, annual = LSL.annual(m), lv = LSL.level(annual), month = LSL.monthEarned(m.id);
    var pct = lv.next ? Math.round((annual - lv.cur.min) / (lv.next.min - lv.cur.min) * 100) : 100;
    var delta = lastSeen.id === m.id ? m.points - lastSeen.points : 0;
    var h = '<div class="store-line"><div><div class="name">' + esc(m.name) + '</div><div class="meta">' + esc(m.category) + ' · ' + esc(m.code) + (c.member.role === 'owner' ? ' · 店长' : ' · 店员') + '</div></div><span class="chip plain">Lv.' + (lv.idx + 1) + ' ' + esc(lv.cur.name) + '</span></div>';
    h += '<div class="points-card rv">';
    if (delta) h += '<span class="fly ' + (delta > 0 ? 'up' : 'down') + '">' + (delta > 0 ? '+' : '') + delta + '</span>';
    h += '<div class="mono">AVAILABLE POINTS · 可用积分</div>';
    h += '<div class="big num">' + fxNum('fxw', fmtNum(m.points), 'pts-' + m.id + '-' + m.points, 'card') + '<small>分</small></div>';
    h += '<div class="stats"><div><div class="num">' + fxNum('fxw', fmtNum(month), 'month-' + m.id + '-' + month, 'card') + '<em>+</em></div><div class="lbl">本月累计获得</div><div class="mono">THIS MONTH</div></div>';
    h += '<div><div class="lv-name">' + esc(lv.cur.name) + '</div><div class="lbl">当前年度等级</div><div class="mono">' + esc(lv.cur.en) + '</div></div></div>';
    h += '<div class="lvbar"><div class="bar rv"><i class="lv" style="--w:' + pct + '%"></i></div><div class="mono"><span>年度贡献 ' + annual + '</span><span>' + (lv.next ? '距「' + lv.next.name + '」' + (lv.next.min - annual) + ' 分' : '已达最高等级') + '</span></div></div>';
    return h + '</div>';
  }
  function guestCard(c) {
    if (c && !c.merchant) {
      var pend = LSL.membershipsOf(c.user.id).filter(function (x) { return x.status === 'pending'; })[0];
      return '<div class="guest-card rv"><div class="mono">WELCOME · ' + esc(maskPhone(c.user.phone)) + '</div><h3>' + (pend ? '门店绑定审核中' : '还差一步：绑定你的门店') + '</h3><p>' +
        (pend ? '运营人员确认后即可查看积分。也可以向店长要绑定码，立即绑定。' : '积分记在门店名下。用门店绑定码可立即绑定，也可以提交审核。') + '</p><button class="btn block" data-push="bind">' + (pend ? '用绑定码立即绑定' : '去绑定门店') + '</button></div>';
    }
    return '<div class="guest-card rv"><div class="mono">GUEST · 游客模式</div><h3>登录后查看<br>你的门店积分</h3><p>手机号验证码登录，30 天内免登录。积分、报名、兑换都需要登录。</p><button class="btn block" data-login>手机号登录 / 注册</button></div>';
  }

  /* ---------- 首页 ---------- */
  var ICONS = {
    about: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    academy: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 3 9 3 12 0v-5"/></svg>',
    data: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    tasks: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg>'
  };
  function viewHome(c) {
    var db = LSL.db(), m = c && c.merchant;
    var tasks = db.tasks.filter(function (t) { return t.active; });
    var rewards = db.rewards.filter(function (r) { return r.active; }).sort(function (a, b) { return a.cost - b.cost; });
    var courses = upcomingCourses();
    var p = db.panel, N = m ? 9 : 8, n = 0;
    var h = hero(c);
    h += band();

    // 轮播图
    var cs = db.content.carousel;
    if (cs.length) {
      h += '<div class="carousel rv" id="carousel"><div class="slides">' + cs.map(function (s) {
        return '<div class="slide" data-link="' + esc(s.link) + '"><img src="' + s.image + '" alt="" /><div class="cap"><b>' + esc(s.title) + '</b><small>' + esc(s.sub) + '</small></div></div>';
      }).join('') + '</div><div class="cdots">' + cs.map(function (s, i) { return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('') + '</div></div>';
    }
    // 三项统计（后台可改，点击跳转）
    h += '<div class="stats3">' + db.content.stats.map(function (st, i) {
      var v = LSL.statValue(st);
      return '<button class="stat rv" data-link="' + esc(st.link) + '">' + fxNum('num', esc(v), 'stat-' + st.id + '-' + v) + '<span class="unit">' + esc(st.unit) + '</span><span class="lbl">' + esc(st.label) + (st.link ? '<i>›</i>' : '') + '</span></button>';
    }).join('') + '</div>';
    // 快捷入口
    h += '<div class="entries">' + [['about', '关于我们'], ['academy', '商学院'], ['data', '我的数据'], ['tasks', '本月活动']].map(function (e) {
      return '<button class="entry rv" data-link="' + e[0] + '"><span class="ic">' + ICONS[e[0]] + '</span>' + e[1] + '</button>';
    }).join('') + '</div>';

    if (m) {
      var annual = LSL.annual(m);
      h += '<section class="block">' + secHead(++n, N, '年度贡献值', 'ANNUAL');
      h += '<div class="contrib-total rv">' + fxNum('num', fmtNum(annual), 'annual-' + m.id + '-' + annual) + '<span class="heavy">分</span><span class="mono">= 三大板块之和</span></div>';
      h += '<div class="bar rv" style="height:16px">' + LSL.SECTIONS.map(function (s) { return annual ? '<i class="' + s.key + '" style="--w:' + (m.sections[s.key] / annual * 100) + '%"></i>' : ''; }).join('') + '</div>';
      h += '<div class="contrib-rows">' + LSL.SECTIONS.map(function (s) {
        var v = m.sections[s.key] || 0;
        return '<div class="contrib-row rv"><i class="dot ' + s.key + '"></i><span class="nm">' + s.name + ' <span class="en">' + s.en + '</span></span>' + fxNum('num', v, 'sec-' + m.id + '-' + s.key + '-' + v, s.key) + '</div>';
      }).join('') + '</div><p class="mono" style="margin-top:10px;letter-spacing:.08em">兑换只扣可用积分，年度贡献值不扣减</p></section>';
    }

    h += '<section class="block">' + secHead(++n, N, '三大板块 · 怎么积分', 'HOW TO EARN');
    h += '<div class="rule-cards tilt">' + LSL.SECTIONS.map(function (s, i) {
      return '<div class="card rule-card rv"><span class="idx">' + no(i) + '</span><div class="en">X / ' + no(i) + ' · ' + s.en + '</div>' +
        '<h3><i class="dot ' + s.key + '"></i>' + s.name + '</h3><p class="what">' + esc(s.what) + '</p>' +
        '<ul>' + s.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul><p class="verify">核验依据：' + esc(s.verify) + '</p>' +
        (m ? '<div class="mine"><span>本店该板块累计</span>' + fxNum('num', m.sections[s.key] || 0, 'rule-' + m.id + '-' + s.key + '-' + (m.sections[s.key] || 0), s.key) + '</div>' : '') + '</div>';
    }).join('') + '</div></section>';

    h += '<section class="block">' + secHead(++n, N, '商圈动态', esc(p.month));
    h += '<div class="panel-box rv"><div class="mono"><i class="live"></i>WHAT\'S NEW · ' + esc(p.month) + '</div><h3><span class="marker">' + esc(p.title) + '</span></h3>';
    h += '<div class="metrics">' + p.metrics.map(function (x, k) { return '<div>' + fxNum('num', esc(x.value), 'metric-' + k + '-' + x.value) + '<div class="unit">' + esc(x.unit) + '</div><div class="lbl">' + esc(x.label) + '</div></div>'; }).join('') + '</div>';
    h += p.notices.length ? '<ul class="notices">' + p.notices.map(function (x, i) { return '<li><span class="n">' + no(i) + '</span><span>' + esc(x.text) + '</span></li>'; }).join('') + '</ul>' : '<div class="empty">暂无公告</div>';
    h += '</div></section>';

    h += '<section class="block">' + secHead(++n, N, '本月可参与', '<a data-go="tasks">全部 ' + tasks.length + ' 项 →</a>');
    h += '<div class="task-list tilt">' + tasks.slice(0, 3).map(function (t, i) { return taskCard(t, i, c); }).join('') + '</div></section>';

    h += '<section class="block">' + secHead(++n, N, '商学院 · 近期课程', '<a data-go="academy">全部 →</a>');
    h += courses.length ? '<div class="task-list tilt">' + courses.slice(0, 2).map(function (x) { return courseCard(x, c); }).join('') + '</div>' : '<div class="empty">本月暂无课程</div>';
    h += '</section>';

    h += '<section class="block">' + secHead(++n, N, '本月兑换权益', '<a data-go="mall">积分商城 →</a>');
    h += '<div class="reward-list">' + rewards.slice(0, 4).map(function (r, i) {
      return '<div class="card rv reward ' + (i % 2 ? 't2' : 't1') + '" data-redeem="' + r.id + '"><div class="body"><h4>' + esc(r.name) + '</h4><div class="sub">剩余 ' + r.stock + ' 份 · ' + esc(r.category) + '</div><div class="state">' + shortfall(m, r) + '</div></div>' +
        '<div class="cost"><div class="num">' + r.cost + '</div><div class="mono">POINTS</div></div></div>';
    }).join('') + '</div></section>';

    h += '<section class="block">' + secHead(++n, N, '工作人员', '<a data-push="about">遇到问题找谁 →</a>');
    h += '<div class="staff-strip">' + visibleStaff().map(function (s) {
      return '<button class="card staff-card rv" data-push="about">' + ava(s.name, s.color, s.photo) + '<b>' + esc(s.name) + '</b><span class="t">' + esc(s.title) + '</span><p>' + esc(s.duties) + '</p></button>';
    }).join('') + '</div></section>';

    h += '<section class="block">' + secHead(++n, N, '聊一次合作', 'CONTACT') + leadBox() + '</section>';
    h += footer();
    return h;
  }

  function band() {
    var items = ['公益捐赠', '商圈共生', '社区参与', '商学院', '湖畔市集', '志愿服务', '社区议事', '调研共创'];
    var one = items.map(function (x) { return '<span>' + x + '</span><i>' + (theme === 'pixel' ? '★' : theme === 'ally' ? '✦' : theme === 'court' ? '❧' : '✳') + '</i>'; }).join('');
    return '<div class="band"><div class="band-track">' + one + one + '</div></div>';
  }
  function footer() {
    return '<div class="footer-note"><span class="mono">麓商联 · 麓湖商户积分系统</span><span class="mono">© ' + new Date().getFullYear() + ' LUSHANG · 手机端 H5 演示版</span></div>';
  }
  function visibleStaff() { return LSL.db().staff.filter(function (s) { return s.visible; }).sort(function (a, b) { return a.order - b.order; }); }
  function upcomingCourses() {
    var t = Date.now() - 3 * 3600000;
    return LSL.db().academy.courses.filter(function (x) { return x.active && x.start > t; }).sort(function (a, b) { return a.start - b.start; });
  }

  function taskCard(t, i, c) {
    var pend = c && c.merchant ? LSL.db().claims.filter(function (x) { return x.taskId === t.id && x.merchantId === c.merchant.id && x.status === 'pending'; }).length : 0;
    return '<div class="card task rv"><span class="idx">' + no(i) + '</span><div class="top">' + chip(t.section) + '<span class="chip plain">' + esc(t.form) + '</span></div>' +
      '<h4>' + esc(t.title) + '</h4><p class="desc">' + esc(t.desc) + '</p>' +
      '<div class="foot"><div class="pts"><div class="num">' + esc(t.pointsText || (t.points + ' 分')) + '</div><div class="verify">核验：' + esc(t.verify) + '</div></div>' +
      '<button class="btn sm' + (pend ? ' ghost' : '') + '" data-claim="' + t.id + '">' + (pend ? '审核中 · 再报' : '完成后申报') + '</button></div></div>';
  }
  function courseCard(x, c) {
    var d = new Date(x.start), mt = mentorOf(x.mentorId) || {};
    var list = LSL.signupsOf(x.id), left = x.seats - list.length;
    var mine = c && c.merchant ? list.filter(function (s) { return s.merchantId === c.merchant.id; })[0] : null;
    var btn = mine ? (mine.status === 'checked' ? '<span class="status checked">已签到 +' + x.points + '</span>' : '<button class="btn sm ghost" data-unsign="' + mine.id + '">已报名 · 取消</button>')
      : left <= 0 ? '<span class="status off">名额已满</span>' : '<button class="btn sm" data-sign="' + x.id + '">报名</button>';
    return '<div class="card course rv"><div class="date"><small>' + (d.getMonth() + 1) + '月</small><span class="num">' + d.getDate() + '</span><small>周' + WEEK[d.getDay()] + '</small></div><div class="body">' +
      '<h4>' + esc(x.title) + '</h4><div class="meta">' + esc(mt.name || '') + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' · ' + esc(x.place) + '</div>' +
      '<div class="acts"><span class="seats">余 ' + Math.max(0, left) + ' / ' + x.seats + ' 席 · 到场 +' + x.points + '</span>' + btn + '</div></div></div>';
  }

  function leadBox() {
    if (state.leadDone) return '<div class="lead-box rv"><div class="lead-done"><div class="num">THANKS!</div><h3>已收到你的信息</h3><p class="mono" style="margin-top:8px">工作人员会在 1 个工作日内联系你</p><button class="btn" style="margin-top:16px" data-lead-again>再提交一条</button></div></div>';
    return '<div class="lead-box rv"><div class="mono">LET\'S TALK · 合作意向</div><h3>有合作想法？<br>留个联系方式</h3><p>品牌入驻、活动合作、赞助与场地合作，都可以聊。</p>' +
      '<form id="leadForm"><div class="row"><label class="field"><span>姓名 *</span><input name="name" required maxlength="20" /></label><label class="field"><span>手机号 *</span><input name="phone" required inputmode="tel" maxlength="11" /></label></div>' +
      '<label class="field"><span>公司 / 品牌</span><input name="company" maxlength="40" /></label>' +
      '<label class="field"><span>合作类型</span><select name="type">' + LSL.LEAD_TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>想聊什么</span><textarea name="message" maxlength="300" placeholder="简单说说你的想法"></textarea></label>' +
      '<label class="check"><input type="checkbox" name="agree" required /> 同意麓商联使用以上信息联系我，信息仅用于本次合作沟通</label>' +
      '<button class="btn block" type="submit">提交合作意向</button></form></div>';
  }

  /* ---------- 参与 ---------- */
  function viewTasks(c) {
    var db = LSL.db();
    var list = db.tasks.filter(function (t) { return t.active && (state.filter === 'all' || t.section === state.filter); });
    var h = '<div class="mono" style="margin-bottom:6px">PARTICIPATE · ' + esc(LSL.monthLabel(Date.now())) + '</div><h2 class="sec-title"><span class="marker">本月可参与</span></h2>';
    h += '<div class="filters"><button data-filter="all" class="' + (state.filter === 'all' ? 'on' : '') + '">全部</button>' +
      LSL.SECTIONS.map(function (s) { return '<button data-filter="' + s.key + '" class="' + (state.filter === s.key ? 'on' : '') + '">' + s.name + '</button>'; }).join('') + '</div>';
    if (state.filter !== 'all') {
      var s = LSL.section(state.filter);
      h += '<div class="card rv" style="margin-bottom:18px"><div class="mono">规则 · ' + s.en + '</div><p style="font-size:13px;margin-top:6px">' + esc(s.rules.join('；')) + '。</p><p class="muted" style="font-size:12px;margin-top:6px">核验依据：' + esc(s.verify) + '</p></div>';
    }
    h += list.length ? '<div class="task-list tilt">' + list.map(function (t, i) { return taskCard(t, i, c); }).join('') + '</div>' : '<div class="empty">该板块本月暂无开放内容</div>';
    h += '<p class="mono" style="letter-spacing:.08em;margin-top:18px;text-align:center">报名不计分，完成后提交申报，审核通过即发放</p>';
    return h;
  }

  /* ---------- 商学院 ---------- */
  function viewAcademy(c) {
    var ac = LSL.db().academy;
    var h = '<div class="mono" style="margin-bottom:6px">LUSHANG ACADEMY · 麓商学院</div><h2 class="sec-title"><span class="marker">商学院</span></h2>';
    h += '<div class="seg">' + [['courses', '本月课程'], ['mentors', '导师'], ['past', '往期回顾']].map(function (s) { return '<button data-seg="' + s[0] + '" class="' + (state.seg === s[0] ? 'on' : '') + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (state.seg === 'courses') {
      var list = upcomingCourses();
      h += list.length ? '<div class="task-list tilt">' + list.map(function (x) { return courseCard(x, c); }).join('') + '</div>' : '<div class="empty">本月暂无课程</div>';
      h += '<p class="mono" style="letter-spacing:.06em;margin-top:16px;text-align:center">报名不计分 · 到场签到后自动发放商圈共生值</p>';
    } else if (state.seg === 'mentors') {
      h += '<div class="task-list tilt">' + ac.mentors.map(function (x, i) {
        return '<div class="card mentor rv">' + ava(x.name, ['#e8501f', '#5f7d14', '#1597a6', '#7a4fb3'][i % 4], x.photo) + '<div><b>' + esc(x.name) + '</b> <span class="t">' + esc(x.title) + '</span><div class="chip plain" style="margin-top:4px">' + esc(x.tags) + '</div><p>' + esc(x.intro) + '</p></div></div>';
      }).join('') + '</div>';
    } else {
      h += '<div class="task-list">' + ac.past.slice().sort(function (a, b) { return b.date - a.date; }).map(function (x) {
        var mt = mentorOf(x.mentorId) || {};
        return '<div class="card past rv">' + (x.image ? '<img src="' + x.image + '" alt="" />' : '') + '<div class="in"><div class="mono">' + esc(LSL.monthLabel(x.date)) + ' · ' + esc(mt.name || '') + '</div><h4>' + esc(x.title) + '</h4><p>' + esc(x.summary) + '</p></div></div>';
      }).join('') + '</div>';
    }
    return h;
  }

  /* ---------- 兑换 ---------- */
  function viewMall(c) {
    var db = LSL.db(), m = c && c.merchant;
    var list = db.rewards.filter(function (r) { return r.active; });
    var h = '<div class="mono" style="margin-bottom:6px">REDEEM · 积分商城</div><h2 class="sec-title"><span class="marker">用积分换权益</span></h2>';
    h += m ? '<div class="card t1 rv" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px"><div><div class="mono">AVAILABLE</div><div class="heavy">可用积分</div></div><div class="num" style="font-size:calc(44px * var(--ns))">' + fmtNum(m.points) + '</div></div>'
      : '<div class="card t1 rv" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px"><div class="heavy">登录后查看可用积分</div><button class="btn sm" data-login>登录</button></div>';
    h += '<div class="mall-grid tilt">' + list.map(function (r, i) {
      var can = m && r.stock > 0 && m.points >= r.cost;
      return '<div class="card mall-card rv"><div class="cover"><span class="mono">' + esc(r.category) + '</span><span class="num">' + no(i) + '</span></div><h4>' + esc(r.name) + '</h4><p class="sub">' + esc(r.desc) + '</p>' +
        '<div class="cost"><span class="num">' + r.cost + '<small class="mono"> PTS</small></span><span class="mono">余 ' + r.stock + '</span></div><div style="font-size:11px;font-weight:800;margin-bottom:8px">' + shortfall(m, r) + '</div>' +
        '<button class="btn sm block' + (can ? '' : ' ghost') + '" data-redeem="' + r.id + '"' + (r.stock <= 0 ? ' disabled' : '') + '>' + (r.stock <= 0 ? '已兑完' : '立即兑换') + '</button></div>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------- 我的 ---------- */
  function viewMe(c) {
    var h = '';
    if (!c) {
      h += '<div class="guest-card rv" style="margin-top:0"><div class="mono">GUEST · 游客模式</div><h3>登录麓商联</h3><p>手机号 + 验证码即可登录，首次登录后绑定你的门店。</p><button class="btn block" data-login>手机号登录 / 注册</button></div>';
      h += '<div class="menu rv" style="margin-top:22px"><button class="menu-item" data-push="about">关于我们 · 联系工作人员</button><button class="menu-item" data-push="themes">视觉风格 <small class="r">' + T().name + '</small></button></div>';
      return h + footer();
    }
    var u = c.user, m = c.merchant;
    h += '<div class="me-head rv">' + ava(u.name || u.phone, 'var(--accent)') + '<div><b>' + esc(u.name || '麓商联会员') + '</b><small>' + esc(maskPhone(u.phone)) + (m ? ' · ' + esc(m.name) + ' · ' + (c.member.role === 'owner' ? '店长' : '店员') : ' · 未绑定门店') + '</small></div></div>';
    if (m) {
      var annual = LSL.annual(m), lv = LSL.level(annual);
      h += '<div class="metrics rv" style="margin:0 0 20px"><div><span class="num">' + fmtNum(m.points) + '</span><div class="lbl">可用积分</div></div><div><span class="num">' + fmtNum(annual) + '</span><div class="lbl">年度贡献</div></div><div><span class="num">' + esc(lv.cur.name) + '</span><div class="lbl">年度等级</div></div></div>';
    } else {
      h += guestCard(c).replace('guest-card rv', 'guest-card rv" style="margin:0 0 20px');
    }
    var mine = LSL.membershipsOf(u.id).filter(function (x) { return x.status === 'active'; });
    h += '<div class="menu rv">';
    if (m) h += '<button class="menu-item" data-push="data">我的数据</button><button class="menu-item" data-push="ledger">积分明细</button><button class="menu-item" data-push="claims">我的申报</button><button class="menu-item" data-push="orders">我的兑换</button><button class="menu-item" data-push="signups">我的报名</button><button class="menu-item" data-push="members">门店成员' + (c.member.role === 'owner' ? ' <small class="r">店长可查看绑定码</small>' : '') + '</button>';
    h += '</div><div class="menu rv" style="margin-top:16px">';
    if (mine.length > 1) h += '<button class="menu-item" data-switch>切换门店 <small class="r">已绑定 ' + mine.length + ' 家</small></button>';
    h += '<button class="menu-item" data-push="bind">绑定' + (m ? '其他' : '') + '门店</button><button class="menu-item" data-rename>修改称呼</button><button class="menu-item" data-push="about">关于我们 · 联系工作人员</button><button class="menu-item" data-push="themes">视觉风格 <small class="r">' + T().name + '</small></button></div>';
    h += '<button class="btn ghost block rv" style="margin-top:20px" data-logout>退出登录</button>';
    h += '<p class="mono" style="text-align:center;margin-top:12px;letter-spacing:.06em">登录状态 30 天有效，每次打开自动续期</p>';
    return h + footer();
  }

  function viewData(c) {
    if (!c || !c.merchant) return needStoreHTML();
    var m = c.merchant, db = LSL.db(), annual = LSL.annual(m), lv = LSL.level(annual);
    var rank = db.merchants.slice().sort(function (a, b) { return LSL.annual(b) - LSL.annual(a); }).map(function (x) { return x.id; }).indexOf(m.id) + 1;
    var claims = db.claims.filter(function (x) { return x.merchantId === m.id && x.status === 'approved'; }).length;
    var signs = db.signups.filter(function (x) { return x.merchantId === m.id && x.status === 'checked'; }).length;
    var orders = db.orders.filter(function (x) { return x.merchantId === m.id; }).length;
    var pct = lv.next ? Math.round((annual - lv.cur.min) / (lv.next.min - lv.cur.min) * 100) : 100;
    var h = '<div class="mono" style="margin-bottom:6px">MY DATA · ' + esc(m.name) + '</div><h2 class="sec-title"><span class="marker">我的数据</span></h2>';
    h += '<div class="stats3" style="margin-top:0">' + [['年度贡献', annual, '分'], ['商圈排名', rank, '名'], ['本月获得', LSL.monthEarned(m.id), '分'], ['参与活动', claims, '次'], ['课程签到', signs, '次'], ['兑换权益', orders, '次']].map(function (x, i) {
      return '<div class="stat rv">' + fxNum('num', x[1], 'd-' + i + '-' + m.id + '-' + x[1]) + '<span class="unit">' + x[2] + '</span><span class="lbl">' + x[0] + '</span></div>';
    }).join('') + '</div>';
    h += '<section class="block">' + secHead(1, 2, '积分构成', 'COMPOSITION');
    h += '<div class="bar rv" style="height:16px">' + LSL.SECTIONS.map(function (s) { return annual ? '<i class="' + s.key + '" style="--w:' + (m.sections[s.key] / annual * 100) + '%"></i>' : ''; }).join('') + '</div>';
    h += '<div class="contrib-rows">' + LSL.SECTIONS.map(function (s) {
      var v = m.sections[s.key] || 0;
      return '<div class="contrib-row rv"><i class="dot ' + s.key + '"></i><span class="nm">' + s.name + '</span><span class="mono">' + (annual ? Math.round(v / annual * 100) : 0) + '%</span>' + fxNum('num', v, 'dsec-' + m.id + '-' + s.key + '-' + v, s.key) + '</div>';
    }).join('') + '</div></section>';
    h += '<section class="block">' + secHead(2, 2, '等级进度', 'LEVEL');
    h += '<div class="card rv"><div style="display:flex;justify-content:space-between;align-items:baseline"><b class="heavy" style="font-size:22px">Lv.' + (lv.idx + 1) + ' ' + esc(lv.cur.name) + '</b><span class="mono">' + (lv.next ? '下一级 ' + esc(lv.next.name) + ' · ' + lv.next.min : 'MAX') + '</span></div>' +
      '<div class="bar rv" style="margin-top:12px;height:14px"><i class="lv" style="--w:' + pct + '%"></i></div><p class="muted" style="font-size:12px;margin-top:8px">等级按年度贡献值 200 / 500 / 1000 / 2000 分档</p></div></section>';
    return h;
  }

  function listPage(title, rows, empty) { return '<h2 class="sec-title"><span class="marker">' + title + '</span></h2>' + (rows.length ? '<ul class="ledger">' + rows.join('') + '</ul>' : '<div class="empty">' + empty + '</div>'); }
  function viewLedger(c) {
    if (!c || !c.merchant) return needStoreHTML();
    return listPage('积分明细', LSL.ledgerOf(c.merchant.id).map(ledgerRow), '暂无积分记录');
  }
  function ledgerRow(r) {
    var tag = r.section ? chip(r.section) : '<span class="chip plain">' + (r.type === 'spend' ? '兑换' : '其他') + '</span>';
    return '<li class="rv"><div class="t"><b>' + esc(r.title) + '</b><small>' + tag + fmtDate(r.createdAt) + '</small></div><div class="v ' + (r.points > 0 ? 'plus' : 'minus') + '">' + (r.points > 0 ? '+' : '') + r.points + '</div></li>';
  }
  function viewClaims(c) {
    if (!c || !c.merchant) return needStoreHTML();
    var list = LSL.db().claims.filter(function (x) { return x.merchantId === c.merchant.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    return listPage('我的申报', list.map(function (x) {
      var st = { pending: '审核中', approved: '已发放', rejected: '已退回', revoked: '已撤回' }[x.status];
      return '<li class="rv"><div class="t"><b>' + esc(x.title) + '</b><small>' + chip(x.section) + fmtDate(x.createdAt) + (x.reason ? ' · ' + esc(x.reason) : '') + '</small></div><div style="text-align:right"><div class="v ' + (x.status === 'approved' ? 'plus' : '') + '">' + (x.status === 'approved' ? '+' : '') + x.points + '</div><span class="status ' + x.status + '">' + st + '</span></div></li>';
    }), '还没有申报记录');
  }
  function viewOrders(c) {
    if (!c || !c.merchant) return needStoreHTML();
    var list = LSL.db().orders.filter(function (x) { return x.merchantId === c.merchant.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    return listPage('我的兑换', list.map(function (o) {
      return '<li class="rv"><div class="t"><b>' + esc(o.name) + '</b><small>' + esc(o.no) + ' · ' + fmtDate(o.createdAt) + '</small></div><div style="text-align:right"><div class="v minus">-' + o.cost + '</div><span class="status s-' + o.status + '">' + o.status + '</span></div></li>';
    }), '还没有兑换记录');
  }
  function viewSignups(c) {
    if (!c || !c.merchant) return needStoreHTML();
    var db = LSL.db();
    var list = db.signups.filter(function (x) { return x.merchantId === c.merchant.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    return listPage('我的报名', list.map(function (s) {
      var x = db.academy.courses.filter(function (k) { return k.id === s.courseId; })[0] || { title: '（课程已删除）', start: s.createdAt, points: 0 };
      var st = { signed: '已报名', checked: '已签到', cancelled: '已取消' }[s.status];
      return '<li class="rv"><div class="t"><b>' + esc(x.title) + '</b><small>' + fmtDate(x.start) + '</small></div><div style="text-align:right">' + (s.status === 'checked' ? '<div class="v plus">+' + x.points + '</div>' : '') + '<span class="status ' + s.status + '">' + st + '</span></div></li>';
    }), '还没有报名课程');
  }
  function viewMembers(c) {
    if (!c || !c.merchant) return needStoreHTML();
    var db = LSL.db(), owner = c.member.role === 'owner';
    var list = db.members.filter(function (x) { return x.merchantId === c.merchant.id && x.status !== 'rejected'; });
    var h = '<h2 class="sec-title"><span class="marker">门店成员</span></h2>';
    if (owner) h += '<div class="card rv" style="margin-bottom:20px"><div class="mono">BIND CODE · 门店绑定码</div><div class="num" style="font-size:calc(48px * var(--ns));margin:6px 0">' + esc(c.merchant.bindCode) + '</div><p class="muted" style="font-size:12px">店员登录后输入此码即可绑定本店。如需更换，请联系运营人员重置。</p></div>';
    h += '<ul class="ledger">' + list.map(function (mb) {
      var u = LSL.find('users', mb.userId) || {};
      var me = mb.userId === c.user.id;
      return '<li class="rv">' + ava(u.name || u.phone, mb.role === 'owner' ? 'var(--accent)' : 'var(--ink-2)') + '<div class="t"><b>' + esc(u.name || '未填称呼') + (me ? '（我）' : '') + '</b><small>' + esc(maskPhone(u.phone)) + ' · ' + (mb.role === 'owner' ? '店长' : '店员') + (mb.status === 'pending' ? ' · 待审核' : '') + '</small></div>' +
        (owner && !me && mb.role !== 'owner' ? '<button class="btn sm ghost" data-unbind="' + mb.id + '">移除</button>' : '') + '</li>';
    }).join('') + '</ul>';
    h += '<p class="mono" style="letter-spacing:.06em;margin-top:14px">移除后该成员立即无法查看本店积分</p>';
    return h;
  }
  function needStoreHTML() { return '<div class="empty">请先登录并绑定门店</div>'; }

  /* ---------- 关于我们 + 工作人员 ---------- */
  function viewAbout() {
    var db = LSL.db(), ab = db.content.about, staff = visibleStaff();
    var topic = db.content.topics.filter(function (t) { return t.id === state.topic; })[0] || db.content.topics[0];
    var h = '<div class="mono" style="margin-bottom:6px">ABOUT · 麓商联</div><h2 class="sec-title"><span class="marker">关于我们</span></h2>';
    h += '<div class="card rv"><p style="font-size:14px;line-height:1.75">' + esc(ab.intro) + '</p><p class="heavy" style="margin-top:12px;font-size:16px">' + esc(ab.mission) + '</p></div>';
    h += '<section class="block">' + secHead(1, 3, '遇到问题找谁', 'HELP');
    h += '<div class="topics rv">' + db.content.topics.map(function (t) { return '<button data-topic="' + t.id + '" class="' + (topic && t.id === topic.id ? 'on' : '') + '">' + esc(t.name) + '</button>'; }).join('') + '</div>';
    var s = topic && staffOf(topic.staffId);
    if (s) h += '<div class="card contact rv"><div class="staff-row">' + ava(s.name, s.color, s.photo) + '<div class="info"><b>' + esc(s.name) + '</b><span class="t">' + esc(s.title) + '</span><p>负责：' + esc(s.duties) + '</p></div></div>' +
      '<span class="tel">' + esc(s.phone) + '</span><div class="acts"><a class="btn sm" href="tel:' + esc(s.phone.replace(/-/g, '')) + '">一键拨号</a><button class="btn sm green" data-copy="' + esc(s.wechat) + '">复制微信号</button></div></div>';
    h += '</section>';
    h += '<section class="block">' + secHead(2, 3, '工作人员', staff.length + ' 位');
    h += '<div class="task-list">' + staff.map(function (x) {
      return '<div class="card staff-row rv">' + ava(x.name, x.color, x.photo) + '<div class="info"><b>' + esc(x.name) + '</b><span class="t">' + esc(x.title) + '</span><p>' + esc(x.duties) + '</p></div><div class="acts"><a class="btn sm" href="tel:' + esc(x.phone.replace(/-/g, '')) + '">拨号</a></div></div>';
    }).join('') + '</div></section>';
    h += '<section class="block">' + secHead(3, 3, '聊一次合作', 'CONTACT') + leadBox() + '</section>';
    return h + footer();
  }

  /* ---------- 视觉风格 ---------- */
  function viewThemes() {
    var h = '<h2 class="sec-title"><span class="marker">视觉风格</span></h2><p class="muted" style="font-size:12px;margin:-6px 0 16px">演示用：同一套功能，5 种视觉方案，点击即可切换。</p>';
    h += '<div class="theme-list">' + Object.keys(THEMES).map(function (k, i) {
      var t = THEMES[k];
      return '<button data-set-theme="' + k + '" class="' + (k === theme ? 'on' : '') + '"><span class="sw">' + t.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' + (i + 1) + '. ' + t.name + '<br><small class="muted">' + t.desc + '</small></button>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------- 绑定门店 ---------- */
  function viewBind(c) {
    if (!c) return '<div class="guest-card"><h3>请先登录</h3><p>登录后选择你的门店。</p><button class="btn block" data-login>手机号登录</button></div>';
    var db = LSL.db(), u = c.user;
    var pend = LSL.membershipsOf(u.id).filter(function (x) { return x.status === 'pending'; });
    var myApps = db.applications.filter(function (a) { return a.userId === u.id && a.status === 'pending'; });
    var step = state.bindMode === 'apply' ? 2 : state.bindPick ? 2 : 1;
    var h = '<div class="steps"><i class="on"></i><i class="' + (step >= 2 ? 'on' : '') + '"></i><i></i></div>';
    h += '<h2 class="sec-title"><span class="marker">绑定你的门店</span></h2><p class="muted" style="font-size:12px;margin:-6px 0 16px">积分记在门店名下；一个手机号可以绑定多家门店。</p>';
    pend.forEach(function (mb) { var m = LSL.find('merchants', mb.merchantId); h += '<div class="card rv" style="margin-bottom:12px"><span class="status pending">审核中</span> <b>' + esc(m && m.name) + '</b><p class="muted" style="font-size:12px;margin-top:4px">运营人员确认后即可使用，也可改用绑定码立即绑定。</p></div>'; });
    myApps.forEach(function (a) { h += '<div class="card rv" style="margin-bottom:12px"><span class="status pending">入驻审核中</span> <b>' + esc(a.name) + '</b></div>'; });

    if (state.bindMode === 'apply') {
      h += '<div class="card rv"><div class="mono">NEW STORE · 新店入驻申请</div><form id="applyForm" style="margin-top:12px">' +
        '<label class="field"><span>门店名称 *</span><input name="name" required /></label>' +
        '<div class="row"><label class="field"><span>业态</span><select name="category"><option>餐饮 · 咖啡</option><option>餐饮 · 正餐</option><option>零售</option><option>运动 · 健身</option><option>文化 · 教育</option><option>生活服务</option></select></label><label class="field"><span>铺位号</span><input name="unit" placeholder="如 A-102" /></label></div>' +
        '<div class="row"><label class="field"><span>联系人 *</span><input name="contact" required value="' + esc(u.name) + '" /></label><label class="field"><span>手机号</span><input value="' + esc(u.phone) + '" disabled /></label></div>' +
        '<button class="btn block" type="submit">提交入驻申请</button></form></div><button class="btn ghost block" style="margin-top:14px" data-bind-mode="code">← 返回选择已有门店</button>';
      return h;
    }
    if (!state.bindPick) {
      h += '<label class="field"><input id="bindSearch" placeholder="搜索门店名称 / 铺位号" /></label>';
      h += '<div class="bind-list" id="bindList">' + db.merchants.filter(function (m) { return m.status === 'active'; }).map(function (m) {
        var bound = LSL.memberOk(u.id, m.id);
        return '<button class="card bind-item" data-pick="' + m.id + '" data-q="' + esc(m.name + ' ' + (m.unit || '') + ' ' + m.category) + '"' + (bound ? ' disabled style="opacity:.5"' : '') + '><span><b>' + esc(m.name) + '</b><small>' + esc(m.category) + ' · ' + esc(m.unit || m.code) + '</small></span><span class="mono">' + (bound ? '已绑定' : '选择 ›') + '</span></button>';
      }).join('') + '</div>';
      h += '<button class="btn ghost block" data-bind-mode="apply">门店不在列表？申请入驻</button>';
      return h;
    }
    var pm = LSL.find('merchants', state.bindPick);
    h += '<div class="card bind-item on rv" style="margin-bottom:18px"><span><b>' + esc(pm.name) + '</b><small>' + esc(pm.category) + ' · ' + esc(pm.unit || pm.code) + '</small></span><button class="mono" data-pick="">重选</button></div>';
    h += '<div class="seg"><button data-bind-mode="code" class="' + (state.bindMode === 'code' ? 'on' : '') + '">绑定码 · 立即生效</button><button data-bind-mode="review" class="' + (state.bindMode === 'review' ? 'on' : '') + '">提交审核</button></div>';
    if (state.bindMode === 'code') {
      h += '<form id="codeBind"><label class="field"><span>门店绑定码</span><input name="code" inputmode="numeric" maxlength="6" placeholder="4 位数字" required /><div class="hint">向店长索取（我的 → 门店成员），或扫门店专属二维码自动填入。演示：' + esc(pm.name) + ' 的绑定码是 ' + esc(pm.bindCode) + '</div></label><button class="btn block" type="submit">立即绑定</button></form>';
    } else {
      h += '<form id="reviewBind"><label class="field"><span>你的称呼</span><input name="name" value="' + esc(u.name) + '" placeholder="如：小王（店员）" /></label><label class="field"><span>补充说明</span><textarea name="note" placeholder="如：新入职店员，负责周末班"></textarea></label>' +
        '<label class="field"><span>门头照 / 工作照（选填）</span><label class="upload" id="up"><input type="file" accept="image/*" hidden /><span>＋ 点击上传图片</span></label></label><button class="btn block" type="submit">提交审核</button></form>';
    }
    return h;
  }

  var VIEWS = { home: viewHome, tasks: viewTasks, academy: viewAcademy, mall: viewMall, me: viewMe, about: viewAbout, data: viewData,
    ledger: viewLedger, claims: viewClaims, orders: viewOrders, signups: viewSignups, members: viewMembers, bind: viewBind, themes: viewThemes };

  /* ---------- 轮播 ---------- */
  function setupCarousel() {
    var el = document.getElementById('carousel'); if (!el) return;
    var slides = el.querySelector('.slides'), dots = el.querySelectorAll('.cdots i'), n = dots.length, i = 0, x0 = null;
    function show(k) { i = (k + n) % n; slides.style.transform = 'translateX(' + (-i * 100) + '%)'; Array.prototype.forEach.call(dots, function (d, j) { d.classList.toggle('on', j === i); }); }
    if (n > 1) carouselTimer = setInterval(function () { show(i + 1); }, 4000);
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  /* ---------- 晶格风格：缓慢流动的德劳内三角网 ---------- */
  function setupMesh() { document.querySelectorAll('canvas.mesh').forEach(function (cv) { if (!cv.__run) { cv.__run = true; startMesh(cv); } }); }
  function startMesh(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var C = 5, R = 4, pts = [], still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (var r = 0; r <= R; r++) for (var c = 0; c <= C; c++) {
      var inner = c > 0 && c < C && r > 0 && r < R;
      pts.push({ bx: c / C * w + (inner ? (Math.random() - .5) * w / C * .8 : 0), by: r / R * h + (inner ? (Math.random() - .5) * h / R * .8 : 0), amp: inner ? 10 + Math.random() * 10 : 0, ph: Math.random() * 6.28 });
    }
    // 配色取自参考站：紫 → 品红 → 青绿 → 蓝 → 橄榄黄，按位置与时间在色带上平滑过渡
    var PAL = [[106, 75, 196], [194, 68, 154], [63, 179, 154], [74, 127, 209], [185, 178, 60], [106, 75, 196]];
    function col(x, y, t, shift) {
      var k = ((x / w * .55 + y / h * .35 + Math.sin(t / 3200 + x / w * 2.6) * .12 + shift) % 1 + 1) % 1 * (PAL.length - 1);
      var i = Math.floor(k), f = k - i, A = PAL[i], B = PAL[i + 1];
      return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * f) + ',' + Math.round(A[1] + (B[1] - A[1]) * f) + ',' + Math.round(A[2] + (B[2] - A[2]) * f) + ')';
    }
    function draw(t) {
      if (!cv.isConnected) return;
      var P = pts.map(function (q) { return { x: q.bx + Math.sin(t / 1900 + q.ph) * q.amp, y: q.by + Math.cos(t / 2300 + q.ph) * q.amp }; });
      ctx.clearRect(0, 0, w, h);
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
        var a = P[r * (C + 1) + c], b = P[r * (C + 1) + c + 1], d = P[(r + 1) * (C + 1) + c], e = P[(r + 1) * (C + 1) + c + 1];
        var tris = (r + c) % 2 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
        tris.forEach(function (tr) {
          var g = ctx.createLinearGradient(tr[0].x, tr[0].y, tr[2].x, tr[2].y);
          g.addColorStop(0, col(tr[0].x, tr[0].y, t, 0));
          g.addColorStop(1, col(tr[2].x, tr[2].y, t, .22));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tr[0].x, tr[0].y); ctx.lineTo(tr[1].x, tr[1].y); ctx.lineTo(tr[2].x, tr[2].y); ctx.closePath(); ctx.fill();
        });
      }
      if (!still) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ---------- 弹层 ---------- */
  function sheet(title, body, onMount) {
    var mask = document.createElement('div');
    mask.className = 'mask';
    mask.innerHTML = '<div class="sheet"><div class="sheet-head"><h3>' + esc(title) + '</h3><button class="x" data-close>×</button></div>' + body + '</div>';
    mask.addEventListener('click', function (e) { if (e.target === mask || e.target.hasAttribute('data-close')) mask.remove(); });
    $screen.appendChild(mask);
    if (onMount) onMount(mask.querySelector('.sheet'), function () { mask.remove(); });
  }

  function openLogin(after) {
    var body = '<div class="demo-tip">演示环境：验证码统一为 ' + LSL.DEMO_CODE + '。试试 13800000001（湖畔手冲咖啡 · 店长），或任意新号码体验注册。</div>' +
      '<form id="loginForm"><label class="field"><span>手机号</span><input name="phone" inputmode="tel" maxlength="11" placeholder="请输入手机号" required /></label>' +
      '<label class="field"><span>验证码</span><div class="code-row"><input name="code" inputmode="numeric" maxlength="6" placeholder="短信验证码" required /><button class="btn sm green" type="button" id="sendCode">获取验证码</button></div></label>' +
      '<label class="check"><input type="checkbox" name="agree" required /> 我已阅读并同意《用户协议》和《隐私政策》</label>' +
      '<button class="btn block" type="submit">登录 / 注册</button><p class="mono" style="text-align:center;margin-top:12px;letter-spacing:.06em">未注册的手机号验证后自动注册 · 30 天免登录</p></form>';
    sheet('手机号登录', body, function (el, close) {
      var btn = el.querySelector('#sendCode'), timer = null;
      function countdown(s) {
        btn.disabled = true; btn.textContent = s + 's';
        timer = setInterval(function () { s--; if (s <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '重新获取'; } else btn.textContent = s + 's'; }, 1000);
      }
      btn.addEventListener('click', function () {
        var r = LSL.sendCode(el.querySelector('[name=phone]').value.trim());
        if (!r.ok) { toast(r.msg); if (r.wait) countdown(r.wait); return; }
        toast('验证码已发送（演示：' + LSL.DEMO_CODE + '）'); countdown(r.wait);
        el.querySelector('[name=code]').focus();
      });
      el.querySelector('#loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var r = LSL.login(String(fd.get('phone')).trim(), String(fd.get('code')).trim());
        if (!r.ok) return toast(r.msg);
        if (timer) clearInterval(timer);
        close();
        var c = LSL.current();
        toast(r.isNew ? '注册成功，欢迎加入麓商联' : '登录成功');
        if (!c.merchant) { state.bindPick = ''; state.bindMode = 'code'; state.stack = ['bind']; render(); $page.scrollTop = 0; return; }
        render();
        if (after) after();
      });
    });
  }

  function openClaim(tid) {
    var t = LSL.find('tasks', tid), s = LSL.section(t.section);
    var body = '<div style="margin-bottom:14px">' + chip(t.section) + ' <span class="chip plain">' + esc(t.form) + '</span></div><h4 class="heavy" style="font-size:17px">' + esc(t.title) + '</h4>' +
      '<p class="muted" style="font-size:12px;margin:6px 0 16px">计分：' + esc(t.pointsText) + ' · 核验：' + esc(t.verify) + '</p><form id="claimForm">' +
      (t.needAmount ? '<label class="field"><span>捐赠金额 / 物资确认价值（元）</span><input name="amount" type="number" min="1" required placeholder="例如 500" /><div class="hint" id="amtHint">每 100 元计 10 分，不足 100 元部分年度内累计</div></label>' : '') +
      '<label class="field"><span>情况说明</span><textarea name="note" placeholder="参与时间、内容等"></textarea></label>' +
      '<label class="field"><span>上传凭证（' + esc(s.verify) + '）</span><label class="upload" id="up"><input type="file" accept="image/*" hidden /><span>＋ 点击上传图片</span></label></label>' +
      '<button class="btn block" type="submit">提交申报</button><p class="mono" style="margin-top:12px;letter-spacing:.06em;text-align:center">提交后由运营审核，通过即发放积分</p></form>';
    sheet('提交积分申报', body, function (el, close) {
      var img = bindUpload(el);
      var amt = el.querySelector('input[name=amount]');
      if (amt) amt.addEventListener('input', function () {
        var v = Math.floor(Number(amt.value) || 0);
        el.querySelector('#amtHint').textContent = v ? '预计 ' + Math.floor(v / 100) * 10 + ' 分（不足 100 元部分 ' + (v % 100) + ' 元计入年度累计）' : '每 100 元计 10 分，不足 100 元部分年度内累计';
      });
      el.querySelector('#claimForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target), c = LSL.current();
        var r = LSL.submitClaim({ merchantId: c.merchant.id, userId: c.user.id, taskId: tid, amount: fd.get('amount'), note: fd.get('note'), image: img() });
        if (!r.ok) return toast(r.msg);
        close(); LSLFX.burst($screen, T().burst); toast('已提交，等待审核'); render();
      });
    });
  }

  function openRedeem(rid) {
    var c = LSL.current(), m = c.merchant, r = LSL.find('rewards', rid);
    if (!r || !r.active) return toast('该权益已下架');
    var enough = m.points >= r.cost && r.stock > 0;
    var body = '<div class="card t1" style="margin-bottom:18px"><div class="mono">' + esc(r.category) + '</div><h4 class="heavy" style="font-size:18px;margin:4px 0">' + esc(r.name) + '</h4><p class="muted" style="font-size:12px">' + esc(r.desc) + '</p></div>' +
      '<div class="metrics" style="margin-bottom:18px"><div><span class="num">' + r.cost + '</span><div class="lbl">所需积分</div></div><div><span class="num">' + fmtNum(m.points) + '</span><div class="lbl">当前可用</div></div><div><span class="num">' + r.stock + '</span><div class="lbl">剩余份数</div></div></div>' +
      '<p style="font-size:13px;font-weight:800;margin-bottom:16px">' + shortfall(m, r) + '</p><button class="btn block" id="doRedeem"' + (enough ? '' : ' disabled') + '>确认兑换（扣 ' + r.cost + ' 分）</button>' +
      '<p class="mono" style="margin-top:12px;letter-spacing:.06em;text-align:center">只扣可用积分，年度贡献值不变</p>';
    sheet('兑换权益', body, function (el, close) {
      el.querySelector('#doRedeem').addEventListener('click', function () {
        var res = LSL.redeem(m.id, rid, c.user.id);
        if (!res.ok) return toast(res.msg);
        close(); LSLFX.burst($screen, T().burst); toast('兑换成功，运营将尽快联系你'); render();
      });
    });
  }

  function bindUpload(el) {
    var data = '', file = el.querySelector('input[type=file]');
    if (file) file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      compress(f, function (d) { data = d; el.querySelector('#up span').innerHTML = '<img src="' + d + '" alt="" />点击更换'; });
    });
    return function () { return data; };
  }
  function compress(file, cb) {
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 720, k = Math.min(1, max / Math.max(im.width, im.height));
        var cv = document.createElement('canvas'); cv.width = im.width * k; cv.height = im.height * k;
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.7));
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  /* ---------- 风格切换 ---------- */
  function setTheme(k, silent) {
    if (!THEMES[k]) k = 'sweat';
    theme = k;
    document.documentElement.setAttribute('data-theme', k);
    try { localStorage.setItem('lsl-theme', k); } catch (e) { /* ignore */ }
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', THEMES[k].meta);
    LSLFX.setShape(THEMES[k].shape); LSLFX.reset();
    document.querySelectorAll('[data-theme-pick]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-theme-pick') === k); });
    if (!silent) { render(); $page.scrollTop = 0; }
  }

  /* ---------- 事件 ---------- */
  function link(to) {
    if (!to) return;
    if (to === 'about' || to === 'data') return to === 'data' ? need(function () { push('data'); }) : push('about');
    go(to);
  }
  $tabbar.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) go(b.getAttribute('data-tab')); });
  $back.addEventListener('click', back);
  $page.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go],[data-push],[data-link],[data-filter],[data-seg],[data-claim],[data-redeem],[data-sign],[data-unsign],[data-login],[data-logout],[data-pick],[data-bind-mode],[data-topic],[data-copy],[data-set-theme],[data-switch],[data-rename],[data-unbind],[data-lead-again]');
    if (!t || !$page.contains(t)) return;
    var d = t.dataset;
    if (d.go) return go(d.go);
    if (d.push) return d.push === 'bind' ? (state.bindPick = '', state.bindMode = 'code', need0(function () { push('bind'); })) : push(d.push);
    if (d.link !== undefined) return link(d.link);
    if (d.filter) { state.filter = d.filter; return render(); }
    if (d.seg) { state.seg = d.seg; return render(); }
    if (d.claim) return need(function () { openClaim(d.claim); });
    if (d.redeem) return need(function () { openRedeem(d.redeem); });
    if (d.sign) return need(function (c) { var r = LSL.signup(d.sign, c.user.id, c.merchant.id); toast(r.ok ? '报名成功，到场签到后发放积分' : r.msg); if (r.ok) { LSLFX.burst($screen, T().burst); render(); } });
    if (d.unsign) { if (confirmSafe('取消报名？')) { LSL.cancelSignup(d.unsign); toast('已取消报名'); render(); } return; }
    if (d.login !== undefined) return openLogin();
    if (d.logout !== undefined) { if (confirmSafe('确认退出登录？')) { LSL.logout(); state.stack = []; state.tab = 'home'; toast('已退出'); render(); } return; }
    if (d.pick !== undefined) { state.bindPick = d.pick; state.bindMode = 'code'; render(); $page.scrollTop = 0; return; }
    if (d.bindMode) { state.bindMode = d.bindMode; if (d.bindMode === 'apply') state.bindPick = ''; render(); return; }
    if (d.topic) { state.topic = d.topic; return render(); }
    if (d.copy) { copyText(d.copy); return; }
    if (d.setTheme) return setTheme(d.setTheme);
    if (d.switch !== undefined) return openSwitch();
    if (d.rename !== undefined) { var c = LSL.current(); var nm = window.prompt ? prompt('你的称呼', c.user.name || '') : null; if (nm != null) { LSL.setUserName(c.user.id, nm.trim().slice(0, 20)); render(); } return; }
    if (d.unbind) { if (confirmSafe('确认移除该成员？')) { LSL.removeMember(d.unbind); toast('已移除'); render(); } return; }
    if (d.leadAgain !== undefined) { state.leadDone = false; render(); }
  });
  function need0(fn) { if (!LSL.current()) return openLogin(fn); fn(); }
  function confirmSafe(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
  function copyText(s) {
    var ok = function () { toast('已复制：' + s); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok, function () { toast('微信号：' + s); });
    else toast('微信号：' + s);
  }
  function openSwitch() {
    var c = LSL.current();
    var list = LSL.membershipsOf(c.user.id).filter(function (x) { return x.status === 'active'; });
    sheet('切换门店', '<div class="bind-list">' + list.map(function (mb) { var m = LSL.find('merchants', mb.merchantId); return '<button class="card bind-item' + (m.id === c.merchant.id ? ' on' : '') + '" data-sw="' + m.id + '"><span><b>' + esc(m.name) + '</b><small>' + (mb.role === 'owner' ? '店长' : '店员') + '</small></span><span class="num">' + fmtNum(m.points) + '</span></button>'; }).join('') + '</div>', function (el, close) {
      el.addEventListener('click', function (e) { var b = e.target.closest('[data-sw]'); if (!b) return; LSL.switchMerchant(b.dataset.sw); close(); toast('已切换门店'); go('home'); });
    });
  }

  $page.addEventListener('input', function (e) {
    if (e.target.id !== 'bindSearch') return;
    var q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#bindList [data-q]').forEach(function (b) { b.style.display = !q || b.dataset.q.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
  });
  $page.addEventListener('submit', function (e) {
    var f = e.target, fd = new FormData(f), c = LSL.current(), r;
    e.preventDefault();
    if (f.id === 'leadForm') {
      r = LSL.submitLead({ name: String(fd.get('name')).trim(), phone: String(fd.get('phone')).trim(), company: fd.get('company'), type: fd.get('type'), message: fd.get('message') });
      if (!r.ok) return toast(r.msg);
      state.leadDone = true; LSLFX.burst($screen, T().burst); toast('提交成功'); render({ quiet: true });
      var lb = $page.querySelector('.lead-box'); if (lb) lb.scrollIntoView({ block: 'center' });
    } else if (f.id === 'codeBind') {
      r = LSL.bindByCode(c.user.id, state.bindPick, fd.get('code'));
      if (!r.ok) return toast(r.msg);
      LSLFX.burst($screen, T().burst); toast('绑定成功'); state.bindPick = ''; go('home');
    } else if (f.id === 'reviewBind') {
      if (fd.get('name')) LSL.setUserName(c.user.id, String(fd.get('name')).trim());
      r = LSL.requestBind(c.user.id, state.bindPick, fd.get('note'), f.__img ? f.__img() : '');
      if (!r.ok) return toast(r.msg);
      toast('已提交，等待运营审核'); state.bindPick = ''; render();
    } else if (f.id === 'applyForm') {
      LSL.apply({ name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'), contact: fd.get('contact'), phone: c.user.phone, userId: c.user.id });
      if (fd.get('contact')) LSL.setUserName(c.user.id, String(fd.get('contact')).trim());
      toast('入驻申请已提交，等待运营审核'); state.bindMode = 'code'; render();
    }
  });
  // 审核表单的图片上传
  $page.addEventListener('change', function (e) {
    var f = e.target.closest('#reviewBind'); if (!f || e.target.type !== 'file') return;
    var file = e.target.files[0]; if (!file) return;
    compress(file, function (d) { f.__img = function () { return d; }; f.querySelector('#up span').innerHTML = '<img src="' + d + '" alt="" />点击更换'; });
  });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-theme-pick]'); if (b) setTheme(b.getAttribute('data-theme-pick')); });

  // 后台改动（另一个标签页）实时同步
  LSL.onChange(function (src) { if (src === 'remote' && !document.querySelector('.mask')) { var y = $page.scrollTop; render({ quiet: true }); $page.scrollTop = y; } });

  /* ---------- 启动 ---------- */
  var q = (location.search.match(/[?&]theme=(\w+)/) || [])[1];
  var saved = null; try { saved = localStorage.getItem('lsl-theme'); } catch (e) { /* ignore */ }
  setTheme(q || saved || 'sweat', true);
  render();
  window.LSLApp = { setTheme: setTheme, themes: THEMES };
})();
