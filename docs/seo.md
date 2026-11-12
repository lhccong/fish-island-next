# 站点名称与 SEO

对外站点名称为“摸鱼岛”。`index.html` 在初始 HTML 中提供中文页面语言、站点标题、内容描述、Open Graph、Twitter 分享摘要和 WebSite 结构化数据，不依赖客户端请求或登录状态。描述仅包含已接入的热榜、鱼小圈、阅读和游戏，不宣传尚未接入的聊天能力。

本次仅调整文档元信息，不改变页面布局、主题、明暗模式或业务状态。所有路由仍共用 SPA 初始文档；这不是服务端渲染，不能保证搜索引擎收录动态内容或改变搜索排名。

生产域名为 `https://yucoder.cn/`，已配置绝对地址的 canonical、`og:url`、结构化数据 `url`。`public/robots.txt` 提供 sitemap 地址，`public/sitemap.xml` 仅列出公开热榜首页，不收录登录、授权、个人资料和需要鉴权的页面。不从浏览器当前地址自动生成这些字段，以免收录本地、预览域名或授权查询参数。

当前 SPA 共用首页 canonical。后续如为其他公开路由提供独立搜索入口，需同时提供对应的初始 HTML 标题、描述和 canonical，再加入 sitemap。部署需通过 HTTPS 提供上述域名，并让 `/robots.txt` 和 `/sitemap.xml` 返回真实静态文件，不能被 history fallback 替换为 HTML。预览环境应由部署层提供 noindex。

如需进一步收录公开榜单内容，应单独评估预渲染或服务端渲染，按架构规范先记录 ADR；登录和授权页的 noindex 应在部署响应头或对应路由的初始 HTML 中提供。当前变更未实现这些部署配置。
