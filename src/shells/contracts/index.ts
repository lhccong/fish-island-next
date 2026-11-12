import type { ReactNode } from 'react';

export type ShellId = 'wechat' | 'feishu' | 'dingtalk' | 'wps';

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
  contentScroll?: boolean;
  footer?: ReactNode;
  contentKey?: string;
  navigation: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  content: ReactNode;
}
