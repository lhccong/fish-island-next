# 聊天表情面板与输入区验收

日期：2026-11-13。实现决策：ADR-045。

- 表情入口为工具栏上方的非模态面板，底部 Emoji / 收藏 / 搜索，保留关闭按钮、外部点击和 Esc。
- 使用 fishmusic 同款 214 张本地 QQ APNG。清单异步加载，图片保持原貌；输入区与消息区都显示内联图片，协议保持 `[qqface:id]`。
- 独立富文本输入区支持选区替换、表情前后输入、原子删除、撤销、复制标记、纯文本粘贴、组合输入保护与换行。粘贴 HTML 不进入 DOM，粘贴图片继续使用原上传用例。
- 全部注册主题：WPS、微信、企业微信、飞书、钉钉；每种均覆盖明亮/暗夜及桌面 1280×720、手机 375×812 / 390×844。
- 生产构建执行 90 个主题/模式/视口场景：88 项首轮通过；飞书明亮/暗夜的 375px 两项在浏览器 page fixture 创建阶段超时，串行复验通过；额外复验合计 6 项通过。无应用行为失败残留。
- 覆盖面板边界、44px 命中区域、焦点返回、Emoji 插入和实际显示、发送协议、未知标记与图片失败回退、长度限制、触屏事件触发的实际滚动、首末项聚焦、桌面滑轨显示/手机隐藏、内部无横向溢出。
- 收藏与搜索覆盖 loading / empty / error / success、保存及移除失败、滚动续载、追加失败重试、去重、结束提示、预览和发送重试；原草稿和引用保留。只读悬停放大层不拦截原面板点击或滚动。
- 已检查桌面和手机的实际截图，包括暗夜输入区及 WPS 手机布局。
- 额外输入回归 15 项最终通过：输入聚焦、消息菜单、图片上传与失败重试、引用和发送，以及换肤/明暗切换时保留草稿、上传、请求和连接。主题切换测试依赖开发模块入口，改在开发服务器执行；引用断言同步适配工作区已有的“定位原文”按钮。
- `npm run check` 通过，包含格式、lint、类型、全部单元测试和生产构建。为避免并发占用造成基础设施超时，检查时使用 `VITEST_MAX_WORKERS=2`。

限制：浏览器自动化使用合成账号、请求和消息；未连接真实账号发送，未验收真机软键盘与系统输入法候选窗。组合输入保护通过合成 composition 事件验证。

## 临时产物清理受阻

已核对下列路径均为本次任务创建的普通目录，位于本仓库或独立临时构建目录。自动审批审查对批量及单目录 PowerShell `Remove-Item -LiteralPath ... -Recurse -Force` 均拒绝执行，只返回 `blocked by policy`，未提供更详细原因；没有删除成功。两份临时 Playwright 配置已通过文件补丁移除。以下目录需要后续清理，不能视为正式交付物：

- `E:\owner-project\fish-island-next\test-results-emoji-task`
- `E:\owner-project\fish-island-next\test-results-emoji-task-recheck`
- `E:\owner-project\fish-island-next\test-results-emoji-task-debug`
- `E:\owner-project\fish-island-next\test-results-emoji-task-touch`
- `E:\owner-project\fish-island-next\test-results-emoji-task-wheel`
- `E:\owner-project\fish-island-next\test-results-emoji-task-rich`
- `E:\owner-project\fish-island-next\test-results-emoji-task-matrix`
- `E:\owner-project\fish-island-next\test-results-emoji-task-retry`
- `E:\owner-project\fish-island-next\test-results-emoji-task-regression`
- `E:\owner-project\fish-island-next\test-results-emoji-task-regression-retry`
- `C:\Users\SEASUN\AppData\Local\Temp\fish-island-emoji-20261113-qa`
