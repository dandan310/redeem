# 现有系统基础数据结构梳理 & Java 重构选型

> 来源：用管理员账号登录线上后台，**只读**调用「系统设置」「基础数据」两个模块的列表/详情接口，结合前端打包代码里的路由与接口清单整理。
> 范围：只整理基础数据（平台底座 + 保洁相关主数据），订单、账单、布草、运输、河流监测等业务数据未涉及。
> 字段来自接口返回，不是数据库表结构；真实表名、索引、未在接口暴露的列需要对照数据库确认。

## 1. 现有系统概况

| 项 | 现状 |
| --- | --- |
| 前端 | Vue 3 + Vuex + Vue Router + Element Plus + ECharts，打包后按模块拆分（platform / baseData / orderCenter / bill / sectionTest / documentCenter） |
| 后端 | 接口统一在 `/api` 下；从报错格式和 socket.io 推断为 Node.js + MySQL（推断，未见源码） |
| 登录 | `GET /publicKey` 取 RSA 公钥 → 密码 RSA 加密后 `POST /platform/login` → 返回 `token` + `secret`；之后每个请求带 `Authorization: token` 和 `sign`（RSA 加密的 `{timeStamp, secret}`） |
| 文件 | 七牛云（`/platform/qiniuToken`），CDN 域名独立 |
| 打印 | C-Lodop 本地打印，打印模板存在「打印规则」表 |
| 实时通知 | socket.io |
| 接口规模 | 约 325 个接口（get 186 / post 42 / put 33 / delete 64），权限点 329 个 |

统一返回格式：`{ status, success, message, data }`，分页列表为 `data: { rows, total }`，默认每页 30 条。

通用约定：

- 主键是 18 位左右的数字字符串；超级管理员 id 为 `-1`，树的根节点 `parent_id` 为 `-1`。
- 状态统一用字典 `enable_type`（`enable` / `disable`）。
- 接口里的 `xxx_value` 字段是字典翻译后的中文名，不是独立的列。

## 2. 平台底座（系统设置模块）

### 2.1 实体关系

```
机构 organ ──< 机构-应用 >── 应用 application ──< 应用-菜单/操作 >── 菜单 menu ──< 操作 operation
   │                                                                      ▲
   ├──< 机构-用户 >── 用户 user ──< 用户-角色 >── 角色 role ──< 角色-权限 >──┘
   │                    └──< 用户直接授权（userManage/permissionTree）
   ├── 字典项 dict_item（organ_id = -1 为全局，可按机构覆盖）
   ├── 系统配置值 system_config（按机构自定义 custom_value）
   ├── 公众号/小程序 wx_app
   └──< 机构-工作台 >── 工作台 work_panel ──< 工作台明细 >── 工作台组件 work_module
```

这是一套「机构 = 租户、应用 = 租户套餐」的多租户 RBAC：机构开通哪些应用，决定它能看到哪些菜单；机构内再用角色（或直接对用户）分配菜单和操作权限。

### 2.2 各表字段

**机构 organ**（机构管理，现有 13 个）

| 字段 | 说明 |
| --- | --- |
| id, code, name | 机构编码唯一 |
| type | 字典 `organ_type`：`platform` 开发者平台 / `application` 系统应用 |
| active_status, msg_status | 启用状态、消息通知开关 |
| phone, mail, fax, address, zip_code | 联系方式 |
| nation, province, city, county | 行政区划 |
| image_url | Logo |
| wx_config | 编码后的微信配置 JSON |
| remark | |

关联：机构-应用（`appList/{organId}`）、机构-用户（`userList/{organId}`）。

**应用 application**（应用管理，现有 9 个）

| 字段 | 说明 |
| --- | --- |
| id, code, name, status, remark | |

关联：应用-菜单/操作树（`menuTree/{appId}`）。现有应用：客房保洁、酒吧、酒店接送、酒店线上订单、洗涤厂、账单、河流监测、电商、开发管理平台。

**菜单 menu**（两级树，7 个一级 / 约 50 个二级）

| 字段 | 说明 |
| --- | --- |
| id, parent_id, name, code, icon, sort, status, remark | |
| url | 前端路由，如 `/baseData/cleanerManage` |
| resource_module | 所属模块，如 `baseData` |
| resource_code | 权限前缀，如 `baseData.cleanerManage` |
| resource_path | 前端组件路径，如 `@/views/base_data/cleaner_manage/index.vue` |
| params | 路由参数 |

**操作 operation**（菜单下的按钮/接口权限）

| 字段 | 说明 |
| --- | --- |
| id, menu_id, code, name, sort, status, remark | code 如 `insert` / `update` / `delete` / `list` |
| req_url | 对应的后端接口，如 `/baseData/cleanerManage/insert` |
| resource_code, resource_desc | 冗余的菜单权限前缀和菜单名 |

