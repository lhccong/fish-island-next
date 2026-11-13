# HTTP 聊天发送验收

日期：2026-11-13。实现决策见 ADR-038。前后端均为当前未提交工作区；保留任务开始前已有改动。

## 接口与运行

后端新增 `POST /api/chat/message/send`（Controller 路径为 `/chat/message/send`，沿用 `/api` context path），需要现有 Sa-Token 会话。请求示例：

```json
{
  "content": "消息正文",
  "quotedMessageId": "1794530000000",
  "clientMessageId": "69368fa3-d31e-44c4-a114-8ce81aec095b"
}
```

`quotedMessageId` 可省略；`clientMessageId` 是重试去重标识。正文非空、最多 5000 UTF-16 单元。接口从会话补齐用户、头像、头像框、称号、等级、积分、VIP、管理员和 IP 地区，引用仅接受公共房间已存在消息。响应为统一 BaseResponse，data.message 与全员 `chat` 广播里的 message 相同。旧客户端依然通过 WS 发送，HTTP 入口广播不跳过本人及本人其他连接。

需要重新编译并启动新后端后才可真实使用新前端发送；此次没有重启用户现有后端、连接真实账号发送或写入真实聊天数据。地区查询复用现有服务，失败时为未知国家/地区。

## 已执行

- 后端独立临时 Maven build：全量主源码 compile 成功，HttpChatMessageServiceTest 4/4 通过（mock 用户/数据库/Redis/定位/广播，不连接生产服务）。覆盖登录与封禁、禁言、空白/长度、资料补齐、公共引用和嵌套裁剪、保存先于广播、保存失败无广播、重试同 ID、已撤回回执不重新创建。
- Vitest 最终全套通过 43 文件、158 用例；聊天定向 12 文件、30 用例通过，包含 HTTP/WS 两种到达顺序、重试串行与同标识、迟到广播、撤回墓碑、账号取消、消息窗口保留待处理消息、最小请求和过期/异常回执。
- Playwright 发送 30/30：WPS、微信、企业微信、飞书蓝、钉钉蓝 × light/dark × Chromium 桌面 1280×720、手机 375×812、390×844。覆盖空白/超长禁用、输入法组合不发送、发送中左侧图标、下一条草稿保留、失败重试同请求、WS 先于 HTTP 时仍转圈、HTTP/重复广播去重、引用新发消息/原消息、取消引用、提交仅正文/引用 ID/去重标识、按钮高度、输入区与页面无横向溢出。
- 截图为以上全部组合采集发送中和成功；人工抽查手机暗夜及桌面暗夜的对齐、间距、引用可读性、左侧图标和操作区。
- 桌面历史、媒体、菜单回归 30/30；实时回归首次因旧用例仍断言“发送永远禁用”失败，已同步新行为后单独重跑，最终 10/10 通过（历史/媒体/菜单/实时共 40 组桌面回归通过）。
- 聊天改动定向 ESLint 通过；全量 `npm run check` 已执行，格式最终通过，但被并行改动的 stock 模块两项 lint 阻断：TradeList.tsx 的 react-refresh/only-export-components、use-resource.ts 的 react-hooks/set-state-in-effect。先前一次类型检查还遇到该模块尚未生成 StockWorkspace，未擅自修改其业务文件。最终独立 `npm run typecheck`、全套 `npm run test`、`npm run build -- --outDir <本次临时目录>/frontend-final` 均通过。构建保留已有大型异步游戏 chunk 警告；未将单个文件体积当作聊天入口性能证明。

## 限制与清理

未进行真实后端+数据库+Redis+两个真实账号的端到端联调、物理手机软键盘、跨实例广播、持续 30 分钟和输入延迟/内存性能采样。浏览器验证基于合成数据与 HTTP/WS mock，不能代替生产联调。七天去重窗口依赖 Redis；既有广播连接表为单进程，未新增跨实例消息总线或断线补拉。

测试报告、截图、trace、临时 Maven POM 和前后端验证产物位于本次独立临时目录 `C:/Users/SEASUN/AppData/Local/Temp/fish-island-http-send-20261113-8c46`。已确认该目录为本次创建，先后尝试校验绝对路径后的清理与直接 LiteralPath 清理，两次均被工具自动审批拒绝，仅返回 `blocked by policy`，未绕过限制。因此该目录及其 backend-build、playwright、regression、realtime-final、frontend-build、frontend-final 子目录仍保留，后续可手动删除该确切目录。工作区内 `.tmp-chat-send-20261113` 已移动到以上系统临时目录，无工作区残留。原有 dist、后端 target 及其他任务文件未删除。
