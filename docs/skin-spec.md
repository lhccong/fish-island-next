# 外壳与皮肤协议

状态：基础配色和微信工作台外壳已实现；完整聊天外壳、导入器和其他平台布局待实现。

## 1. 两个独立维度

- shellId 决定微信、飞书、钉钉等结构布局。
- skinId 决定 token、字体、背景和图标资源。
- 外壳支持的区域：navigation、conversations、header、messages、composer、auxiliary。
- app 组合功能区域并传入外壳 slots；皮肤选择不持有消息，不建立连接，不触发历史重取。
- 当前内置 ID 决定配色；真正接入外壳时新增独立 shellId，不能让相同名称隐式绑定布局。

ADR-008 新增 `wecom` 企业微信主题，工作台“主题”按钮与初始化页共享选择，刷新后恢复。企业微信主题复用微信工作台结构。

内置配置完整提供 `--color-accent`、`--color-accent-soft`、`--color-accent-text`、`--color-selected-muted`、`--color-rail`、`--color-sidebar`、`--color-message-outgoing` 七个颜色 token。第三方导入仍只开放前两个，其他字段只用于受信任的内置配置。

## 2. 第一版导入包设计

第一阶段只导入声明式文件，不执行 JavaScript、不接收任意 HTML 或 CSS。ZIP 解包依赖在导入功能实施时经 ADR 选择。

```text
skin-package.zip
  manifest.json
  tokens.json
  assets/                  可选 PNG/WebP/JPEG 等资源
```

拟定 manifest v1（设计契约，不代表现有校验器）：

```json
{
  "schemaVersion": 1,
  "id": "community.ocean",
  "name": "海风",
  "version": "1.0.0",
  "author": "示例作者",
  "compatibleShells": ["wechat", "feishu", "dingtalk"],
  "tokensFile": "tokens.json",
  "assets": {}
}
```

tokens.json v1 示例：

```json
{
  "--color-accent": "#10b46c",
  "--color-accent-soft": "#e9f5ee"
}
```

现阶段第三方可导入白名单只有上述两个颜色 token；内置配置使用 ADR-008 规定的七个颜色变量。global.css 中的外壳、状态色、--color-selected-muted、--color-accent-text、--color-divider 等是工作台默认设计变量，当前不对导入包开放。微信参考配色：导航 #dfdfdf、来源列表 #e8e8e8、内容 #fafafa、选中行 #10b46c。选中行文字使用 on-accent/selected-muted，普通链接使用更深的 accent-text 保持可读。后续开放画布、文字、气泡、间距等变量时，必须同步类型、schema、边界值、默认值、兼容说明和测试；不能直接放行所有 CSS 变量。

## 3. 校验与生命周期（导入实现时必须满足）

1. 文件进入临时区；校验扩展名、实际格式、包版本和必要字段，忽略文件名作为可信类型的假设。
2. ZIP 暂定上限：压缩 5MiB、解压总计 20MiB、最多 100 文件。先检测条目和解压限额；阻止 ../、绝对路径、重复规范化路径及压缩炸弹。
3. token 仅限白名单；颜色采用受支持的明确颜色格式，不接收 url()、var()、表达式等任意 CSS 字符串。尺寸值设合理上下界。
4. 资源仅允许包内相对路径；不自动加载远程 URL。首版不支持 SVG、字体和脚本，避免未定义的执行或网络行为。
5. 预览隔离应用，取消恢复原皮肤；通过后用户主动应用，失败不破坏当前皮肤。
6. 持久化包版本、校验结果与资源；切换/删除时释放 object URL，恢复默认始终可用。
7. 缺失可选 token 使用默认值；未知 schemaVersion 或不兼容外壳给出明确反馈，不能静默部分应用。

## 4. 设计与兼容验收

ADR-009 的独立 SSO 页使用默认 `--color-sso-*` 与 `--shadow-sso-*` 语义变量复现旧版灰色点阵、白卡片与黑色主按钮，不随工作台主题变色；暂不开放第三方皮肤导入。

旧热榜总览的颜色统一使用 --color-hot-*，阴影使用 --shadow-hot-card/--shadow-hot-tab。这些局部表现变量用于复刻旧模块，不修改微信外壳配色，也暂不开放第三方导入。

按用户后续调整，分类选中态采用 accent-soft 背景与 accent-text 文字；hot-ribbon 引用 accent，hot-ribbon-fold 和 hot-link 引用 accent-text。旧模块蓝色缎带与橙色选中态已改为微信主题色。

只读热榜消息使用 --color-message-surface，滚动滑块使用 --color-scrollbar/--color-scrollbar-hover；这些是默认设计变量，暂不属于导入包白名单。

- 覆盖普通文字、链接、选中、禁用、聚焦、失败、未读、图片占位等状态。
- 皮肤无法改变业务权限、请求地址、消息内容或连接行为。
- 微信、飞书、钉钉外壳采用自己的布局模块，不复制业务处理函数。
- 不引入可执行第三方外壳插件；若未来需要，必须单独设计信任与隔离模型并记录 ADR。
