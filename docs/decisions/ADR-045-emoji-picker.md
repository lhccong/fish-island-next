# ADR-045：输入区锚定表情面板与 QQ Emoji

采用输入工具栏上方的非模态 Popover，替代居中的表情 Dialog。新增同栈 `@radix-ui/react-popover`，由 shared/ui 包装定位、边界避让、Esc、外部点击及焦点返回；无覆盖层，不阻断输入区。替代方案是手写定位和关闭逻辑，因键盘、软键盘及浮层嵌套维护成本未采用。

从本地 fishmusic/client/public/qface 引入相同 APNG 资源与清单，仅复用资源，不复制业务、缓存或通信代码。清单随面板异步块加载，图片按需懒加载。Emoji 以 `[qqface:数字ID]` 插入草稿选区，复用现有发送协议；消息文本仅渲染清单中已有 ID，未知标记保持文字。图片原貌不随模式改变。收藏、搜索、分页和图片发送继续使用现有账号用例。

面板包含底部 Emoji、收藏、搜索切换，固定关闭入口、独立 reserved ScrollArea 和反馈。所有外壳复用同一实现、全部主题与明暗语义变量，手机保留 44px 触控目标和预留 gutter。切换外观不重建业务用例。

验证：npm run check；全部注册主题 × 明暗 × 桌面/375/390 的锚点、边界、键盘/触屏、Emoji 插入与消息呈现、关闭焦点、收藏/搜索 loading/empty/error/success 和连续分页回归。资源来源记录于 public/qface/README.md。

输入区补充：textarea 无法显示内联图片，改用 chat feature 独立的 contenteditable 编辑器。草稿 store 仍只存纯文本与 `[qqface:id]`，编辑器只创建文本节点及受信任的本地 Emoji img，不接受粘贴 HTML；DOM 选区转换为序列化偏移，Emoji 是不可编辑的原子节点，保留组合输入、原生编辑撤销、换行、删除、纯文本粘贴和图片上传。替代方案为遮罩覆盖 textarea，但标记与图片宽度不同会导致光标错位，故不采用。验证增加输入框内 Emoji、前后输入、选区替换、删除、复制粘贴、IME 和发送协议。
