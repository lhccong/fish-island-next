# 个人音乐模块

入口：聊天室输入区的音乐图标。搜索后点歌，播放器可将当前歌曲发送到聊天；点击音乐消息在本机播放。关闭面板继续播放，通过可拖动音乐悬浮球暂停/继续、切歌、打开播放器或停止。每个人拥有独立队列。

消息与悬浮球共用 `shared/ui/MediaDisc` 的静态光盘外观，包含反光盘面、同心纹路、中心孔及播放状态标记。纯音乐消息不显示矩形气泡背景；图片、引用、撤回和原有消息操作保留各自呈现，不增加持续动画或播放进度订阅。

## 文件职责

- `domain.ts`：纯歌曲和端口类型。
- `client.ts`：仅请求摸鱼岛后端，校验歌曲和公开 HTTPS 播放地址。
- `search-controller.ts`：取消、分页和稳定 ID 去重，每次 20 首、最多 100 首。
- `player-controller.ts`：单音频实例、最多 50 首待播、竞态取消、结束切歌、释放；进度使用独立 store。
- `MusicProvider.tsx` / `music-context.ts`：账号宿主、按需加载和播放回调。
- `MusicRuntime.tsx` / `MusicSearch.tsx` / `MusicPlayback.tsx`：音频生命周期和面板。
- `MusicOrb.tsx` / `use-music-orb.ts`：独立悬浮球与拖动，消息行不订阅播放状态。
- `index.ts`：唯一跨模块入口。模块不导入任何其他业务 feature。

后端配置在 `fish-island-backend/src/main/resources/application.yml` 的 `fishisland.third-party.music`：`api-url` 为上游根地址，`token` 填在部署用 yml。配置密钥后重启后端；前端沿用自己的 `VITE_API_BASE_URL`，只请求后端 `/api/third-party/music/search`、`/url`。密钥不进入浏览器，也不放进音乐消息。

## 接线与移除

app 的 `MusicSession` 负责注入后端客户端和聊天发送函数，并通过 `ChatMusicProvider` 注入点击播放回调。chat 只保留可选工具插槽、音乐消息纯元数据和卡片，不导入本模块。

移除时，在 `ChatConnectionProvider` 中解除 MusicSession 包装，删除 `ChatPlaceholderPage`/`ChatMiniPage` 的 ChatMusicTool 插槽及 import，再删除 `src/app/components/MusicSession.tsx`、本目录和相关 music 测试/config。删除后端 `com.cong.fishisland.thirdparty.music` 包及 yml 配置。历史音乐消息仍显示歌曲文字和“音乐播放未启用”，无需改数据库或聊天 Socket 协议。

## 验证

```sh
npm run check
npx playwright test --config playwright.music.config.ts
npx playwright test --config playwright.music-performance.config.ts
```

浏览器验证使用前一步生成的生产构建、合成会话和可播放的合成 WAV，不连接真实聊天账号。真实音源需要部署者配置上游密钥后联调；浏览器可能要求主动点播放。规范与限制见 `docs/decisions/098-third-party-music.md`。
