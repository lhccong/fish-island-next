import { MessageStream } from './MessageStream';
import { ChatComposer } from './ChatComposer';
import { OnlineMembers } from './OnlineMembers';
import { useChatMembers } from './chat-members-context';
import styles from './ChatWorkspace.module.css';
import { Table2 } from 'lucide-react';
import type { ChatPresentation } from './chat-presentation';
import type { ReactNode } from 'react';

export function ChatWorkspace({
  membersOpen,
  onCloseMembers,
  groupName,
  onRenameGroup,
  presentation = 'conversation',
  toolbarAction,
}: {
  membersOpen: boolean;
  onCloseMembers: () => void;
  groupName: string;
  onRenameGroup: (name: string) => void;
  presentation?: ChatPresentation;
  toolbarAction?: ReactNode;
}) {
  const { state, refresh } = useChatMembers();
  const messages = (
    <div key="messages" className={styles.messages}>
      <MessageStream presentation={presentation} />
    </div>
  );
  const composer = (
    <ChatComposer key="composer" presentation={presentation} toolbarAction={toolbarAction} />
  );
  return (
    <div
      className={styles.workspace}
      data-members-open={membersOpen}
      data-presentation={presentation}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented && membersOpen) onCloseMembers();
      }}
    >
      <div className={styles.conversation}>
        {presentation === 'worksheet' ? [composer, messages] : [messages, composer]}
        {presentation === 'worksheet' && (
          <footer className={styles.sheetBar} aria-label="当前工作表">
            <span className={styles.sheetTab}>
              <Table2 size={15} aria-hidden="true" />
              <span title={groupName}>{groupName}</span>
            </span>
          </footer>
        )}
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