完整权限码 = `模块.菜单.操作`，如 `baseData.cleanerManage.insert`。登录后 `/platform/userAuthority` 一次返回 `menuList`、`operationList`（权限码数组）、`userMsg`（id、name、organ_id、organ_name）。

**角色 role**（现有 6 个）

| 字段 | 说明 |
| --- | --- |
| id, code, name, remark | |
| type | 字典 `user_type`：`manager` 管理员 / `plain` 普通用户 |

关联：角色-权限（菜单 + 操作的勾选树）、角色-用户。

**用户 user**（用户管理约 3700 条；人员管理约 1800 条，字段相同，推断为当前机构范围内的人员视图）

| 字段 | 说明 |
| --- | --- |
| id, name, user_name | user_name 为登录名，多数是手机号 |
| tel, email | |
| sex | 字典 `sex` |
| age | |
| certificate_type, certificate_num | 字典 `certificate_type`：身份证 / 护照 |
| type | 字典 `user_type` |
| active_status, remark | |

关联：用户-角色、用户直接授权、用户-机构。另有用户级存储：表格列配置（`getTableLogs`，一个 JSON）、使用习惯（`getUserHabit`，一个 JSON）、快捷入口 shortcut（id, name, code, icon, link）。

**字典 dict / 字典项 dict_item**（42 个字典）

| 表 | 字段 |
| --- | --- |
| dict | id, code, name, remark |
| dict_item | id, dict_code, code, name, sort, default_option（yes/no）, organ_id（-1 全局）, remark |

**系统配置 system_config**（12 项）

| 字段 | 说明 |
| --- | --- |
| id, code, name, remark | |
| dict_code | 可选值来自哪个字典 |
| custom | 是否允许自定义值（yes/no） |
| value, custom_value | 当前选中的字典项、自定义值 |

现有配置项：列表页码大小、会话保持方式、图片水印、缩略图、默认密码规则、登录失败锁定次数与时长、新增酒店人员/司机/保洁默认绑定的角色、接送通知时间、接送账单截止日。

**其余平台表**

| 表 | 字段 | 备注 |
| --- | --- | --- |
| 公众号/小程序 wx_app | id, name, type（`wx_public` / `wx_app`）, organ_key, app_id, app_secret, token, grant_type, mch_id, mch_key, api_v3, api_cert, web_url, msg_tem（模板消息 JSON）, menu_obj（公众号菜单 JSON）, status, remark | 按机构绑定，含微信支付商户配置 |
| 通知任务 notify_task | id, code, name, status, remark | 8 个；按权限树指定接收人 |
| 定时任务 timed_task | id, code, name, time_expression（6 位 cron）, status, remark | 3 个 |
| 工作台组件 work_module | id, code, name, status, remark | 23 个，对应前端图表/卡片组件 |
| 工作台 work_panel | id, code, name, status, remark | 5 个，可分配给机构 |
| 工作台明细 | id, workPanel_id, template_id, code, width, height, sort | 栅格布局 |
| 待办事项 pending_task | id, title, message, status（pending / in_progress / completed）, annex（附件 URL 数组）, main_id（关联 id 数组） | 按角色分派 |
| 商户配置 merchant_config | id, start_price, transport, bale, status, remark | 电商用，保洁系统不需要 |
| 公告 proclamation | 富文本 + 接收人 | 未展开 |

## 3. 保洁相关主数据（基础数据模块）

| 表 | 字段 | 说明 |
| --- | --- | --- |
| 酒店 hotel | id, name, tel, status, public（yes/no 是否公开）, half_able, limit_able, remark | 约 110 家；`half_able` / `limit_able` 是业务开关，含义需确认 |
| 酒店-用户 | hotel_id, user_id, 类型（字典 `hotel_user_type`：`director` 负责人 / `plain` 普通） | 酒店前台账号 |
| 房间 room | 按 `hotel_id` 查询 | 抽查的酒店没有房间数据，字段未取到，需看库 |
| 保洁 cleaner | id, cleaner_id（→ user.id）, name, user_name, tel, status, remark | 保洁员是「用户」的一个身份扩展，目前只有 1 条 |
| 客户 customer | id, name, tel, status, owing（欠款）, remark | 约 130 家，洗涤厂客户 |
| 客户计价项 | id, code, name, price, status, remark | 24 项布草单价，洗涤业务用 |
| 会员 vip | id, name, tel, status, remark | |
| 账单标签 bill_tag | id, name, status, remark | |
| 打印规则 print_rule | id, code, name, rules（Lodop 脚本）, status, remark | |

保洁业务用到的字典：`room_status`（待接单 / 已接单 / 已完成 / 异常 / 已取消）、`room_order_status`（进行中 / 已完成）、`payment_status`（待收款 / 已收款）、`hotel_user_type`、`enable_type`。

