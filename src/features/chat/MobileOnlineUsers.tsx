import { UsersRound } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { ChatOnlineUsers } from './ChatOnlineUsers';
import styles from './MobileOnlineUsers.module.css';

export function MobileOnlineUsers({ groupName }: { groupName: string }) {
  return (
    <Dialog
      title="聊天列表"
      description="浏览联系人列表，可搜索和手动刷新。"
      hideDescription
      className={styles.dialog ?? ''}
      showCloseAction={false}
      dismissLabel="关闭聊天列表"
      trigger={
        <button type="button" className={styles.trigger} aria-label="查看聊天列表">
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
