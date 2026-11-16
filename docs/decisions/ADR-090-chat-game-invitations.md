# ADR-090 聊天游戏邀请标签

状态：已采用。日期：2026-11-16。

## 原因与方案

聊天兼容旧版 `[invite/chess|draw|landlords|chineseChess]房间号[/invite]` 和 `<undercover>…房间ID: 房间号</undercover>`，同时接受 `[invite/undercover]`。domain/chat 提供纯文本分段与白名单解析，feature/chat 按文本版本缓存分段并用共享 Button 呈现游戏名、房间号和入口，保留前后文字、表情及非法标记原文。房间号仅允许 1–100 位字母数字、下划线和短横线。

app 将卧底路由 roomId 注入现有工作台和房间控制器，初次加载只查看邀请房间，加入仍经原有确认操作；不新增连接、发送邀请协议或跨 feature 依赖。未迁移的象棋显示暂未接入且不提供可用入口。

## 影响与替代方案

全部外壳共用消息渲染，使用 surface/text/muted/border/action 语义变量和手机 44px 控件。主题与模式切换不改变消息、草稿和游戏状态。没有请求的邀请呈现不虚构房间人数或存续状态，实际加载、空房与失败沿用游戏模块。拒绝复制旧聊天页面或自动加入房间，避免通信重复及未经用户选择的业务写入。

## 验证

纯规则测试覆盖两类标签、混合文本、多邀请、未知类型、异常 ID；浏览器检查全部注册主题 × 明暗 × 桌面/375/390 的卡片、焦点、布局和房间导航。执行 npm run check，验收结果随交付说明记录。

2026-11-16 验证结果：Windows / Chromium / Vite 开发模式，合成账号、消息与房间接口；npm run check 通过（107 个测试文件、436 项单元测试及生产构建）。Playwright 42/42 通过，覆盖摸鱼岛、摸鱼岛像素风、WPS、微信、企业微信、飞书、钉钉 × 明亮/暗夜 × 1280px 桌面/375px/390px；检查邀请呈现、32px/44px 操作、键盘与手机入口、各游戏路由、草稿保留、换肤不重连/重取历史、卧底 loading/error/重试/ready/结束/空房。已检查经典手机、飞书暗夜手机和 WPS 暗夜桌面实际截图；清理命令被自动审批以 blocked by policy 拒绝，未提供具体原因。残留：E:/owner-project/fish-island-next/dist、C:/Users/SEASUN/AppData/Local/Temp/fish-invitations-current、C:/Users/SEASUN/AppData/Local/Temp/fish-invitations-c670434c80604694874e3a7ae140007f；需后续删除这些本次构建与测试产物。真实多人服务、完整游戏流程及聊天性能预算未实测；开发服务器有 ResizeObserver 循环提示，构建保留大块及 MomentEditor 动静态导入警告。
