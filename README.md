# 鱼岛 Next

基于 React + TypeScript + Vite 的独立前端重构工程。项目路径：`E:/owner-project/fish-island-next`。

## 开发入口

**编写任何功能之前先读 [AGENTS.md](./AGENTS.md) 和 [系统架构](./docs/architecture.md)。**

| 文档                                           | 内容                                            |
| ---------------------------------------------- | ----------------------------------------------- |
| [系统架构](./docs/architecture.md)             | 分层、依赖方向、数据流、状态所有权、实施顺序    |
| [组件规范](./docs/component-standards.md)      | 组件职责、Props、状态、视觉、可访问性、评审清单 |
| [皮肤协议](./docs/skin-spec.md)                | 外壳与皮肤边界、导入包设计、校验与回滚要求      |
| [性能规范](./docs/performance.md)              | 更新边界、缓存预算、性能场景和测量方法          |
| [架构决策](./docs/decisions/001-foundation.md) | 技术选择、工具兼容与替代方案                    |

## 启动

推荐 Node.js 22.12+ 的兼容 LTS 版本；当前本地 Node.js 20.20.2 也在支持范围。统一使用 npm；依赖由 package-lock.json 锁定。

```powershell
cd E:/owner-project/fish-island-next
npm ci
npm run dev
```

新环境先安装依赖；当前目录已安装。浏览器打开终端打印的地址。

## 检查

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` 包含格式、lint（零警告）、严格类型、单元测试和生产构建。浏览器测试单独运行；CI 两者均执行。其他命令：`npm run format`、`npm run lint:fix`、`npm run test:watch`、`npm run preview`。

如果本机已有 Chrome，也可以不下载测试浏览器，在 PowerShell 中执行：

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:e2e
```

本次初始化的检查记录见 [初始化验证](./docs/initialization-validation.md)。

## 当前能力

已实现微信风格工作台、真实热榜接入、来源选择、分类与原文跳转。总览卡片统一高度并内部滚动显示完整榜单，选择来源或卡片标题进入紧凑消息气泡详情。页头已移除搜索/刷新，保留来源搜索及错误重试。详情底部提供可编辑的演示输入框和工具栏，不会发送。主内容、来源和卡片采用 Radix Scroll Area，支持触屏与键盘。桌面与窄屏分别采用来源列表和选择器。

- `/`：真实热榜，默认公开读取 `https://api.yucoder.cn/api/hot/list`（POST），无需登录且不携带凭证。
- `/chat`：需要登录，当前展示聊天未接入状态页。
- `/pet`：发现 → 伙伴；需要登录。原创二维分层营地复用旧宠物精灵资源，支持散步、养成、装备、外观、自动喂食、锻造和服务端回合挑战。营地移动不产生收益；接口兼容与未验证项见 [伙伴迁移记录](./docs/audits/pet-migration.md)。
- `/reader`：发现 → 阅读，支持在线书源搜索、TXT 导入、本地书架与进度、目录/正文搜索、全局悬浮窗、文档画中画、阅读主题、工作伪装和系统朗读。默认复用旧版阅读服务配置；可在“阅读设置”中覆盖服务地址和当前会话凭证。真实浏览器搜索、目录与正文已联调，系统音频仍需设备实测。完整对照及验证范围见 [阅读迁移](./docs/audits/reader-migration.md)。
- `/user/login`：原摸鱼岛风格的账号/邮箱密码登录弹窗。导航入口在当前页面上覆盖弹窗，关闭后保留原热榜状态；直接访问时以热榜为背景。有 redirect 参数时登录后进入目标。
- `/foundation`：五种内置主题、明亮/暗夜模式预览与开发约定，独立按需加载。

已配置 ESLint 依赖检查、严格类型、Vitest、Playwright 和 GitHub Actions。实现决策见 [ADR-002](./docs/decisions/002-wechat-hot-board.md)。

账号入口位于导航栏，可查看当前用户并退出。登录采用旧后端动态 Sa-Token 请求头；保持登录写入按后端地址隔离的 localStorage，否则使用 sessionStorage。刷新会向服务端校验，不保存密码；网络错误提供重试，过期才清除。详见 [认证接入决策](./docs/decisions/006-legacy-auth.md)。

工作台“主题”按钮可独立选择五种主题和明亮/暗夜模式，初始化页也提供模式切换；选择自动保存，刷新后恢复。暗夜基础背景为 `#191A1C`，图片与封面保持原貌。切换不清空草稿或游戏当前局。详见 [明暗模式决策](./docs/decisions/ADR-019-light-dark-mode.md)。

**聊天消息、注册、找回密码和第三方登录尚未迁移；历史缓存及第三方皮肤导入未实现。** 飞书/钉钉尚无对应布局。热榜读取服务端聚合结果，没有自动轮询和持久缓存。聊天性能预算仍待实测。

## 后续实施

从后端协议梳理与纯文本聊天闭环开始，随后验证第二种外壳，最后实现声明式皮肤包导入。详细顺序以架构文档为准。

可复制 `.env.example` 为 `.env.local` 并通过 `VITE_API_BASE_URL` 指定后端根地址（不包含 /api）；未设置或空值使用旧后端。直接访问其他服务须支持浏览器跨域、凭证与动态认证请求头。本地联调请使用仅在开发模式加载的 `.env.development.local`：将 `VITE_API_BASE_URL` 设为 Vite origin（例如 `http://localhost:5173`），再设置 `VITE_DEV_API_TARGET=http://127.0.0.1:8123`、`VITE_DEV_WS_TARGET=ws://127.0.0.1:8090`，启用 HTTP 与 WebSocket 同源代理；后者把 `/ws/` 转为 Netty 根路径。端口或访问主机改变时同步调整 origin；部署构建须使用部署环境的 API 地址。前端环境变量不能存放秘密。部署 `dist/` 时需将未知前端路由回退到 index.html。

# Linux 部署

拉取、构建与 1Panel 站点发布命令见 [部署说明](docs/deployment.md)。