其余基础数据（商品、商品分类、商家、司机、车队、车辆、河流、断面、溶解度等）属于其他业务线，共享保洁系统第一期不需要迁移。

## 4. Java 开源框架选型

### 4.1 推荐：芋道 ruoyi-vue-pro（单体起步，后续可换 yudao-cloud）

现有底座的每一块在它里面几乎都有现成对应，前端同样是 Vue 3 + Element Plus，迁移成本最低：

| 现有系统 | ruoyi-vue-pro 对应 | 说明 |
| --- | --- | --- |
| 机构 organ | 租户 `system_tenant` | 行级多租户，MyBatis-Plus 自动加 `tenant_id` |
| 应用 application + 机构-应用 | 租户套餐 `system_tenant_package` | 套餐 = 一组菜单，和「机构开通应用」是同一个模型 |
| 菜单 + 操作 | `system_menu`（目录 / 菜单 / 按钮，带权限标识） | 现有 329 个权限码可脚本导入 |
| 角色、角色-权限、用户-角色 | `system_role` / `system_role_menu` / `system_user_role` | 另带数据权限；「用户直接授权」没有，需要改成走角色 |
| 用户 / 人员 | 后台 `system_users`；保洁员、酒店前台等手机端用户可放 `member_user` | |
| 字典 / 字典项 | `system_dict_type` / `system_dict_data` | 按机构覆盖字典项需自己加 |
| 系统配置 | `infra_config` | |
| 定时任务 | `infra_job`（Quartz） | |
| 通知任务、socket.io 推送 | 站内信 `system_notify_*` + WebSocket 模块 | |
| 公众号/小程序、微信支付 | `mp` 公众号模块 + `pay` 支付模块 + 社交登录 | |
| 七牛云上传 | `infra_file_config`（S3 协议，支持七牛） | |
| 待办事项 | 可自建，或用自带的 Flowable 工作流 | |
| 工作台组件/组装、表格列配置、使用习惯、打印规则 | 无直接对应 | 需要自建，量不大 |

其他理由：MIT 协议可商用；自带代码生成器，酒店、房间、保洁员这类主数据的增删改查可以直接生成；有 uni-app 端可做保洁员/酒店小程序；单体版按 Maven 模块划分，业务量上来后可平移到同作者的微服务版 yudao-cloud（Spring Cloud Alibaba）。

建议选 JDK 17 或 21 + Spring Boot 3 的分支，数据库继续用 MySQL，加 Redis。具体版本号以仓库当前说明为准，我这次没有联网核对最新版本。

### 4.2 备选

| 框架 | 适合的情况 | 不足 |
| --- | --- | --- |
| RuoYi-Vue-Plus | 想要更轻、代码更规整的底座；多租户、Sa-Token、MyBatis-Plus、数据权限齐全 | 没有内置公众号、支付、会员模块，这些要自己接 |
| JeecgBoot | 表单、报表多，想靠低代码在线配置出页面 | 体量重，前端是 Ant Design Vue，历史上安全漏洞偏多，部分高级功能收费 |
| RuoYi-Cloud / Pig | 一开始就确定要上微服务 | 当前体量（千级用户、百级酒店）用不上，运维成本先涨 |

### 4.3 关于「业务量增大」

目前数据量很小（用户约 3700、酒店约 110），单体 Spring Boot + MySQL + Redis 足够支撑很长时间。比换架构更重要的是：订单接单这类并发点用 Redis 锁或乐观锁、订单表提前按租户和时间建索引、通知和统计走异步。等单个业务线出现明显瓶颈，再把它拆成独立服务。

### 4.4 迁移顺序建议

1. 搭起底座，导入机构（租户）、应用（套餐）、菜单与权限码、字典、系统配置。
2. 迁移用户、角色及关联；密码算法不同，建议上线后让用户用手机验证码重置。
3. 做保洁主数据：酒店、酒店人员、房间、保洁员。
4. 做保洁业务：派单、接单、完成、异常、收款。
5. 其他业务线（洗涤、接送、电商等）按套餐逐个搬。

## 5. 调研中发现的现有系统问题

1. **查询参数被直接拼进 SQL。** 给列表接口传一个未知参数 `size`，返回了 `ER_BAD_FIELD_ERROR: Unknown column 'size' in 'where clause'`。这说明存在 SQL 注入风险，且数据库报错原文直接返回给了前端。
2. **微信密钥明文下发。** 公众号/小程序列表接口把 `app_secret`、`mch_key`、`api_v3` 原文返回给浏览器，任何有该菜单权限的账号都能拿到支付密钥。
3. 部分关联接口不分页（例如某角色的用户列表一次返回 1600 多条）。

新系统里这三点分别由参数化查询（MyBatis）、敏感字段脱敏/只写不读、统一分页解决。
