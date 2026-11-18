/* 麓商联商户积分系统 · 共用数据层（v6）
 * 商户端（index.html）与运营后台（admin.html）共用。
 * 演示版数据保存在浏览器 localStorage，键名 lsl-points-db-v6。
 * 正式版这些逻辑全部迁到服务端：验证码、会话、密码校验都必须在服务器上完成。
 */
(function (global) {
  'use strict';

  var DB_KEY = 'lsl-points-db-v6';
  var SESSION_KEY = 'lsl-session';          // 商户登录凭证
  var CUR_KEY = 'lsl-current-merchant';     // 当前选中的门店（一个手机号可绑定多家店）
  var ADMIN_KEY = 'lsl-admin-session';      // 后台登录凭证
  var SMS_KEY = 'lsl-sms';                  // 验证码发送记录（演示用）
  var DAY = 86400000;
  var SESSION_DAYS = 30;                    // 30 天免登录，每次打开自动续期
  var ADMIN_HOURS = 12;
  var DEMO_CODE = '1234';                   // 演示环境固定验证码

  /* ---------- 三大板块与积分规则（第一年试行方案） ---------- */
  var SECTIONS = [
    { key: 'donation', name: '公益捐赠值', en: 'GIVING', color: 'var(--sec-donation)',
      what: '通过麓湖社区发展基金会等指定公益渠道完成的捐赠',
      rules: ['每捐赠 100 元计 10 分', '最低统计单位 100 元，不足部分年度内累计', '物资 / 服务捐赠按确认价值每 100 元计 10 分', '同一笔捐赠只计一个账户，退款同步撤回'],
      verify: '基金会到账记录、捐赠证书或公益票据' },
    { key: 'synergy', name: '商圈共生值', en: 'TOGETHER', color: 'var(--sec-synergy)',
      what: '参与调研、商学院、商圈共创及联合活动',
      rules: ['有效问卷每份 20 分，重点调研 30–100 分', '商学院到场 30 分，完成系列课程 +50 分', '担任分享嘉宾 100 分', '报名不计分，完成后发放'],
      verify: '系统记录、现场签到及项目确认' },
    { key: 'community', name: '社区参与值', en: 'NEIGHBOR', color: 'var(--sec-community)',
      what: '参加社区活动、社区议事、志愿服务和社区共建项目',
      rules: ['按活动要求完成计分', '共建项目（收捐点、物资支持）按负责人确认计分', '仅作参与记录，不作考核'],
      verify: '活动签到、现场照片及负责人确认' }
  ];
  var FORMS = ['线上参与', '线下市集', '公益捐赠', '商学院课程', '社区活动'];
  var LEVELS = [
    { min: 0, name: '新芽', en: 'SEED' }, { min: 200, name: '同行', en: 'RUNNER' }, { min: 500, name: '共建', en: 'BUILDER' },
    { min: 1000, name: '共生', en: 'PARTNER' }, { min: 2000, name: '灯塔', en: 'BEACON' }
  ];
  var REWARD_CATS = ['曝光推广', '空间场地', '经营服务', '活动福利'];
  var LEAD_TYPES = ['品牌入驻', '活动合作', '赞助支持', '场地合作', '其他'];
  var LEAD_STATUS = { 'new': '未联系', contacted: '已联系', deal: '已合作', invalid: '无效' };
  var STAT_METRICS = { merchants: '入驻商户数（自动）', activities: '本月开放活动数（自动）', courses: '本月商学院课程数（自动）', points: '累计发放积分（自动）', donation: '公益捐赠累计金额（自动）' };
  var LINKS = { tasks: '参与页', academy: '商学院', mall: '兑换页', about: '关于我们', data: '我的数据', '': '不跳转' };
  var ADMIN_ROLES = { 'super': '超级管理员', ops: '运营人员' };

  /* ---------- 工具 ---------- */
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function now() { return Date.now(); }
  function monthLabel(ts) { var d = new Date(ts); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'; }
  function sameMonth(a, b) { var x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth(); }
  function sectionOf(key) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].key === key) return SECTIONS[i]; return null; }
  function findIn(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function randStr(n, chars) { chars = chars || 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; var s = ''; for (var i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length)); return s; }

  /* SHA-256（演示用的同步实现；HTTP 直连 IP 时浏览器不提供 crypto.subtle）
   * 正式版密码在服务端用 bcrypt / argon2 存储，前端不做任何校验。 */
  function sha256(str) {
    var s = unescape(encodeURIComponent(str));
    var K = [], H = [], i, j, isPrime = function (n) { for (var f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; };
    for (var c = 2, n = 0; n < 64; c++) if (isPrime(c)) { if (n < 8) H[n] = (Math.pow(c, 1 / 2) * 4294967296) | 0; K[n++] = (Math.pow(c, 1 / 3) * 4294967296) | 0; }
    var words = [], bitLen = s.length * 8;
    s += '\x80'; while (s.length % 64 - 56) s += '\x00';
    for (i = 0; i < s.length; i++) words[i >> 2] |= s.charCodeAt(i) << ((3 - i) % 4) * 8;
    words[words.length] = (bitLen / 4294967296) | 0; words[words.length] = bitLen | 0;
    var rotr = function (v, a) { return (v >>> a) | (v << (32 - a)); };
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = H.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = H[0], e = H[4];
        var t1 = H[7] + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & H[5]) ^ (~e & H[6])) + K[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H = [(t1 + t2) | 0].concat(H); H[4] = (H[4] + t1) | 0; H.length = 8;
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
    }
    var out = ''; for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (H[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  }
  function hashPw(pw, salt) { return sha256(salt + ':' + pw); }

  /* 演示配图：用 SVG 生成，避免依赖外部图片 */
  function scene(kind, title) {
    var svg = {
      lake: '<rect width="800" height="450" fill="#9fc6d6"/><circle cx="620" cy="110" r="54" fill="#f6d27a"/><path d="M0 250 L140 160 L260 230 L380 140 L520 240 L640 170 L800 250 V450 H0Z" fill="#6f8f6a"/><path d="M0 300 H800 V450 H0Z" fill="#5a93ad"/><path d="M60 330 H300 M420 360 H700 M160 400 H520" stroke="#cfe6ee" stroke-width="6" stroke-linecap="round"/>',
      market: '<rect width="800" height="450" fill="#f2e6cf"/><path d="M60 170 L180 110 L300 170Z M300 170 L420 110 L540 170Z M540 170 L660 110 L780 170Z" fill="#e2683c"/><path d="M60 170 H780 V200 H60Z" fill="#c74f2a"/><rect x="80" y="200" width="200" height="140" fill="#fff7e6"/><rect x="320" y="200" width="200" height="140" fill="#fff7e6"/><rect x="560" y="200" width="200" height="140" fill="#fff7e6"/><path d="M0 340 H800 V450 H0Z" fill="#8fb07a"/><circle cx="180" cy="270" r="26" fill="#f2b84b"/><circle cx="420" cy="270" r="26" fill="#7fb8c9"/><circle cx="660" cy="270" r="26" fill="#d9776a"/>',
      class: '<rect width="800" height="450" fill="#e8e3f3"/><rect x="120" y="70" width="560" height="220" rx="10" fill="#3d3a5c"/><path d="M170 130 H460 M170 170 H560 M170 210 H400" stroke="#f3efe2" stroke-width="10" stroke-linecap="round"/><circle cx="220" cy="360" r="34" fill="#f2b84b"/><circle cx="330" cy="370" r="34" fill="#7fb8c9"/><circle cx="440" cy="360" r="34" fill="#d9776a"/><circle cx="550" cy="370" r="34" fill="#8fb07a"/><path d="M0 410 H800 V450 H0Z" fill="#c9c1de"/>',
      run: '<rect width="800" height="450" fill="#dfeccb"/><path d="M0 300 C200 240 400 360 800 280 V450 H0Z" fill="#9cc56b"/><path d="M0 340 C240 300 460 400 800 330" stroke="#f7f1e1" stroke-width="22" fill="none"/><circle cx="130" cy="120" r="46" fill="#f6d27a"/><g fill="#3a5a40"><circle cx="560" cy="170" r="60"/><circle cx="640" cy="190" r="50"/><rect x="590" y="210" width="16" height="80"/></g>'
    }[kind] || '';
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">' + svg + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }

  /* ---------- 初始演示数据 ---------- */
  function seed() {
    var t = now();
    var ago = function (d, h) { return t - d * DAY - (h || 0) * 3600000; };
    var later = function (d, h) { var x = new Date(t + d * DAY); x.setHours(h || 14, 0, 0, 0); return x.getTime(); };

    var merchants = [
      ['m1', '湖畔手冲咖啡', '餐饮 · 咖啡', '林晓', 'A-102'], ['m2', '麓野烘焙', '餐饮 · 烘焙', '周野', 'A-108'],
      ['m3', '跃动瑜伽馆', '运动 · 健身', '许妍', 'B-201'], ['m4', '水岸花事', '零售 · 花艺', '陈默', 'A-115'],
      ['m5', '小麓书房', '文化 · 书店', '何川', 'C-003'], ['m6', '湖光骑行社', '运动 · 户外', '吴越', 'B-012']
    ].map(function (x, i) {
      return { id: x[0], name: x[1], category: x[2], contact: x[3], unit: x[4], code: 'LH00' + (i + 1), bindCode: String(2601 + i),
        status: 'active', points: 0, sections: { donation: 0, synergy: 0, community: 0 }, donationCarry: 0, createdAt: ago(300 - i * 20) };
    });

    // 商户用户（手机号即账号）与门店成员关系
    var users = [], members = [];
    function addUser(phone, name, mid, role, status, d) {
      var u = { id: 'u' + (users.length + 1), phone: phone, name: name, createdAt: ago(d || 100), lastLoginAt: ago(Math.min(d || 100, 3)) };
      users.push(u);
      if (mid) members.push({ id: 'mb' + (members.length + 1), userId: u.id, merchantId: mid, role: role, status: status || 'active', note: '', photo: '', createdAt: ago(d || 100) });
      return u;
    }
    addUser('13800000001', '林晓', 'm1', 'owner'); addUser('13800000011', '小周（店员）', 'm1', 'staff', 'active', 40);
    addUser('13800000002', '周野', 'm2', 'owner'); addUser('13800000003', '许妍', 'm3', 'owner');
    addUser('13800000004', '陈默', 'm4', 'owner'); addUser('13800000005', '何川', 'm5', 'owner'); addUser('13800000006', '吴越', 'm6', 'owner');
    var pend = addUser('13900000009', '阿南', null, null, null, 1);
    members.push({ id: 'mb' + (members.length + 1), userId: pend.id, merchantId: 'm5', role: 'staff', status: 'pending', note: '新来的店员，负责周末班', photo: '', createdAt: ago(0, 6) });

    var tasks = [
      { id: 't1', title: '麓湖社区发展基金会 · 冬日温暖捐', section: 'donation', form: '公益捐赠', points: 10, pointsText: '每 100 元 10 分', verify: '基金会到账记录 / 捐赠证书', desc: '通过基金会指定渠道捐赠，凭到账截图或证书申报，物资捐赠按确认价值折算。', needAmount: true },
      { id: 't2', title: '社区旧衣物资收捐点', section: 'community', form: '社区活动', points: 40, pointsText: '40 分 / 月', verify: '负责人确认 + 现场照片', desc: '门店设置收捐点满一个月，由社区负责人确认后计分。' },
      { id: 't3', title: '商圈消费体验问卷', section: 'synergy', form: '线上参与', points: 20, pointsText: '20 分 / 份', verify: '系统记录', desc: '填写本季度商圈消费体验问卷，有效问卷每份 20 分。' },
      { id: 't4', title: '重点调研 · 夜间经济访谈', section: 'synergy', form: '线上参与', points: 60, pointsText: '30–100 分', verify: '项目确认', desc: '参与 45 分钟深度访谈，按调研深度确认 30–100 分。' },
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

    var staff = [
      { id: 's1', name: '陈晨', title: '商户服务经理', duties: '商户入驻、门店绑定、积分申报问题', phone: '028-6000-0101', wechat: 'lsl_chenchen', color: '#e8501f' },
      { id: 's2', name: '刘洋', title: '活动运营', duties: '活动报名、湖畔市集、社区议事', phone: '028-6000-0102', wechat: 'lsl_liuyang', color: '#5f7d14' },
      { id: 's3', name: '孙悦', title: '公益项目专员', duties: '基金会捐赠、公益票据、收捐点', phone: '028-6000-0103', wechat: 'lsl_sunyue', color: '#1597a6' },
      { id: 's4', name: '王磊', title: '商学院负责人', duties: '课程安排、导师邀请、签到发分', phone: '028-6000-0104', wechat: 'lsl_wanglei', color: '#7a4fb3' },
      { id: 's5', name: '赵敏', title: '权益履约', duties: '积分兑换、推广位排期、场地预约', phone: '028-6000-0105', wechat: 'lsl_zhaomin', color: '#c48a1c' }
    ].map(function (x, i) { x.visible = true; x.order = i + 1; x.photo = ''; return x; });

    var academy = {
      mentors: [
        { id: 'am1', name: '何川', title: '小麓书房主理人', tags: '社群运营 · 会员制', intro: '把一家社区书店做成邻里会客厅，会员复购率 60%。', photo: '' },
        { id: 'am2', name: '许妍', title: '跃动瑜伽创始人', tags: '私域运营 · 活动策划', intro: '从 0 到 2000 人的社群，一套能复制的活动 SOP。', photo: '' },
        { id: 'am3', name: '周舟', title: '品牌设计顾问', tags: '门店视觉 · 内容拍摄', intro: '小店也能有好看的门头和朋友圈，教你用手机拍出质感。', photo: '' }
      ],
      past: [
        { id: 'ap1', title: '小店如何做私域', date: ago(28), mentorId: 'am2', summary: '42 位店主到场，现场搭好了各自的会员群欢迎语。', image: scene('class') },
        { id: 'ap2', title: '门店陈列与橱窗', date: ago(56), mentorId: 'am3', summary: '实地走访 5 家门店，给出改造前后对比。', image: scene('market') },
        { id: 'ap3', title: '社区店的会员制', date: ago(84), mentorId: 'am1', summary: '会员权益怎么设计，才能让邻居愿意每周都来。', image: scene('lake') }
      ],
      courses: [
        { id: 'ac1', title: '小店私域与会员运营', mentorId: 'am2', start: later(3, 14), place: '麓坊中心 2F 多功能厅', seats: 30, points: 30, desc: '会员分层、社群欢迎语、复购活动设计，带上手机现场实操。' },
        { id: 'ac2', title: '用手机拍出门店质感', mentorId: 'am3', start: later(10, 15), place: '湖畔草坪 · 户外', seats: 20, points: 30, desc: '光线、构图、修图三步，课后交作业可获点评。' },
        { id: 'ac3', title: '社区店的节日营销', mentorId: 'am1', start: later(17, 14), place: '小麓书房', seats: 25, points: 30, desc: '元旦与春节档期的联合活动怎么做，商户之间如何互相导流。' }
      ].map(function (c) { c.active = true; return c; })
    };

    var db = {
      version: 6,
      merchants: merchants, users: users, members: members, sessions: [],
      tasks: tasks, rewards: rewards, claims: [], ledger: [], orders: [], signups: [], leads: [],
      applications: [
        { id: 'a1', name: '湖畔精酿小馆', category: '餐饮 · 酒馆', contact: '赵一舟', phone: '13100008807', unit: 'B-110', userId: '', status: 'pending', createdAt: ago(1, 3) }
      ],
      staff: staff,
      academy: academy,
      content: {
        carousel: [
          { id: 'cs1', image: scene('market'), title: '周末湖畔市集 · 报名中', sub: '完成整场出摊 +50 商圈共生值', link: 'tasks' },
          { id: 'cs2', image: scene('class'), title: '商学院 · 小店私域与会员运营', sub: '到场签到 +30 分', link: 'academy' },
          { id: 'cs3', image: scene('lake'), title: '冬日温暖捐', sub: '每捐赠 100 元计 10 分', link: 'tasks' }
        ],
        stats: [
          { id: 'st1', label: '入驻商户', mode: 'auto', metric: 'merchants', value: '', unit: '家', link: 'about' },
          { id: 'st2', label: '公益捐赠累计', mode: 'manual', metric: 'donation', value: '12,800', unit: '元', link: 'tasks' },
          { id: 'st3', label: '本月活动', mode: 'auto', metric: 'activities', value: '', unit: '场', link: 'tasks' }
        ],
        about: {
          intro: '麓商联是麓湖商户的共同体：把商户、社区和公益连在一起。在这里，每一次参与都被记录，每一份贡献都有回报。',
          mission: '让在麓湖开店的人，彼此认识、互相帮忙、一起变好。'
        },
        topics: [
          { id: 'tp1', name: '入驻与门店绑定', staffId: 's1' }, { id: 'tp2', name: '积分申报与审核', staffId: 's1' },
          { id: 'tp3', name: '活动报名 / 市集', staffId: 's2' }, { id: 'tp4', name: '公益捐赠与票据', staffId: 's3' },
          { id: 'tp5', name: '商学院课程', staffId: 's4' }, { id: 'tp6', name: '积分兑换与履约', staffId: 's5' }
        ]
      },
      panel: {
        title: '圈里新鲜事', month: monthLabel(t),
        metrics: [{ label: '本月新入驻', value: '6', unit: '家' }, { label: '公益捐赠累计', value: '12,800', unit: '元' }, { label: '社区活动', value: '9', unit: '场' }],
        notices: [
          { id: 'n1', text: '本周六湖畔市集开放报名，参与商户可获商圈共生值 50 分。', date: ago(1) },
          { id: 'n2', text: '冬日温暖捐已开启，捐赠凭证请在「参与」页提交申报。', date: ago(3) },
          { id: 'n3', text: '商学院本月主题：小店私域与会员运营。', date: ago(6) }
        ]
      },
      admins: [],
      adminLogs: []
    };

    // 后台账号（演示）：超级管理员 admin / admin123，运营 yunying / lsl2026
    [['ad1', 'admin', '系统管理员', '13700000000', 'super', 'admin123'], ['ad2', 'yunying', '李运营', '13700000001', 'ops', 'lsl2026'], ['ad3', 'shenhe', '赵审核', '13700000002', 'ops', 'lsl2026']]
      .forEach(function (a, i) {
        var salt = randStr(12);
        db.admins.push({ id: a[0], username: a[1], name: a[2], phone: a[3], role: a[4], salt: salt, pwHash: hashPw(a[5], salt), status: 'active', mustChange: false, createdAt: ago(60 - i), lastLoginAt: i ? ago(i) : 0 });
      });

    // 历史流水
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
    hist.forEach(function (h) { grant(db, h[0], h[1], h[2], h[3], ago(h[4], 2)); });
    [['m1', 'r6', 25, '已完成'], ['m3', 'r1', 12, '处理中'], ['m6', 'r6', 1, '待处理']].forEach(function (o) { redeemInto(db, o[0], o[1], '', ago(o[2], 1), o[3]); });

    db.claims.push(
      { id: 'c1', merchantId: 'm2', userId: 'u3', taskId: 't1', section: 'donation', title: '麓湖社区发展基金会 · 冬日温暖捐', amount: 650, points: 60, note: '基金会小程序转账，附到账截图。', image: '', status: 'pending', createdAt: ago(0, 4) },
      { id: 'c2', merchantId: 'm4', userId: 'u5', taskId: 't6', section: 'synergy', title: '周末湖畔市集 · 联合摆摊', points: 50, note: '本月第一周市集全天出摊。', image: '', status: 'pending', createdAt: ago(1, 2) },
      { id: 'c3', merchantId: 'm1', userId: 'u1', taskId: 't3', section: 'synergy', title: '商圈消费体验问卷', points: 20, note: '已在线填写。', image: '', status: 'pending', createdAt: ago(0, 1) }
    );
    db.signups.push(
      { id: 'sg1', courseId: 'ac1', userId: 'u3', merchantId: 'm2', status: 'signed', createdAt: ago(1) },
      { id: 'sg2', courseId: 'ac1', userId: 'u4', merchantId: 'm3', status: 'signed', createdAt: ago(2) },
      { id: 'sg3', courseId: 'ac2', userId: 'u6', merchantId: 'm5', status: 'signed', createdAt: ago(1) }
    );
    db.leads.push(
      { id: 'ld1', name: '王先生', company: '山野咖啡烘焙', phone: '13612345678', type: '品牌入驻', message: '想了解麓湖的铺位和入驻流程。', status: 'new', note: '', createdAt: ago(0, 3) },
      { id: 'ld2', name: '刘女士', company: '城市跑团', phone: '13787654321', type: '活动合作', message: '想在湖边办一场晨跑活动，寻求商户联合。', status: 'contacted', note: '已加微信，下周见面', createdAt: ago(4) }
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
  function redeemInto(db, merchantId, rewardId, userId, ts, status) {
    var m = findIn(db.merchants, merchantId), r = findIn(db.rewards, rewardId);
    if (!m || !r) return { ok: false, msg: '数据不存在' };
    if (!r.active) return { ok: false, msg: '该权益已下架' };
    if (r.stock <= 0) return { ok: false, msg: '库存不足' };
    if (m.points < r.cost) return { ok: false, msg: '可用积分不足，还差 ' + (r.cost - m.points) + ' 分' };
    m.points -= r.cost; // 只扣可用积分，年度贡献值不扣减
    r.stock -= 1;
    var order = { id: uid('o'), no: 'DH' + String(ts || now()).slice(-8), merchantId: merchantId, userId: userId || '', rewardId: rewardId, name: r.name, cost: r.cost, status: status || '待处理', createdAt: ts || now() };
    db.orders.push(order);
    db.ledger.push({ id: uid('l'), merchantId: merchantId, type: 'spend', section: '', points: -r.cost, title: '兑换 · ' + r.name, createdAt: ts || now(), refId: order.id });
    return { ok: true, order: order };
  }

  /* ---------- 存储 ---------- */
  var cache = null;
  var listeners = [];
  function load() {
    if (cache) return cache;
    try { var raw = localStorage.getItem(DB_KEY); if (raw) { cache = JSON.parse(raw); return cache; } } catch (e) { /* ignore */ }
    cache = seed(); save(true); return cache;
  }
  function save(silent) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(cache)); } catch (e) { console.warn('保存失败（可能是图片过大）', e); return false; }
    if (!silent) listeners.forEach(function (fn) { fn('local'); });
    return true;
  }
  global.addEventListener && global.addEventListener('storage', function (e) {
    if (e.key === DB_KEY) { cache = null; listeners.forEach(function (fn) { fn('remote'); }); }
  });
  function ls(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) { return null; }
  }

  function level(total) {
    var cur = LEVELS[0], next = null;
    for (var i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i].min) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; }
    return { cur: cur, next: next, idx: LEVELS.indexOf(cur) };
  }
  function annual(m) { return (m.sections.donation || 0) + (m.sections.synergy || 0) + (m.sections.community || 0); }
  function adminLog(db, action) {
    var a = LSL.admin();
    db.adminLogs.unshift({ id: uid('lg'), adminId: a ? a.id : '', adminName: a ? a.name : '系统', action: action, createdAt: now() });
    if (db.adminLogs.length > 300) db.adminLogs.length = 300;
  }

  /* ---------- 对外 API ---------- */
  var LSL = {
    SECTIONS: SECTIONS, FORMS: FORMS, LEVELS: LEVELS, REWARD_CATS: REWARD_CATS, LEAD_TYPES: LEAD_TYPES, LEAD_STATUS: LEAD_STATUS,
    STAT_METRICS: STAT_METRICS, LINKS: LINKS, ADMIN_ROLES: ADMIN_ROLES, DEMO_CODE: DEMO_CODE,
    section: sectionOf, level: level, annual: annual, monthLabel: monthLabel, sameMonth: sameMonth, scene: scene, uid: uid,
    db: load, save: function () { return save(); },
    onChange: function (fn) { listeners.push(fn); },
    reset: function () { cache = seed(); save(); ls(SESSION_KEY, null); ls(CUR_KEY, null); ls(ADMIN_KEY, null); return '已恢复初始演示数据'; },
    find: function (list, id) { return findIn(load()[list], id); },

    monthEarned: function (mid) {
      var t = now();
      return load().ledger.filter(function (l) { return l.merchantId === mid && l.type === 'earn' && sameMonth(l.createdAt, t); }).reduce(function (s, l) { return s + l.points; }, 0);
    },
    ledgerOf: function (mid) { return load().ledger.filter(function (l) { return l.merchantId === mid; }).sort(function (a, b) { return b.createdAt - a.createdAt; }); },

    /* 首页统计数值：自动统计或后台手动填写 */
    statValue: function (st) {
      if (st.mode === 'manual') return st.value;
      var db = load(), t = now();
      var v = {
        merchants: function () { return db.merchants.filter(function (m) { return m.status === 'active'; }).length; },
        activities: function () { return db.tasks.filter(function (x) { return x.active; }).length; },
        courses: function () { return db.academy.courses.filter(function (c) { return c.active && sameMonth(c.start, t); }).length; },
        points: function () { return db.ledger.filter(function (l) { return l.type === 'earn'; }).reduce(function (s, l) { return s + l.points; }, 0); },
        donation: function () { return db.merchants.reduce(function (s, m) { return s + (m.sections.donation || 0); }, 0) * 10; }
      }[st.metric];
      return v ? Number(v()).toLocaleString('en-US') : st.value;
    },

    /* ======== 商户端：手机号 + 验证码登录 ======== */
    validPhone: function (p) { return /^1[3-9]\d{9}$/.test(String(p || '')); },
    sendCode: function (phone) {
      if (!LSL.validPhone(phone)) return { ok: false, msg: '请输入正确的手机号' };
      var rec = {}; try { rec = JSON.parse(ls(SMS_KEY) || '{}'); } catch (e) { rec = {}; }
      var r = rec[phone] || { last: 0, day: '', count: 0 };
      var today = new Date().toDateString();
      if (r.day !== today) { r.day = today; r.count = 0; }
      var wait = Math.ceil((r.last + 60000 - now()) / 1000);
      if (wait > 0) return { ok: false, wait: wait, msg: wait + ' 秒后可重新获取' };
      if (r.count >= 10) return { ok: false, msg: '今日获取次数已达上限' };
      r.last = now(); r.count++; rec[phone] = r; ls(SMS_KEY, JSON.stringify(rec));
      return { ok: true, wait: 60 }; // 正式版：服务端调用短信平台下发
    },
    login: function (phone, code) {
      if (!LSL.validPhone(phone)) return { ok: false, msg: '请输入正确的手机号' };
      if (String(code) !== DEMO_CODE) return { ok: false, msg: '验证码不正确' };
      var db = load(), isNew = false;
      var u = db.users.filter(function (x) { return x.phone === phone; })[0];
      if (!u) { u = { id: uid('u'), phone: phone, name: '', createdAt: now(), lastLoginAt: now() }; db.users.push(u); isNew = true; }
      u.lastLoginAt = now();
      var token = randStr(32);
      db.sessions.push({ token: token, userId: u.id, createdAt: now(), expiresAt: now() + SESSION_DAYS * DAY });
      ls(SESSION_KEY, token);
      var mb = LSL.membershipsOf(u.id).filter(function (x) { return x.status === 'active'; })[0];
      if (mb && !LSL.memberOk(u.id, ls(CUR_KEY))) ls(CUR_KEY, mb.merchantId);
      save();
      return { ok: true, user: u, isNew: isNew };
    },
    // 校验登录凭证；有效则自动续期 30 天
    me: function () {
      var token = ls(SESSION_KEY); if (!token) return null;
      var db = load();
      var s = db.sessions.filter(function (x) { return x.token === token; })[0];
      if (!s || s.expiresAt < now()) { ls(SESSION_KEY, null); return null; }
      var u = findIn(db.users, s.userId);
      if (!u) { ls(SESSION_KEY, null); return null; }
      if (s.expiresAt - now() < (SESSION_DAYS - 1) * DAY) { s.expiresAt = now() + SESSION_DAYS * DAY; save(true); }
      return u;
    },
    logout: function () {
      var token = ls(SESSION_KEY), db = load();
      db.sessions = db.sessions.filter(function (x) { return x.token !== token; });
      ls(SESSION_KEY, null); ls(CUR_KEY, null); save();
    },
    membershipsOf: function (userId) { return load().members.filter(function (x) { return x.userId === userId; }); },
    memberOk: function (userId, mid) { return load().members.some(function (x) { return x.userId === userId && x.merchantId === mid && x.status === 'active'; }); },
    // 当前门店：登录 + 有效成员关系
    current: function () {
      var u = LSL.me(); if (!u) return null;
      var mid = ls(CUR_KEY);
      if (!LSL.memberOk(u.id, mid)) {
        var mb = LSL.membershipsOf(u.id).filter(function (x) { return x.status === 'active'; })[0];
        mid = mb ? mb.merchantId : ''; ls(CUR_KEY, mid || null);
      }
      var m = mid && findIn(load().merchants, mid);
      if (!m) return { user: u, merchant: null, member: null };
      var member = load().members.filter(function (x) { return x.userId === u.id && x.merchantId === mid; })[0];
      return { user: u, merchant: m, member: member };
    },
    switchMerchant: function (mid) { ls(CUR_KEY, mid); },
    // 绑定方式一：输入门店绑定码，立即生效
    bindByCode: function (userId, mid, code) {
      var db = load(), m = findIn(db.merchants, mid);
      if (!m) return { ok: false, msg: '门店不存在' };
      if (String(code).trim() !== m.bindCode) return { ok: false, msg: '绑定码不正确，请向店长或运营人员获取' };
      var ex = db.members.filter(function (x) { return x.userId === userId && x.merchantId === mid; })[0];
      var hasOwner = db.members.some(function (x) { return x.merchantId === mid && x.role === 'owner' && x.status === 'active'; });
      if (ex) { ex.status = 'active'; } else db.members.push({ id: uid('mb'), userId: userId, merchantId: mid, role: hasOwner ? 'staff' : 'owner', status: 'active', note: '绑定码绑定', photo: '', createdAt: now() });
      ls(CUR_KEY, mid); save(); return { ok: true };
    },
    // 绑定方式二：提交运营审核
    requestBind: function (userId, mid, note, photo) {
      var db = load();
      var ex = db.members.filter(function (x) { return x.userId === userId && x.merchantId === mid; })[0];
      if (ex && ex.status === 'active') return { ok: false, msg: '已绑定该门店' };
      if (ex) { ex.status = 'pending'; ex.note = note; ex.photo = photo; ex.createdAt = now(); }
      else db.members.push({ id: uid('mb'), userId: userId, merchantId: mid, role: 'staff', status: 'pending', note: note || '', photo: photo || '', createdAt: now() });
      save(); return { ok: true };
    },
    apply: function (data) {
      var db = load();
      var a = { id: uid('a'), name: data.name, category: data.category, contact: data.contact, phone: data.phone, unit: data.unit || '', userId: data.userId || '', status: 'pending', createdAt: now() };
      db.applications.push(a); save(); return a;
    },
    setUserName: function (userId, name) { var u = findIn(load().users, userId); if (u) { u.name = name; save(); } },

    submitClaim: function (data) {
      var db = load(), task = findIn(db.tasks, data.taskId);
      if (!task) return { ok: false, msg: '参与内容不存在' };
      var pts = task.points;
      if (task.needAmount) {
        var amt = Math.max(0, Math.floor(Number(data.amount) || 0));
        if (!amt) return { ok: false, msg: '请填写捐赠金额' };
        pts = Math.floor(amt / 100) * 10;
      }
      var c = { id: uid('c'), merchantId: data.merchantId, userId: data.userId || '', taskId: task.id, section: task.section, title: task.title, amount: data.amount ? Number(data.amount) : undefined, points: pts, note: data.note || '', image: data.image || '', status: 'pending', createdAt: now() };
      db.claims.push(c); save(); return { ok: true, claim: c };
    },
    redeem: function (mid, rid, userId) { var r = redeemInto(load(), mid, rid, userId); if (r.ok) save(); return r; },

    /* 商学院报名：报名不计分，到场签到后发放 */
    signupsOf: function (courseId) { return load().signups.filter(function (s) { return s.courseId === courseId && s.status !== 'cancelled'; }); },
    signup: function (courseId, userId, mid) {
      var db = load(), c = findIn(db.academy.courses, courseId);
      if (!c || !c.active) return { ok: false, msg: '课程不存在或已结束' };
      if (db.signups.some(function (s) { return s.courseId === courseId && s.merchantId === mid && s.status !== 'cancelled'; })) return { ok: false, msg: '本店已报名该课程' };
      if (LSL.signupsOf(courseId).length >= c.seats) return { ok: false, msg: '名额已满' };
      db.signups.push({ id: uid('sg'), courseId: courseId, userId: userId, merchantId: mid, status: 'signed', createdAt: now() });
      save(); return { ok: true };
    },
    cancelSignup: function (id) { var s = findIn(load().signups, id); if (s && s.status === 'signed') { s.status = 'cancelled'; save(); } },

    submitLead: function (d) {
      if (!d.name || !LSL.validPhone(d.phone)) return { ok: false, msg: '请填写姓名和正确的手机号' };
      var db = load();
      var dup = db.leads.some(function (l) { return l.phone === d.phone && now() - l.createdAt < 10 * 60000; });
      if (dup) return { ok: false, msg: '已收到你的信息，我们会尽快联系你' };
      db.leads.unshift({ id: uid('ld'), name: d.name, company: d.company || '', phone: d.phone, type: d.type || '其他', message: d.message || '', status: 'new', note: '', createdAt: now() });
      save(); return { ok: true };
    },

    /* ======== 运营后台：账号与权限 ======== */
    adminLogin: function (username, pw) {
      var db = load();
      var a = db.admins.filter(function (x) { return x.username === String(username || '').trim(); })[0];
      if (!a || a.pwHash !== hashPw(pw, a.salt)) return { ok: false, msg: '账号或密码不正确' };
      if (a.status !== 'active') return { ok: false, msg: '该账号已停用，请联系超级管理员' };
      a.lastLoginAt = now();
      ls(ADMIN_KEY, JSON.stringify({ id: a.id, exp: now() + ADMIN_HOURS * 3600000 }));
      adminLog(db, '登录后台'); save(true);
      return { ok: true, admin: a };
    },
    admin: function () {
      var s; try { s = JSON.parse(ls(ADMIN_KEY) || 'null'); } catch (e) { s = null; }
      if (!s || s.exp < now()) return null;
      var a = findIn(load().admins, s.id);
      return a && a.status === 'active' ? a : null;
    },
    isSuper: function () { var a = LSL.admin(); return !!(a && a.role === 'super'); },
    adminLogout: function () { ls(ADMIN_KEY, null); },
    log: function (action) { var db = load(); adminLog(db, action); save(true); },
    changeOwnPassword: function (oldPw, newPw) {
      var a = LSL.admin(); if (!a) return { ok: false, msg: '请重新登录' };
      if (a.pwHash !== hashPw(oldPw, a.salt)) return { ok: false, msg: '原密码不正确' };
      if (String(newPw).length < 6) return { ok: false, msg: '新密码至少 6 位' };
      a.salt = randStr(12); a.pwHash = hashPw(newPw, a.salt); a.mustChange = false;
      adminLog(load(), '修改了自己的密码'); save(); return { ok: true };
    },
    // 以下仅超级管理员可用
    addAdmin: function (d) {
      if (!LSL.isSuper()) return { ok: false, msg: '无权限' };
      var db = load(), username = String(d.username || '').trim();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return { ok: false, msg: '账号为 3–20 位字母、数字或下划线' };
      if (db.admins.some(function (x) { return x.username === username; })) return { ok: false, msg: '账号已存在' };
      var pw = d.password || randStr(8), salt = randStr(12);
      var a = { id: uid('ad'), username: username, name: d.name || username, phone: d.phone || '', role: d.role === 'super' ? 'super' : 'ops', salt: salt, pwHash: hashPw(pw, salt), status: 'active', mustChange: true, createdAt: now(), lastLoginAt: 0 };
      db.admins.push(a); adminLog(db, '新增后台用户 ' + username + '（' + ADMIN_ROLES[a.role] + '）'); save();
      return { ok: true, admin: a, password: pw };
    },
    updateAdmin: function (id, d) {
      if (!LSL.isSuper()) return { ok: false, msg: '无权限' };
      var db = load(), a = findIn(db.admins, id); if (!a) return { ok: false, msg: '用户不存在' };
      var me = LSL.admin();
      if (d.role && d.role !== a.role && a.role === 'super' && LSL.superCount() <= 1) return { ok: false, msg: '至少保留一名超级管理员' };
      if (d.role && a.id === me.id && d.role !== 'super') return { ok: false, msg: '不能取消自己的超级管理员权限' };
      if (d.name != null) a.name = d.name; if (d.phone != null) a.phone = d.phone; if (d.role) a.role = d.role;
      adminLog(db, '编辑后台用户 ' + a.username); save(); return { ok: true };
    },
    resetAdminPassword: function (id) {
      if (!LSL.isSuper()) return { ok: false, msg: '无权限' };
      var db = load(), a = findIn(db.admins, id); if (!a) return { ok: false, msg: '用户不存在' };
      var pw = randStr(8); a.salt = randStr(12); a.pwHash = hashPw(pw, a.salt); a.mustChange = true;
      adminLog(db, '重置了 ' + a.username + ' 的密码'); save(); return { ok: true, password: pw };
    },
    setAdminStatus: function (id, status) {
      if (!LSL.isSuper()) return { ok: false, msg: '无权限' };
      var db = load(), a = findIn(db.admins, id), me = LSL.admin();
      if (a.id === me.id) return { ok: false, msg: '不能停用自己的账号' };
      if (status !== 'active' && a.role === 'super' && LSL.superCount() <= 1) return { ok: false, msg: '至少保留一名超级管理员' };
      a.status = status; adminLog(db, (status === 'active' ? '启用' : '停用') + '后台用户 ' + a.username); save(); return { ok: true };
    },
    deleteAdmin: function (id) {
      if (!LSL.isSuper()) return { ok: false, msg: '无权限' };
      var db = load(), a = findIn(db.admins, id), me = LSL.admin();
      if (!a) return { ok: false, msg: '用户不存在' };
      if (a.id === me.id) return { ok: false, msg: '不能删除自己的账号' };
      if (a.role === 'super' && LSL.superCount() <= 1) return { ok: false, msg: '至少保留一名超级管理员' };
      db.admins = db.admins.filter(function (x) { return x.id !== id; });
      adminLog(db, '删除后台用户 ' + a.username); save(); return { ok: true };
    },
    superCount: function () { return load().admins.filter(function (x) { return x.role === 'super' && x.status === 'active'; }).length; },

    /* ======== 运营后台：业务操作 ======== */
    approveClaim: function (cid, pts) {
      var db = load(), c = findIn(db.claims, cid);
      if (!c || c.status !== 'pending') return { ok: false, msg: '状态已变化' };
      var m = findIn(db.merchants, c.merchantId);
      pts = Math.max(0, Math.round(Number(pts)));
      if (c.section === 'donation' && c.amount && String(pts) === String(c.points)) {
        var total = (m.donationCarry || 0) + c.amount; // 不足 100 元的部分年度内累计
        pts = Math.floor(total / 100) * 10; m.donationCarry = total % 100;
      }
      c.status = 'approved'; c.points = pts; c.reviewedAt = now();
      if (pts > 0) grant(db, c.merchantId, c.section, pts, c.title, now(), c.id);
      adminLog(db, '通过积分申报：' + m.name + ' · ' + c.title + ' +' + pts); save(); return { ok: true, points: pts };
    },
    rejectClaim: function (cid, reason) {
      var db = load(), c = findIn(db.claims, cid);
      if (!c || c.status !== 'pending') return { ok: false };
      c.status = 'rejected'; c.reason = reason || ''; c.reviewedAt = now(); adminLog(db, '退回积分申报：' + c.title); save(); return { ok: true };
    },
    revokeClaim: function (cid) {
      var db = load(), c = findIn(db.claims, cid);
      if (!c || c.status !== 'approved') return { ok: false };
      var m = findIn(db.merchants, c.merchantId);
      m.points -= c.points; m.sections[c.section] = Math.max(0, (m.sections[c.section] || 0) - c.points);
      db.ledger.push({ id: uid('l'), merchantId: m.id, type: 'revoke', section: c.section, points: -c.points, title: '撤回 · ' + c.title, createdAt: now(), refId: c.id });
      c.status = 'revoked'; adminLog(db, '撤回积分：' + m.name + ' · ' + c.title); save(); return { ok: true };
    },
    reviewApplication: function (aid, pass) {
      var db = load(), a = findIn(db.applications, aid);
      if (!a || a.status !== 'pending') return null;
      a.status = pass ? 'approved' : 'rejected'; a.reviewedAt = now();
      var m = null;
      if (pass) {
        m = LSL.addMerchant({ name: a.name, category: a.category, contact: a.contact, unit: a.unit }, true);
        a.merchantId = m.id;
        if (a.userId) db.members.push({ id: uid('mb'), userId: a.userId, merchantId: m.id, role: 'owner', status: 'active', note: '入驻申请', photo: '', createdAt: now() });
      }
      adminLog(db, (pass ? '通过' : '拒绝') + '入驻申请：' + a.name); save(); return m || true;
    },
    reviewMember: function (id, pass) {
      var db = load(), mb = findIn(db.members, id); if (!mb) return;
      mb.status = pass ? 'active' : 'rejected';
      var m = findIn(db.merchants, mb.merchantId), u = findIn(db.users, mb.userId);
      adminLog(db, (pass ? '通过' : '拒绝') + '门店绑定：' + (u && u.phone) + ' → ' + (m && m.name)); save();
    },
    removeMember: function (id) {
      var db = load(), mb = findIn(db.members, id); if (!mb) return;
      db.members = db.members.filter(function (x) { return x.id !== id; });
      var u = findIn(db.users, mb.userId), m = findIn(db.merchants, mb.merchantId);
      adminLog(db, '移除门店成员：' + (u && u.phone) + ' ← ' + (m && m.name)); save();
    },
    setMemberRole: function (id, role) { var mb = findIn(load().members, id); if (mb) { mb.role = role; save(); } },
    forceLogout: function (userId) {
      var db = load(); db.sessions = db.sessions.filter(function (s) { return s.userId !== userId; });
      var u = findIn(db.users, userId); adminLog(db, '强制下线：' + (u && u.phone)); save();
    },
    resetBindCode: function (mid) { var m = findIn(load().merchants, mid); if (m) { m.bindCode = randStr(4, '0123456789'); adminLog(load(), '重置绑定码：' + m.name); save(); } return m && m.bindCode; },
    addMerchant: function (data, silent) {
      var db = load();
      var m = { id: uid('m'), name: data.name, category: data.category || '', contact: data.contact || '', unit: data.unit || '', code: 'LH' + String(100 + db.merchants.length + 1).slice(-3), bindCode: randStr(4, '0123456789'), status: 'active', points: 0, sections: { donation: 0, synergy: 0, community: 0 }, donationCarry: 0, createdAt: now() };
      db.merchants.push(m); if (!silent) { adminLog(db, '新增商户：' + m.name); save(); } return m;
    },
    checkIn: function (signupId) {
      var db = load(), s = findIn(db.signups, signupId);
      if (!s || s.status !== 'signed') return { ok: false };
      var c = findIn(db.academy.courses, s.courseId);
      s.status = 'checked'; s.checkedAt = now();
      grant(db, s.merchantId, 'synergy', c.points || 30, '商学院到场 · ' + c.title, now(), s.id);
      adminLog(db, '课程签到发分：' + c.title); save(); return { ok: true, points: c.points || 30 };
    },
    upsert: function (list, item) {
      var db = load(), arr = list.split('.').reduce(function (o, k) { return o[k]; }, db);
      if (item.id) { var o = findIn(arr, item.id); if (o) { for (var k in item) o[k] = item[k]; save(); return o; } }
      item.id = uid(list.slice(-2)); item.createdAt = now(); arr.push(item); save(); return item;
    },
    remove: function (list, id) {
      var db = load(), path = list.split('.'), last = path.pop();
      var parent = path.reduce(function (o, k) { return o[k]; }, db);
      parent[last] = parent[last].filter(function (x) { return x.id !== id; }); save();
    },
    setOrderStatus: function (oid, st) { var o = findIn(load().orders, oid); if (o) { o.status = st; o.updatedAt = now(); adminLog(load(), '兑换订单 ' + o.no + ' → ' + st); save(); } }
  };

  global.LSL = LSL;
})(window);
