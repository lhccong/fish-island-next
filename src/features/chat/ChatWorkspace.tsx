import { ChatWindow } from './ChatWindow';
import { MessageStream } from './MessageStream';
import { PageFooterOutlet } from '@/shared/ui/PageFooter';
import { ChatComposer } from './ChatComposer';
import { OnlineMembers } from './OnlineMembers';
import { ClassicMembers } from './ClassicMembers';
import styles from './ChatWorkspace.module.css';
import { Table2 } from 'lucide-react';
import type { ChatPresentation } from './chat-presentation';
import type { ReactNode } from 'react';

export function ChatWorkspace({
  membersOpen,
  classicMembersOpen,
  onToggleClassicMembers,
  onCloseMembers,
  groupName,
  onRenameGroup,
  presentation = 'conversation',
  toolbarAction,
  toolsSlot,
  decoration = 'none',
  standalone = false,
  miniChatHref,
}: {
  membersOpen: boolean;
  classicMembersOpen: boolean;
  onToggleClassicMembers: () => void;
  onCloseMembers: () => void;
  groupName: string;
  onRenameGroup: (name: string) => void;
  presentation?: ChatPresentation;
  toolbarAction?: ReactNode;
  toolsSlot?: ReactNode;
  decoration?: 'none' | 'island' | 'classic';
  standalone?: boolean;
  miniChatHref?: string;
}) {
  const renderMessages = (activePresentation: ChatPresentation, floating: boolean) => (
    <div
      key="messages"
      className={styles.messages}
      data-decoration={floating ? 'none' : decoration}
      data-chat-decoration={floating ? 'none' : decoration}
    >
      <MessageStream
        presentation={activePresentation}
        compactWorksheet={floating && activePresentation === 'worksheet'}
      />
    </div>
  );

  return (
    <ChatWindow
      groupName={groupName}
      standalone={standalone}
      {...(miniChatHref ? { miniChatHref } : {})}
    >
      {(floating, toggleFloating, windowPresentation) => (
        <div
          className={styles.workspace}
          data-members-open={!floating && membersOpen}
          data-presentation={floating ? windowPresentation : presentation}
          data-floating={floating}
          data-floating-excel={floating && windowPresentation === 'worksheet'}
          data-decoration={floating ? 'none' : decoration}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.defaultPrevented && membersOpen) onCloseMembers();
          }}
        >
          <div className={styles.conversation}>
            {[
              renderMessages(floating ? windowPresentation : presentation, floating),
              <ChatComposer
                key="composer"
                presentation={floating ? windowPresentation : presentation}
                compactWorksheet={floating && windowPresentation === 'worksheet'}
                toolsPresentation={decoration === 'classic' ? 'menu' : 'inline'}
                toolbarAction={!floating && toolbarAction}
                toolsSlot={toolsSlot}
                floating={floating}
                onToggleFloating={toggleFloating}
              />,
            ]}
            {(floating ? windowPresentation : presentation) === 'worksheet' && (
              <div className={styles.sheetBar} aria-label="当前工作表">
                <span className={styles.sheetTab}>
                  <Table2 size={15} aria-hidden="true" />
                  <span title={groupName}>{floating ? '消息记录' : groupName}</span>
                </span>
                {floating ? <span className={styles.sheetStatus}>就绪</span> : <PageFooterOutlet />}
              </div>
            )}
          </div>
          {!floating && decoration === 'classic' && !membersOpen && (
            <ClassicMembers open={classicMembersOpen} onToggle={onToggleClassicMembers} />
          )}
          {!floating && membersOpen && (
            <OnlineMembers
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
