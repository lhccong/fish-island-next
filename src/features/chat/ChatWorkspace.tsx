import { MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ChatComposer } from './ChatComposer';
import { OnlineMembers } from './OnlineMembers';
import { useChatMembers } from './chat-members-context';
import styles from './ChatWorkspace.module.css';

export function ChatWorkspace({
  membersOpen,
  onCloseMembers,
  groupName,
  onRenameGroup,
}: {
  membersOpen: boolean;
  onCloseMembers: () => void;
  groupName: string;
  onRenameGroup: (name: string) => void;
}) {
  const { state, refresh } = useChatMembers();
  return (
    <div
      className={styles.workspace}
      data-members-open={membersOpen}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented && membersOpen) onCloseMembers();
      }}
    >
      <div className={styles.conversation}>
        <div className={styles.messages}>
          <ScrollArea label="群聊消息区">
            <div className={styles.empty}>
              <MessageCircle size={44} strokeWidth={1.2} aria-hidden="true" />
              <h2>{groupName}</h2>
              <p>消息服务暂未接入</p>
              <span>点击右上角 ··· 查看当前在线的岛友</span>
            </div>
          </ScrollArea>
        </div>
        <ChatComposer />
      </div>
      {membersOpen && (
        <OnlineMembers
          state={state}
          onRefresh={refresh}
          onClose={onCloseMembers}
          groupName={groupName}
          onRenameGroup={onRenameGroup}
        />
      )}
    </div>
  );
}
