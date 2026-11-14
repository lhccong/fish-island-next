# ADR-056 评论图片粘贴与表情包入口

状态：已采用。日期：2026-11-14。

评论输入区复用 FishCirclePort.upload 和既有三张附件协议。文件选择与剪贴板图片共用串行上传流程，逐张保留成功结果；失败保留草稿和已上传附件，用户可重新选择或粘贴。上传及发送互斥，卸载取消请求。

app 注入既有 ChatEmoticonPort 的只读 list 能力，由鱼小圈内部 Context 提供给独立表情面板。不会依赖 chat feature 或发送聊天消息；选中收藏后作为评论附件，点击发送评论才提交。无需新依赖和后端变更。替代方案是跨 feature 复用聊天面板，但其隐含聊天草稿和即时发送行为不适用于评论，因此不采用。

面板使用 shared/ui/Popover、reserved ScrollArea 与 InfiniteScroll。全部主题、明暗模式及桌面/375px/390px 验证粘贴、限制、失败恢复、面板键盘/触屏、附件发送和无横向溢出；执行 npm run check。
