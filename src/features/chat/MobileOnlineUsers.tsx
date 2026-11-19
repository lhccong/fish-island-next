import { UsersRound } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { ChatOnlineUsers } from './ChatOnlineUsers';
import styles from './MobileOnlineUsers.module.css';

export function MobileOnlineUsers({
  groupName,
  visibility = 'mobile',
}: {
  groupName: string;
  visibility?: 'mobile' | 'desktop' | 'all';
}) {
  return (
    <Dialog
      title="聊天列表"
      description="浏览、搜索和编辑聊天列表。"
      hideDescription
      className={styles.dialog ?? ''}
      showCloseAction={false}
      dismissLabel="关闭聊天列表"
      trigger={
        <button
          type="button"
          className={styles.trigger}
          data-visibility={visibility}
          aria-label="查看聊天列表"
        >
          <UsersRound size={21} aria-hidden="true" />
        </button>
      }
    >
      <div className={styles.list}>
        <ChatOnlineUsers groupName={groupName} presentation="dialog" />
      </div>
    </Dialog>
  );
}
