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

已实现初始化页面、三种基础配色切换、开发约定弹窗、路由与模块边界种子。已配置 ESLint 依赖检查、TypeScript 严格检查、Vitest、Playwright 桌面/移动项目和 GitHub Actions。

**尚未接入登录或后端，没有完整平台外壳、聊天功能、历史缓存和第三方皮肤导入。** 预览切换不会持久化；配色名称不代表已完成相应平台布局。性能预算是未来验收目标。

## 后续实施

从后端协议梳理与纯文本聊天闭环开始，随后验证第二种外壳，最后实现声明式皮肤包导入。详细顺序以架构文档为准。

`.env.example` 仅描述未来公开地址配置；前端环境变量不能存放秘密。当前工程不自动连接这些地址。部署 `dist/` 时需将未知前端路由回退到 index.html。
