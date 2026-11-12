# 滚动分页验收（ADR-034）

日期：2026-11-12。数据：拦截接口返回的合成数据，不使用真实账号或聊天记录。

## 整改入口

| 入口                   | 实现                                             | 状态                                            |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------- |
| 鱼小圈动态             | features/fish-circle/CircleFeed.tsx、use-page.ts | 下滑追加，去除页码/翻页                         |
| 评论                   | features/fish-circle/Comments.tsx                | 展开本地预览后下滑追加，保留回复操作            |
| 互动通知               | features/fish-circle/CircleNotifications.tsx     | 列表内部滚动追加，已读/选择范围为已加载消息     |
| 行囊、物品手册、补给铺 | features/pet/ItemsPanel.tsx、use-pet-pages.ts    | 弹窗内部追加                                    |
| 外观                   | features/pet/SkinsPanel.tsx                      | 弹窗内部追加                                    |
| 幸运补给领取记录       | features/pet/SupplyPanel.tsx                     | 弹窗内部追加                                    |
| 在线阅读搜索           | features/reader/OnlineSearch.tsx                 | 保留 SSE 和 lastIndex，滚动续载，失败不提交游标 |
| 赞助榜、打赏动态       | features/about/use-donations.ts、DonationEnd.tsx | 原滚动分页改为共享观察器/Hook，保留数量反馈     |

共享实现：shared/ui/InfiniteScroll。后端 current/pageSize 和阅读游标协议保持不变；未分页的有限列表和阅读正文的章节导航不改变。

## 验证范围

主题：WPS、微信、企业微信、飞书、钉钉；各主题均验证明亮/暗夜模式。视口：桌面 Chromium 1280×720、手机 Chromium 375×812、390×844。

- scroll-pagination.spec.ts：动态/评论、五个伙伴分页面板，追加、去重、停止、错误保留、重试、键盘滚动及内部/页面无横向溢出。
- circle-notifications.spec.ts：加载、短列表自动续载、重复页停止、已读/删除、错误/空状态、关闭及焦点返回。
- reader-import.spec.ts：首批 loading/empty/error、流式追加失败和同游标重试、重试后继续下一批、去重、结束、添加书架、关闭及焦点返回。
- about-navigation.spec.ts：榜单及动态追加、多页结束、错误重试、数量、滚动区 gutter、主题和手机布局。
- fish-circle.spec.ts、fish-circle-layout.spec.ts：筛选/刷新、发布/评论变更后的分页重置、评论子回复、首批错误及空态。

测试命令：`npx playwright test --config playwright.scroll-pagination.config.ts`。配置独立构建预览并注入合成阅读凭证，可用 SCROLL_TEST_PORT 选择独立端口。结果与截图位于 test-results-scroll-pagination、test-results-scroll-final。

## 实际运行结果

- 最终 `npm run check` 通过：Prettier、ESLint、TypeScript、30 个测试文件 / 120 个单元测试及生产构建。构建仍有既有人生重开大块体积提示。
- 390px 独立重点回归：`scroll-pagination.spec.ts reader-import.spec.ts circle-notifications.spec.ts --project=mobile-390 --workers=2`，**40 项全部通过**（3.2 分钟）。覆盖全部 5 个主题及明暗模式，包含五个伙伴分页面板的初始失败/空态与追加失败恢复，以及流式搜索重试后继续第三批。
- 首轮矩阵已执行桌面和 375px 的主题/模式组合，包括赞助榜、打赏动态、通知、阅读、动态、评论和伙伴面板；在并行任务较多时出现超时，后续批次中止，不能将该批次记为 150 项全部通过。
- 三项已知超时单独重跑均通过：375px 钉钉暗夜动态/评论（1 项）；桌面 WPS 明亮伙伴五面板（1 项）；390px 钉钉暗夜赞助榜（1 项）。证据分别在 test-results-scroll-retry-feed、test-results-scroll-retry-camp、test-results-scroll-retry-about，均有 `.last-run.json` 的 passed 结果。
- 390px 首轮赞助榜在末尾 `/about` 路由回归的导航属性断言超时，分页加载/重试/结束已完成；同一用例单独重跑通过。
- 额外的鱼小圈旧版全流程补充批次（fish-circle.spec.ts / fish-circle-layout.spec.ts）出现浏览器 context 初始化超时后中止；未完成全套端到端回归，不能宣称全仓 E2E 全绿。早期 375px 已通过动态刷新/筛选/错误/空态以及发布、点赞、评论、编辑、删除流程；这不能替代完整补充批次。

实际检查了桌面和 375px/390px 的明暗截图，包含动态结束反馈、通知续载及伙伴弹窗列表；脚本断言列表去重、已有内容保留、请求序列、内部和页面无横向溢出。

## 限制

浏览器验证采用桌面 Chromium 及手机设备模拟，未在真实 iOS Safari、Android 设备、实际手势滑动和真实后端长时网络环境下验证；未实现的聊天消息历史不在本次验收范围。全量性能/有界聊天历史缓存仍遵守 performance.md，未在本次声称完成。
