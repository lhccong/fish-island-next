# 个人音乐与光盘消息验收

日期：2026-11-17。工作区基于 `6e99569`，包含原有未提交修改；本任务未创建 Git 提交。

## 实现范围

第三方模块 `src/third-party/music` 提供网易云 / QQ 音乐搜索、点歌、个人待播队列、播放 / 暂停、下一首、进度和音量；可发送音乐消息，其他用户点击后在各自设备播放。悬浮光盘支持鼠标 / 触屏拖动、键盘移动、暂停 / 继续、打开播放器和停止。

消息和悬浮球使用共享静态光盘：反光盘面、同心纹路、中心孔和播放状态标记。纯音乐消息的内外矩形背景均移除，引用和撤回反馈保留；无持续旋转动画。消息行不订阅播放进度，播放器只有一个原生音频实例。

服务端实现在 `fish-island-backend/.../thirdparty/music`，配置位于后端 `application.yml` 的 `fishisland.third-party.music.api-url` / `token`。密钥只由服务端读取；消息只保存来源、编号、歌名、歌手。删除和接线说明见第三方模块 README 与 ADR-098。

## 门禁与交互

| 检查                     | 结果                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| `npm run check`          | 通过：格式、零警告 lint、类型、117 个测试文件 / 515 项单元测试、生产构建 |
| 后端 `MusicUpstreamTest` | 4 项通过，0 失败；Maven 编译通过                                         |
| 生产构建音乐浏览器矩阵   | 134 项通过，1 项桌面不适用的手机短屏测试跳过                             |
| 生产构建稳态对照         | 两个 60 秒样本通过；光盘最终版再测音乐样本通过                           |

主题全部来自注册表：`moyu-island`（摸鱼岛经典）、`pixel-island`（像素）、`wechat`、`wecom`、`feishu`、`dingtalk`、`wps`。每个主题均覆盖明亮 / 暗夜和 1280 × 720、375 × 844、390 × 844，包含完整聊天室、独立 Excel 聊天小窗、音乐消息和悬浮球。另检查 375 / 390 × 460 的短屏布局。

覆盖搜索 loading / empty / error / success、来源选择与 Esc / 焦点返回、滚动续载、待播队列、发送成功与草稿保留、卡片冷启动加载反馈、真实合成音频播放 / 暂停 / 跳转 / 连续播放、音源失败恢复、悬浮球真实触屏 / 鼠标拖动、停止、跨主题 / 模式保留队列 / 音量 / 草稿 / 单一连接，以及退出释放音频。断言无页面 / 面板横向溢出、光盘为正圆、纯音乐背景透明、滚动 gutter 和手机隐藏滑轨。

通过实际截图检查明暗光盘盘面、桌面 / 手机排版、焦点和弹层避让。独立小窗曾遮挡悬浮球，现已将音乐层设置为 70（普通浮窗 60，模态弹窗 80），全部小窗矩阵复测通过。

复现命令：先 `npm run check`，再 `npx playwright test --config playwright.music.config.ts`；测试使用生产 preview、屏蔽 Service Worker、合成会话 / 搜索 / 发送响应和支持 Range 的可播放 PCM WAV，不伪造 HTMLAudioElement.play。

## 性能样本

Windows 11 Pro，Intel i7-12700K，Chromium 158.0.8127.18，1280 × 720，生产构建。资源稳定后，每 50ms 按时间校准注入一条不同文本消息，持续输入；记录 input 事件时间戳到下一次 requestAnimationFrame，并使用 PerformanceObserver 收集大于 50ms 的长任务。虚拟消息窗口仍按现有 1000 条上限工作。

| 场景               | 时间    | 入站消息 | 输入样本 | 输入 p95 | >50ms 长任务 |
| ------------------ | ------- | -------- | -------- | -------- | ------------ |
| 不开音乐基线       | 60.340s | 1206     | 732      | 14.7ms   | 0            |
| 光盘最终版播放音乐 | 60.353s | 1206     | 930      | 14.8ms   | 0            |

