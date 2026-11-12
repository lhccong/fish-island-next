import { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { chatService, chatPreferences } from '@/app/config/chat';
import { useAuth } from '@/features/auth';
import {
  ChatWorkspace,
  useLocalGroupName,
  ChatMembersProvider,
  ChatOnlineUsers,
  MobileOnlineUsers,
} from '@/features/chat';
import styles from './ChatPlaceholderPage.module.css';

export function ChatPlaceholderPage() {
  const { session } = useAuth();
  const { groupName, saveGroupName } = useLocalGroupName(chatPreferences);
  const [membersOpen, setMembersOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeMembers = () => {
    setMembersOpen(false);
    trigger.current?.focus();
  };
  if (session.status !== 'authenticated') return null;
  return (
    <ChatMembersProvider key={session.user.id} service={chatService}>
      <WorkspaceLayout
        sidebarLabel="聊天会话"
        sidebarVariant="chat"
        slots={{
          contentScroll: false,
          sidebar: <ChatOnlineUsers groupName={groupName} />,
          header: (
            <div className={styles.header}>
              <h1 title={groupName}>{groupName}</h1>
              <div className={styles.headerActions}>
                <MobileOnlineUsers groupName={groupName} />
                <button
                  type="button"
                  ref={trigger}
                  className={styles.more}
                  aria-label="群聊详情"
                  aria-expanded={membersOpen}
                  aria-controls={membersOpen ? 'chat-online-members' : undefined}
                  onClick={() => setMembersOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && membersOpen) closeMembers();
                  }}
                >
                  <MoreHorizontal size={23} aria-hidden="true" />
                </button>
              </div>
            </div>
          ),
          content: (
            <ChatWorkspace
              key={session.user.id}
              membersOpen={membersOpen}
              onCloseMembers={closeMembers}
              groupName={groupName}
              onRenameGroup={saveGroupName}
            />
          ),
        }}
      />
    </ChatMembersProvider>
  );
}
