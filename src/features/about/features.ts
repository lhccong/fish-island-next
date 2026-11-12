import { AppWindow, MessageCircle, BookOpen, Gamepad2, Wrench, Gift } from 'lucide-react';

export const legacyFeatures = [
  {
    title: '多源信息聚合',
    icon: AppWindow,
    items: [
      '知乎热榜',
      '微博热榜',
      '虎扑步行街热榜',
      '编程导航热榜',
      'CSDN 热榜',
      '掘金热榜',
      'B 站热门',
      '抖音热搜',
      '网易云热歌榜',
      '什么值得买热榜',
    ],
  },
  {
    title: '摸鱼聊天室',
    icon: MessageCircle,
    items: [
      '发送 emoji 表情包',
      '发送搜狗在线表情包',
      '支持网站链接解析',
      '支持 markdown 文本解析',
      '支持 AI 助手回答',
      '头像框功能',
      '用户地理位置显示功能',
      '用户称号功能',
      '五子棋、象棋对战邀请功能',
      '积分红包🧧发送功能',
      '支持用户 CV 发送图片功能',
    ],
  },
  {
    title: '摸鱼阅读',
    icon: BookOpen,
    items: ['在线搜书功能', '小窗口观看功能', '支持自定义书源'],
  },
  {
    title: '小游戏',
    icon: Gamepad2,
    items: ['五子棋（人机/在线对战）', '象棋（人机/在线对战）', '2048'],
  },
  {
    title: '工具箱',
    icon: Wrench,
    items: ['JSON 格式化', '文本比对', '聚合翻译', 'Git 提交格式生成', 'AI 智能体', 'AI 周报助手'],
  },
  { title: '其他功能', icon: Gift, items: ['每日待办功能', '头像框兑换功能'] },
] as const;
