# 基础设施适配层

后续在此实现 HTTP、WebSocket、缓存和 DTO 映射。通过 domain 定义的端口供 app 注入 features。

当前没有真实实现，不在初始化时建立连接或发送请求。不得直接导入组件、store、皮肤和路由，不能调用 toast。
