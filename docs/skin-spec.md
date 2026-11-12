# 外壳与皮肤协议

状态：基础配色和微信工作台外壳已实现；完整聊天外壳、导入器和其他平台布局待实现。

## 1. 独立的外观维度

ADR-019 新增独立的 `colorMode`（明亮 light / 暗夜 dark），与 shellId、skinId 正交组合。主题注册表保留明亮默认值，`getSkinTokens` 为实际工作台和预览提供相同的模式组合。暗夜基础背景 `#191A1C`，局部配色通过模式语义变量覆盖；图片、封面和插画不反色。仅内置可信配置使用组合结果，第三方导入白名单保持不变。

- shellId 决定微信、飞书、钉钉等结构布局。
- skinId 决定 token、字体、背景和图标资源。
- 外壳支持的区域：navigation、conversations、header、messages、composer、auxiliary。
- app 组合功能区域并传入外壳 slots；皮肤选择不持有消息，不建立连接，不触发历史重取。
- 当前内置 ID 决定配色；真正接入外壳时新增独立 shellId，不能让相同名称隐式绑定布局。

ADR-008 新增 `wecom` 企业微信主题，工作台“主题”按钮与初始化页共享选择，刷新后恢复。企业微信主题复用微信工作台结构。

ADR-013 新增 `wps`（WPS 表格）内置主题，参考 WPS 表格的浅灰导航、白色工作区和绿色强调色，提供完整十二个 token。复用现有主题预览、选择和持久化流程及响应式工作台，不增加表格编辑能力或新的 shellId。

ADR-016 根据后续需求新增独立 `wps` shellId；app 目前将选择 wps 主题显式映射至该外壳，其余主题映射至微信工作台。受信任的组合规则不属于皮肤 token 权限。共用布局组件接收 `navigationLayout="ribbon"`，导航占据顶端，现有业务 slots 和草稿保持挂载。聊天、热榜、鱼小圈在文档标签行各占一个路由标签，白底与 aria-current 标识当前页；工具区不重复这些入口。手机隐藏次要办公示意，保留可触达的顶部标签、账号与主题入口。装饰工具不提供虚假的编辑能力。

内置配置完整提供 `--color-accent`、`--color-accent-soft`、`--color-accent-text`、`--color-selected-muted`、`--color-rail`、`--color-sidebar`、`--color-message-outgoing`，以及 ADR-011 新增的 `--color-message-incoming`、`--color-rail-active`、`--color-hover`、`--color-canvas`、`--color-surface`，共十二个颜色 token。全部为六位十六进制颜色，默认值与微信主题一致；主题预览和实际界面使用同一组变量。第三方导入仍只开放前两个，其他字段只用于受信任的内置配置。

## 2. 第一版导入包设计

ADR-017 的 WPS 热榜为 app 显式注入的 table 呈现变体，不由皮肤配置操作业务。采用现有白底、灰色边框、绿色标签变量复现多维表格；手机将来源移入标题单元格，隐藏次要列。主题入口在工具栏内预留至少 60px，控件不超出容器。

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

现阶段第三方可导入白名单只有上述两个颜色 token；内置配置使用 ADR-008 与 ADR-011 规定的十二个颜色变量。global.css 中的外壳、状态色、--color-selected-muted、--color-accent-text、--color-divider 等是工作台默认设计变量，当前不对导入包开放。微信参考配色：导航 #dfdfdf、来源列表 #e8e8e8、内容 #fafafa、选中行 #10b46c。选中行文字使用 on-accent/selected-muted，普通链接使用更深的 accent-text 保持可读。后续开放画布、文字、气泡、间距等变量时，必须同步类型、schema、边界值、默认值、兼容说明和测试；不能直接放行所有 CSS 变量。

ADR-012 的鱼小圈右侧使用默认 `--color-circle-*`、`--shadow-circle-*` 与 `--radius-circle-*`，保留旧版白卡、浅灰底、蓝灰文字、暖橙置顶和发布按钮；封面读取账号图片。ADR-015 仅改变左侧发现栏，选中行使用当前主题 accent/on-accent；不改变右侧局部配色，不扩大第三方导入白名单。

## 3. 校验与生命周期（导入实现时必须满足）

