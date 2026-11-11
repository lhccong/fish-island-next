# ADR-009：迁移摸鱼岛 SSO 授权页

- 日期：2026-11-11
- 状态：采用

旧站 `/oauth2/authorize` 是摸鱼岛作为 OAuth2 提供方的用户授权页，与 Linux Do 第三方登录不同。本次迁移原页面的灰色点阵、锁图标、用户卡片、应用信息、权限展开和允许/拒绝操作。保持 client_id、redirect_uri、response_type（默认 code）、scope（默认 read）、state 参数；未登录经现有登录页返回完整授权路径，拒绝回首页。

domain/sso 定义应用信息与授权端口；infrastructure/sso 适配 GET /api/auth/app/info?clientId 与 GET /api/oauth2/authorize，通过注入的凭证读取器携带 Sa-Token、credentials=include。features/sso 持有请求、展开和提交状态；app 组合现有鉴权、服务与导航。授权码换 token 属于第三方服务端职责，不迁入浏览器。无新增依赖。

授权仅在用户点击允许后请求；服务端负责校验客户端、回调地址和权限。兼容返回 URL 字符串及 code/data 包装，仅接受 HTTP(S) 回调地址。参数缺失、空应用、网络失败与授权失败明确显示，可重试；过期会话重新恢复并进入登录。请求取消、重复提交与旧响应处理在功能边界内完成。

替代方案：复制旧 Ant Design 页面会引入第二套 UI 与跨层请求，违反现有基线；因此使用现有 React、Lucide 与 CSS Modules 还原样式。专用 SSO token 置于默认 token 中，不随工作台主题改变。

验证：检查请求参数、动态凭证头、成功回调与失败处理；浏览器覆盖未登录返回、权限展开、允许/拒绝、加载、空数据、异常、重试和重复提交，以及桌面、375px、390px 手机交互及溢出；执行 npm run check。真实第三方授权链路需在部署端将授权入口切换至 next 域名后验证。
