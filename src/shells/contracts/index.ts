import type { ReactNode } from 'react';

export type ShellId = 'wechat' | 'feishu' | 'dingtalk' | 'wps' | 'pixel-island' | 'moyu-island';
export type WorkspaceNavigationLayout = 'rail' | 'ribbon' | 'topbar' | 'side';

export interface ChatShellSlots {
  navigation: ReactNode;
  conversations: ReactNode;
  header: ReactNode;
  messages: ReactNode;
  composer: ReactNode;
  auxiliary?: ReactNode;
}

// 外壳仅负责区域布局；业务数据订阅与操作由传入区域负责。
export interface ChatShellProps {
  slots: ChatShellSlots;
}

export interface WorkspaceShellSlots {
  status?: ReactNode;
  contentScroll?: boolean;
  contentFill?: boolean;
  footer?: ReactNode;
  contentKey?: string;
  navigation: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  content: ReactNode;
}
