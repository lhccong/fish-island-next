# 像素抽奖转盘验收

日期：2026-11-15。实现基线：ADR-079；旧版参考 `fish-island-frontend/src/pages/Pet/Lottery.tsx` 与 `Lottery.less`，请求规则同时对照后端 TurntableServiceImpl。

## 已验证

- `npm run check` 通过：99 个测试文件、400 项单元测试，格式、ESLint、类型检查及生产构建通过。专项浏览器命令最终退出码 0，36 passed；Windows 上用例结束后清理了残留的测试工作进程。
- Chrome 发布构建，`playwright.lottery.config.ts`，36 组组合：pixel-island、wps、wechat、wecom、feishu、dingtalk × light/dark × 1440×1000、375×844、390×844。
- 初次 loading、读取失败与重试、空转盘、空中奖记录；单抽、十连抽结果关闭与焦点返回、积分不足反馈。
- 每日免费为全部转盘共享：首次单抽免费、切换另一转盘后收费、重新打开后保持已使用状态。首次十连显示九抽价格，服务端仍是最终结算来源。
- 27 条合成中奖记录按 13 条分批；独立视口连续续载、失败保留已有记录、显式重试、结束提示。限高桌面不超过 440px、手机 300px；标题与正文分离。
- 内部视口 Home/End，首末记录可达、实际滚动位置变化；桌面主动悬停显示滑轨，手机滑轨隐藏；reserved gutter 桌面至少 24px、手机至少 20px，内部与页面无横向溢出。手机触屏点击抽奖与重试。
- 单元测试覆盖旧版九宫格高亮顺序、服务端中奖落点、取消时清理计时器、奖池条目 ID 与装备模板 ID 区分、进度解码、全局免费查询与当前转盘记录过滤。

## 截图

截图使用合成账号和替代图标，无真实账号、凭证或聊天记录。

- [桌面明亮](./pixel-lottery/desktop-light.png)
- [桌面暗夜中奖记录与可见滑轨](./pixel-lottery/desktop-dark-records.png)
- [375px 明亮](./pixel-lottery/mobile-375-light.png)
- [390px 暗夜中奖记录](./pixel-lottery/mobile-390-dark-records.png)

## 边界

浏览器业务测试使用合成接口数据，未进行真实账号积分扣除；未验收实体手机上的惯性滑动、跨午夜保持打开、跨标签页同时抽奖。外观切换没有进入请求依赖，运行中的跨主题/模式切换未在本专项新增交互用例。保留既有构建体积及 MomentEditor 静态/动态混合导入告警。

临时测试输出及测试发布构建位于本次独立 `test-results-lottery-079`，提取截图后清理；早期开发构建的 `.tmp-lottery-079` 已清理。正式验收截图保留在本目录。
