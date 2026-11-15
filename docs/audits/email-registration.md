# 邮箱注册迁移验收

日期：2026-11-15。对应 ADR-080。入口：登录弹窗 → 注册。

## 实现

- 沿用旧 `/api/user/email/send` 和 `/api/user/email/register`；账号选填，完整邮箱、至少八位密码、确认密码、邮件验证码必填。
- 发送中与提交中使用 LoadingIndicator；请求互斥，发送成功进入 60 秒倒计时；失败保留输入并允许重试。
- 有效用户 ID 才确认成功，清除注册密码并返回邮箱预填的登录表单，不建立会话。
- 固定标题、关闭和注册反馈/操作区，正文 reserved ScrollArea；共享 Button 与语义配色，手机输入 16px，触控至少 44px。
- 卸载取消注册/验证码请求并清除计时器；密码和注册草稿不进入持久化存储或日志。

## 方法与范围

Windows、本机 Chrome、Vite 开发服务、Playwright。全部网络响应使用合成数据拦截，没有发送真实邮件或创建账号。

矩阵覆盖六个注册主题：摸鱼岛像素风（pixel-island）、WPS（wps）、微信（wechat）、企业微信（wecom）、飞书（feishu）、钉钉（dingtalk）；明亮/暗夜；1280×720、375×812、390×844。

`tests/e2e/registration.spec.ts` 覆盖空表单阻止提交、选填账号、发送及倒计时、密码不一致、注册 loading、验证码拒绝后重试、成功返回登录且无持久化会话、首项可达、手机 CDP 触屏滚动、末项和固定提交可达、gutter 布局断言、无横向溢出、关闭；另在三种视口验证验证码网络失败与关闭在途请求。截图检查像素风桌面明亮及 375px 暗夜的比例、正文与操作分区，截图为临时验证产物，提取结论后删除。

`src/infrastructure/auth/registration.test.ts` 检查旧字段、匿名请求、字符串长 ID、无效成功响应、业务拒绝及验证码发送未确认。

结果：注册专项 39/39 浏览器测试通过；`npm run check` 通过（100 个单元测试文件、409 项测试通过，含格式、ESLint、类型检查及生产构建）。

## 清理受阻

已停止本次启动的开发服务，已核对下列绝对路径及其范围。自动审批审查拒绝了递归删除操作，仅返回 `blocked by policy`，没有提供进一步原因，因此以下产物仍保留，需后续手动删除；未删除来源不明的其他目录。

- `E:/owner-project/fish-island-next/dist`：本次检查生成的构建输出，已确认内容仅包含生成的 index/assets 与 public 文件副本。
- `C:/Users/SEASUN/AppData/Local/Temp/fish-registration-20261115-results`：初轮浏览器验证产物。
- `C:/Users/SEASUN/AppData/Local/Temp/fish-registration-final-20261115-results`：中间验证产物。
- `C:/Users/SEASUN/AppData/Local/Temp/fish-registration-verified-20261115-results`：旧登录回归的截图、失败追踪。
- `C:/Users/SEASUN/AppData/Local/Temp/fish-registration-matrix-20261115-results`：最终通过的注册矩阵截图与结果。

## 限制与其他回归

- 未验证真实服务的邮件投递、验证码频率限制与实际建号；未验证真机软键盘与输入法。
- 旧账号密码注册 `/api/user/register` 的滑块验证不属于邮箱注册协议，本次未迁移。
- 原有 `auth.spec.ts` 额外回归中，桌面“账号登录失败/跳转/刷新/退出”在刷新后的用户菜单点击处超时，出现节点反复卸载；“邮箱登录持久化与跨标签退出”在资料菜单项定位处超时。登录提交与进入工作台步骤已通过，完整退出流程未通过。未改写当前工作区其他账号菜单或签到变更。
- 构建保留既有大 chunk 与 MomentEditor 静态/动态混合导入提示。
