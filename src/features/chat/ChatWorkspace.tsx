import { ChatWindow } from './ChatWindow';
import { MessageStream } from './MessageStream';
import { PageFooterOutlet } from '@/shared/ui/PageFooter';
import { ChatComposer } from './ChatComposer';
import { OnlineMembers } from './OnlineMembers';
import { ClassicMembers } from './ClassicMembers';
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
  decoration = 'none',
}: {
  membersOpen: boolean;
  onCloseMembers: () => void;
  groupName: string;
  onRenameGroup: (name: string) => void;
  presentation?: ChatPresentation;
  toolbarAction?: ReactNode;
  decoration?: 'none' | 'island' | 'classic';
}) {
  const { state, refresh } = useChatMembers();
  const renderMessages = (activePresentation: ChatPresentation) => (
    <div
      key="messages"
      className={styles.messages}
      data-decoration={decoration}
      data-chat-decoration={decoration}
    >
      <MessageStream presentation={activePresentation} />
    </div>
  );

  return (
    <ChatWindow groupName={groupName}>
      {(floating, toggleFloating) => (
        <div
          className={styles.workspace}
          data-members-open={!floating && membersOpen}
          data-presentation={floating ? 'conversation' : presentation}
          data-floating={floating}
          data-decoration={floating ? 'none' : decoration}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.defaultPrevented && membersOpen) onCloseMembers();
          }}
        >
          <div className={styles.conversation}>
            {[
              renderMessages(floating ? 'conversation' : presentation),
              <ChatComposer
                key="composer"
                presentation={floating ? 'conversation' : presentation}
                toolsPresentation={decoration === 'classic' ? 'menu' : 'inline'}
                toolbarAction={!floating && toolbarAction}
                floating={floating}
                onToggleFloating={toggleFloating}
              />,
            ]}
            {!floating && presentation === 'worksheet' && (
              <div className={styles.sheetBar} aria-label="当前工作表">
                <span className={styles.sheetTab}>
                  <Table2 size={15} aria-hidden="true" />
                  <span title={groupName}>{groupName}</span>
                </span>
                <PageFooterOutlet />
              </div>
            )}
          </div>
          {!floating && decoration === 'classic' && !membersOpen && <ClassicMembers />}
          {!floating && membersOpen && (
            <OnlineMembers
              state={state}
              onRefresh={refresh}
              onClose={onCloseMembers}
              groupName={groupName}
              onRenameGroup={onRenameGroup}
            />
          )}
        </div>
      )}
    </ChatWindow>
  );
}
