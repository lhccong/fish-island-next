# 像素伙伴工作台验收

日期：2026-11-15。决策：[ADR-078](../decisions/ADR-078-pet-pixel-workspace.md)。

## 实现范围

- 伙伴装备、营地挑战、行囊按可用宽度三栏/两栏/单栏重排。六个装备位、真实属性、紧凑图标入口与物品详情可直接访问，详细管理面板保留。
- 喂食/抚摸直接接纳接口返回的伙伴数据，不重新请求 mine，不替换伙伴 DOM，不显示成功横幅；等待时保留控件和位置，失败反馈保留。
- 自动喂食按背包 consumable 分类读取，依据 food 子类型、有效 code 和正库存筛选，同 code 合并数量。共享 pixel Select 支持键盘、触屏、Esc、焦点返回和滚动续载，失败重试保留表单阈值，耗尽后仍可关闭自动喂食。
- 复用像素纸面/木框明暗变量及主题动作色。明亮使用海水青底色与 56% 的小岛插画，暗夜保留 #191A1C 基础底色、插画 32%。图片贴底，在中栏留白处显示木屋与猫；显式 contentFill 让短页底部也铺满背景，不改变正文、精灵和装备透明度，不接收指针事件。
- 未新增任务奖励、货币、技能接口、依赖或第二套业务逻辑。

## 检查与矩阵

`npm run check` 已通过：格式、零警告 Lint、类型检查、97 个测试文件共 396 项单元测试及生产构建。构建仍有已有大分块与鱼小圈动态/静态混合导入提示。

浏览器命令：

```powershell
npx playwright test -c playwright.pet-pixel.config.ts 'pet.spec.ts|pet-(pixel|care|actions|extras|items|food).spec.ts'
```

功能回归共 187 个不同场景：首轮 185 通过，2 例战斗按钮等待超时；将短暂跳过控件的竞态等待改为稳定结算断言，并补齐加载门闩/就绪等待后，微信暗夜 375/390 两例单独补跑通过。未通过强制点击或忽略业务断言跳过验证。

最新背景调整另执行：

```powershell
npx playwright test -c playwright.pet-background.config.ts
```

背景矩阵 36 个不同场景：首轮 35 通过，像素明亮桌面在登录首次导航等待 load 时超时；夹具改为等待 DOMContentLoaded 后继续等待真实可用控件，该例单独补跑通过。合计 223 个不同浏览器场景完成覆盖，首跑失败与补跑结果均保留，不表述为单轮零失败。

主题范围以 builtinSkins 注册表为准：pixel-island、wps、wechat、wecom、feishu、dingtalk。每个主题覆盖明亮/暗夜及 1440×1000、375×844、390×844。

| 主题         | 明亮/暗夜 × 桌面/375/390 |
| ------------ | ------------------------ |
| 摸鱼岛像素风 | 已验证                   |
| WPS 表格     | 已验证                   |
| 微信绿       | 已验证                   |
| 企业微信     | 已验证                   |
| 飞书蓝       | 已验证                   |
| 钉钉蓝       | 已验证                   |

验收包括领养空态、主体加载、失败重试、喂食原位更新和失败、装备回读、背包选中/分类、真实滚轮/触屏滚动、续载失败保留已有内容、结束、滚动留白与无横向溢出、弹窗顶部关闭、名字修改、外观/购买/分解/锻造/挑战。检查主题模式切换保留营地坐标、内嵌选择和同视口滚动位置，且不增加 mine/行囊请求。

食物分页专项覆盖像素主题 × 明暗 × 三个视口，验证短列表、连续加载、重试、非食物/零库存/缺少编号过滤、同类数量合并与保存实际 foodCode。宠物测试夹具统一模拟账号 WebSocket，避免使用合成凭证访问真实服务。

背景专用矩阵验证实际图片可解码、明暗透明度、暗夜基础色、内容填满实际视口、喂食后背景稳定，以及成功/空/失败布局。截图已检查明亮/暗夜桌面、375/390 手机及食物下拉。正式证据：

- [明亮桌面](pet-pixel-workspace/desktop-light.png)、[暗夜桌面](pet-pixel-workspace/desktop-dark.png)
- [375 手机](pet-pixel-workspace/mobile-light-375.png)、[390 手机](pet-pixel-workspace/mobile-light-390.png)、[390 下方行囊](pet-pixel-workspace/mobile-bottom-390.png)
- [桌面食物下拉](pet-pixel-workspace/food-select-light-1440.png)、[手机食物下拉](pet-pixel-workspace/food-select-light-390.png)

## 边界

使用合成 HTTP 数据与本地精灵测试资源，未执行真实后端账号/积分/冷却联调，未在实体手机或 Safari 验收；不以这些结果宣称真实业务或完整性能达标。

## 本次临时产物

任务开始前已记录仓库已有改动及测试目录，未删除其他任务的 default-theme/sign-in 等目录。

自动审批拒绝了已核对绝对路径的递归清理，以及限定到本次目录的逐文件清理方案；工具仅返回 `blocked by policy`，未提供更具体原因。以下目录属于本次测试产物，仍需清理：

- `E:\owner-project\fish-island-next\test-results-pet-final`
- `E:\owner-project\fish-island-next\test-results-pet-4197-build`
- `E:\owner-project\fish-island-next\test-results-pet-4198-build`
- `E:\owner-project\fish-island-next\test-results-pet-pixel-task`
- `E:\owner-project\fish-island-next\test-results-pet-food-task`
- `E:\owner-project\fish-island-next\test-results-pet-background-task`

只成功删除了首个失败运行的 `.last-run.json`；未把忽略规则当作清理。正式验收截图保存于本审计同名目录，不属于待删除的临时产物。
