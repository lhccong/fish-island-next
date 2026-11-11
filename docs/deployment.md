# Linux / 1Panel 部署

服务器准备 Git、Node.js（推荐 22 LTS，至少 22.12）和 npm。执行用户需要有源码目录与站点目录写权限。仓库分支为 master。

首次拉取并部署：

```bash
git clone --branch master https://github.com/lhccong/fish-island-next.git /opt/fish-island-next
cd /opt/fish-island-next
bash scripts/deploy.sh
```

后续更新：

```bash
cd /opt/fish-island-next
bash scripts/deploy.sh
```

脚本会拉取 master，执行 npm ci、npm run build，将 dist **内容**发布到 `/thome/1panel/1panel/www/sites/new.yucoder.cn/index`，不会生成额外的 dist 子目录。构建失败不会进入发布阶段。静态资源先复制，再替换 index.html；旧哈希资源及服务器配置保留，可另行定期清理。源码工作区有未提交改动时停止，不覆盖本地修改。

默认后端为 https://api.yucoder.cn。需要修改时，在源码根目录创建 `.env.local`（已被 Git 忽略）：

```dotenv
VITE_API_BASE_URL=https://api.yucoder.cn
```

修改后重新执行部署脚本。VITE 环境变量会公开到前端产物，不能存放密钥。

1Panel 站点根目录指向上述 index 目录。React Router 使用 history 路由，在站点 Nginx/OpenResty 配置的 `location /` 中配置回退，避免直接打开登录或授权页时出现 404：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

若已有 `location /`，修改该块，不要重复添加。部署脚本只发布文件，不操作服务器服务配置。后端需允许站点域名的跨域请求；登录请求携带凭证时需配置明确的允许来源及凭证支持。
