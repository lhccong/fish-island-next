# 浏览器默认控件样式排查与整改

## 谁是卧底迁移（ADR-063）

入口：游戏 → 谁是卧底。源码：`src/features/undercover/LocalSetup.tsx`、`LocalTurn.tsx`、`CreateRoomDialog.tsx`、`RoomPlayers.tsx`。人数、卧底数、词语来源、模式、时长与投票目标均使用共享 Radix Select；结束、退出和投票确认使用共享 Dialog，操作使用 Button，房间设置和发言记录使用 reserved ScrollArea。没有复制旧版 Ant Design 或原生系统选项列表，没有引入 alert/confirm/prompt。验收范围和限制见 [谁是卧底验收](undercover-migration.md)。

日期：2026-11-12。范围：fish-island-next 当前工作区的 src 应用源码与 CSS，包括尚未提交的文件；不涉及旁边的旧项目仓库。先通过源码确认问题，再使用合成账号、动态和接口响应进行浏览器验证，不包含真实账号资料或聊天记录。

## 四处问题的整改

| 入口                                  | 源码                                           | 整改结果                                                                                                                 |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 账号 → 个人资料 → 修改信息 → 称号设置 | `src/features/auth/ProfileTitles.tsx`          | 替换为 shared/ui/Select；保留读取、重试、不可用当前项及选择后立即生效，失败不改变当前称号或编辑草稿                      |
| WPS 主题 → 热榜 → 来源筛选            | `src/features/hot-board/ui/WpsHotTable.tsx`    | 替换为同一 Select，展开面板支持长列表、选中标记、滚动及视口避让；来源变化不重挂载表格或清空搜索条件                      |
| WPS 主题 → 热榜 → 分类筛选            | `src/features/hot-board/ui/WpsHotTable.tsx`    | 替换为同一 Select；保留全部分类、动态分类、筛选和重置行为                                                                |
| 鱼小圈 → 动态 → 评论 → 评论图片       | `src/features/fish-circle/CommentComposer.tsx` | 页面上传入口改为统一 Button 与数量提示，file 输入隐藏；保留系统文件选择、上传中、失败重试、移除附件、最多 3 张及发送行为 |

共 3 处原生下拉面板和 1 处原生文件上传入口，涉及 3 个业务源码文件。Select 基于 Radix Select（MIT）封装，使用主题语义变量，Portal 避免弹窗/滚动区裁剪，手机操作行高至少 44px。异步保存期间触发按钮被禁用时，完成后恢复焦点。ESLint 已禁止应用源码直接写 select/datalist JSX；Radix 内部不可见的表单桥接不是产品可见面板。

## 验证范围

- 主题：注册表中的 WPS、微信、企业微信、飞书、钉钉；模式：明亮和暗夜。
- 视口：桌面 Chromium 1280×720（WPS 旧流程另检查 1920×1080 与 1280×800）、375×812、390×844；手机通过触屏视口模拟验证。
- 称号：加载、读取失败重试、空列表、成功选择、保存失败保留原值及草稿、不可用项禁用、Esc 不关闭外层编辑器、关闭及异步保存后焦点返回。
- WPS 筛选：来源/分类展开与选择、长列表滚动、方向键/Home/End/Enter/Esc、选中标记、边界与横向溢出、搜索及分类保留、加载/空数据/失败状态；该表格呈现仅在 WPS 外壳提供入口。
- 评论上传：空附件、点击按钮打开系统文件选择、上传中禁用、上传失败重试、数量更新、附件上限、删除后恢复可用、发送失败保留内容、成功后清空。
- 测试入口：`account-profile.spec.ts`、`control-appearance.spec.ts`、`control-states.spec.ts`、`wps-hot-table.spec.ts`、`fish-circle.spec.ts`。独立生产构建位于 `node_modules/.cache/control-dist`；首轮截图位于 `node_modules/.cache/control-verification`，最终选择器回归截图位于 `node_modules/.cache/control-final-verification`。
- 未验证：真实手机硬件及软键盘、Safari/Firefox、真实后端账号；相关流程使用合成数据在 Chromium 中验证，不能作为其他浏览器或真机的实测结论。

验证结论：最终生产快照下上述 5 组浏览器测试共 141 项通过（Windows、Chrome/Chromium，桌面及触屏模拟）；本次修改文件的 Prettier/ESLint 检查通过，单元测试 83 项通过，独立 Vite 生产构建通过。全仓 `npm run check` 已执行，最新停在阅读模块的 15 个文件格式检查（`src/domain/reader`、`src/features/reader`、`src/infrastructure/reader`），因此不能标记全仓检查通过。阅读模块不在本次四处控件整改范围。原生 select 的 ESLint 回归门禁已用违规 JSX 验证能正确拒绝；没有把已有游戏大资源块的构建提示当作此次控件失败。

## 相邻控件检查

- ADR-053 通知 → 管理：`src/features/fish-circle/NotificationRow.tsx` 与 `CircleNotifications.module.css` 已将复选框改为语义 token 自定义外观，保留原生 checkbox 语义与键盘，标签提供 44px 触控区；通知操作使用共享 DropdownMenu，面板内删除确认操作使用共享 Button，不调用浏览器确认框。

- 未发现应用实现中的 datalist、optgroup 或原生 date/time/month/week/color 选择器，也未发现用于业务交互的 alert/confirm/prompt 调用；安全解码测试里的 javascript:alert 字符串不是实际调用。
- 保持登录、热榜来源设置、通知未读筛选使用 checkbox 和主题 accent-color；人生重开部分 radio 已使用自定义外观。它们不属于截图中的原生展开面板，本次没有修改这些控件或补做其全部平台的视觉验收。
- 人生重开/修仙的属性分配、动态打赏和抽奖人数使用 number 输入框，平台数字步进按钮保留为后续视觉复查项。
- 头像/背景图及发布图片已有自定义上传入口，系统文件选择窗口属于需保留的系统能力。
- 动态更多操作使用 shared/ui/DropdownMenu，编辑/删除确认使用统一 Dialog。

## 农场迁移（ADR-050）

入口：游戏 → 摸鱼农场 → 选择种子。源码：src/features/farm/SeedDialog.tsx。旧项目原生/Ant Design 控件不复制，作物分类采用 shared/ui/Select，操作与确认使用共享 Button、Dialog、reserved ScrollArea；无新增原生 select、alert、confirm 或 prompt。验证范围与限制见 [农场验收](farm-migration.md)。

农场好友排序（src/features/farm/FarmFriendList.tsx）采用共享 Select 的 pixel 呈现，触发器和 Portal 面板同步羊皮纸语义配色、直角、字号与选中/聚焦状态；保持 Radix 键盘、Esc 与焦点返回，不使用原生下拉列表。

## 宠物挑战（ADR-061）

入口：伙伴 → 宠物 Boss / 宠物爬塔 / 挑战。`src/features/pet/ChallengePanel.tsx` 的分类使用 shared/ui/Select 的 pixel 呈现；战斗、排行与楼层预览使用共享 Dialog、reserved ScrollArea 和 Button。`TowerCard.tsx` 楼层输入保留 number 语义与手机数字键盘，通过局部 CSS 统一输入外观并移除系统步进装饰；无原生 select、系统确认或手写可点击 div 选择器。24px 装备格为只读图像，不冒充触控按钮。
