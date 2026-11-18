/* 麓商联 · 运营后台 */
(function () {
  'use strict';

  var $root = document.getElementById('root');
  var $side, $main;
  var cur = (location.hash || '#review').slice(1);
  var tabs = { academy: 'courses', content: 'carousel', leads: 'all' };

  var MENU = [
    { grp: '业务' },
    { key: 'review', name: '审核中心', en: 'REVIEW' },
    { key: 'merchants', name: '商户管理', en: 'MERCHANTS' },
    { key: 'tasks', name: '积分任务', en: 'TASKS' },
    { key: 'rewards', name: '权益兑换', en: 'REWARDS' },
    { key: 'orders', name: '兑换订单', en: 'ORDERS' },
    { key: 'academy', name: '商学院', en: 'ACADEMY' },
    { grp: '内容' },
    { key: 'content', name: '内容管理', en: 'CONTENT' },
    { key: 'staff', name: '工作人员', en: 'STAFF' },
    { key: 'leads', name: '合作留资', en: 'LEADS' },
    { grp: '数据' },
    { key: 'stats', name: '数据统计', en: 'STATS' },
    { grp: '系统', superOnly: true },
    { key: 'users', name: '用户管理', en: 'USERS', superOnly: true }
  ];
  var ORDER_FLOW = ['待处理', '处理中', '已完成'];

  /* ---------- 工具 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(ts) { if (!ts) return '—'; var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-US'); }
  function chip(sec) { var s = LSL.section(sec); return s ? '<span class="chip ' + s.key + '">' + s.name + '</span>' : '<span class="chip plain">—</span>'; }
  function mName(id) { var m = LSL.find('merchants', id); return m ? m.name : '（已删除）'; }
  function uPhone(id) { var u = LSL.find('users', id); return u ? u.phone : '—'; }
  function mentorName(id) { var x = LSL.db().academy.mentors.filter(function (m) { return m.id === id; })[0]; return x ? x.name : '—'; }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2000); }
  function fxNum(cls, val, key, colors) {
    return '<span class="' + cls + '" data-fx data-fx-key="' + esc(key) + '" data-fx-step="2" data-fx-duration="2000"' + (colors ? ' data-fx-colors="' + colors + '"' : '') + '><span class="fx-line">' + val + '</span></span>';
  }
  var FX_SEC = { donation: '#ea5520,#ea5520,#141414', synergy: '#8fc31f,#c8f04a,#141414', community: '#1597a6,#1597a6,#141414' };
  function menuItems() { var sup = LSL.isSuper(); return MENU.filter(function (x) { return x.key && (!x.superOnly || sup); }); }
  function head(title, right) {
    var items = menuItems(), i = items.findIndex(function (x) { return x.key === cur; });
    return '<div class="sec-head rv"><span class="mono"><b>' + pad(i + 1) + ' / ' + pad(items.length) + '</b> · ' + esc(items[i].en) + '</span><span class="mono">' + (right || '') + '</span></div>' +
      '<h1 class="a-title" data-fx data-fx-key="title-' + cur + '"><span class="fx-line"><span class="marker">' + esc(title || items[i].name) + '</span></span></h1>';
  }
  function tabBar(group, list) { return '<div class="a-tabs">' + list.map(function (t) { return '<button data-tab="' + group + ':' + t[0] + '" class="' + (tabs[group] === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>'; }

  function modal(title, body, onSave, saveText) {
    var m = document.createElement('div');
    m.className = 'a-modal';
    m.innerHTML = '<form class="card"><h3>' + esc(title) + '</h3>' + body + '<div class="acts">' + (onSave ? '<button type="button" class="btn ghost" data-close>取消</button><button class="btn" type="submit">' + (saveText || '保存') + '</button>' : '<button type="button" class="btn" data-close>知道了</button>') + '</div></form>';
    m.addEventListener('click', function (e) { if (e.target === m || e.target.hasAttribute('data-close')) m.remove(); });
    var form = m.querySelector('form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!onSave) return m.remove();
      if (onSave(new FormData(form), form) !== false) { m.remove(); render(); }
    });
    document.body.appendChild(m);
    bindUploads(form);
    return m;
  }
  function field(label, name, val, type, extra) { return '<label class="field"><span>' + label + '</span><input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" ' + (extra || '') + ' /></label>'; }
  function area(label, name, val) { return '<label class="field"><span>' + label + '</span><textarea name="' + name + '">' + esc(val || '') + '</textarea></label>'; }
  function select(label, name, opts, val) {
    return '<label class="field"><span>' + label + '</span><select name="' + name + '">' + opts.map(function (o) {
      var v = typeof o === 'string' ? o : o.v, t = typeof o === 'string' ? o : o.t;
      return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('') + '</select></label>';
  }
  function upload(label, name, val, wide) {
    return '<label class="field"><span>' + label + '</span><label class="upload" data-upload="' + name + '" data-wide="' + (wide ? 1 : 0) + '"><input type="file" accept="image/*" hidden /><input type="hidden" name="' + name + '" value="' + esc(val || '') + '" /><span>' + (val ? '<img src="' + val + '" alt="" />点击更换' : '＋ 点击上传图片') + '</span></label></label>';
  }
  function bindUploads(root) {
    root.querySelectorAll('[data-upload]').forEach(function (box) {
      var f = box.querySelector('input[type=file]');
      f.addEventListener('change', function () {
        var file = f.files[0]; if (!file) return;
        compress(file, box.dataset.wide === '1' ? 960 : 480, function (d) { box.querySelector('input[type=hidden]').value = d; box.querySelector('span').innerHTML = '<img src="' + d + '" alt="" />点击更换'; });
      });
    });
  }
  function compress(file, max, cb) {
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = im.width * k; cv.height = im.height * k; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.72));
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  var secOpts = LSL.SECTIONS.map(function (s) { return { v: s.key, t: s.name }; });
  var linkOpts = Object.keys(LSL.LINKS).map(function (k) { return { v: k, t: LSL.LINKS[k] }; });
  function showPassword(title, user, pw) {
    modal(title, '<p style="font-size:13px">请把以下初始密码发给 <b>' + esc(user) + '</b>，对方首次登录后需修改密码。密码只显示这一次。</p><div class="pw-show">' + esc(pw) + '</div>', null);
  }

  /* ---------- 登录 ---------- */
  function viewLogin(msg) {
    $root.innerHTML = '<div class="a-login"><form id="loginForm"><div class="mono">LSL ADMIN · 运营后台</div><h1><span class="marker">麓商联</span><br>运营后台登录</h1>' +
      field('账号', 'username', '', 'text', 'required autocomplete="username"') + field('密码', 'password', '', 'password', 'required autocomplete="current-password"') +
      '<div class="err">' + esc(msg || '') + '</div><button class="btn block" type="submit">登录</button>' +
      '<div class="demo">演示账号：超级管理员 <code>admin</code> / <code>admin123</code>；运营人员 <code>yunying</code> / <code>lsl2026</code>。<br>运营人员看不到「用户管理」。</div></form></div>';
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target), r = LSL.adminLogin(fd.get('username'), fd.get('password'));
      if (!r.ok) return viewLogin(r.msg);
      boot();
      if (r.admin.mustChange) forceChangePw();
    });
  }
  function forceChangePw(manual) {
    modal(manual ? '修改密码' : '请先修改初始密码', (manual ? '' : '<p style="font-size:13px;margin-bottom:14px">你的密码由超级管理员设置或重置，为保证安全请修改。</p>') + field('当前密码', 'old', '', 'password', 'required') + field('新密码（至少 6 位）', 'pw', '', 'password', 'required minlength="6"') + field('确认新密码', 'pw2', '', 'password', 'required'), function (fd) {
      if (fd.get('pw') !== fd.get('pw2')) { toast('两次输入的新密码不一致'); return false; }
      var r = LSL.changeOwnPassword(fd.get('old'), fd.get('pw'));
      if (!r.ok) { toast(r.msg); return false; }
      toast('密码已修改');
    }, '修改密码');
  }

  /* ---------- 框架 ---------- */
  function boot() {
    var a = LSL.admin();
    if (!a) return viewLogin();
    $root.innerHTML = '<header class="a-top"><span class="logo">麓商联</span><span class="mono">LSL ADMIN · 运营后台</span><span class="grow"></span>' +
      '<span class="who">' + esc(a.name) + ' <span class="chip ' + (a.role === 'super' ? 'donation' : 'plain') + '">' + LSL.ADMIN_ROLES[a.role] + '</span></span>' +
      '<a class="btn sm green" href="index.html" target="_blank">打开商户端</a><button class="btn sm ghost" id="pwBtn">修改密码</button><button class="btn sm ghost" id="outBtn">退出</button>' +
      (a.role === 'super' ? '<button class="btn sm ghost" id="resetBtn">恢复演示数据</button>' : '') + '</header>' +
      '<div class="a-wrap"><nav class="a-side" id="side"></nav><main class="a-main" id="main"></main></div>';
    $side = document.getElementById('side'); $main = document.getElementById('main');
    document.getElementById('pwBtn').onclick = function () { forceChangePw(true); };
    document.getElementById('outBtn').onclick = function () { LSL.adminLogout(); viewLogin('已退出登录'); };
    var rb = document.getElementById('resetBtn');
    if (rb) rb.onclick = function () { if (confirm('恢复初始演示数据？所有改动将清空，并需要重新登录。')) { LSL.reset(); viewLogin('演示数据已恢复，请重新登录'); } };
    $side.addEventListener('click', function (e) { var b = e.target.closest('[data-nav]'); if (!b) return; cur = b.getAttribute('data-nav'); location.hash = cur; render(); window.scrollTo(0, 0); });
    $main.addEventListener('click', onClick);
    $main.addEventListener('submit', onSubmit);
    $main.addEventListener('change', onChange);
    bindUploads($main);
    render();
  }

  function renderSide() {
    var db = LSL.db(), sup = LSL.isSuper();
    var badge = {
      review: db.claims.filter(function (c) { return c.status === 'pending'; }).length + db.applications.filter(function (a) { return a.status === 'pending'; }).length + db.members.filter(function (m) { return m.status === 'pending'; }).length,
      orders: db.orders.filter(function (o) { return o.status === '待处理'; }).length,
      leads: db.leads.filter(function (l) { return l.status === 'new'; }).length
    };
    var n = 0;
    $side.innerHTML = MENU.filter(function (x) { return !x.superOnly || sup; }).map(function (x) {
      if (x.grp) return '<div class="grp">' + x.grp + '</div>';
      n++;
      return '<button data-nav="' + x.key + '" class="' + (cur === x.key ? 'on' : '') + '"><span class="mono">' + pad(n) + '</span><span class="t">' + x.name + '</span>' + (badge[x.key] ? '<span class="badge">' + badge[x.key] + '</span>' : '') + '</button>';
    }).join('');
  }

  function render(opts) {
    opts = opts || {};
    if (!LSL.admin()) return viewLogin('登录已过期，请重新登录');
    if (!VIEWS[cur]) cur = 'review';
    renderSide();
    var item = MENU.filter(function (x) { return x.key === cur; })[0];
    $main.innerHTML = item.superOnly && !LSL.isSuper() ? '<div class="denied"><div class="num">403</div><h2>无权限</h2><p class="muted">「用户管理」仅超级管理员可用。</p></div>' : VIEWS[cur]();
    bindUploads($main);
    LSLFX.run($main, { instant: !!opts.quiet });
  }

  /* ---------- 审核中心 ---------- */
  function vReview() {
    var db = LSL.db();
    var apps = db.applications.filter(function (a) { return a.status === 'pending'; });
    var mbs = db.members.filter(function (m) { return m.status === 'pending'; });
    var claims = db.claims.filter(function (c) { return c.status === 'pending'; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    var done = db.claims.filter(function (c) { return c.status !== 'pending'; }).sort(function (a, b) { return (b.reviewedAt || b.createdAt) - (a.reviewedAt || a.createdAt); }).slice(0, 10);
    var h = head('审核中心', apps.length + mbs.length + claims.length + ' 项待处理');

    h += '<div class="a-sub">新店入驻申请 <span class="mono">' + apps.length + ' PENDING</span></div>';
    h += apps.length ? '<table class="tbl rv"><tr><th>门店</th><th>业态 / 铺位</th><th>联系人</th><th>提交时间</th><th>操作</th></tr>' + apps.map(function (a) {
      return '<tr><td><b>' + esc(a.name) + '</b></td><td>' + esc(a.category) + '<br><small>' + esc(a.unit || '—') + '</small></td><td>' + esc(a.contact) + ' <small>' + esc(a.phone) + '</small></td><td><small>' + fmtDate(a.createdAt) + '</small></td>' +
        '<td><div class="ops"><button class="btn sm" data-app-pass="' + a.id + '">通过</button><button class="btn sm ghost" data-app-reject="' + a.id + '">拒绝</button></div></td></tr>';
    }).join('') + '</table>' : '<div class="card empty rv">暂无待审核入驻申请</div>';

    h += '<div class="a-sub">门店绑定审核 <span class="mono">' + mbs.length + ' PENDING</span></div>';
    h += mbs.length ? '<table class="tbl rv"><tr><th>手机号</th><th>申请绑定门店</th><th>说明</th><th>照片</th><th>提交时间</th><th>操作</th></tr>' + mbs.map(function (m) {
      var u = LSL.find('users', m.userId) || {};
      return '<tr><td><b>' + esc(u.phone) + '</b><br><small>' + esc(u.name || '') + '</small></td><td>' + esc(mName(m.merchantId)) + '</td><td><small>' + esc(m.note || '—') + '</small></td><td>' + (m.photo ? '<img class="thumb" src="' + m.photo + '" data-view alt="" />' : '—') + '</td><td><small>' + fmtDate(m.createdAt) + '</small></td>' +
        '<td><div class="ops"><button class="btn sm" data-mb-pass="' + m.id + '">通过</button><button class="btn sm ghost" data-mb-reject="' + m.id + '">拒绝</button></div></td></tr>';
    }).join('') + '</table>' : '<div class="card empty rv">暂无待审核绑定</div>';

    h += '<div class="a-sub">积分申报审核 <span class="mono">' + claims.length + ' PENDING</span></div>';
    h += claims.length ? '<table class="tbl rv"><tr><th>商户</th><th>所属板块</th><th>参与内容</th><th>材料</th><th>发放分值</th><th>操作</th></tr>' + claims.map(function (c) {
      var hint = c.section === 'donation' && c.amount ? '<br><small>捐赠 ' + c.amount + ' 元，分值不改则按年度累计余额自动折算</small>' : '';
      return '<tr><td><b>' + esc(mName(c.merchantId)) + '</b><br><small>' + fmtDate(c.createdAt) + (c.userId ? ' · ' + esc(uPhone(c.userId)) : '') + '</small></td><td>' + chip(c.section) + '</td><td>' + esc(c.title) + hint + '</td>' +
        '<td>' + (c.image ? '<img class="thumb" src="' + c.image + '" data-view alt="" />' : '') + '<small>' + esc(c.note || '—') + '</small></td>' +
        '<td><input class="inline" type="number" min="0" value="' + c.points + '" id="pts_' + c.id + '" /></td>' +
        '<td><div class="ops"><button class="btn sm" data-pass="' + c.id + '">通过发放</button><button class="btn sm ghost" data-reject="' + c.id + '">退回</button></div></td></tr>';
    }).join('') + '</table>' : '<div class="card empty rv">暂无待审核申报</div>';

    h += '<div class="a-sub">最近处理 <span class="mono">退款 / 误发可撤回</span></div>';
    h += done.length ? '<table class="tbl rv"><tr><th>商户</th><th>板块</th><th>内容</th><th>分值</th><th>状态</th><th>操作</th></tr>' + done.map(function (c) {
      var st = { approved: '已发放', rejected: '已退回', revoked: '已撤回' }[c.status];
      return '<tr><td>' + esc(mName(c.merchantId)) + '</td><td>' + chip(c.section) + '</td><td>' + esc(c.title) + (c.reason ? '<br><small>' + esc(c.reason) + '</small>' : '') + '</td><td class="num">' + c.points + '</td>' +
        '<td><span class="status ' + c.status + '">' + st + '</span></td><td>' + (c.status === 'approved' ? '<button class="btn sm ghost" data-revoke="' + c.id + '">撤回积分</button>' : '') + '</td></tr>';
    }).join('') + '</table>' : '<div class="card empty rv">暂无记录</div>';
    return h;
  }

  /* ---------- 商户管理 ---------- */
  function vMerchants() {
    var db = LSL.db(), list = db.merchants.slice().sort(function (a, b) { return LSL.annual(b) - LSL.annual(a); });
    var h = head('商户管理', list.length + ' 家商户');
    h += '<div class="a-sub">全部商户档案 <button class="btn sm" data-add-merchant>＋ 新增商户</button></div>';
    h += '<table class="tbl rv"><tr><th>编号</th><th>门店</th><th>成员</th><th>绑定码</th><th>可用积分</th>' + LSL.SECTIONS.map(function (s) { return '<th>' + s.name + '</th>'; }).join('') + '<th>年度贡献</th><th>等级</th><th>操作</th></tr>' + list.map(function (m) {
      var a = LSL.annual(m), lv = LSL.level(a), cnt = db.members.filter(function (x) { return x.merchantId === m.id && x.status === 'active'; }).length;
      return '<tr><td class="mono">' + esc(m.code) + '</td><td><b>' + esc(m.name) + '</b><br><small>' + esc(m.category) + ' · ' + esc(m.unit || '—') + '</small></td><td>' + cnt + ' 人</td><td class="mono" style="font-size:13px;color:var(--ink)">' + esc(m.bindCode) + '</td>' +
        '<td class="num">' + fmtNum(m.points) + '</td>' + LSL.SECTIONS.map(function (s) { return '<td class="num" style="color:' + s.color + '">' + (m.sections[s.key] || 0) + '</td>'; }).join('') +
        '<td class="num">' + fmtNum(a) + '</td><td><span class="chip plain">Lv.' + (lv.idx + 1) + ' ' + lv.cur.name + '</span></td><td><div class="ops"><button class="btn sm green" data-members="' + m.id + '">成员</button><button class="btn sm ghost" data-rebind="' + m.id + '">重置绑定码</button></div></td></tr>';
    }).join('') + '</table>';
    h += '<p class="mono" style="margin-top:12px;letter-spacing:.08em">年度贡献值 = 三大板块分项之和 · 等级按 200 / 500 / 1000 / 2000 分档 · 店员输入绑定码即可绑定门店</p>';
    return h;
  }
  function openMembers(mid) {
    var db = LSL.db(), m = LSL.find('merchants', mid);
    var list = db.members.filter(function (x) { return x.merchantId === mid && x.status !== 'rejected'; });
    var body = '<p class="muted" style="font-size:12px;margin-bottom:12px">绑定码：<b class="mono" style="color:var(--ink);font-size:14px">' + esc(m.bindCode) + '</b> · 移除成员后，对方立即无法查看本店积分；强制下线会让其所有设备重新登录。</p>' +
      (list.length ? '<table class="tbl"><tr><th>手机号</th><th>角色</th><th>状态</th><th>最近登录</th><th>操作</th></tr>' + list.map(function (x) {
        var u = LSL.find('users', x.userId) || {};
        return '<tr><td><b>' + esc(u.phone) + '</b><br><small>' + esc(u.name || '') + '</small></td><td>' + (x.role === 'owner' ? '店长' : '店员') + '</td><td><span class="status ' + x.status + '">' + (x.status === 'active' ? '正常' : '待审核') + '</span></td><td><small>' + fmtDate(u.lastLoginAt) + '</small></td>' +
          '<td><div class="ops"><button type="button" class="btn sm ghost" data-role="' + x.id + ':' + (x.role === 'owner' ? 'staff' : 'owner') + '">设为' + (x.role === 'owner' ? '店员' : '店长') + '</button><button type="button" class="btn sm ghost" data-kick="' + x.userId + '">强制下线</button><button type="button" class="btn sm ghost" data-unbind="' + x.id + '">移除</button></div></td></tr>';
      }).join('') + '</table>' : '<div class="empty">暂无成员</div>');
    var md = modal(m.name + ' · 门店成员', body, null);
    md.querySelector('.card').style.width = '760px';
    md.addEventListener('click', function (e) {
      var b = e.target.closest('[data-role],[data-kick],[data-unbind]'); if (!b) return;
      if (b.dataset.role) { var p = b.dataset.role.split(':'); LSL.setMemberRole(p[0], p[1]); toast('已更新角色'); }
      else if (b.dataset.kick) { LSL.forceLogout(b.dataset.kick); toast('已强制下线'); }
      else if (b.dataset.unbind) { if (!confirm('确认移除该成员？')) return; LSL.removeMember(b.dataset.unbind); toast('已移除'); }
      md.remove(); render(); openMembers(mid);
    });
  }

  /* ---------- 积分任务 / 权益 / 订单 ---------- */
  function vTasks() {
    var db = LSL.db();
    var h = head('积分任务', db.tasks.filter(function (t) { return t.active; }).length + ' 项开放中');
    h += '<div class="a-sub">本月参与内容 <button class="btn sm" data-task-edit="">＋ 新建任务</button></div>';
    h += '<table class="tbl rv"><tr><th>内容</th><th>所属板块</th><th>参与形式</th><th>积分值</th><th>核验方式</th><th>状态</th><th>操作</th></tr>' + db.tasks.map(function (t) {
      return '<tr><td><b>' + esc(t.title) + '</b><br><small>' + esc(t.desc) + '</small></td><td>' + chip(t.section) + '</td><td>' + esc(t.form) + '</td><td><span class="num">' + t.points + '</span><br><small>' + esc(t.pointsText) + '</small></td><td><small>' + esc(t.verify) + '</small></td>' +
        '<td><span class="status ' + (t.active ? 'active' : 'off') + '">' + (t.active ? '开放' : '停用') + '</span></td>' +
        '<td><div class="ops"><button class="btn sm green" data-task-edit="' + t.id + '">编辑</button><button class="btn sm ghost" data-toggle="tasks:' + t.id + '">' + (t.active ? '停用' : '开放') + '</button><button class="btn sm ghost" data-del="tasks:' + t.id + '">删除</button></div></td></tr>';
    }).join('') + '</table>';
    return h;
  }
  function vRewards() {
    var db = LSL.db();
    var h = head('权益兑换', db.rewards.filter(function (r) { return r.active; }).length + ' 项上架中');
    h += '<div class="a-sub">权益列表 <button class="btn sm" data-reward-edit="">＋ 新增权益</button></div>';
    h += '<table class="tbl rv"><tr><th>权益</th><th>分类</th><th>所需积分</th><th>库存</th><th>状态</th><th>操作</th></tr>' + db.rewards.map(function (r) {
      return '<tr><td><b>' + esc(r.name) + '</b><br><small>' + esc(r.desc) + '</small></td><td>' + esc(r.category) + '</td><td class="num">' + r.cost + '</td><td class="num">' + r.stock + '</td>' +
        '<td><span class="status ' + (r.active ? 'active' : 'off') + '">' + (r.active ? '上架' : '下架') + '</span></td>' +
        '<td><div class="ops"><button class="btn sm green" data-reward-edit="' + r.id + '">编辑</button><button class="btn sm ghost" data-toggle="rewards:' + r.id + '">' + (r.active ? '下架' : '上架') + '</button><button class="btn sm ghost" data-del="rewards:' + r.id + '">删除</button></div></td></tr>';
    }).join('') + '</table>';
    return h;
  }
  function vOrders() {
    var list = LSL.db().orders.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    var h = head('兑换订单', '待处理 → 处理中 → 已完成');
    h += '<div class="a-grid c3 tilt" style="margin-bottom:10px">' + ORDER_FLOW.map(function (s, k) {
      var n = list.filter(function (o) { return o.status === s; }).length;
      return '<div class="card kpi rv"><span class="idx">' + pad(k + 1) + '</span><div>' + fxNum('num', n, 'ord-' + s + '-' + n) + '</div><div class="lbl">' + s + '</div></div>';
    }).join('') + '</div><div class="a-sub">订单列表</div>';
    h += list.length ? '<table class="tbl rv"><tr><th>单号</th><th>商户</th><th>权益</th><th>积分</th><th>时间</th><th>状态</th><th>操作</th></tr>' + list.map(function (o) {
      var next = ORDER_FLOW[ORDER_FLOW.indexOf(o.status) + 1];
      return '<tr><td class="mono">' + esc(o.no) + '</td><td>' + esc(mName(o.merchantId)) + '</td><td>' + esc(o.name) + '</td><td class="num">' + o.cost + '</td><td><small>' + fmtDate(o.createdAt) + '</small></td>' +
        '<td><span class="status s-' + o.status + '">' + o.status + '</span></td><td>' + (next ? '<button class="btn sm" data-order="' + o.id + ':' + next + '">标记' + next + '</button>' : '<small>—</small>') + '</td></tr>';
    }).join('') + '</table>' : '<div class="card empty rv">暂无订单</div>';
    return h;
  }

  /* ---------- 商学院 ---------- */
  function vAcademy() {
    var ac = LSL.db().academy, h = head('商学院') + tabBar('academy', [['courses', '本月课程'], ['mentors', '导师'], ['past', '往期回顾']]);
    if (tabs.academy === 'courses') {
      h += '<div class="a-sub">课程 <button class="btn sm" data-course-edit="">＋ 新建课程</button></div>';
      h += '<table class="tbl rv"><tr><th>课程</th><th>导师</th><th>时间 / 地点</th><th>报名 / 名额</th><th>签到发分</th><th>状态</th><th>操作</th></tr>' + ac.courses.slice().sort(function (a, b) { return a.start - b.start; }).map(function (c) {
        var sg = LSL.signupsOf(c.id), ck = sg.filter(function (s) { return s.status === 'checked'; }).length;
        return '<tr><td><b>' + esc(c.title) + '</b><br><small>' + esc(c.desc) + '</small></td><td>' + esc(mentorName(c.mentorId)) + '</td><td><small>' + fmtDate(c.start) + '<br>' + esc(c.place) + '</small></td><td class="num">' + sg.length + '<small> / ' + c.seats + '</small></td><td>+' + c.points + '<br><small>已签到 ' + ck + '</small></td>' +
          '<td><span class="status ' + (c.active ? 'active' : 'off') + '">' + (c.active ? '开放' : '停用') + '</span></td>' +
          '<td><div class="ops"><button class="btn sm" data-signups="' + c.id + '">报名名单</button><button class="btn sm green" data-course-edit="' + c.id + '">编辑</button><button class="btn sm ghost" data-toggle="academy.courses:' + c.id + '">' + (c.active ? '停用' : '开放') + '</button><button class="btn sm ghost" data-del="academy.courses:' + c.id + '">删除</button></div></td></tr>';
      }).join('') + '</table><p class="mono" style="margin-top:12px;letter-spacing:.08em">报名不计分 · 在报名名单中点「签到」即按课程分值发放商圈共生值</p>';
    } else if (tabs.academy === 'mentors') {
      h += '<div class="a-sub">导师 <button class="btn sm" data-mentor-edit="">＋ 新增导师</button></div>';
      h += '<table class="tbl rv"><tr><th>照片</th><th>导师</th><th>擅长方向</th><th>介绍</th><th>操作</th></tr>' + ac.mentors.map(function (x) {
        return '<tr><td>' + (x.photo ? '<img class="thumb" src="' + x.photo + '" data-view alt="" />' : '<small>—</small>') + '</td><td><b>' + esc(x.name) + '</b><br><small>' + esc(x.title) + '</small></td><td>' + esc(x.tags) + '</td><td><small>' + esc(x.intro) + '</small></td>' +
          '<td><div class="ops"><button class="btn sm green" data-mentor-edit="' + x.id + '">编辑</button><button class="btn sm ghost" data-del="academy.mentors:' + x.id + '">删除</button></div></td></tr>';
      }).join('') + '</table>';
    } else {
      h += '<div class="a-sub">往期回顾 <button class="btn sm" data-past-edit="">＋ 新增回顾</button></div>';
      h += '<table class="tbl rv"><tr><th>配图</th><th>主题</th><th>导师</th><th>日期</th><th>简介</th><th>操作</th></tr>' + ac.past.slice().sort(function (a, b) { return b.date - a.date; }).map(function (x) {
        return '<tr><td>' + (x.image ? '<img class="thumb wide" src="' + x.image + '" data-view alt="" />' : '—') + '</td><td><b>' + esc(x.title) + '</b></td><td>' + esc(mentorName(x.mentorId)) + '</td><td><small>' + fmtDate(x.date).slice(0, 10) + '</small></td><td><small>' + esc(x.summary) + '</small></td>' +
          '<td><div class="ops"><button class="btn sm green" data-past-edit="' + x.id + '">编辑</button><button class="btn sm ghost" data-del="academy.past:' + x.id + '">删除</button></div></td></tr>';
      }).join('') + '</table>';
    }
    return h;
  }
  function openSignups(cid) {
    var c = LSL.db().academy.courses.filter(function (x) { return x.id === cid; })[0];
    var list = LSL.signupsOf(cid);
    var md = modal(c.title + ' · 报名名单', list.length ? '<table class="tbl"><tr><th>门店</th><th>报名人</th><th>报名时间</th><th>状态</th><th>操作</th></tr>' + list.map(function (s) {
      return '<tr><td><b>' + esc(mName(s.merchantId)) + '</b></td><td>' + esc(uPhone(s.userId)) + '</td><td><small>' + fmtDate(s.createdAt) + '</small></td><td><span class="status ' + s.status + '">' + (s.status === 'checked' ? '已签到' : '已报名') + '</span></td><td>' + (s.status === 'signed' ? '<button type="button" class="btn sm" data-check="' + s.id + '">签到 +' + c.points + '</button>' : '') + '</td></tr>';
    }).join('') + '</table>' : '<div class="empty">暂无报名</div>', null);
    md.querySelector('.card').style.width = '700px';
    md.addEventListener('click', function (e) {
      var b = e.target.closest('[data-check]'); if (!b) return;
      var r = LSL.checkIn(b.dataset.check); if (r.ok) toast('已签到，发放 ' + r.points + ' 分');
      md.remove(); render(); openSignups(cid);
    });
  }

  /* ---------- 内容管理 ---------- */
  function vContent() {
    var db = LSL.db(), ct = db.content;
    var h = head('内容管理', '商户端首页与关于我们') + tabBar('content', [['carousel', '轮播图'], ['stats', '首页统计数据'], ['panel', '商圈面板'], ['about', '关于我们']]);
    if (tabs.content === 'carousel') {
      h += '<div class="a-sub">首页轮播图 <button class="btn sm" data-slide-edit="">＋ 新增轮播图</button></div>';
      h += '<table class="tbl rv"><tr><th>图片</th><th>标题</th><th>副标题</th><th>点击跳转</th><th>排序</th><th>操作</th></tr>' + ct.carousel.map(function (s, i) {
        return '<tr><td><img class="thumb wide" src="' + s.image + '" data-view alt="" /></td><td><b>' + esc(s.title) + '</b></td><td><small>' + esc(s.sub) + '</small></td><td>' + esc(LSL.LINKS[s.link] || '—') + '</td>' +
          '<td><div class="ops"><button class="btn sm ghost" data-move="content.carousel:' + s.id + ':-1"' + (i ? '' : ' disabled') + '>↑</button><button class="btn sm ghost" data-move="content.carousel:' + s.id + ':1"' + (i < ct.carousel.length - 1 ? '' : ' disabled') + '>↓</button></div></td>' +
          '<td><div class="ops"><button class="btn sm green" data-slide-edit="' + s.id + '">编辑</button><button class="btn sm ghost" data-del="content.carousel:' + s.id + '">删除</button></div></td></tr>';
      }).join('') + '</table><p class="mono" style="margin-top:12px;letter-spacing:.08em">建议尺寸 16:9（如 1600×900），上传后自动压缩</p>';
    } else if (tabs.content === 'stats') {
      h += '<div class="a-sub">首页三项统计数据</div><form id="statsForm" class="card rv">';
      h += '<table class="tbl" style="border:0"><tr><th>名称</th><th>数据来源</th><th>自动统计口径</th><th>手动数值</th><th>单位</th><th>点击跳转</th><th>当前显示</th></tr>' + ct.stats.map(function (s, i) {
        return '<tr><td><input class="inline" style="width:110px" name="label' + i + '" value="' + esc(s.label) + '" /></td>' +
          '<td><select name="mode' + i + '"><option value="auto"' + (s.mode === 'auto' ? ' selected' : '') + '>系统自动统计</option><option value="manual"' + (s.mode === 'manual' ? ' selected' : '') + '>手动填写</option></select></td>' +
          '<td><select name="metric' + i + '">' + Object.keys(LSL.STAT_METRICS).map(function (k) { return '<option value="' + k + '"' + (s.metric === k ? ' selected' : '') + '>' + LSL.STAT_METRICS[k] + '</option>'; }).join('') + '</select></td>' +
          '<td><input class="inline" style="width:90px" name="value' + i + '" value="' + esc(s.value) + '" /></td><td><input class="inline" style="width:50px" name="unit' + i + '" value="' + esc(s.unit) + '" /></td>' +
          '<td><select name="link' + i + '">' + linkOpts.map(function (o) { return '<option value="' + o.v + '"' + (s.link === o.v ? ' selected' : '') + '>' + o.t + '</option>'; }).join('') + '</select></td>' +
          '<td class="num">' + esc(LSL.statValue(s)) + '<small> ' + esc(s.unit) + '</small></td></tr>';
      }).join('') + '</table><button class="btn" type="submit" style="margin-top:14px">保存统计数据</button></form>';
      h += '<p class="mono" style="margin-top:12px;letter-spacing:.08em">「手动填写」时商户端显示手动数值；「系统自动统计」时按口径实时计算</p>';
    } else if (tabs.content === 'panel') {
      var p = db.panel;
      h += '<div class="a-grid c2"><div><form id="panelForm" class="card rv">' + '<div class="row">' + field('面板名称', 'title', p.title) + field('展示月份', 'month', p.month) + '</div><div class="field"><span>三项指标（名称 / 数值 / 单位）</span></div>' +
        p.metrics.map(function (m, k) { return '<div class="metric-edit"><input name="ml' + k + '" value="' + esc(m.label) + '" /><input name="mv' + k + '" value="' + esc(m.value) + '" /><input name="mu' + k + '" value="' + esc(m.unit) + '" /></div>'; }).join('') +
        '<p class="mono" style="letter-spacing:.06em;margin:4px 0 16px">面板只显示月份，不写商圈名称</p><button class="btn" type="submit">保存面板</button></form>';
      h += '<div class="a-sub">公告 <button class="btn sm" data-notice-edit="">＋ 新增公告</button></div>';
      h += p.notices.length ? '<table class="tbl rv">' + p.notices.map(function (n, k) {
        return '<tr><td class="mono">' + pad(k + 1) + '</td><td>' + esc(n.text) + '</td><td><div class="ops"><button class="btn sm green" data-notice-edit="' + n.id + '">编辑</button><button class="btn sm ghost" data-notice-del="' + n.id + '">删除</button></div></td></tr>';
      }).join('') + '</table>' : '<div class="card empty">暂无公告</div>';
      h += '</div><div><div class="mono" style="margin-bottom:10px">PREVIEW · 商户端效果</div><div class="panel-box" style="max-width:360px"><div class="mono"><i class="live"></i>WHAT\'S NEW · ' + esc(p.month) + '</div><h3><span class="marker">' + esc(p.title) + '</span></h3>' +
        '<div class="metrics">' + p.metrics.map(function (x) { return '<div><span class="num">' + esc(x.value) + '</span><div class="unit">' + esc(x.unit) + '</div><div class="lbl">' + esc(x.label) + '</div></div>'; }).join('') + '</div>' +
        '<ul class="notices">' + p.notices.map(function (n, k) { return '<li><span class="n">' + pad(k + 1) + '</span><span>' + esc(n.text) + '</span></li>'; }).join('') + '</ul></div></div></div>';
    } else {
      h += '<div class="a-grid c2"><form id="aboutForm" class="card rv">' + area('麓商联介绍', 'intro', ct.about.intro) + area('一句话使命', 'mission', ct.about.mission) + '<button class="btn" type="submit">保存</button></form><div>';
      h += '<div class="a-sub" style="margin-top:0">遇到问题找谁 <button class="btn sm" data-topic-edit="">＋ 新增事项</button></div>';
      h += '<table class="tbl rv"><tr><th>事项</th><th>对接人</th><th>操作</th></tr>' + ct.topics.map(function (t) {
        var s = LSL.find('staff', t.staffId);
        return '<tr><td><b>' + esc(t.name) + '</b></td><td>' + (s ? esc(s.name) + ' <small>' + esc(s.title) + '</small>' : '<small>未设置</small>') + '</td><td><div class="ops"><button class="btn sm green" data-topic-edit="' + t.id + '">编辑</button><button class="btn sm ghost" data-del="content.topics:' + t.id + '">删除</button></div></td></tr>';
      }).join('') + '</table><p class="mono" style="margin-top:12px;letter-spacing:.06em">商户端「关于我们」选择事项后显示对应工作人员和联系方式</p></div></div>';
    }
    return h;
  }

  /* ---------- 工作人员 ---------- */
  function vStaff() {
    var list = LSL.db().staff.slice().sort(function (a, b) { return a.order - b.order; });
    var h = head('工作人员', list.filter(function (s) { return s.visible; }).length + ' 位展示中');
    h += '<div class="a-sub">工作人员展示 <button class="btn sm" data-staff-edit="">＋ 新增工作人员</button></div>';
    h += '<table class="tbl rv"><tr><th>头像</th><th>姓名 / 职务</th><th>负责事项</th><th>联系方式</th><th>排序</th><th>状态</th><th>操作</th></tr>' + list.map(function (s, i) {
      return '<tr><td><span class="ava" style="--c:' + esc(s.color) + ';width:40px;height:40px;font-size:14px">' + (s.photo ? '<img src="' + s.photo + '" alt="" />' : esc(s.name.slice(-1))) + '</span></td><td><b>' + esc(s.name) + '</b><br><small>' + esc(s.title) + '</small></td><td><small>' + esc(s.duties) + '</small></td>' +
        '<td><small>电话 ' + esc(s.phone) + '<br>微信 ' + esc(s.wechat) + '</small></td>' +
        '<td><div class="ops"><button class="btn sm ghost" data-smove="' + s.id + ':-1"' + (i ? '' : ' disabled') + '>↑</button><button class="btn sm ghost" data-smove="' + s.id + ':1"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button></div></td>' +
        '<td><span class="status ' + (s.visible ? 'active' : 'off') + '">' + (s.visible ? '展示' : '隐藏') + '</span></td>' +
        '<td><div class="ops"><button class="btn sm green" data-staff-edit="' + s.id + '">编辑</button><button class="btn sm ghost" data-svis="' + s.id + '">' + (s.visible ? '隐藏' : '展示') + '</button><button class="btn sm ghost" data-del="staff:' + s.id + '">删除</button></div></td></tr>';
    }).join('') + '</table><p class="mono" style="margin-top:12px;letter-spacing:.06em">联系方式建议使用工作电话或企业微信，不公开个人手机号</p>';
    return h;
  }

  /* ---------- 合作留资 ---------- */
  function vLeads() {
    var all = LSL.db().leads, f = tabs.leads;
    var list = all.filter(function (l) { return f === 'all' || l.status === f; });
    var h = head('合作留资', all.filter(function (l) { return l.status === 'new'; }).length + ' 条未联系');
    h += tabBar('leads', [['all', '全部 ' + all.length]].concat(Object.keys(LSL.LEAD_STATUS).map(function (k) { return [k, LSL.LEAD_STATUS[k] + ' ' + all.filter(function (l) { return l.status === k; }).length]; })));
    h += '<div class="a-sub">留资列表 <button class="btn sm green" data-export>导出 Excel（CSV）</button></div>';
    h += list.length ? '<table class="tbl rv"><tr><th>提交时间</th><th>联系人</th><th>公司 / 品牌</th><th>合作类型</th><th>想聊什么</th><th>跟进状态</th><th>备注</th></tr>' + list.map(function (l) {
      return '<tr><td><small>' + fmtDate(l.createdAt) + '</small></td><td><b>' + esc(l.name) + '</b><br><small>' + esc(l.phone) + '</small></td><td>' + esc(l.company || '—') + '</td><td>' + esc(l.type) + '</td><td><small>' + esc(l.message || '—') + '</small></td>' +
        '<td><select data-lead-status="' + l.id + '">' + Object.keys(LSL.LEAD_STATUS).map(function (k) { return '<option value="' + k + '"' + (l.status === k ? ' selected' : '') + '>' + LSL.LEAD_STATUS[k] + '</option>'; }).join('') + '</select></td>' +
        '<td><small>' + esc(l.note || '—') + '</small><br><button class="btn sm ghost" data-lead-note="' + l.id + '">写备注</button></td></tr>';
    }).join('') + '</table>' : '<div class="card empty rv">暂无留资</div>';
    return h;
  }
  function exportLeads() {
    var rows = [['提交时间', '姓名', '手机号', '公司/品牌', '合作类型', '想聊什么', '跟进状态', '备注']].concat(LSL.db().leads.map(function (l) {
      return [fmtDate(l.createdAt), l.name, l.phone, l.company, l.type, l.message, LSL.LEAD_STATUS[l.status], l.note];
    }));
    var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'lsl-leads-' + fmtDate(Date.now()).slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    LSL.log('导出合作留资');
  }

  /* ---------- 数据统计 ---------- */
  function vStats() {
    var db = LSL.db();
    var issued = db.ledger.filter(function (l) { return l.type === 'earn'; }).reduce(function (s, l) { return s + l.points; }, 0);
    var spent = db.ledger.filter(function (l) { return l.type === 'spend'; }).reduce(function (s, l) { return s - l.points; }, 0);
    var reviewed = db.claims.filter(function (c) { return c.status !== 'pending'; });
    var rate = reviewed.length ? Math.round(reviewed.filter(function (c) { return c.status === 'approved' || c.status === 'revoked'; }).length / reviewed.length * 100) : 0;
    var bySec = {}; LSL.SECTIONS.forEach(function (s) { bySec[s.key] = db.merchants.reduce(function (t, m) { return t + (m.sections[s.key] || 0); }, 0); });
    var total = LSL.SECTIONS.reduce(function (t, s) { return t + bySec[s.key]; }, 0) || 1;
    var h = head('数据统计', '截至 ' + fmtDate(Date.now()));
    h += '<div class="a-grid c4 tilt">' + kpi('累计发放', fmtNum(issued), '+', 'POINTS ISSUED') + kpi('累计消耗', fmtNum(spent), '-', 'POINTS SPENT') + kpi('申报通过率', rate, '%', 'APPROVAL RATE') + kpi('入驻商户', db.merchants.length, '家', 'MERCHANTS') + '</div>';
    h += '<div class="a-grid c4 tilt" style="margin-top:20px">' + kpi('注册用户', db.users.length, '人', 'USERS') + kpi('课程报名', db.signups.filter(function (s) { return s.status !== 'cancelled'; }).length, '次', 'SIGNUPS') + kpi('合作留资', db.leads.length, '条', 'LEADS') + kpi('兑换订单', db.orders.length, '单', 'ORDERS') + '</div>';
    h += '<div class="a-sub">三大板块贡献分布</div><div class="card dist rv">' + LSL.SECTIONS.map(function (s) {
      return '<div class="dist-row"><b>' + s.name + '</b><div class="bar rv"><i class="' + s.key + '" style="--w:' + (bySec[s.key] / total * 100) + '%"></i></div><span>' + fxNum('num', bySec[s.key], 'dist-' + s.key + '-' + bySec[s.key], FX_SEC[s.key]) + '</span></div>';
    }).join('') + '</div>';
    var rank = db.merchants.slice().sort(function (a, b) { return LSL.annual(b) - LSL.annual(a); });
    h += '<div class="a-sub">商户贡献排行</div><table class="tbl rv"><tr><th>#</th><th>门店</th>' + LSL.SECTIONS.map(function (s) { return '<th>' + s.name + '</th>'; }).join('') + '<th>年度贡献</th><th>等级</th></tr>' + rank.map(function (m, k) {
      var a = LSL.annual(m);
      return '<tr><td class="num' + (k < 3 ? ' orange' : '') + '">' + pad(k + 1) + '</td><td><b>' + esc(m.name) + '</b></td>' + LSL.SECTIONS.map(function (s) { return '<td class="num">' + (m.sections[s.key] || 0) + '</td>'; }).join('') + '<td class="num">' + a + '</td><td>' + LSL.level(a).cur.name + '</td></tr>';
    }).join('') + '</table>';
    return h;
  }
  function kpi(lbl, v, unit, en) { return '<div class="card kpi rv"><div class="num">' + fxNum('fxw', v, 'kpi-' + lbl + '-' + v) + '<em>' + unit + '</em></div><div class="lbl">' + lbl + '</div><div class="mono">' + en + '</div></div>'; }

  /* ---------- 用户管理（仅超级管理员） ---------- */
  function vUsers() {
    var db = LSL.db(), me = LSL.admin();
    var h = head('用户管理', '仅超级管理员可见');
    h += '<div class="a-sub">后台用户 · 麓湖运营人员 <button class="btn sm" data-admin-add>＋ 新增用户</button></div>';
    h += '<table class="tbl rv"><tr><th>账号</th><th>姓名</th><th>手机号</th><th>角色</th><th>状态</th><th>最近登录</th><th>创建时间</th><th>操作</th></tr>' + db.admins.map(function (a) {
      var self = a.id === me.id;
      return '<tr class="' + (self ? 'me' : '') + '"><td class="mono" style="font-size:13px;color:var(--ink)">' + esc(a.username) + (self ? ' <small>（我）</small>' : '') + '</td><td><b>' + esc(a.name) + '</b></td><td>' + esc(a.phone || '—') + '</td>' +
        '<td><span class="chip ' + (a.role === 'super' ? 'donation' : 'plain') + '">' + LSL.ADMIN_ROLES[a.role] + '</span></td><td><span class="status ' + a.status + '">' + (a.status === 'active' ? '正常' : '已停用') + '</span>' + (a.mustChange ? '<br><small>待改初始密码</small>' : '') + '</td>' +
        '<td><small>' + fmtDate(a.lastLoginAt) + '</small></td><td><small>' + fmtDate(a.createdAt) + '</small></td>' +
        '<td><div class="ops"><button class="btn sm green" data-admin-edit="' + a.id + '">编辑</button><button class="btn sm" data-admin-reset="' + a.id + '">重置密码</button>' +
        (self ? '' : '<button class="btn sm ghost" data-admin-status="' + a.id + '">' + (a.status === 'active' ? '停用' : '启用') + '</button><button class="btn sm ghost" data-admin-del="' + a.id + '">删除</button>') + '</div></td></tr>';
    }).join('') + '</table>';
    h += '<p class="mono" style="margin-top:12px;letter-spacing:.06em">超级管理员：全部功能 + 用户管理 · 运营人员：除用户管理外的全部功能 · 至少保留一名超级管理员</p>';
    h += '<div class="a-sub">操作日志 <span class="mono">最近 50 条</span></div>';
    h += db.adminLogs.length ? '<table class="tbl rv"><tr><th>时间</th><th>操作人</th><th>操作</th></tr>' + db.adminLogs.slice(0, 50).map(function (l) {
      return '<tr><td><small>' + fmtDate(l.createdAt) + '</small></td><td>' + esc(l.adminName) + '</td><td>' + esc(l.action) + '</td></tr>';
    }).join('') + '</table>' : '<div class="card empty rv">暂无日志</div>';
    return h;
  }
  function editAdmin(id) {
    var a = id ? LSL.find('admins', id) : { username: '', name: '', phone: '', role: 'ops' };
    modal(id ? '编辑用户 · ' + a.username : '新增后台用户',
      (id ? '' : field('登录账号（字母 / 数字 / 下划线）', 'username', '', 'text', 'required pattern="[A-Za-z0-9_]{3,20}"')) +
      '<div class="row">' + field('姓名', 'name', a.name, 'text', 'required') + field('手机号', 'phone', a.phone) + '</div>' +
      select('角色', 'role', [{ v: 'ops', t: '运营人员（不能管理用户）' }, { v: 'super', t: '超级管理员（全部权限）' }], a.role) +
      (id ? '' : field('初始密码（留空自动生成）', 'password', '', 'text', 'minlength="6"') + '<p class="muted" style="font-size:12px;margin:-6px 0 12px">新用户首次登录后需修改密码。</p>'),
      function (fd) {
        var r;
        if (id) r = LSL.updateAdmin(id, { name: fd.get('name'), phone: fd.get('phone'), role: fd.get('role') });
        else r = LSL.addAdmin({ username: fd.get('username'), name: fd.get('name'), phone: fd.get('phone'), role: fd.get('role'), password: fd.get('password') });
        if (!r.ok) { toast(r.msg); return false; }
        toast('已保存');
        if (!id) setTimeout(function () { showPassword('用户已创建', r.admin.username, r.password); }, 50);
      });
  }

  var VIEWS = { review: vReview, merchants: vMerchants, tasks: vTasks, rewards: vRewards, orders: vOrders, academy: vAcademy, content: vContent, staff: vStaff, leads: vLeads, stats: vStats, users: vUsers };

  /* ---------- 编辑弹窗 ---------- */
  function editTask(id) {
    var t = id ? LSL.find('tasks', id) : { section: 'synergy', form: '线上参与', points: 20, pointsText: '', verify: '', desc: '', title: '', active: true };
    modal(id ? '编辑任务' : '新建任务',
      field('标题', 'title', t.title, 'text', 'required') + '<div class="row">' + select('所属板块', 'section', secOpts, t.section) + select('参与形式', 'form', LSL.FORMS, t.form) + '</div>' +
      '<div class="row">' + field('积分值（审核默认发放）', 'points', t.points, 'number', 'min="0" required') + field('积分说明（展示）', 'pointsText', t.pointsText, 'text', 'placeholder="如 20 分 / 份"') + '</div>' +
      field('核验方式', 'verify', t.verify) + area('说明', 'desc', t.desc) + select('状态', 'active', [{ v: '1', t: '开放' }, { v: '0', t: '停用' }], t.active ? '1' : '0') +
      '<label class="check"><input type="checkbox" name="needAmount" ' + (t.needAmount ? 'checked' : '') + ' /> 按捐赠金额计分（每 100 元 10 分）</label>',
      function (fd) {
        var pts = Number(fd.get('points')) || 0;
        LSL.upsert('tasks', { id: id || undefined, title: fd.get('title'), section: fd.get('section'), form: fd.get('form'), points: pts, pointsText: fd.get('pointsText') || pts + ' 分', verify: fd.get('verify'), desc: fd.get('desc'), active: fd.get('active') === '1', needAmount: !!fd.get('needAmount') });
        LSL.log((id ? '编辑' : '新建') + '积分任务：' + fd.get('title')); toast('已保存');
      });
  }
  function editReward(id) {
    var r = id ? LSL.find('rewards', id) : { name: '', desc: '', cost: 100, stock: 5, category: LSL.REWARD_CATS[0], active: true };
    modal(id ? '编辑权益' : '新增权益', field('名称', 'name', r.name, 'text', 'required') + field('说明', 'desc', r.desc) +
      '<div class="row">' + field('所需积分', 'cost', r.cost, 'number', 'min="1" required') + field('库存', 'stock', r.stock, 'number', 'min="0" required') + '</div>' +
      '<div class="row">' + select('分类', 'category', LSL.REWARD_CATS, r.category) + select('状态', 'active', [{ v: '1', t: '上架' }, { v: '0', t: '下架' }], r.active ? '1' : '0') + '</div>',
      function (fd) {
        LSL.upsert('rewards', { id: id || undefined, name: fd.get('name'), desc: fd.get('desc'), cost: Number(fd.get('cost')), stock: Number(fd.get('stock')), category: fd.get('category'), active: fd.get('active') === '1' });
        LSL.log((id ? '编辑' : '新增') + '权益：' + fd.get('name')); toast('已保存');
      });
  }
  function toLocalInput(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function editCourse(id) {
    var ac = LSL.db().academy;
    var c = id ? ac.courses.filter(function (x) { return x.id === id; })[0] : { title: '', mentorId: (ac.mentors[0] || {}).id, start: Date.now() + 7 * 86400000, place: '', seats: 30, points: 30, desc: '', active: true };
    modal(id ? '编辑课程' : '新建课程', field('课程名称', 'title', c.title, 'text', 'required') + select('导师', 'mentorId', ac.mentors.map(function (m) { return { v: m.id, t: m.name + ' · ' + m.title }; }), c.mentorId) +
      '<div class="row">' + field('上课时间', 'start', toLocalInput(c.start), 'datetime-local', 'required') + field('地点', 'place', c.place) + '</div>' +
      '<div class="row">' + field('名额', 'seats', c.seats, 'number', 'min="1"') + field('签到发分', 'points', c.points, 'number', 'min="0"') + '</div>' + area('课程介绍', 'desc', c.desc),
      function (fd) {
        LSL.upsert('academy.courses', { id: id || undefined, title: fd.get('title'), mentorId: fd.get('mentorId'), start: new Date(fd.get('start')).getTime(), place: fd.get('place'), seats: Number(fd.get('seats')) || 30, points: Number(fd.get('points')) || 0, desc: fd.get('desc'), active: id ? c.active : true });
        LSL.log((id ? '编辑' : '新建') + '课程：' + fd.get('title')); toast('已保存');
      });
  }
  function editMentor(id) {
    var x = id ? LSL.db().academy.mentors.filter(function (m) { return m.id === id; })[0] : { name: '', title: '', tags: '', intro: '', photo: '' };
    modal(id ? '编辑导师' : '新增导师', '<div class="row">' + field('姓名', 'name', x.name, 'text', 'required') + field('头衔', 'title', x.title) + '</div>' + field('擅长方向', 'tags', x.tags) + area('一句话介绍', 'intro', x.intro) + upload('照片', 'photo', x.photo),
      function (fd) { LSL.upsert('academy.mentors', { id: id || undefined, name: fd.get('name'), title: fd.get('title'), tags: fd.get('tags'), intro: fd.get('intro'), photo: fd.get('photo') }); toast('已保存'); });
  }
  function editPast(id) {
    var ac = LSL.db().academy;
    var x = id ? ac.past.filter(function (m) { return m.id === id; })[0] : { title: '', mentorId: (ac.mentors[0] || {}).id, date: Date.now(), summary: '', image: '' };
    modal(id ? '编辑往期回顾' : '新增往期回顾', field('主题', 'title', x.title, 'text', 'required') + '<div class="row">' + select('导师', 'mentorId', ac.mentors.map(function (m) { return { v: m.id, t: m.name }; }), x.mentorId) + field('日期', 'date', toLocalInput(x.date).slice(0, 10), 'date') + '</div>' + area('简介', 'summary', x.summary) + upload('现场照片', 'image', x.image, true),
      function (fd) { LSL.upsert('academy.past', { id: id || undefined, title: fd.get('title'), mentorId: fd.get('mentorId'), date: new Date(fd.get('date')).getTime(), summary: fd.get('summary'), image: fd.get('image') }); toast('已保存'); });
  }
  function editSlide(id) {
    var s = id ? LSL.db().content.carousel.filter(function (x) { return x.id === id; })[0] : { image: '', title: '', sub: '', link: 'tasks' };
    modal(id ? '编辑轮播图' : '新增轮播图', upload('图片（16:9）', 'image', s.image, true) + field('标题', 'title', s.title, 'text', 'required') + field('副标题', 'sub', s.sub) + select('点击跳转', 'link', linkOpts, s.link),
      function (fd) {
        if (!fd.get('image')) { toast('请上传图片'); return false; }
        LSL.upsert('content.carousel', { id: id || undefined, image: fd.get('image'), title: fd.get('title'), sub: fd.get('sub'), link: fd.get('link') });
        LSL.log((id ? '编辑' : '新增') + '轮播图：' + fd.get('title')); toast('已保存');
      });
  }
  function editStaff(id) {
    var list = LSL.db().staff;
    var s = id ? LSL.find('staff', id) : { name: '', title: '', duties: '', phone: '', wechat: '', color: '#1597a6', photo: '', visible: true };
    modal(id ? '编辑工作人员' : '新增工作人员', '<div class="row">' + field('姓名', 'name', s.name, 'text', 'required') + field('职务', 'title', s.title) + '</div>' + field('负责事项', 'duties', s.duties) +
      '<div class="row">' + field('工作电话', 'phone', s.phone) + field('企业微信 / 微信号', 'wechat', s.wechat) + '</div><div class="row">' + field('头像底色', 'color', s.color, 'color') + upload('照片（选填）', 'photo', s.photo) + '</div>',
      function (fd) {
        var maxOrder = list.reduce(function (m, x) { return Math.max(m, x.order || 0); }, 0);
        LSL.upsert('staff', { id: id || undefined, name: fd.get('name'), title: fd.get('title'), duties: fd.get('duties'), phone: fd.get('phone'), wechat: fd.get('wechat'), color: fd.get('color'), photo: fd.get('photo'), visible: id ? s.visible : true, order: id ? s.order : maxOrder + 1 });
        LSL.log((id ? '编辑' : '新增') + '工作人员：' + fd.get('name')); toast('已保存');
      });
  }
  function editTopic(id) {
    var ct = LSL.db().content, t = id ? ct.topics.filter(function (x) { return x.id === id; })[0] : { name: '', staffId: (LSL.db().staff[0] || {}).id };
    modal(id ? '编辑事项' : '新增事项', field('事项名称', 'name', t.name, 'text', 'required') + select('对接工作人员', 'staffId', LSL.db().staff.map(function (s) { return { v: s.id, t: s.name + ' · ' + s.title }; }), t.staffId),
      function (fd) { LSL.upsert('content.topics', { id: id || undefined, name: fd.get('name'), staffId: fd.get('staffId') }); toast('已保存'); });
  }
  function editNotice(id) {
    var p = LSL.db().panel, n = id ? p.notices.filter(function (x) { return x.id === id; })[0] : { text: '' };
    modal(id ? '编辑公告' : '新增公告', area('公告内容', 'text', n.text), function (fd) {
      if (id) n.text = fd.get('text'); else p.notices.unshift({ id: 'n' + Date.now(), text: fd.get('text'), date: Date.now() });
      LSL.save(); toast('已保存');
    });
  }
  function move(listPath, id, dir) {
    var db = LSL.db(), arr = listPath.split('.').reduce(function (o, k) { return o[k]; }, db);
    var i = arr.findIndex(function (x) { return x.id === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t; LSL.save();
  }

  /* ---------- 事件 ---------- */
  function onClick(e) {
    var t = e.target.closest('button, img[data-view]'); if (!t) return;
    var d = t.dataset, r, p;
    if (d.tab) { p = d.tab.split(':'); tabs[p[0]] = p[1]; return render({ quiet: true }); }
    if (d.view !== undefined && t.tagName === 'IMG') return modal('查看图片', '<img src="' + t.src + '" style="width:100%" alt="" />', null);
    if (d.appPass) { r = LSL.reviewApplication(d.appPass, true); toast('已通过，新增商户 ' + (r && r.name)); }
    else if (d.appReject) { LSL.reviewApplication(d.appReject, false); toast('已拒绝'); }
    else if (d.mbPass) { LSL.reviewMember(d.mbPass, true); toast('已通过绑定'); }
    else if (d.mbReject) { LSL.reviewMember(d.mbReject, false); toast('已拒绝'); }
    else if (d.pass) { r = LSL.approveClaim(d.pass, document.getElementById('pts_' + d.pass).value); toast(r.ok ? '已发放 ' + r.points + ' 分' : r.msg); }
    else if (d.reject) { var why = prompt('退回原因（商户可见）', '材料不完整，请补充凭证'); if (why === null) return; LSL.rejectClaim(d.reject, why); toast('已退回'); }
    else if (d.revoke) { if (!confirm('确认撤回该笔积分？（如捐赠退款）')) return; LSL.revokeClaim(d.revoke); toast('已撤回'); }
    else if (d.addMerchant !== undefined) {
      return modal('新增商户', field('门店名称', 'name', '', 'text', 'required') + '<div class="row">' + field('业态', 'category', '') + field('铺位号', 'unit', '') + '</div>' + field('联系人', 'contact', ''), function (fd) {
        var m = LSL.addMerchant({ name: fd.get('name'), category: fd.get('category'), unit: fd.get('unit'), contact: fd.get('contact') }); toast('已新增，绑定码 ' + m.bindCode);
      });
    }
    else if (d.members) return openMembers(d.members);
    else if (d.rebind) { if (!confirm('重置后旧绑定码失效，已绑定的成员不受影响。继续？')) return; toast('新绑定码：' + LSL.resetBindCode(d.rebind)); }
    else if (d.taskEdit !== undefined) return editTask(d.taskEdit);
    else if (d.rewardEdit !== undefined) return editReward(d.rewardEdit);
    else if (d.courseEdit !== undefined) return editCourse(d.courseEdit);
    else if (d.mentorEdit !== undefined) return editMentor(d.mentorEdit);
    else if (d.pastEdit !== undefined) return editPast(d.pastEdit);
    else if (d.slideEdit !== undefined) return editSlide(d.slideEdit);
    else if (d.staffEdit !== undefined) return editStaff(d.staffEdit);
    else if (d.topicEdit !== undefined) return editTopic(d.topicEdit);
    else if (d.noticeEdit !== undefined) return editNotice(d.noticeEdit);
    else if (d.signups) return openSignups(d.signups);
    else if (d.toggle) { p = d.toggle.split(':'); var arr = p[0].split('.').reduce(function (o, k) { return o[k]; }, LSL.db()); var it = arr.filter(function (x) { return x.id === p[1]; })[0]; LSL.upsert(p[0], { id: it.id, active: !it.active }); }
    else if (d.del) { if (!confirm('确认删除？')) return; p = d.del.split(':'); LSL.remove(p[0], p[1]); LSL.log('删除 ' + p[0]); toast('已删除'); }
    else if (d.move) { p = d.move.split(':'); move(p[0], p[1], Number(p[2])); }
    else if (d.smove) {
      p = d.smove.split(':'); var list = LSL.db().staff.slice().sort(function (a, b) { return a.order - b.order; });
      var i = list.findIndex(function (x) { return x.id === p[0]; }), j = i + Number(p[1]);
      if (list[j]) { var o = list[i].order; list[i].order = list[j].order; list[j].order = o; LSL.save(); }
    }
    else if (d.svis) { var s = LSL.find('staff', d.svis); LSL.upsert('staff', { id: s.id, visible: !s.visible }); }
    else if (d.order) { p = d.order.split(':'); LSL.setOrderStatus(p[0], p[1]); toast('已更新为' + p[1]); }
    else if (d.noticeDel) { var pn = LSL.db().panel; pn.notices = pn.notices.filter(function (n) { return n.id !== d.noticeDel; }); LSL.save(); toast('已删除'); }
    else if (d.export !== undefined) return exportLeads();
    else if (d.leadNote) { var ld = LSL.find('leads', d.leadNote); var note = prompt('跟进备注', ld.note || ''); if (note === null) return; ld.note = note; LSL.save(); }
    else if (d.adminAdd !== undefined) return editAdmin('');
    else if (d.adminEdit) return editAdmin(d.adminEdit);
    else if (d.adminReset) { var ad = LSL.find('admins', d.adminReset); if (!confirm('重置 ' + ad.username + ' 的密码？旧密码将立即失效。')) return; r = LSL.resetAdminPassword(d.adminReset); if (!r.ok) return toast(r.msg); render(); return showPassword('密码已重置', ad.username, r.password); }
    else if (d.adminStatus) { var as = LSL.find('admins', d.adminStatus); r = LSL.setAdminStatus(as.id, as.status === 'active' ? 'disabled' : 'active'); if (!r.ok) return toast(r.msg); toast('已' + (as.status === 'active' ? '启用' : '停用')); }
    else if (d.adminDel) { var dl = LSL.find('admins', d.adminDel); if (!confirm('确认删除后台用户 ' + dl.username + '？删除后无法恢复。')) return; r = LSL.deleteAdmin(dl.id); if (!r.ok) return toast(r.msg); toast('已删除'); }
    else return;
    render({ quiet: true });
  }
  function onSubmit(e) {
    var f = e.target, fd = new FormData(f);
    e.preventDefault();
    if (f.id === 'panelForm') {
      var p = LSL.db().panel; p.title = fd.get('title'); p.month = fd.get('month');
      p.metrics = [0, 1, 2].map(function (k) { return { label: fd.get('ml' + k), value: fd.get('mv' + k), unit: fd.get('mu' + k) }; });
      LSL.save(); LSL.log('更新商圈面板'); toast('面板已更新');
    } else if (f.id === 'statsForm') {
      var ct = LSL.db().content;
      ct.stats.forEach(function (s, i) { s.label = fd.get('label' + i); s.mode = fd.get('mode' + i); s.metric = fd.get('metric' + i); s.value = fd.get('value' + i); s.unit = fd.get('unit' + i); s.link = fd.get('link' + i); });
      LSL.save(); LSL.log('更新首页统计数据'); toast('统计数据已保存，商户端实时更新');
    } else if (f.id === 'aboutForm') {
      var ab = LSL.db().content.about; ab.intro = fd.get('intro'); ab.mission = fd.get('mission'); LSL.save(); LSL.log('更新关于我们'); toast('已保存');
    } else return;
    render({ quiet: true });
  }
  function onChange(e) {
    var s = e.target;
    if (s.dataset && s.dataset.leadStatus) { var ld = LSL.find('leads', s.dataset.leadStatus); ld.status = s.value; LSL.save(); LSL.log('留资跟进：' + ld.name + ' → ' + LSL.LEAD_STATUS[s.value]); toast('已更新'); render({ quiet: true }); }
  }

  LSL.onChange(function (src) { if (src === 'remote' && $main && !document.querySelector('.a-modal') && LSL.admin()) render({ quiet: true }); });
  window.addEventListener('hashchange', function () { cur = location.hash.slice(1); if ($main) render(); });

  boot();
})();
