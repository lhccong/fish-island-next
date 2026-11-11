# ADR-006：接入旧摸鱼岛账号与邮箱登录

- 日期：2026-11-11
- 状态：采用

## 协议与范围

对照旧 LoginRegister 和后端 UserController/UserServiceImpl：账号 POST /api/user/login，JSON userAccount/userPassword；邮箱 POST /api/user/email/login，JSON email/userPassword；登录响应 code=0、data 为用户并含 saTokenInfo.tokenName/tokenValue。GET /api/user/get/login 恢复用户；POST /api/user/logout 注销。受保护请求携带服务端指定的 Sa-Token 请求头并使用 credentials=include，与旧客户端一致。公开热榜仍不携带凭证。

本轮实现账户/邮箱密码登录、用户头像入口、刷新恢复、退出、跨标签页同步和 /chat 路由守卫。/user/login 兼容旧登录地址，redirect 仅允许本站相对路径，登录成功返回原页面。会话状态区分恢复中、游客、已登录、恢复失败；网络失败不当作凭证失效，不清除有效登录信息，提供重试。

## 边界与持久化

domain/auth 定义 AuthPort、SessionVault 与领域模型；infrastructure/auth 完成 DTO、HTTP、浏览器持久化；features/auth 管理独立 Zustand 会话和表现；app 注入服务与装配路由，不允许业务组件直接访问 localStorage 或后端 DTO。

确认旧 Sa-Token 协议后保存 token，不保存账号密码或整份个人资料。凭证按后端地址命名空间隔离；勾选保持登录写 localStorage，否则写 sessionStorage。旧项目不同源存储不会自动共享。跨标签页变化重新校验；并发请求使用序号与取消信号，旧请求不得覆盖新登录/退出结果。StrictMode 重挂载复用恢复请求。

认证失败清除本机凭证并回到游客；恢复的网络错误保留凭证。退出始终清理本机信息，若服务器注销失败明确提示“已退出本机，但未能确认服务器注销”，不声称远端 token 已撤销。前端守卫仅影响导航，后端继续决定权限。

## 未迁移能力与验证

注册、注册滑块/邮箱验证码、找回密码及 Linux Do/OAuth 回调属于后续独立账号功能，不放置未绑定按钮；本轮不修改后端或创建真实账号。旧密码登录不要求验证码。第三方回调的部署域名需要配套配置，不能直接复用生产回调冒充新站登录。

验证账号/邮箱请求形状、凭证解码、动态请求头、错误处理、存储隔离、恢复网络错误、失效、退出及竞态。浏览器覆盖登录失败/成功、刷新恢复、受保护跳转、保持登录、退出和手机布局。真实服务仅验证匿名会话状态及跨域，不用虚构账号尝试登录，也不读取用户现有凭证；真实账号成功登录需由用户自行验证。
