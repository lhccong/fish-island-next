# ADR-064 签到迁移

日期：2026-11-14。状态：采用。

## 原因与影响

迁移旧版每日签到、月度日历及补签。domain/sign-in 定义模型和端口，infrastructure/sign-in 校验旧接口，features/sign-in 独立持有请求与交互，app 注入账号凭证，经账号资料的组合插槽提供入口。不将签到状态加入聊天或账号资料状态；账号变化卸载，关闭取消请求，主题和模式变化不重挂载。

沿用 `/api/user/signIn`、`/api/sign/status`、`/api/sign/month` 和 `/api/sign/makeup`。奖励及可补签资格由服务端决定，补签确认说明每次20积分、每月最多3次、最近7天限制。月历切换属于日期浏览，不是列表分页。

## 替代方案

不复制旧版巨型头像组件、Ant Design 或 moment；使用现有 Dialog、Button、ScrollArea 和原生日期计算。账号功能通过 ReactNode 插槽组合，禁止 feature 直接依赖其他 feature。

## 验证

适配全部注册主题、明暗、桌面及375/390px；校验请求取消、重复提交、失败重试、跨年日历、补签确认、滚动间距和焦点。执行 npm run check 及合成接口浏览器流程；真实账号操作不在自动验收中执行。
