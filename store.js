/* 麓商联商户积分系统 · 共用数据层
 * 商户端（index.html）与运营后台（admin.html）共用。
 * 数据保存在浏览器 localStorage，键名 lsl-points-db-v5。
 */
(function (global) {
  'use strict';

  var DB_KEY = 'lsl-points-db-v5';
  var CUR_KEY = 'lsl-current-merchant';
  var DAY = 86400000;

  /* ---------- 三大板块与积分规则（第一年试行方案） ---------- */
  var SECTIONS = [
    {
      key: 'donation',
      name: '公益捐赠值',
      en: 'GIVING',
      color: 'var(--sec-donation)',
      what: '通过麓湖社区发展基金会等指定公益渠道完成的捐赠',
      rules: [
        '每捐赠 100 元计 10 分',
        '最低统计单位 100 元，不足部分年度内累计',
        '物资 / 服务捐赠按确认价值每 100 元计 10 分',
        '同一笔捐赠只计一个账户，退款同步撤回'
      ],
      verify: '基金会到账记录、捐赠证书或公益票据'
    },
    {
      key: 'synergy',
      name: '商圈共生值',
      en: 'TOGETHER',
      color: 'var(--sec-synergy)',
      what: '参与调研、商学院、商圈共创及联合活动',
      rules: [
        '有效问卷每份 20 分，重点调研 30–100 分',
        '商学院到场 30 分，完成系列课程 +50 分',
        '担任分享嘉宾 100 分',
        '报名不计分，完成后发放'
      ],
      verify: '系统记录、现场签到及项目确认'
    },
    {
      key: 'community',
      name: '社区参与值',
      en: 'NEIGHBOR',
      color: 'var(--sec-community)',
      what: '参加社区活动、社区议事、志愿服务和社区共建项目',
      rules: [
        '按活动要求完成计分',
        '共建项目（收捐点、物资支持）按负责人确认计分',
        '仅作参与记录，不作考核'
      ],
      verify: '活动签到、现场照片及负责人确认'
    }
  ];

  var FORMS = ['线上参与', '线下市集', '公益捐赠', '商学院课程', '社区活动'];

  var LEVELS = [
    { min: 0, name: '新芽', en: 'SEED' },
    { min: 200, name: '同行', en: 'RUNNER' },
    { min: 500, name: '共建', en: 'BUILDER' },
    { min: 1000, name: '共生', en: 'PARTNER' },
    { min: 2000, name: '灯塔', en: 'BEACON' }
  ];

  var REWARD_CATS = ['曝光推广', '空间场地', '经营服务', '活动福利'];

  /* ---------- 工具 ---------- */
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function now() { return Date.now(); }
  function monthLabel(ts) { var d = new Date(ts); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'; }
  function sameMonth(a, b) { var x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth(); }
  function sameYear(a, b) { return new Date(a).getFullYear() === new Date(b).getFullYear(); }
  function sectionOf(key) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].key === key) return SECTIONS[i]; return null; }

  /* ---------- 初始演示数据 ---------- */
  function seed() {
    var t = now();
    var ago = function (d, h) { return t - d * DAY - (h || 0) * 3600000; };

    var merchants = [
      { id: 'm1', name: '湖畔手冲咖啡', category: '餐饮 · 咖啡', contact: '林晓', phone: '138****2101', code: 'LH001' },
      { id: 'm2', name: '麓野烘焙', category: '餐饮 · 烘焙', contact: '周野', phone: '139****3302', code: 'LH002' },
      { id: 'm3', name: '跃动瑜伽馆', category: '运动 · 健身', contact: '许妍', phone: '137****4403', code: 'LH003' },
      { id: 'm4', name: '水岸花事', category: '零售 · 花艺', contact: '陈默', phone: '136****5504', code: 'LH004' },
      { id: 'm5', name: '小麓书房', category: '文化 · 书店', contact: '何川', phone: '135****6605', code: 'LH005' },
      { id: 'm6', name: '湖光骑行社', category: '运动 · 户外', contact: '吴越', phone: '133****7706', code: 'LH006' }
    ].map(function (m, i) {
      m.status = 'active';
      m.points = 0;
      m.sections = { donation: 0, synergy: 0, community: 0 };
      m.donationCarry = 0;
      m.createdAt = ago(300 - i * 20);
      return m;
    });

    var tasks = [
      { id: 't1', title: '麓湖社区发展基金会 · 冬日温暖捐', section: 'donation', form: '公益捐赠', points: 10, pointsText: '每 100 元 10 分', verify: '基金会到账记录 / 捐赠证书', desc: '通过基金会指定渠道捐赠，凭到账截图或证书申报，物资捐赠按确认价值折算。', needAmount: true },
      { id: 't2', title: '社区旧衣物资收捐点', section: 'community', form: '社区活动', points: 40, pointsText: '40 分 / 月', verify: '负责人确认 + 现场照片', desc: '门店设置收捐点满一个月，由社区负责人确认后计分。' },
      { id: 't3', title: '商圈消费体验问卷', section: 'synergy', form: '线上参与', points: 20, pointsText: '20 分 / 份', verify: '系统记录', desc: '填写本季度商圈消费体验问卷，有效问卷每份 20 分。' },
      { id: 't4', title: '重点调研 · 夜间经济访谈', section: 'synergy', form: '线上参与', points: 60, pointsText: '30–100 分', verify: '项目确认', desc: '参与 45 分钟深度访谈，按调研深度确认 30–100 分。' },
      { id: 't5', title: '麓商学院 · 小店私域运营课', section: 'synergy', form: '商学院课程', points: 30, pointsText: '到场 30 分', verify: '现场签到', desc: '到场签到 30 分；完成本季系列课程另 +50 分。报名不计分。' },
      { id: 't6', title: '周末湖畔市集 · 联合摆摊', section: 'synergy', form: '线下市集', points: 50, pointsText: '50 分 / 场', verify: '现场签到 + 项目确认', desc: '周六湖畔草坪联合市集，完成整场出摊后计分。' },
      { id: 't7', title: '社区议事会 · 街区公共空间', section: 'community', form: '社区活动', points: 20, pointsText: '20 分 / 次', verify: '活动签到', desc: '参与月度社区议事，讨论街区外摆与公共空间。' },
      { id: 't8', title: '湖岸净滩志愿行动', section: 'community', form: '社区活动', points: 30, pointsText: '30 分 / 次', verify: '活动签到 + 现场照片', desc: '周日早 8 点集合，完成 2 小时净滩志愿服务。' },
      { id: 't9', title: '商学院分享嘉宾招募', section: 'synergy', form: '商学院课程', points: 100, pointsText: '100 分', verify: '项目确认', desc: '分享你的经营经验，担任一期商学院分享嘉宾。' }
    ].map(function (x) { x.active = true; x.createdAt = ago(9); return x; });

    var rewards = [
      { id: 'r1', name: '商圈公众号推文露出', desc: '麓商联公众号月度推文中一个商户位', cost: 300, stock: 4, category: '曝光推广' },
      { id: 'r2', name: '湖畔草坪活动场地 · 半天', desc: '用于品牌活动 / 快闪，需提前 7 天预约', cost: 500, stock: 2, category: '空间场地' },
      { id: 'r3', name: '导视屏轮播广告 · 7 天', desc: '商圈入口导视屏每日轮播', cost: 200, stock: 6, category: '曝光推广' },
      { id: 'r4', name: '商学院进阶课席位', desc: '季度进阶课程 1 个席位', cost: 150, stock: 10, category: '经营服务' },
      { id: 'r5', name: '门店摄影服务 1 次', desc: '专业摄影师上门拍摄 20 张精修', cost: 400, stock: 3, category: '经营服务' },
      { id: 'r6', name: '市集摊位优先权', desc: '下月湖畔市集优先选位', cost: 80, stock: 12, category: '活动福利' }
    ].map(function (x) { x.active = true; x.createdAt = ago(9); return x; });

    var db = {
      version: 5,
      merchants: merchants,
      tasks: tasks,
      rewards: rewards,
      claims: [],
      ledger: [],
      orders: [],
      applications: [
        { id: 'a1', name: '湖畔精酿小馆', category: '餐饮 · 酒馆', contact: '赵一舟', phone: '131****8807', status: 'pending', createdAt: ago(1, 3) },
        { id: 'a2', name: '麓湖亲子美学', category: '教育 · 美育', contact: '孙苗', phone: '132****9908', status: 'pending', createdAt: ago(0, 5) }
      ],
      panel: {
        title: '圈里新鲜事',
        month: monthLabel(t),
        metrics: [
          { label: '本月新入驻', value: '6', unit: '家' },
          { label: '公益捐赠累计', value: '12,800', unit: '元' },
          { label: '社区活动', value: '9', unit: '场' }
        ],
        notices: [
          { id: 'n1', text: '本周六湖畔市集开放报名，参与商户可获商圈共生值 50 分。', date: ago(1) },
          { id: 'n2', text: '冬日温暖捐已开启，捐赠凭证请在「参与」页提交申报。', date: ago(3) },
          { id: 'n3', text: '商学院 11 月主题：小店私域与会员运营。', date: ago(6) }
        ]
      }
    };

    // 历史流水：通过 grant 计入，保证分项与可用积分一致
    var hist = [
      ['m1', 'donation', 80, '基金会捐赠 800 元', 120], ['m1', 'synergy', 30, '商学院 · 门店陈列课到场', 60], ['m1', 'synergy', 50, '完成系列课程', 40],
      ['m1', 'community', 40, '社区收捐点 · 10 月', 20], ['m1', 'synergy', 20, '商圈问卷', 4], ['m1', 'community', 30, '湖岸净滩志愿行动', 2], ['m1', 'donation', 100, '基金会捐赠 1000 元', 6],
      ['m2', 'donation', 50, '基金会捐赠 500 元', 90], ['m2', 'synergy', 50, '湖畔市集联合摆摊', 30], ['m2', 'synergy', 50, '湖畔市集联合摆摊', 6], ['m2', 'community', 20, '社区议事会', 3],
      ['m3', 'donation', 200, '基金会捐赠 2000 元', 150], ['m3', 'synergy', 100, '商学院分享嘉宾', 80], ['m3', 'synergy', 80, '重点调研 · 运动社群', 50],
      ['m3', 'community', 30, '湖岸净滩志愿行动', 35], ['m3', 'community', 40, '社区收捐点 · 10 月', 18], ['m3', 'synergy', 30, '商学院到场', 5], ['m3', 'community', 30, '社区跑团领跑', 1],
      ['m4', 'synergy', 20, '商圈问卷', 70], ['m4', 'community', 20, '社区议事会', 8],
      ['m5', 'donation', 30, '图书捐赠（确认价值 300 元）', 100], ['m5', 'synergy', 30, '商学院到场', 45], ['m5', 'community', 20, '社区读书会', 7],
      ['m6', 'donation', 60, '基金会捐赠 600 元', 200], ['m6', 'synergy', 60, '重点调研 · 骑行路线', 110], ['m6', 'community', 30, '湖岸净滩志愿行动', 35], ['m6', 'synergy', 50, '湖畔市集联合摆摊', 2]
    ];
    hist.forEach(function (h) {
      grant(db, h[0], h[1], h[2], h[3], ago(h[4], 2));
    });

    // 历史兑换
    [['m1', 'r6', 25, '已完成'], ['m3', 'r1', 12, '处理中'], ['m6', 'r6', 1, '待处理']].forEach(function (o) {
      redeemInto(db, o[0], o[1], ago(o[2], 1), o[3]);
    });

    // 待审核申报
    db.claims.push(
      { id: 'c1', merchantId: 'm2', taskId: 't1', section: 'donation', title: '麓湖社区发展基金会 · 冬日温暖捐', amount: 650, points: 60, note: '基金会小程序转账，附到账截图。', image: '', status: 'pending', createdAt: ago(0, 4) },
      { id: 'c2', merchantId: 'm4', taskId: 't6', section: 'synergy', title: '周末湖畔市集 · 联合摆摊', points: 50, note: '11 月第一周市集全天出摊。', image: '', status: 'pending', createdAt: ago(1, 2) },
      { id: 'c3', merchantId: 'm1', taskId: 't3', section: 'synergy', title: '商圈消费体验问卷', points: 20, note: '已在线填写。', image: '', status: 'pending', createdAt: ago(0, 1) }
    );
    return db;
  }

  /* ---------- 核心规则 ---------- */
  // 发放积分：同时更新可用积分、板块分项（年度贡献 = 分项之和），并写入流水
  function grant(db, merchantId, section, pts, title, ts, refId) {
    var m = findIn(db.merchants, merchantId);
    if (!m || !pts) return null;
    m.points += pts;
    m.sections[section] = (m.sections[section] || 0) + pts;
    var row = { id: uid('l'), merchantId: merchantId, type: 'earn', section: section, points: pts, title: title, createdAt: ts || now(), refId: refId || '' };
    db.ledger.push(row);
    return row;
  }

  function redeemInto(db, merchantId, rewardId, ts, status) {
    var m = findIn(db.merchants, merchantId);
    var r = findIn(db.rewards, rewardId);
    if (!m || !r) return { ok: false, msg: '数据不存在' };
    if (!r.active) return { ok: false, msg: '该权益已下架' };
    if (r.stock <= 0) return { ok: false, msg: '库存不足' };
    if (m.points < r.cost) return { ok: false, msg: '可用积分不足，还差 ' + (r.cost - m.points) + ' 分' };
    m.points -= r.cost; // 只扣可用积分，年度贡献值不扣减
    r.stock -= 1;
    var order = { id: uid('o'), no: 'DH' + String(ts || now()).slice(-8), merchantId: merchantId, rewardId: rewardId, name: r.name, cost: r.cost, status: status || '待处理', createdAt: ts || now() };
    db.orders.push(order);
    db.ledger.push({ id: uid('l'), merchantId: merchantId, type: 'spend', section: '', points: -r.cost, title: '兑换 · ' + r.name, createdAt: ts || now(), refId: order.id });
    return { ok: true, order: order };
  }

  function findIn(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ---------- 存储 ---------- */
  var cache = null;
  function load() {
    if (cache) return cache;
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (raw) { cache = JSON.parse(raw); return cache; }
    } catch (e) { /* ignore */ }
    cache = seed();
    save();
    return cache;
  }
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(cache)); } catch (e) { console.warn('保存失败', e); }
    listeners.forEach(function (fn) { fn('local'); });
  }
  var listeners = [];
  global.addEventListener && global.addEventListener('storage', function (e) {
    if (e.key === DB_KEY) { cache = null; listeners.forEach(function (fn) { fn('remote'); }); }
  });

  function level(total) {
    var cur = LEVELS[0], next = null;
    for (var i = 0; i < LEVELS.length; i++) {
      if (total >= LEVELS[i].min) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; }
    }
    return { cur: cur, next: next, idx: LEVELS.indexOf(cur) };
  }

  /* ---------- 对外 API ---------- */
  var LSL = {
    SECTIONS: SECTIONS,
    FORMS: FORMS,
    LEVELS: LEVELS,
    REWARD_CATS: REWARD_CATS,
    section: sectionOf,
    level: level,
    monthLabel: monthLabel,
    sameMonth: sameMonth,
    db: load,
    save: save,
    onChange: function (fn) { listeners.push(fn); },
    reset: function () { cache = seed(); save(); return '已恢复初始演示数据'; },
    find: function (list, id) { return findIn(load()[list], id); },

    annual: function (m) { return (m.sections.donation || 0) + (m.sections.synergy || 0) + (m.sections.community || 0); },
    monthEarned: function (mid) {
      var t = now();
      return load().ledger.filter(function (l) { return l.merchantId === mid && l.type === 'earn' && sameMonth(l.createdAt, t); })
        .reduce(function (s, l) { return s + l.points; }, 0);
    },
    ledgerOf: function (mid) {
      return load().ledger.filter(function (l) { return l.merchantId === mid; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    },

    /* 当前绑定门店（商户端） */
    currentId: function () { return localStorage.getItem(CUR_KEY) || ''; },
    setCurrent: function (id) { if (id) localStorage.setItem(CUR_KEY, id); else localStorage.removeItem(CUR_KEY); },

    /* 商户端动作 */
    submitClaim: function (data) {
      var db = load();
      var task = findIn(db.tasks, data.taskId);
      if (!task) return { ok: false, msg: '参与内容不存在' };
      var pts = task.points;
      if (task.needAmount) {
        var amt = Math.max(0, Math.floor(Number(data.amount) || 0));
        if (!amt) return { ok: false, msg: '请填写捐赠金额' };
        pts = Math.floor(amt / 100) * 10; // 预估分值，审核时结合年度累计余额确认
      }
      var c = { id: uid('c'), merchantId: data.merchantId, taskId: task.id, section: task.section, title: task.title, amount: data.amount ? Number(data.amount) : undefined, points: pts, note: data.note || '', image: data.image || '', status: 'pending', createdAt: now() };
      db.claims.push(c);
      save();
      return { ok: true, claim: c };
    },
    redeem: function (mid, rid) { var r = redeemInto(load(), mid, rid); if (r.ok) save(); return r; },
    apply: function (data) {
      var db = load();
      var a = { id: uid('a'), name: data.name, category: data.category, contact: data.contact, phone: data.phone, status: 'pending', createdAt: now() };
      db.applications.push(a); save(); return a;
    },

    /* 后台动作 */
    approveClaim: function (cid, pts) {
      var db = load(); var c = findIn(db.claims, cid);
      if (!c || c.status !== 'pending') return { ok: false, msg: '状态已变化' };
      var m = findIn(db.merchants, c.merchantId);
      pts = Math.max(0, Math.round(Number(pts)));
      if (c.section === 'donation' && c.amount && String(pts) === String(c.points)) {
        // 按年度累计规则计算：上次不足 100 元的余额并入本次
        var total = (m.donationCarry || 0) + c.amount;
        pts = Math.floor(total / 100) * 10;
        m.donationCarry = total % 100;
      }
      c.status = 'approved'; c.points = pts; c.reviewedAt = now();
      if (pts > 0) grant(db, c.merchantId, c.section, pts, c.title, now(), c.id);
      save(); return { ok: true, points: pts };
    },
    rejectClaim: function (cid, reason) {
      var db = load(); var c = findIn(db.claims, cid);
      if (!c || c.status !== 'pending') return { ok: false };
      c.status = 'rejected'; c.reason = reason || ''; c.reviewedAt = now(); save(); return { ok: true };
    },
    revokeClaim: function (cid) {
      // 退款 / 撤销：同步撤回已发放积分
      var db = load(); var c = findIn(db.claims, cid);
      if (!c || c.status !== 'approved') return { ok: false };
      var m = findIn(db.merchants, c.merchantId);
      m.points -= c.points;
      m.sections[c.section] = Math.max(0, (m.sections[c.section] || 0) - c.points);
      db.ledger.push({ id: uid('l'), merchantId: m.id, type: 'revoke', section: c.section, points: -c.points, title: '撤回 · ' + c.title, createdAt: now(), refId: c.id });
      c.status = 'revoked'; save(); return { ok: true };
    },
    reviewApplication: function (aid, pass) {
      var db = load(); var a = findIn(db.applications, aid);
      if (!a || a.status !== 'pending') return null;
      a.status = pass ? 'approved' : 'rejected'; a.reviewedAt = now();
      var m = null;
      if (pass) {
        m = { id: uid('m'), name: a.name, category: a.category, contact: a.contact, phone: a.phone, code: 'LH' + String(100 + db.merchants.length + 1).slice(-3), status: 'active', points: 0, sections: { donation: 0, synergy: 0, community: 0 }, donationCarry: 0, createdAt: now() };
        db.merchants.push(m); a.merchantId = m.id;
      }
      save(); return m;
    },
    addMerchant: function (data) {
      var db = load();
      var m = { id: uid('m'), name: data.name, category: data.category, contact: data.contact, phone: data.phone, code: 'LH' + String(100 + db.merchants.length + 1).slice(-3), status: 'active', points: 0, sections: { donation: 0, synergy: 0, community: 0 }, donationCarry: 0, createdAt: now() };
      db.merchants.push(m); save(); return m;
    },
    upsert: function (list, item) {
      var db = load(); var arr = db[list];
      if (item.id) { var o = findIn(arr, item.id); if (o) { for (var k in item) o[k] = item[k]; save(); return o; } }
      item.id = uid(list.charAt(0)); item.createdAt = now(); arr.push(item); save(); return item;
    },
    remove: function (list, id) { var db = load(); db[list] = db[list].filter(function (x) { return x.id !== id; }); save(); },
    setOrderStatus: function (oid, st) { var o = findIn(load().orders, oid); if (o) { o.status = st; o.updatedAt = now(); save(); } }
  };

  global.LSL = LSL;
})(window);
