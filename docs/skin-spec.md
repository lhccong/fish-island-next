# 外壳与皮肤协议

状态：基础配色预览已实现；完整协议、导入器和三套外壳待实现。不得混淆。

## 1. 两个独立维度

- shellId 决定微信、飞书、钉钉等结构布局。
- skinId 决定 token、字体、背景和图标资源。
- 外壳支持的区域：navigation、conversations、header、messages、composer、auxiliary。
- app 组合功能区域并传入外壳 slots；皮肤选择不持有消息，不建立连接，不触发历史重取。
- 当前初始化页的三个 ID 只是颜色预览；真正接入外壳时新增独立 shellId，不能让相同名称隐式绑定布局。

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
  "--color-accent": "#087d51",
  "--color-accent-soft": "#e6f4ec"
}
```

现阶段白名单只有上述两个颜色 token，内置配置同样遵守。后续开放画布、文字、气泡、间距等变量时，必须同步类型、schema、边界值、默认值、兼容说明和测试；不能直接放行所有 CSS 变量。

## 3. 校验与生命周期（导入实现时必须满足）

1. 文件进入临时区；校验扩展名、实际格式、包版本和必要字段，忽略文件名作为可信类型的假设。
2. ZIP 暂定上限：压缩 5MiB、解压总计 20MiB、最多 100 文件。先检测条目和解压限额；阻止 ../、绝对路径、重复规范化路径及压缩炸弹。
3. token 仅限白名单；颜色采用受支持的明确颜色格式，不接收 url()、var()、表达式等任意 CSS 字符串。尺寸值设合理上下界。
4. 资源仅允许包内相对路径；不自动加载远程 URL。首版不支持 SVG、字体和脚本，避免未定义的执行或网络行为。
5. 预览隔离应用，取消恢复原皮肤；通过后用户主动应用，失败不破坏当前皮肤。
6. 持久化包版本、校验结果与资源；切换/删除时释放 object URL，恢复默认始终可用。
7. 缺失可选 token 使用默认值；未知 schemaVersion 或不兼容外壳给出明确反馈，不能静默部分应用。

## 4. 设计与兼容验收

- 覆盖普通文字、链接、选中、禁用、聚焦、失败、未读、图片占位等状态。
- 皮肤无法改变业务权限、请求地址、消息内容或连接行为。
- 微信、飞书、钉钉外壳采用自己的布局模块，不复制业务处理函数。
- 不引入可执行第三方外壳插件；若未来需要，必须单独设计信任与隔离模型并记录 ADR。
