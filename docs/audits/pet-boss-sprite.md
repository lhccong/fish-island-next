# 反派像素动画资源

日期：2026-11-15。

## 实现

- `public/assets/pet/villain-idle.webp`：256 × 256，透明背景，15 个编码帧，约 169 KiB，1.6 秒无限循环；像素对齐的起伏与披风摆动，非 CSS 模拟的静态图。
- `public/assets/pet/villain-idle-still.webp`：同一角色静态帧，由 picture 的 `prefers-reduced-motion: reduce` source 选择。
- `features/pet/BossSprite` 仅负责展示，列表和 Boss 战斗预览共用，不使用服务端返回的旧 PNG；伙伴、爬塔和切磋图片沿用原逻辑。图片加载复用 LoadingIndicator，失败有可访问的文本回退。
- 原始插画保持颜色和透明度，周围场景继续使用已有主题及明暗 token；不新增依赖、请求或业务状态。

## 生成记录

使用内置 imagegen 技能生成原图，随后本地编码动画 WebP 与静态 WebP。正式资源存于仓库，运行时无需图像生成服务。

最终生成提示词：

> Use case: stylized-concept. Asset: single transparent pixel-art game boss sprite for a small RPG web UI, replacing an unrelated PNG. Draw one full body chibi humanoid dark sorcerer villain, oversized horned purple hood, glowing amber eyes, charcoal armor, ragged plum cape, little boots, clutching a tiny staff. Menacing but playful fish-island game boss. Authentic clean 32-bit pixel art, sharp stepped square pixel edges, limited plum/indigo/charcoal palette with amber highlights, readable at 96px. Front three-quarter view facing slightly left, entire body centered in square image with generous 15% transparent padding on all sides. NO background, scenery, ground, labels, text, UI, borders or watermark. One character only. True transparent alpha. Use visibly chunky pixels, no smooth vector curves, no blur.

## 验证

- `npm run check` 通过：格式、ESLint、TypeScript、396 项单元测试、生产构建。构建保留既有大包及混合动态导入提示。
- 使用隔离的生产构建和合成接口运行 Chrome 回归：pixel-island、wps、wechat、wecom、feishu、dingtalk × light/dark × 1440/375/390，共 36 组合。前 34 项完成且未报告失败；最后两个钉钉暗夜手机用例已生成截图，但浏览器进程未正常收尾，停止运行，不能计为通过。
- 已验证范围包含列表与战斗预览共用 WebP、减少动态效果时选择静态资源、触屏打开/进入预览、关闭、加载/空列表/接口失败、图片失败回退及无横向溢出。已目视检查像素岛明暗手机及桌面截图；36 组合均生成列表截图，未逐张人工复核。
- 文件验证：15 个不同编码帧、透明 alpha 范围 0–255、总时长 1600ms、loop=0。
- 早期开发服务器回归受并行改动的热更新与短暂缺失的 Lottery.module.css 干扰，改用隔离产物；图片失败测试使用独立查询参数避开浏览器内存复用。
- 未验证：最后两个钉钉暗夜手机用例的完整自动化收尾、真实账号/后端联调、实体手机与其他浏览器。测试入口：`tests/e2e/pet-boss-sprite.spec.ts`。

## 临时产物清理

一次性 Playwright 配置已删除。以下本次生成的目录已核对绝对路径与归属，但自动审批策略拒绝删除（blocked by policy），因此保留，后续需人工删除：

- `E:\owner-project\fish-island-next\test-results-villain-task`：早期测试截图、失败上下文及追踪。
- `E:\owner-project\fish-island-next\test-results-villain-task-retry`：隔离测试截图和运行产物。
- `E:\owner-project\fish-island-next\test-results-villain-build-task`：隔离的生产构建副本。

正式交付物位于 `public/assets/pet/`；内置 imagegen 保存的原始生成图留作资源来源。
