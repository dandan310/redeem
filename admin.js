/* 麓商联 · 运营后台 */
(function () {
  'use strict';

  var $side = document.getElementById('side');
  var $main = document.getElementById('main');
  var cur = (location.hash || '#review').slice(1);
  var fxPlayed = false;

  var MENU = [
    { key: 'review', name: '审核中心', en: 'REVIEW' },
    { key: 'merchants', name: '商户管理', en: 'MERCHANTS' },
    { key: 'panel', name: '商圈面板', en: 'PANEL' },
    { key: 'tasks', name: '积分任务', en: 'TASKS' },
    { key: 'rewards', name: '权益兑换', en: 'REWARDS' },
    { key: 'orders', name: '兑换订单', en: 'ORDERS' },
    { key: 'stats', name: '数据统计', en: 'STATS' }
  ];
  var ORDER_FLOW = ['待处理', '处理中', '已完成'];

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
  function chip(sec) { var s = LSL.section(sec); return s ? '<span class="chip ' + s.key + '">' + s.name + '</span>' : '<span class="chip plain">—</span>'; }
  function mName(id) { var m = LSL.find('merchants', id); return m ? m.name : '（已删除）'; }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1800); }
  function head(i, label, title, right) {
    var fx = fxPlayed ? '' : ' data-fx';
    return '<div class="sec-head"><span class="mono"><b>' + pad(i + 1) + ' / ' + pad(MENU.length) + '</b> · ' + esc(MENU[i].en) + '</span><span class="mono">' + (right || '') + '</span></div>' +
      '<h1 class="a-title"' + fx + '><span class="fx-line"><span class="marker">' + esc(title || label) + '</span></span></h1>';
  }

  function modal(title, body, onSave) {
    var m = document.createElement('div');
    m.className = 'a-modal';
    m.innerHTML = '<form class="card"><h3>' + esc(title) + '</h3>' + body + '<div class="acts"><button type="button" class="btn ghost" data-close>取消</button><button class="btn" type="submit">保存</button></div></form>';
    m.addEventListener('click', function (e) { if (e.target === m || e.target.hasAttribute('data-close')) m.remove(); });
    m.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (onSave(new FormData(e.target), e.target) !== false) { m.remove(); render(); }
    });
    document.body.appendChild(m);
  }
  function field(label, name, val, type, extra) {
    return '<label class="field"><span>' + label + '</span><input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" ' + (extra || '') + ' /></label>';
  }
  function select(label, name, opts, val) {
    return '<label class="field"><span>' + label + '</span><select name="' + name + '">' + opts.map(function (o) {
      var v = typeof o === 'string' ? o : o.v, t = typeof o === 'string' ? o : o.t;
      return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('') + '</select></label>';
  }
  var secOpts = LSL.SECTIONS.map(function (s) { return { v: s.key, t: s.name }; });

  /* ---------- 菜单 ---------- */
  function renderSide() {
    var db = LSL.db();
    var badge = {
      review: db.claims.filter(function (c) { return c.status === 'pending'; }).length + db.applications.filter(function (a) { return a.status === 'pending'; }).length,
      orders: db.orders.filter(function (o) { return o.status === '待处理'; }).length
    };
    $side.innerHTML = MENU.map(function (x, i) {
      return '<button data-nav="' + x.key + '" class="' + (cur === x.key ? 'on' : '') + '"><span class="mono">' + pad(i + 1) + '</span><span class="t">' + x.name + '</span>' + (badge[x.key] ? '<span class="badge">' + badge[x.key] + '</span>' : '') + '</button>';
    }).join('');
  }

  function render() {
    if (!MENU.some(function (x) { return x.key === cur; })) cur = 'review';
    renderSide();
    var i = MENU.findIndex(function (x) { return x.key === cur; });
    $main.innerHTML = VIEWS[cur](i);
    if (!fxPlayed) { fxPlayed = true; LSLFX.run($main); }
  }

  /* ---------- 审核中心 ---------- */
  function vReview(i) {
    var db = LSL.db();
    var apps = db.applications.filter(function (a) { return a.status === 'pending'; });
    var claims = db.claims.filter(function (c) { return c.status === 'pending'; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    var done = db.claims.filter(function (c) { return c.status !== 'pending'; }).sort(function (a, b) { return (b.reviewedAt || b.createdAt) - (a.reviewedAt || a.createdAt); }).slice(0, 12);
    var h = head(i, '审核中心', null, apps.length + claims.length + ' 项待处理');

    h += '<div class="a-sub">入驻申请 <span class="mono">' + apps.length + ' PENDING</span></div>';
    h += apps.length ? '<table class="tbl"><tr><th>门店</th><th>业态</th><th>联系人</th><th>提交时间</th><th>操作</th></tr>' + apps.map(function (a) {
      return '<tr><td><b>' + esc(a.name) + '</b></td><td>' + esc(a.category) + '</td><td>' + esc(a.contact) + ' <small>' + esc(a.phone) + '</small></td><td><small>' + fmtDate(a.createdAt) + '</small></td>' +
        '<td><div class="ops"><button class="btn sm" data-app-pass="' + a.id + '">通过</button><button class="btn sm ghost" data-app-reject="' + a.id + '">拒绝</button></div></td></tr>';
    }).join('') + '</table>' : '<div class="card empty">暂无待审核入驻申请</div>';

    h += '<div class="a-sub">积分申报审核 <span class="mono">' + claims.length + ' PENDING</span></div>';
    h += claims.length ? '<table class="tbl"><tr><th>商户</th><th>所属板块</th><th>参与内容</th><th>材料</th><th>发放分值</th><th>操作</th></tr>' + claims.map(function (c) {
      var hint = c.section === 'donation' && c.amount ? '<br><small>捐赠 ' + c.amount + ' 元，原值不改则按年度累计余额自动折算</small>' : '';
      return '<tr><td><b>' + esc(mName(c.merchantId)) + '</b><br><small>' + fmtDate(c.createdAt) + '</small></td><td>' + chip(c.section) + '</td>' +
        '<td>' + esc(c.title) + hint + '</td>' +
        '<td>' + (c.image ? '<img class="thumb" src="' + c.image + '" data-view="' + c.id + '" alt="凭证" />' : '') + '<small>' + esc(c.note || '—') + '</small></td>' +
        '<td><input class="inline" type="number" min="0" value="' + c.points + '" id="pts_' + c.id + '" /></td>' +
        '<td><div class="ops"><button class="btn sm" data-pass="' + c.id + '">通过发放</button><button class="btn sm ghost" data-reject="' + c.id + '">退回</button></div></td></tr>';
    }).join('') + '</table>' : '<div class="card empty">暂无待审核申报</div>';

    h += '<div class="a-sub">最近处理 <span class="mono">退款 / 误发可撤回</span></div>';
    h += done.length ? '<table class="tbl"><tr><th>商户</th><th>板块</th><th>内容</th><th>分值</th><th>状态</th><th>操作</th></tr>' + done.map(function (c) {
      var st = { approved: '已发放', rejected: '已退回', revoked: '已撤回' }[c.status];
      return '<tr><td>' + esc(mName(c.merchantId)) + '</td><td>' + chip(c.section) + '</td><td>' + esc(c.title) + (c.reason ? '<br><small>' + esc(c.reason) + '</small>' : '') + '</td><td class="num">' + c.points + '</td>' +
        '<td><span class="status ' + c.status + '">' + st + '</span></td><td>' + (c.status === 'approved' ? '<button class="btn sm ghost" data-revoke="' + c.id + '">撤回积分</button>' : '') + '</td></tr>';
    }).join('') + '</table>' : '<div class="card empty">暂无记录</div>';
    return h;
  }

  /* ---------- 商户管理 ---------- */
  function vMerchants(i) {
    var db = LSL.db();
    var list = db.merchants.slice().sort(function (a, b) { return LSL.annual(b) - LSL.annual(a); });
    var h = head(i, '商户管理', null, list.length + ' 家商户');
    h += '<div class="a-sub">全部商户档案 <button class="btn sm" data-add-merchant>＋ 新增商户</button></div>';
    h += '<table class="tbl"><tr><th>编号</th><th>门店</th><th>联系人</th><th>可用积分</th>' + LSL.SECTIONS.map(function (s) { return '<th>' + s.name + '</th>'; }).join('') + '<th>年度贡献</th><th>等级</th></tr>' + list.map(function (m) {
      var a = LSL.annual(m), lv = LSL.level(a);
      return '<tr><td class="mono">' + esc(m.code) + '</td><td><b>' + esc(m.name) + '</b><br><small>' + esc(m.category) + '</small></td><td>' + esc(m.contact) + '<br><small>' + esc(m.phone) + '</small></td>' +
        '<td class="num">' + fmtNum(m.points) + '</td>' + LSL.SECTIONS.map(function (s) { return '<td class="num" style="color:' + s.color + '">' + (m.sections[s.key] || 0) + '</td>'; }).join('') +
        '<td class="num">' + fmtNum(a) + '</td><td><span class="chip plain">Lv.' + (lv.idx + 1) + ' ' + lv.cur.name + '</span></td></tr>';
    }).join('') + '</table>';
    h += '<p class="mono" style="margin-top:12px;letter-spacing:.08em">年度贡献值 = 三大板块分项之和 · 等级按 200 / 500 / 1000 / 2000 分档</p>';
    return h;
  }

  /* ---------- 商圈面板 ---------- */
  function vPanel(i) {
    var p = LSL.db().panel;
    var h = head(i, '商圈面板', null, '商户端首页 · 只读展示');
    h += '<div class="a-grid c2"><div>';
    h += '<form id="panelForm" class="card">';
    h += '<div class="row">' + field('面板名称', 'title', p.title) + field('展示月份', 'month', p.month) + '</div>';
    h += '<div class="field"><span>三项指标（名称 / 数值 / 单位）</span></div>';
    h += p.metrics.map(function (m, k) {
      return '<div class="metric-edit"><input class="field-in" name="ml' + k + '" value="' + esc(m.label) + '" /><input class="field-in" name="mv' + k + '" value="' + esc(m.value) + '" /><input class="field-in" name="mu' + k + '" value="' + esc(m.unit) + '" /></div>';
    }).join('');
    h += '<p class="mono" style="letter-spacing:.06em;margin:4px 0 16px">面板只显示月份，不写商圈名称</p>';
    h += '<button class="btn" type="submit">保存面板</button></form>';

    h += '<div class="a-sub">公告 <button class="btn sm" data-notice-add>＋ 新增公告</button></div>';
    h += p.notices.length ? '<table class="tbl">' + p.notices.map(function (n, k) {
      return '<tr><td class="mono">' + pad(k + 1) + '</td><td>' + esc(n.text) + '</td><td><div class="ops"><button class="btn sm green" data-notice-edit="' + n.id + '">编辑</button><button class="btn sm ghost" data-notice-del="' + n.id + '">删除</button></div></td></tr>';
    }).join('') + '</table>' : '<div class="card empty">暂无公告</div>';
    h += '</div>';

    // 预览
    h += '<div><div class="mono" style="margin-bottom:10px">PREVIEW · 商户端效果</div><div class="panel-box" style="max-width:360px">';
    h += '<div class="mono">WHAT\'S NEW · ' + esc(p.month) + '</div><h3><span class="marker">' + esc(p.title) + '</span></h3>';
    h += '<div class="metrics">' + p.metrics.map(function (x) { return '<div><div class="num">' + esc(x.value) + '</div><div class="unit">' + esc(x.unit) + '</div><div class="lbl">' + esc(x.label) + '</div></div>'; }).join('') + '</div>';
    h += '<ul class="notices">' + p.notices.map(function (n, k) { return '<li><span class="n">' + pad(k + 1) + '</span><span>' + esc(n.text) + '</span></li>'; }).join('') + '</ul>';
    h += '</div></div></div>';
    return h;
  }

  /* ---------- 积分任务 ---------- */
  function vTasks(i) {
    var db = LSL.db();
    var h = head(i, '积分任务', '本月参与内容', db.tasks.filter(function (t) { return t.active; }).length + ' 项开放中');
    h += '<div class="a-sub">全部参与内容 <button class="btn sm" data-task-edit="">＋ 新建任务</button></div>';
    h += '<table class="tbl"><tr><th>内容</th><th>所属板块</th><th>参与形式</th><th>积分值</th><th>核验方式</th><th>状态</th><th>操作</th></tr>' + db.tasks.map(function (t) {
      return '<tr><td><b>' + esc(t.title) + '</b><br><small>' + esc(t.desc) + '</small></td><td>' + chip(t.section) + '</td><td>' + esc(t.form) + '</td>' +
        '<td><span class="num">' + t.points + '</span><br><small>' + esc(t.pointsText) + '</small></td><td><small>' + esc(t.verify) + '</small></td>' +
        '<td><span class="status ' + (t.active ? 'active' : 'off') + '">' + (t.active ? '开放' : '停用') + '</span></td>' +
        '<td><div class="ops"><button class="btn sm green" data-task-edit="' + t.id + '">编辑</button><button class="btn sm ghost" data-task-toggle="' + t.id + '">' + (t.active ? '停用' : '开放') + '</button><button class="btn sm ghost" data-del="tasks:' + t.id + '">删除</button></div></td></tr>';
    }).join('') + '</table>';
    return h;
  }

  /* ---------- 权益兑换 ---------- */
  function vRewards(i) {
    var db = LSL.db();
    var h = head(i, '权益兑换', null, db.rewards.filter(function (r) { return r.active; }).length + ' 项上架中');
    h += '<div class="a-sub">权益列表 <button class="btn sm" data-reward-edit="">＋ 新增权益</button></div>';
    h += '<table class="tbl"><tr><th>权益</th><th>分类</th><th>所需积分</th><th>库存</th><th>状态</th><th>操作</th></tr>' + db.rewards.map(function (r) {
      return '<tr><td><b>' + esc(r.name) + '</b><br><small>' + esc(r.desc) + '</small></td><td>' + esc(r.category) + '</td><td class="num">' + r.cost + '</td><td class="num">' + r.stock + '</td>' +
        '<td><span class="status ' + (r.active ? 'active' : 'off') + '">' + (r.active ? '上架' : '下架') + '</span></td>' +
        '<td><div class="ops"><button class="btn sm green" data-reward-edit="' + r.id + '">编辑</button><button class="btn sm ghost" data-reward-toggle="' + r.id + '">' + (r.active ? '下架' : '上架') + '</button><button class="btn sm ghost" data-del="rewards:' + r.id + '">删除</button></div></td></tr>';
    }).join('') + '</table>';
    return h;
  }

  /* ---------- 兑换订单 ---------- */
  function vOrders(i) {
    var db = LSL.db();
    var list = db.orders.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    var h = head(i, '兑换订单', null, '待处理 → 处理中 → 已完成');
    h += '<div class="a-grid c3" style="margin-bottom:10px">' + ORDER_FLOW.map(function (s, k) {
      return '<div class="card kpi t' + (k + 1) + '"><span class="idx">' + pad(k + 1) + '</span><div class="num">' + list.filter(function (o) { return o.status === s; }).length + '</div><div class="lbl">' + s + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="a-sub">订单列表</div>';
    h += list.length ? '<table class="tbl"><tr><th>单号</th><th>商户</th><th>权益</th><th>积分</th><th>时间</th><th>状态</th><th>操作</th></tr>' + list.map(function (o) {
      var k = ORDER_FLOW.indexOf(o.status), next = ORDER_FLOW[k + 1];
      return '<tr><td class="mono">' + esc(o.no) + '</td><td>' + esc(mName(o.merchantId)) + '</td><td>' + esc(o.name) + '</td><td class="num">' + o.cost + '</td><td><small>' + fmtDate(o.createdAt) + '</small></td>' +
        '<td><span class="status s-' + o.status + '">' + o.status + '</span></td><td>' + (next ? '<button class="btn sm" data-order="' + o.id + ':' + next + '">标记' + next + '</button>' : '<small>—</small>') + '</td></tr>';
    }).join('') + '</table>' : '<div class="card empty">暂无订单</div>';
    return h;
  }

  /* ---------- 数据统计 ---------- */
  function vStats(i) {
    var db = LSL.db();
    var issued = db.ledger.filter(function (l) { return l.type === 'earn'; }).reduce(function (s, l) { return s + l.points; }, 0);
    var spent = db.ledger.filter(function (l) { return l.type === 'spend'; }).reduce(function (s, l) { return s - l.points; }, 0);
    var reviewed = db.claims.filter(function (c) { return c.status !== 'pending'; });
    var passed = reviewed.filter(function (c) { return c.status === 'approved' || c.status === 'revoked'; });
    var rate = reviewed.length ? Math.round(passed.length / reviewed.length * 100) : 0;
    var bySec = {}; LSL.SECTIONS.forEach(function (s) { bySec[s.key] = db.merchants.reduce(function (t, m) { return t + (m.sections[s.key] || 0); }, 0); });
    var total = LSL.SECTIONS.reduce(function (t, s) { return t + bySec[s.key]; }, 0) || 1;

    var h = head(i, '数据统计', null, '截至 ' + fmtDate(Date.now()));
    h += '<div class="a-grid c4 tilt">' +
      kpi('累计发放', fmtNum(issued), '+', 'POINTS ISSUED') + kpi('累计消耗', fmtNum(spent), '-', 'POINTS SPENT') +
      kpi('申报通过率', rate, '%', 'APPROVAL RATE') + kpi('入驻商户', db.merchants.length, '家', 'MERCHANTS') + '</div>';

    h += '<div class="a-sub">三大板块贡献分布</div><div class="card dist">' + LSL.SECTIONS.map(function (s) {
      return '<div class="dist-row"><b>' + s.name + '</b><div class="bar"><i class="' + s.key + '" style="width:' + (bySec[s.key] / total * 100) + '%"></i></div><span class="num">' + bySec[s.key] + '</span></div>';
    }).join('') + '</div>';

    h += '<div class="a-sub">三大板块积分规则</div><table class="tbl"><tr><th>板块</th><th>记录内容</th><th>怎么积分</th><th>核验依据</th></tr>' + LSL.SECTIONS.map(function (s) {
      return '<tr><td>' + chip(s.key) + '</td><td>' + esc(s.what) + '</td><td>' + s.rules.map(esc).join('；') + '</td><td><small>' + esc(s.verify) + '</small></td></tr>';
    }).join('') + '</table>';

    var rank = db.merchants.slice().sort(function (a, b) { return LSL.annual(b) - LSL.annual(a); });
    h += '<div class="a-sub">商户贡献排行</div><table class="tbl"><tr><th>#</th><th>门店</th>' + LSL.SECTIONS.map(function (s) { return '<th>' + s.name + '</th>'; }).join('') + '<th>年度贡献</th><th>等级</th></tr>' + rank.map(function (m, k) {
      var a = LSL.annual(m);
      return '<tr><td class="num' + (k < 3 ? ' orange' : '') + '">' + pad(k + 1) + '</td><td><b>' + esc(m.name) + '</b></td>' + LSL.SECTIONS.map(function (s) { return '<td class="num">' + (m.sections[s.key] || 0) + '</td>'; }).join('') +
        '<td class="num">' + a + '</td><td>' + LSL.level(a).cur.name + '</td></tr>';
    }).join('') + '</table>';
    return h;
  }
  function kpi(lbl, v, unit, en) { return '<div class="card kpi"><div class="num">' + v + '<em>' + unit + '</em></div><div class="lbl">' + lbl + '</div><div class="mono">' + en + '</div></div>'; }

  var VIEWS = { review: vReview, merchants: vMerchants, panel: vPanel, tasks: vTasks, rewards: vRewards, orders: vOrders, stats: vStats };

  /* ---------- 编辑弹窗 ---------- */
  function editTask(id) {
    var t = id ? LSL.find('tasks', id) : { section: 'synergy', form: '线上参与', points: 20, pointsText: '', verify: '', desc: '', title: '', active: true };
    modal(id ? '编辑任务' : '新建任务',
      field('标题', 'title', t.title, 'text', 'required') +
      '<div class="row">' + select('所属板块', 'section', secOpts, t.section) + select('参与形式', 'form', LSL.FORMS, t.form) + '</div>' +
      '<div class="row">' + field('积分值（审核默认发放）', 'points', t.points, 'number', 'min="0" required') + field('积分说明（展示）', 'pointsText', t.pointsText, 'text', 'placeholder="如 20 分 / 份"') + '</div>' +
      field('核验方式', 'verify', t.verify) +
      '<label class="field"><span>说明</span><textarea name="desc">' + esc(t.desc) + '</textarea></label>' +
      select('状态', 'active', [{ v: '1', t: '开放' }, { v: '0', t: '停用' }], t.active ? '1' : '0') +
      '<label class="field"><span><input type="checkbox" name="needAmount" ' + (t.needAmount ? 'checked' : '') + ' /> 按捐赠金额计分（每 100 元 10 分）</span></label>',
      function (fd) {
        var pts = Number(fd.get('points')) || 0;
        LSL.upsert('tasks', { id: id || undefined, title: fd.get('title'), section: fd.get('section'), form: fd.get('form'), points: pts, pointsText: fd.get('pointsText') || pts + ' 分', verify: fd.get('verify'), desc: fd.get('desc'), active: fd.get('active') === '1', needAmount: !!fd.get('needAmount') });
        toast('已保存');
      });
  }
  function editReward(id) {
    var r = id ? LSL.find('rewards', id) : { name: '', desc: '', cost: 100, stock: 5, category: LSL.REWARD_CATS[0], active: true };
    modal(id ? '编辑权益' : '新增权益',
      field('名称', 'name', r.name, 'text', 'required') + field('说明', 'desc', r.desc) +
      '<div class="row">' + field('所需积分', 'cost', r.cost, 'number', 'min="1" required') + field('库存', 'stock', r.stock, 'number', 'min="0" required') + '</div>' +
      '<div class="row">' + select('分类', 'category', LSL.REWARD_CATS, r.category) + select('状态', 'active', [{ v: '1', t: '上架' }, { v: '0', t: '下架' }], r.active ? '1' : '0') + '</div>',
      function (fd) {
        LSL.upsert('rewards', { id: id || undefined, name: fd.get('name'), desc: fd.get('desc'), cost: Number(fd.get('cost')), stock: Number(fd.get('stock')), category: fd.get('category'), active: fd.get('active') === '1' });
        toast('已保存');
      });
  }
  function editNotice(id) {
    var p = LSL.db().panel;
    var n = id ? p.notices.filter(function (x) { return x.id === id; })[0] : { text: '' };
    modal(id ? '编辑公告' : '新增公告', '<label class="field"><span>公告内容</span><textarea name="text" required>' + esc(n.text) + '</textarea></label>', function (fd) {
      if (id) n.text = fd.get('text'); else p.notices.unshift({ id: 'n' + Date.now(), text: fd.get('text'), date: Date.now() });
      LSL.save(); toast('已保存');
    });
  }

  /* ---------- 事件 ---------- */
  $side.addEventListener('click', function (e) {
    var b = e.target.closest('[data-nav]'); if (!b) return;
    cur = b.getAttribute('data-nav'); location.hash = cur; render(); window.scrollTo(0, 0);
  });

  $main.addEventListener('click', function (e) {
    var t = e.target.closest('button, img[data-view]'); if (!t) return;
    var d = t.dataset;
    if (d.appPass) { var m = LSL.reviewApplication(d.appPass, true); toast('已通过，新增商户 ' + (m && m.name)); }
    else if (d.appReject) { LSL.reviewApplication(d.appReject, false); toast('已拒绝'); }
    else if (d.pass) { var r = LSL.approveClaim(d.pass, document.getElementById('pts_' + d.pass).value); toast(r.ok ? '已发放 ' + r.points + ' 分' : r.msg); }
    else if (d.reject) { var why = prompt('退回原因（商户可见）', '材料不完整，请补充凭证'); if (why === null) return; LSL.rejectClaim(d.reject, why); toast('已退回'); }
    else if (d.revoke) { if (!confirm('确认撤回该笔积分？（如捐赠退款）')) return; LSL.revokeClaim(d.revoke); toast('已撤回'); }
    else if (d.view !== undefined && t.tagName === 'IMG') { var w = window.open(''); if (w) w.document.write('<img src="' + t.src + '" style="max-width:100%">'); return; }
    else if (d.addMerchant !== undefined) {
      return modal('新增商户', field('门店名称', 'name', '', 'text', 'required') + field('业态', 'category', '') + '<div class="row">' + field('联系人', 'contact', '') + field('手机号', 'phone', '') + '</div>', function (fd) {
        LSL.addMerchant({ name: fd.get('name'), category: fd.get('category'), contact: fd.get('contact'), phone: fd.get('phone') }); toast('已新增');
      });
    }
    else if (d.taskEdit !== undefined) return editTask(d.taskEdit);
    else if (d.taskToggle) { var tk = LSL.find('tasks', d.taskToggle); LSL.upsert('tasks', { id: tk.id, active: !tk.active }); }
    else if (d.rewardEdit !== undefined) return editReward(d.rewardEdit);
    else if (d.rewardToggle) { var rw = LSL.find('rewards', d.rewardToggle); LSL.upsert('rewards', { id: rw.id, active: !rw.active }); }
    else if (d.del) { if (!confirm('确认删除？')) return; var sp = d.del.split(':'); LSL.remove(sp[0], sp[1]); toast('已删除'); }
    else if (d.order) { var op = d.order.split(':'); LSL.setOrderStatus(op[0], op[1]); toast('已更新为' + op[1]); }
    else if (d.noticeAdd !== undefined) return editNotice('');
    else if (d.noticeEdit) return editNotice(d.noticeEdit);
    else if (d.noticeDel) { var p = LSL.db().panel; p.notices = p.notices.filter(function (n) { return n.id !== d.noticeDel; }); LSL.save(); toast('已删除'); }
    else return;
    render();
  });

  $main.addEventListener('submit', function (e) {
    if (e.target.id !== 'panelForm') return;
    e.preventDefault();
    var fd = new FormData(e.target), p = LSL.db().panel;
    p.title = fd.get('title'); p.month = fd.get('month');
    p.metrics = [0, 1, 2].map(function (k) { return { label: fd.get('ml' + k), value: fd.get('mv' + k), unit: fd.get('mu' + k) }; });
    LSL.save(); toast('面板已更新，商户端刷新可见'); render();
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (confirm('恢复初始演示数据？当前所有改动将清空。')) { LSL.reset(); toast('已恢复'); render(); }
  });
  LSL.onChange(function (src) { if (src === 'remote' && !document.querySelector('.a-modal')) render(); });
  window.addEventListener('hashchange', function () { cur = location.hash.slice(1); render(); });

  render();
})();