该样本满足输入 p95 < 50ms，不代表所有设备、启动、网络和长期运行均无卡顿。两组在压测后均需要点击“查看最新消息”定位末条；测试没有据此宣称持续自动跟随已通过。此现象也存在于不开音乐的基线，未在音乐模块中修改聊天滚动逻辑。

首次进入聊天室已请求 JS gzip 合计 321700 bytes（含登录、聊天、侧栏的同步及异步资源）；打开播放器额外请求 JS 5957 bytes，播放器自身异步块约 5.1 KiB。静态 import 图递归粗统计：入口约 105.4 KiB，加同步依赖约 183.1 KiB，合计约 288.4 KiB，仍超过 200 KiB 目标，**入口体积未达标**。不以单个播放器块的大小代替整个入口预算。

复现性能样本：`npx playwright test --config playwright.music-performance.config.ts`。首次试跑曾因 Node 定时器注入不足 1000 条而失败，已改为按经过时间补齐注入；首轮尚未等资源稳定时观察到 2 个长任务，最长 397ms，因此未将冷启动纳入“零长任务”的结论。

## 未验证与限制

- 真实上游密钥、生产后端部署、歌曲权限和 CDN 音源未联调；上游匿名访问返回 401，部署者须在后端 yml 填写密钥。不会把未配置状态呈现为可播放成功。
- 未完成真实移动设备 / Safari / 真实软键盘、慢网 / 弱设备、完整 1 万条混合历史与 30 分钟内存 / 监听器趋势测试。
- 不提供全员同步、平台账号绑定、歌词、音效或高码率解码保证。
- 构建仍提示已有大块以及鱼小圈 MomentEditor 的静态 / 动态混合导入；此次没有放宽预算或更改拆包规则。

## 临时产物

清理未完成：自动安全审查先后拒绝了含路径范围校验的清理、仅针对已核对测试目录的删除、以及不递归的五个日志文件删除；返回理由均只有 `blocked by policy`。没有把这些产物当成正式交付物。音乐测试 / preview 已结束，用户提供的参考图片保留。

以下为仍需后续逐项核对清理的路径；`dist` 和后端 `target` 原先已存在，只能清理本任务的构建 / 测试产物，不能删除整个共享 `target`：

| 残留路径                                                                                                                       | 内容                                     |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `E:\owner-project\fish-island-next\test-results-music-task`                                                                    | 音乐矩阵截图和测试结果                   |
| `E:\owner-project\fish-island-next\test-results-music-performance-task`                                                        | 稳态对照测试结果                         |
| `E:\owner-project\fish-island-next\test-results-music-performance-final-task`                                                  | 光盘最终版性能测试结果                   |
| `E:\owner-project\fish-island-next\test-results-music-tools-task`                                                              | 一次性体积统计与测试重排脚本             |
| `E:\owner-project\fish-island-next\music-task-run.log`                                                                         | 最终 134 通过 / 1 跳过的矩阵日志         |
| `E:\owner-project\fish-island-next\music-task-performance.log`                                                                 | 无音乐与音乐稳态对照日志                 |
| `E:\owner-project\fish-island-next\music-task-performance-final.log`                                                           | 光盘最终版稳态日志                       |
| `E:\owner-project\fish-island-next\music-task-check.log`                                                                       | 最终全量检查日志                         |
| `E:\owner-project\fish-island-next\music-task-build.log`                                                                       | 中间生产构建日志                         |
| `E:\owner-project\fish-island-next\dist`                                                                                       | 本次校验重新生成的前端构建；目录原先存在 |
| `E:\owner-project\fish-island-backend\target\surefire-reports\com.cong.fishisland.thirdparty.music.MusicUpstreamTest.txt`      | 本次代理单测报告                         |
| `E:\owner-project\fish-island-backend\target\surefire-reports\TEST-com.cong.fishisland.thirdparty.music.MusicUpstreamTest.xml` | 本次代理单测报告                         |
| `E:\owner-project\fish-island-backend\target\classes\com\cong\fishisland\thirdparty\music`                                     | 音乐代理编译子目录                       |
| `E:\owner-project\fish-island-backend\target\test-classes\com\cong\fishisland\thirdparty\music`                                | 音乐代理测试编译子目录                   |