1. 文件进入临时区；校验扩展名、实际格式、包版本和必要字段，忽略文件名作为可信类型的假设。
2. ZIP 暂定上限：压缩 5MiB、解压总计 20MiB、最多 100 文件。先检测条目和解压限额；阻止 ../、绝对路径、重复规范化路径及压缩炸弹。
3. token 仅限白名单；颜色采用受支持的明确颜色格式，不接收 url()、var()、表达式等任意 CSS 字符串。尺寸值设合理上下界。
4. 资源仅允许包内相对路径；不自动加载远程 URL。首版不支持 SVG、字体和脚本，避免未定义的执行或网络行为。
5. 预览隔离应用，取消恢复原皮肤；通过后用户主动应用，失败不破坏当前皮肤。
6. 持久化包版本、校验结果与资源；切换/删除时释放 object URL，恢复默认始终可用。
7. 缺失可选 token 使用默认值；未知 schemaVersion 或不兼容外壳给出明确反馈，不能静默部分应用。

## 4. 设计与兼容验收

ADR-027 的伙伴营地使用 `--color-pet-*` 提供草地、水面、道路、树木、岩石、阴影等原创插画配色，明暗分别定义。功能面板、普通动作、状态和焦点复用工作台语义 token；场景资源保持原貌。主题与模式切换不重挂载营地、不重取业务数据，也不扩大第三方皮肤白名单。

ADR-026 规定普通主操作按钮使用 color-action/color-on-accent/color-action-hover，随主题及明暗模式变化；次按钮为 surface/text/border。profile 的暖色仅用于会员与破蛋日信息，不再覆盖保存按钮。

ADR-025 阅读器使用 `--color-reader-paper/ink` 与 `--color-reader-<preset>-paper/ink` 正文语义变量，明暗模式分别定义，工作伪装与弹层使用工作台语义变量。自定义正文颜色只在用户主动选择后应用，控件始终跟随主题与模式；画中画同步根 token。阅读主题不扩大第三方皮肤权限。

ADR-021 的账号资料卡与编辑表单使用现有 surface/canvas/text/muted/border/accent 语义变量，局部 profile 语义变量仅保留会员/破蛋日卡片与绿色成功提示，保存按钮按 ADR-026 使用当前主题动作色；明暗模式分别定义，手机表单折为单栏，弹窗保留安全区域和独立滚动，头像和背景图不随明暗模式改变。

ADR-018 的游戏目录复用工作台主题变量；封面插画使用默认 `--color-game-*` 配色，游戏内稀有度使用 `--color-life-*`，阴影使用 `--shadow-life-*`。主按钮、选中态、焦点、文字、背景跟随当前主题；插画与稀有度保留跨主题一致的语义。以上局部变量不扩大第三方导入白名单。桌面侧栏与手机页头均提供发现导航，游戏切换主题不重置当前局。

ADR-009 的独立 SSO 页使用 `--color-sso-*` 与 `--shadow-sso-*` 语义变量复现旧版点阵、卡片与主按钮，不随工作台品牌主题变色；按 ADR-019 响应明亮/暗夜模式，暂不开放第三方皮肤导入。

旧热榜总览的颜色统一使用 --color-hot-*，阴影使用 --shadow-hot-card/--shadow-hot-tab。这些局部表现变量用于复刻旧模块，不修改微信外壳配色，也暂不开放第三方导入。

按用户后续调整，分类选中态采用 accent-soft 背景与 accent-text 文字；hot-ribbon 引用 accent，hot-ribbon-fold 和 hot-link 引用 accent-text。旧模块蓝色缎带与橙色选中态已改为微信主题色。

只读热榜消息使用 --color-message-surface，滚动滑块使用 --color-scrollbar/--color-scrollbar-hover；这些是默认设计变量，暂不属于导入包白名单。

- 覆盖普通文字、链接、选中、禁用、聚焦、失败、未读、图片占位等状态。
- 皮肤无法改变业务权限、请求地址、消息内容或连接行为。
- 微信、飞书、钉钉外壳采用自己的布局模块，不复制业务处理函数。
- 不引入可执行第三方外壳插件；若未来需要，必须单独设计信任与隔离模型并记录 ADR。
