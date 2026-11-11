# ADR-001：独立 React SPA 与模块化架构

- 日期：2026-11-11
- 状态：采用

## 背景

旧前端使用 Umi Max，聊天页约 5000 行并混合多类业务。新工程需要明确边界、多外壳与皮肤协议，并继续采用 React。

## 决策

采用 React、TypeScript、Vite、Zustand、React Router、Radix、CSS Modules 与变量。按 app/domain/features/infrastructure/shells/skins/shared 分层。先提供最小初始化页，不复制旧业务。仅使用 npm 锁文件，直接依赖固定版本。

脚手架最初生成 TypeScript 7；当前 typescript-eslint 声明的 peer 范围不包含它。改为 TypeScript 6 兼容版本并执行完整检查，不使用 --force 或 --legacy-peer-deps。

选择 ESLint 9，匹配当前 Node 20.20.2 与插件链；Vitest 使用兼容 Node 20 的 4 系列。后续升级统一验证 Node、Vite、TypeScript、lint 和测试工具的支持范围。

## 替代方案

- 直接继续扩充原 Umi 页面：迁移工作较少，但边界、UI 依赖与页面耦合难以收敛。
- 全面切换 Svelte：界面和组件生态迁移成本更高，与用户确定的 React 方向不符。
- 微前端/独立 npm 包：当前团队和部署需求未要求，先使用单工程逻辑边界。

## 影响和验证

旧后端协议需要独立适配；页面与组件逐项迁移。初始化只验证工程、配色和弹窗，不能证明聊天性能。执行 npm run check 和浏览器 smoke；真实消息场景按 performance.md 后续验收。
