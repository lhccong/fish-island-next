# 基础设施适配层

后续在此实现 HTTP、WebSocket、缓存和 DTO 映射。通过 domain 定义的端口供 app 注入 features。

当前 hot-board 实现公开 HTTP 热榜读取及 DTO 解码，模块入口为 hot-board/index.ts，app 创建后注入功能；请求支持取消和超时，不携带凭证。不在适配器创建时发送请求。

auth 实现账户/邮箱登录、当前用户与退出，以及按后端地址隔离的 SessionVault；凭证只由认证服务持有，密码不持久化。会话状态属于 features/auth，不在基础设施中导航或弹窗。

不得直接导入组件、store、皮肤和路由，不能调用 toast。聊天 WebSocket 与缓存尚未实现。
