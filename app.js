/* 麓商联 · 商户端（微信小程序演示） */
(function () {
  'use strict';

  var $page = document.getElementById('page');
  var $screen = document.getElementById('screen');
  var $title = document.getElementById('navTitle');
  var $back = document.getElementById('navBack');
  var $tabbar = document.getElementById('tabbar');

  var state = { tab: 'home', filter: 'all', view: '' };
  var fxPlayed = false;

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(ts) { var d = new Date(ts); return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
  function no(i) { return pad(i + 1); }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1800);
  }
  function me() { var id = LSL.currentId(); var m = id && LSL.find('merchants', id); return m && m.status === 'active' ? m : null; }
  function chip(sec) { var s = LSL.section(sec); return s ? '<span class="chip ' + s.key + '">' + esc(s.name) + '</span>' : ''; }
  function secHead(n, total, label, right) {
    return '<div class="sec-head"><span class="mono"><b>' + pad(n) + ' / ' + pad(total) + '</b> · ' + esc(label) + '</span>' + (right ? '<span class="mono">' + right + '</span>' : '') + '</div>';
  }
  function shortfall(m, r) {
    if (!r.active) return '<span class="muted">已下架</span>';
    if (r.stock <= 0) return '<span class="muted">已兑完</span>';
    return m.points >= r.cost ? '<span class="ok-text">积分足够，可立即兑换</span>' : '<span class="lack-text">还差 ' + (r.cost - m.points) + ' 分</span>';
  }

  /* ---------- 路由 ---------- */
  var TITLES = { home: '麓商联积分', tasks: '本月可参与', mall: '积分兑换', ledger: '积分明细', bind: '绑定门店' };
  function go(tab) { state.tab = tab; state.view = ''; render(); $page.scrollTop = 0; }

  function render() {
    var m = me();
    var view = (!m || state.view === 'bind') ? 'bind' : state.tab;
    $title.textContent = TITLES[view];
    $tabbar.style.display = view === 'bind' ? 'none' : '';
    $back.style.display = view === 'bind' && m ? 'block' : 'none';
    Array.prototype.forEach.call($tabbar.children, function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === state.tab); });
    var html = { home: viewHome, tasks: viewTasks, mall: viewMall, ledger: viewLedger, bind: viewBind }[view](m);
    $page.innerHTML = html;
    if (view === 'home' || view === 'bind') {
      if (!fxPlayed) { fxPlayed = true; LSLFX.run($page); }
    }
  }

  function heroTitle(l1, l2) {
    var fx = fxPlayed ? '' : ' data-fx';
    return '<h1 class="hero-title"' + fx + '><span class="fx-line">' + esc(l1) + '</span><span class="fx-line">' + esc(l2) + '<i class="hero-band"></i></span></h1>';
  }

  /* ---------- 首页 ---------- */
  function viewHome(m) {
    var db = LSL.db();
    var annual = LSL.annual(m);
    var lv = LSL.level(annual);
    var month = LSL.monthEarned(m.id);
    var pct = lv.next ? Math.round((annual - lv.cur.min) / (lv.next.min - lv.cur.min) * 100) : 100;
    var tasks = db.tasks.filter(function (t) { return t.active; });
    var rewards = db.rewards.filter(function (r) { return r.active; }).sort(function (a, b) { return a.cost - b.cost; });
    var p = db.panel;
    var h = '';

    // Hero
    h += '<section class="hero">';
    h += '<div class="brand-line"><span class="mono">LUSHANGLIAN · 麓山 / 麓湖</span><span class="mono">' + esc(p.month) + '</span></div>';
    h += '<i class="dotgrid"></i>';
    h += heroTitle('麓商联', '积分圈');
    h += '<div class="hero-tag">LET\'S GROW · TOGETHER</div>';
    h += '<div class="store-line"><div><div class="name">' + esc(m.name) + '</div><div class="meta">' + esc(m.category) + ' · ' + esc(m.code) + '</div></div><span class="chip plain">Lv.' + (lv.idx + 1) + ' ' + esc(lv.cur.name) + '</span></div>';

    h += '<div class="points-card">';
    h += '<div class="mono">AVAILABLE POINTS · 可用积分</div>';
    h += '<div class="big num">' + fmtNum(m.points) + '<small>分</small></div>';
    h += '<div class="stats">';
    h += '<div><div class="num">' + fmtNum(month) + '<em>+</em></div><div class="lbl">本月累计获得</div><div class="mono">THIS MONTH</div></div>';
    h += '<div><div class="num lime">' + esc(lv.cur.name) + '</div><div class="lbl">当前年度等级</div><div class="mono">' + esc(lv.cur.en) + '</div></div>';
    h += '</div>';
    h += '<div class="lvbar"><div class="bar"><i class="lv" style="width:' + pct + '%"></i></div><div class="mono"><span>年度贡献 ' + annual + '</span><span>' + (lv.next ? '距「' + lv.next.name + '」' + (lv.next.min - annual) + ' 分' : '已达最高等级') + '</span></div></div>';
    h += '</div>';
    h += '<div class="hero-actions"><button class="btn" data-go="tasks">去参与赚分</button><button class="btn green" data-go="mall">去兑换权益</button></div>';
    h += '</section>';

    h += band();

    // 01 年度贡献值
    h += '<section class="block">' + secHead(1, 6, '年度贡献值', 'ANNUAL');
    h += '<div class="contrib-total"><span class="num">' + fmtNum(annual) + '</span><span class="heavy">分</span><span class="mono">= 三大板块之和</span></div>';
    h += '<div class="bar" style="height:16px">' + LSL.SECTIONS.map(function (s) { return annual ? '<i class="' + s.key + '" style="width:' + (m.sections[s.key] / annual * 100) + '%"></i>' : ''; }).join('') + '</div>';
    h += '<div class="contrib-rows">' + LSL.SECTIONS.map(function (s) {
      return '<div class="contrib-row"><i class="dot ' + s.key + '"></i><span class="nm">' + s.name + ' <span class="en">' + s.en + '</span></span><span class="num">' + (m.sections[s.key] || 0) + '</span></div>';
    }).join('') + '</div>';
    h += '<p class="mono" style="margin-top:10px;letter-spacing:.08em">兑换只扣可用积分，年度贡献值不扣减</p>';
    h += '</section>';

    // 02 三大板块 · 怎么积分
    h += '<section class="block">' + secHead(2, 6, '三大板块 · 怎么积分', 'HOW TO EARN');
    h += '<div class="rule-cards tilt">' + LSL.SECTIONS.map(function (s, i) {
      return '<div class="card rule-card"><span class="idx">' + no(i) + '</span>' +
        '<div class="en">X / ' + no(i) + ' · ' + s.en + '</div>' +
        '<h3><i class="dot ' + s.key + '"></i>' + s.name + '</h3>' +
        '<p class="what">' + esc(s.what) + '</p>' +
        '<ul>' + s.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
        '<p class="verify">核验依据：' + esc(s.verify) + '</p>' +
        '<div class="mine"><span>本店该板块累计</span><span class="num">' + (m.sections[s.key] || 0) + '</span></div></div>';
    }).join('') + '</div></section>';

    // 03 商圈动态面板
    h += '<section class="block">' + secHead(3, 6, '商圈动态', esc(p.month));
    h += '<div class="panel-box">';
    h += '<div class="mono">WHAT\'S NEW · ' + esc(p.month) + '</div>';
    h += '<h3><span class="marker">' + esc(p.title) + '</span></h3>';
    h += '<div class="metrics">' + p.metrics.map(function (x) {
      return '<div><div class="num">' + esc(x.value) + '</div><div class="unit">' + esc(x.unit) + '</div><div class="lbl">' + esc(x.label) + '</div></div>';
    }).join('') + '</div>';
    h += p.notices.length ? '<ul class="notices">' + p.notices.map(function (n, i) { return '<li><span class="n">' + no(i) + '</span><span>' + esc(n.text) + '</span></li>'; }).join('') + '</ul>' : '<div class="empty">暂无公告</div>';
    h += '</div></section>';

    // 04 本月可参与
    h += '<section class="block">' + secHead(4, 6, '本月可参与', '<a data-go="tasks">全部 ' + tasks.length + ' 项 →</a>');
    h += '<div class="task-list tilt">' + tasks.slice(0, 3).map(taskCard).join('') + '</div>';
    if (tasks.length > 3) h += '<button class="btn ghost block" style="margin-top:16px" data-go="tasks">查看全部参与内容</button>';
    h += '</section>';

    // 05 本月兑换权益
    h += '<section class="block">' + secHead(5, 6, '本月兑换权益', '<a data-go="mall">积分商城 →</a>');
    h += '<div class="reward-list">' + rewards.map(function (r, i) {
      return '<div class="card reward ' + (i % 2 ? 't2' : 't1') + '" data-redeem="' + r.id + '">' +
        '<div class="body"><h4>' + esc(r.name) + '</h4><div class="sub">剩余 ' + r.stock + ' 份 · ' + esc(r.category) + '</div><div class="state">' + shortfall(m, r) + '</div></div>' +
        '<div class="cost"><div class="num">' + r.cost + '</div><div class="mono">POINTS</div></div></div>';
    }).join('') + '</div></section>';

    // 06 积分明细
    var rows = LSL.ledgerOf(m.id).slice(0, 5);
    h += '<section class="block">' + secHead(6, 6, '积分明细', '<a data-go="ledger">全部 →</a>');
    h += ledgerList(rows) + '</section>';

    h += footerSwitch(m);
    return h;
  }

  function band() {
    var items = ['公益捐赠', '商圈共生', '社区参与', '商学院', '湖畔市集', '志愿服务', '社区议事', '调研共创'];
    var one = items.map(function (x) { return '<span>' + x + '</span><i>✳</i>'; }).join('');
    return '<div class="band"><div class="band-track">' + one + one + '</div></div>';
  }

  function footerSwitch(m) {
    return '<div class="footer-switch"><button class="btn ghost sm" data-bind>切换 / 重新绑定门店</button>' +
      '<span class="mono">当前门店 ' + esc(m.name) + ' · ' + esc(m.code) + '</span></div>';
  }

  function taskCard(t, i) {
    var my = me();
    var pend = LSL.db().claims.filter(function (c) { return c.taskId === t.id && c.merchantId === my.id && c.status === 'pending'; }).length;
    return '<div class="card task"><span class="idx">' + no(i) + '</span>' +
      '<div class="top">' + chip(t.section) + '<span class="chip plain">' + esc(t.form) + '</span></div>' +
      '<h4>' + esc(t.title) + '</h4><p class="desc">' + esc(t.desc) + '</p>' +
      '<div class="foot"><div class="pts"><div class="num">' + esc(t.pointsText || (t.points + ' 分')) + '</div><div class="verify">核验：' + esc(t.verify) + '</div></div>' +
      '<button class="btn sm' + (pend ? ' ghost' : '') + '" data-claim="' + t.id + '">' + (pend ? '审核中 · 再报' : '完成后申报') + '</button></div></div>';
  }

  /* ---------- 参与 ---------- */
  function viewTasks(m) {
    var db = LSL.db();
    var list = db.tasks.filter(function (t) { return t.active && (state.filter === 'all' || t.section === state.filter); });
    var h = '<div class="mono" style="margin-bottom:6px">PARTICIPATE · ' + esc(LSL.monthLabel(Date.now())) + '</div>';
    h += '<h2 class="sec-title"><span class="marker">本月可参与</span></h2>';
    h += '<div class="filters"><button data-filter="all" class="' + (state.filter === 'all' ? 'on' : '') + '">全部</button>' +
      LSL.SECTIONS.map(function (s) { return '<button data-filter="' + s.key + '" class="' + (state.filter === s.key ? 'on' : '') + '">' + s.name + '</button>'; }).join('') + '</div>';
    if (state.filter !== 'all') {
      var s = LSL.section(state.filter);
      h += '<div class="card" style="margin-bottom:18px"><div class="mono">规则 · ' + s.en + '</div><p style="font-size:13px;margin-top:6px">' + esc(s.rules.join('；')) + '。</p><p class="muted" style="font-size:12px;margin-top:6px">核验依据：' + esc(s.verify) + '</p></div>';
    }
    h += list.length ? '<div class="task-list tilt">' + list.map(taskCard).join('') + '</div>' : '<div class="empty">该板块本月暂无开放内容</div>';

    var mine = db.claims.filter(function (c) { return c.merchantId === m.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    h += '<section class="block">' + secHead(1, 1, '我的申报', mine.length + ' 条');
    h += mine.length ? '<ul class="ledger">' + mine.map(function (c) {
      var st = { pending: '审核中', approved: '已发放', rejected: '已退回', revoked: '已撤回' }[c.status];
      return '<li><div class="t"><b>' + esc(c.title) + '</b><small>' + chip(c.section) + fmtDate(c.createdAt) + (c.reason ? ' · ' + esc(c.reason) : '') + '</small></div>' +
        '<div style="text-align:right"><div class="v ' + (c.status === 'approved' ? 'plus' : '') + '">' + (c.status === 'approved' ? '+' : '') + c.points + '</div><span class="status ' + c.status + '">' + st + '</span></div></li>';
    }).join('') + '</ul>' : '<div class="empty">还没有申报记录</div>';
    h += '<p class="mono" style="letter-spacing:.08em;margin-top:12px">报名不计分，完成后提交申报，审核通过即发放</p></section>';
    return h;
  }

  /* ---------- 兑换 ---------- */
  function viewMall(m) {
    var db = LSL.db();
    var list = db.rewards.filter(function (r) { return r.active; });
    var h = '<div class="mono" style="margin-bottom:6px">REDEEM · 积分商城</div>';
    h += '<h2 class="sec-title"><span class="marker">用积分换权益</span></h2>';
    h += '<div class="card t1" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px"><div><div class="mono">AVAILABLE</div><div class="heavy">可用积分</div></div><div class="num" style="font-size:44px">' + fmtNum(m.points) + '</div></div>';
    h += '<div class="mall-grid tilt">' + list.map(function (r, i) {
      var can = r.stock > 0 && m.points >= r.cost;
      return '<div class="card mall-card"><div class="cover"><span class="mono">' + esc(r.category) + '</span><span class="num">' + no(i) + '</span></div>' +
        '<h4>' + esc(r.name) + '</h4><p class="sub">' + esc(r.desc) + '</p>' +
        '<div class="cost"><span class="num">' + r.cost + '<small class="mono"> PTS</small></span><span class="mono">余 ' + r.stock + '</span></div>' +
        '<div style="font-size:11px;font-weight:800;margin-bottom:8px">' + shortfall(m, r) + '</div>' +
        '<button class="btn sm block' + (can ? '' : ' ghost') + '" data-redeem="' + r.id + '"' + (r.stock <= 0 ? ' disabled' : '') + '>' + (r.stock <= 0 ? '已兑完' : '立即兑换') + '</button></div>';
    }).join('') + '</div>';

    var orders = db.orders.filter(function (o) { return o.merchantId === m.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    h += '<section class="block">' + secHead(1, 1, '我的兑换', orders.length + ' 单');
    h += orders.length ? '<ul class="ledger">' + orders.map(function (o) {
      return '<li><div class="t"><b>' + esc(o.name) + '</b><small>' + esc(o.no) + ' · ' + fmtDate(o.createdAt) + '</small></div><div style="text-align:right"><div class="v minus">-' + o.cost + '</div><span class="status s-' + o.status + '">' + o.status + '</span></div></li>';
    }).join('') + '</ul>' : '<div class="empty">还没有兑换记录</div>';
    h += '</section>';
    return h;
  }

  /* ---------- 明细 ---------- */
  function viewLedger(m) {
    var rows = LSL.ledgerOf(m.id);
    var earn = rows.filter(function (r) { return r.type === 'earn'; }).reduce(function (s, r) { return s + r.points; }, 0);
    var spend = rows.filter(function (r) { return r.type !== 'earn'; }).reduce(function (s, r) { return s - r.points; }, 0);
    var h = '<div class="mono" style="margin-bottom:6px">LEDGER · ' + esc(m.name) + '</div>';
    h += '<h2 class="sec-title"><span class="marker">积分明细</span></h2>';
    h += '<div class="metrics" style="margin-bottom:18px"><div><div class="num">' + fmtNum(m.points) + '</div><div class="lbl">可用积分</div></div><div><div class="num">' + fmtNum(earn) + '</div><div class="unit">+</div><div class="lbl">累计获得</div></div><div><div class="num">' + fmtNum(spend) + '</div><div class="unit">-</div><div class="lbl">兑换 / 撤回</div></div></div>';
    h += ledgerList(rows);
    h += footerSwitch(m);
    return h;
  }

  function ledgerList(rows) {
    if (!rows.length) return '<div class="empty">暂无积分记录</div>';
    return '<ul class="ledger">' + rows.map(function (r) {
      var tag = r.section ? chip(r.section) : '<span class="chip plain">' + (r.type === 'spend' ? '兑换' : '其他') + '</span>';
      return '<li><div class="t"><b>' + esc(r.title) + '</b><small>' + tag + fmtDate(r.createdAt) + '</small></div><div class="v ' + (r.points > 0 ? 'plus' : 'minus') + '">' + (r.points > 0 ? '+' : '') + r.points + '</div></li>';
    }).join('') + '</ul>';
  }

  /* ---------- 绑定门店 ---------- */
  function viewBind(m) {
    var db = LSL.db();
    var list = db.merchants.filter(function (x) { return x.status === 'active'; });
    var pendId = localStorage.getItem('lsl-pending-app');
    var app = pendId && LSL.find('applications', pendId);
    var h = '<section class="hero">';
    h += '<div class="brand-line"><span class="mono">LUSHANGLIAN · 扫码进入</span></div><i class="dotgrid"></i>';
    h += heroTitle('麓商联', '积分圈');
    h += '<div class="hero-tag">LET\'S GROW · TOGETHER</div></section>';

    if (app) {
      var st = { pending: '审核中，请等待运营人员确认', approved: '已通过，点击下方门店完成绑定', rejected: '未通过，可联系运营人员了解原因' }[app.status];
      h += '<div class="card t2" style="margin-bottom:20px"><span class="idx">APPLY</span><div class="mono">入驻申请</div><h4 class="heavy" style="font-size:16px;margin:4px 0">' + esc(app.name) + '</h4><span class="status ' + app.status + '">' + st + '</span></div>';
    }

    h += secHead(1, 2, '选择已入驻门店', '演示用');
    h += '<div class="bind-list">' + list.map(function (x) {
      return '<button class="card bind-item' + (m && m.id === x.id ? ' on' : '') + '" data-pick="' + x.id + '"><span><b>' + esc(x.name) + '</b><small>' + esc(x.category) + ' · ' + esc(x.code) + '</small></span><span class="num" style="font-size:24px">' + fmtNum(x.points) + '</span></button>';
    }).join('') + '</div>';

    h += secHead(2, 2, '新商户 · 申请入驻');
    h += '<form id="applyForm">' +
      '<label class="field"><span>门店名称</span><input name="name" required placeholder="例如：湖畔精酿小馆" /></label>' +
      '<label class="field"><span>业态</span><select name="category"><option>餐饮 · 咖啡</option><option>餐饮 · 正餐</option><option>零售</option><option>运动 · 健身</option><option>文化 · 教育</option><option>生活服务</option></select></label>' +
      '<div class="row"><label class="field"><span>联系人</span><input name="contact" required /></label><label class="field"><span>手机号</span><input name="phone" required inputmode="tel" /></label></div>' +
      '<button class="btn block" type="submit">提交入驻申请</button></form>';
    return h;
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

  function openClaim(tid) {
    var t = LSL.find('tasks', tid); var s = LSL.section(t.section);
    var body = '<div style="margin-bottom:14px">' + chip(t.section) + ' <span class="chip plain">' + esc(t.form) + '</span></div>' +
      '<h4 class="heavy" style="font-size:17px">' + esc(t.title) + '</h4>' +
      '<p class="muted" style="font-size:12px;margin:6px 0 16px">计分：' + esc(t.pointsText) + ' · 核验：' + esc(t.verify) + '</p>' +
      '<form id="claimForm">' +
      (t.needAmount ? '<label class="field"><span>捐赠金额 / 物资确认价值（元）</span><input name="amount" type="number" min="1" required placeholder="例如 500" /><div class="hint" id="amtHint">每 100 元计 10 分，不足 100 元部分年度内累计</div></label>' : '') +
      '<label class="field"><span>情况说明</span><textarea name="note" placeholder="参与时间、内容等"></textarea></label>' +
      '<label class="field"><span>上传凭证（' + esc(s.verify) + '）</span><label class="upload" id="up"><input type="file" accept="image/*" hidden /><span>＋ 点击上传图片</span></label></label>' +
      '<button class="btn block" type="submit">提交申报</button>' +
      '<p class="mono" style="margin-top:12px;letter-spacing:.06em;text-align:center">提交后由运营审核，通过即发放积分</p></form>';
    sheet('提交积分申报', body, function (el, close) {
      var img = '';
      var file = el.querySelector('input[type=file]');
      file.addEventListener('change', function () {
        var f = file.files[0]; if (!f) return;
        compress(f, function (data) { img = data; el.querySelector('#up span').innerHTML = '<img src="' + data + '" alt="" />点击更换'; });
      });
      var amt = el.querySelector('input[name=amount]');
      if (amt) amt.addEventListener('input', function () {
        var v = Math.floor(Number(amt.value) || 0);
        el.querySelector('#amtHint').textContent = v ? '预计 ' + Math.floor(v / 100) * 10 + ' 分（不足 100 元部分 ' + (v % 100) + ' 元计入年度累计）' : '每 100 元计 10 分，不足 100 元部分年度内累计';
      });
      el.querySelector('#claimForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        var r = LSL.submitClaim({ merchantId: me().id, taskId: tid, amount: fd.get('amount'), note: fd.get('note'), image: img });
        if (!r.ok) return toast(r.msg);
        close(); toast('已提交，等待审核'); render();
      });
    });
  }

  function openRedeem(rid) {
    var m = me(); var r = LSL.find('rewards', rid);
    if (!r || !r.active) return toast('该权益已下架');
    var enough = m.points >= r.cost && r.stock > 0;
    var body = '<div class="card t1" style="margin-bottom:18px"><div class="mono">' + esc(r.category) + '</div><h4 class="heavy" style="font-size:18px;margin:4px 0">' + esc(r.name) + '</h4><p class="muted" style="font-size:12px">' + esc(r.desc) + '</p></div>' +
      '<div class="metrics" style="margin-bottom:18px"><div><div class="num">' + r.cost + '</div><div class="lbl">所需积分</div></div><div><div class="num">' + fmtNum(m.points) + '</div><div class="lbl">当前可用</div></div><div><div class="num">' + r.stock + '</div><div class="lbl">剩余份数</div></div></div>' +
      '<p style="font-size:13px;font-weight:800;margin-bottom:16px">' + shortfall(m, r) + '</p>' +
      '<button class="btn block" id="doRedeem"' + (enough ? '' : ' disabled') + '>确认兑换（扣 ' + r.cost + ' 分）</button>' +
      '<p class="mono" style="margin-top:12px;letter-spacing:.06em;text-align:center">只扣可用积分，年度贡献值不变</p>';
    sheet('兑换权益', body, function (el, close) {
      el.querySelector('#doRedeem').addEventListener('click', function () {
        var res = LSL.redeem(me().id, rid);
        if (!res.ok) return toast(res.msg);
        close(); toast('兑换成功，运营将尽快联系你'); render();
      });
    });
  }

  function compress(file, cb) {
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 720, w = im.width, h = im.height, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.7));
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  /* ---------- 事件 ---------- */
  $tabbar.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) go(b.getAttribute('data-tab')); });
  $back.addEventListener('click', function () { state.view = ''; render(); });
  $page.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-go]'))) return go(t.getAttribute('data-go'));
    if ((t = e.target.closest('[data-filter]'))) { state.filter = t.getAttribute('data-filter'); return render(); }
    if ((t = e.target.closest('[data-claim]'))) return openClaim(t.getAttribute('data-claim'));
    if ((t = e.target.closest('[data-redeem]'))) return openRedeem(t.getAttribute('data-redeem'));
    if ((t = e.target.closest('[data-bind]'))) { state.view = 'bind'; render(); $page.scrollTop = 0; return; }
    if ((t = e.target.closest('[data-pick]'))) {
      LSL.setCurrent(t.getAttribute('data-pick')); state.view = ''; state.tab = 'home';
      localStorage.removeItem('lsl-pending-app');
      toast('已绑定 ' + me().name); render(); $page.scrollTop = 0;
    }
  });
  $page.addEventListener('submit', function (e) {
    if (e.target.id !== 'applyForm') return;
    e.preventDefault();
    var fd = new FormData(e.target);
    var a = LSL.apply({ name: fd.get('name'), category: fd.get('category'), contact: fd.get('contact'), phone: fd.get('phone') });
    localStorage.setItem('lsl-pending-app', a.id);
    toast('申请已提交，等待运营审核'); render(); $page.scrollTop = 0;
  });

  // 后台改动（另一个标签页）实时同步
  LSL.onChange(function (src) { if (src === 'remote' && !document.querySelector('.mask')) { var y = $page.scrollTop; render(); $page.scrollTop = y; } });

  // 首次进入：默认绑定第一家门店，方便演示
  if (!LSL.currentId()) LSL.setCurrent(LSL.db().merchants[0].id);
  render();
})();
