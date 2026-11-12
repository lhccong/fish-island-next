# 手机导航与隐藏滚动条验证

日期：2026-11-12。范围：ADR-032、ADR-033。

## 实现

- 手机外层热榜与发现显示底部四项导航，内层工作台隐藏全局导航，保留返回入口。
- 外层头像移至页头右上角，隐藏手机热榜右侧说明；WPS 手机隐藏办公装饰与重复表格标题。桌面布局保留。
- 全局隐藏手机原生滚动条，共享 ScrollArea 隐藏手机 Radix 滑轨，保留原 viewport、事件、位置和 reserved gutter。修改 AGENTS.md 第 13 条并新增第 15 条。

## 已验证

主题：wechat、wecom、feishu、dingtalk、wps，分别验证 light / dark。

视口：桌面 Chromium 1280×720（WPS 专项另用 1920×1080）、手机 Chromium 375×812、390×844。

- 22 个桌面及 44 个手机浏览器场景：导航位置与隐藏、返回和浏览器历史、头像位置及触屏打开登录、主题弹窗与焦点归还、热榜详情和发现到游戏的导航、无横向溢出。
- 热榜 loading / empty / error / success 下的导航和布局。
- 群聊在线成员 loading / empty / error / success，搜索、展开/收起、刷新、关闭与焦点，草稿在主题/模式切换后保留且无额外成员请求。
- 热榜内部列表与 WPS 主内容键盘 End、程序 scrollTop、CDP touch 手势滚动；手机 Radix 滑轨隐藏、桌面滑轨可见；聊天原生 textarea 隐藏原生滚动条。成员列表首末项与 gutter 断言继续通过。
- 查看实际手机截图，确认右上角头像、四项底栏、内层无全局菜单、明暗模式及隐藏滑轨后的正文和操作区。
- npm run check 通过：格式、Lint、类型、29 个单测文件 / 118 项单元测试、生产构建。

执行：playwright.mobile-navigation.config.ts。最终结果来自桌面矩阵、手机矩阵及专项复测。手机 WPS 历史用例按当前朋友圈的按钮返回入口修正后，两种手机宽度专项通过。两项 390px touch 位移用例在并发运行时未收到位移，单 worker 原代码复测均通过。

截图位于 test-results-mobile-verified/、test-results-mobile-gesture-recheck/、test-results-wps-mobile-final/；桌面结果位于 test-results-mobile-final/。这些目录已被仓库忽略。

## 未验证范围

未进行真实 iOS / Android 设备、系统软键盘、独立画中画窗口的设备验收；未逐一回归阅读、伙伴和关于等模块的完整业务流程与所有长下拉列表。本次验证集中在导航、热榜、群聊、账号入口及共享滚动表现，不替代各模块既有业务验收。
