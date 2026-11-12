# 既有伙伴动作表

`luobo.webp` 来自旧前端 `src/components/MoyuPet/index.tsx` 已引用的公开资源 `https://oss.cqbo.com/moyu/pet/luobo.webp`；`wutiaowu.webp` 为用户指定外观，对应 `https://oss.cqbo.com/moyu/pet/wutiaowu.webp`。两张图于 2026-11-12 只读获取，未编辑图像。测试本地读取，CI 不依赖远程资源可达性。

尺寸均为 1536×1872；8 列 × 9 行，每帧 192×208。已检查真实画面：第 0 行待机；luobo 的第 1 行朝右、第 2 行朝左，wutiaowu 的第 1 行朝左、第 2 行朝右。分别配置方向，避免修复一个外观后反转另一个。用于验证真实帧裁切和朝向，不根据实现自行绘制左右方向测试图。此处保留旧资源原有权利归属，不授予额外使用许可。
