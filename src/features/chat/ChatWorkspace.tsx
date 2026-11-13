import { MessageStream } from './MessageStream';
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
          <MessageStream />
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
