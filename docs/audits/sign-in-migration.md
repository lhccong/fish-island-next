# 签到迁移验收

日期：2026-11-14。决策：ADR-064。

## 接口与入口

| 旧版能力   | 新版入口与实现                                                         |
| ---------- | ---------------------------------------------------------------------- |
| 每日签到   | 用户头像 → 每日签到，POST `/api/user/signIn`                           |
| 月历与统计 | GET `/api/sign/month`，月历浏览、连续/累计天数、可用积分、剩余补签次数 |
| 今日状态   | GET `/api/sign/status`，浏览历史月份时仍显示今日状态                   |
| 补签       | 点击可补签日期 → 统一 Dialog 确认20积分消耗 → POST `/api/sign/makeup`  |

所有成功、积分奖励、可补签日期都以服务端为准；不复制旧版会员硬编码奖励提示。账号通过 app 注入凭证，feature 不引用其他 feature。关闭卸载并取消请求，账号变化销毁状态，主题与模式不进入请求依赖。全部按钮使用共享 Button 或有原生 button 语义的日历日期控件，无原生 select、系统确认框或新依赖。

## 自动化

`src/infrastructure/sign-in/client.test.ts`：跨年/闰年、重复/错误日期和无效数值、签到/补签协议、真实奖励映射、认证失效、错误与伪成功响应。

`tests/e2e/sign-in.spec.ts` 与 `playwright.sign-in.config.ts`：遍历注册表的5个主题（WPS、微信、企业微信、飞书、钉钉）与明暗模式，桌面1280×720、375×812、390×844。合成账号和接口覆盖 loading / empty / error / success、签到与补签失败重试、消耗确认和取消、月份往返、已签到禁用、手机日期44px命中区、触屏点击、reserved gutter、内部横向溢出、滚动到底、Esc关闭及焦点返回。微信明亮场景还在日历打开时通过外观模块公开状态接口遍历主题/模式，检查月份与已签到状态保留、请求数不增加。

使用独立4211端口，浏览器截图用于对照布局。临时产物清理受执行策略阻止，具体残留见下文。

## 本次结果

- `npm run check` 最终通过：格式、ESLint、TypeScript、82个测试文件/340项测试及生产构建。曾出现其他模块的中间失败，最终已由当前工作区变更消除；构建仍有既有大分块提示，单测进程有退出超时警告，但命令退出码为0。
- 30种主题/模式/视口组合的功能断言均已执行，29例正常报告通过，375px微信暗夜一例在功能断言结束后的浏览器 context 回收阶段超时；该例单独复测功能断言通过（2.4秒），进程回收仍未正常结束，已停止测试。不能将此记为完整浏览器套件退出成功。
- 已对全部主题、明暗、桌面及375/390px的实际截图进行视觉复核。截图属于待清理临时产物，不属于正式交付物。

## 清理受阻与残留

执行前已确认本次专用目录不在已有目录清单中，且删除目标均为明确的绝对路径。PowerShell 的递归删除被执行策略拒绝（`blocked by policy`）；改为直接列出三个已核对的仓库内绝对路径后仍遭拒绝，因此停止尝试。当前环境不能申请提升权限。

本次已确认残留，需在允许文件删除的本地环境手动清理：

- `E:\owner-project\fish-island-next\test-results-sign-in`：验收截图、对照图和浏览器测试结果。
- `E:\owner-project\fish-island-next\test-results-sign-in-retry`：单例复测截图和结果。
- `E:\owner-project\fish-island-next\test-results-sign-in-build`：隔离的中间生产构建。
- `C:\Users\SEASUN\AppData\Local\Temp\playwright_chromiumdev_profile-jKBDsm`：本次浏览器临时配置。
- `C:\Users\SEASUN\AppData\Local\Temp\playwright_chromiumdev_profile-BXSPEa`：本次浏览器临时配置。
- `C:\Users\SEASUN\AppData\Local\Temp\playwright_chromiumdev_profile-IRJowr`：本次浏览器临时配置。

浏览器配置目录须在对应测试浏览器退出后删除；其他来源的临时目录没有处理。仓库原有的 `dist` 已由最终 `npm run check` 更新为生产构建，作为正式构建输出保留；未删除原先存在的其他任务结果目录。

## 未验证范围

不使用真实账号执行签到或扣除补签积分；线上服务端联调、跨午夜长时间打开、真实手机软硬件与读屏器未验证。没有输入框，不涉及软键盘流程。其余检查结论以本次交付说明为准。
