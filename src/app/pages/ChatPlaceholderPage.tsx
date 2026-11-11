import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router';
import { WechatShell } from '@/shells/wechat';
import { WorkspaceNavigation } from '@/app/components/WorkspaceNavigation';
import styles from './ChatPlaceholderPage.module.css';

export function ChatPlaceholderPage() {
  return (
    <WechatShell
      slots={{
        navigation: <WorkspaceNavigation />,
        sidebar: (
          <div className={styles.sidebar}>
            <h2>聊天</h2>
            <p>暂无已连接的会话</p>
          </div>
        ),
        header: <h1 className={styles.title}>鱼岛聊天</h1>,
        content: (
          <div className={styles.empty}>
            <MessageCircle size={52} strokeWidth={1.2} aria-hidden="true" />
            <h2>聊天空间，准备就绪</h2>
            <p>聊天服务尚未接入，会话与消息将在后续开放。</p>
            <Link to="/">先去看看今日热榜</Link>
          </div>
        ),
      }}
    />
  );
}
