import { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { chatService, chatPreferences, chatListPreferences } from '@/app/config/chat';
import { useAuth } from '@/features/auth';
import { ThemePicker, useAppearanceStore } from '@/features/appearance';
import { MyIslandProvider } from '@/features/my-island';
import { IslandSidebarLauncher } from '@/app/components/IslandSidebarLauncher';
import { IslandSidebar } from '@/app/components/IslandSidebar';
import { IslandSidebarProvider } from '@/app/components/IslandSidebarProvider';
import { islandPreferences } from '@/app/config/my-island';
import {
  ChatWorkspace,
  ChatListProvider,
  useLocalGroupName,
  ChatMembersProvider,
  ChatOnlineUsers,
  MobileOnlineUsers,
} from '@/features/chat';
import styles from './ChatPlaceholderPage.module.css';

export function ChatPlaceholderPage() {
  const { session } = useAuth();
  const skinId = useAppearanceStore((state) => state.skinId);
  const presentation = skinId === 'wps' ? 'worksheet' : 'conversation';
  const { groupName, saveGroupName } = useLocalGroupName(chatPreferences);
  const [membersOpen, setMembersOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const formulaTrigger = useRef<HTMLButtonElement>(null);
  const closeMembers = () => {
    setMembersOpen(false);
    const visibleTrigger = trigger.current?.getClientRects().length
      ? trigger.current
      : formulaTrigger.current;
    visibleTrigger?.focus();
  };
  if (session.status !== 'authenticated') return null;
  return (
    <MyIslandProvider
      key={session.user.id}
      accountId={session.user.id}
      preferences={islandPreferences}
    >
      <IslandSidebarProvider user={session.user}>
        <ChatListProvider key={session.user.id} preferences={chatListPreferences}>
          <ChatMembersProvider service={chatService}>
            <WorkspaceLayout
              sidebarLabel={skinId === 'pixel-island' ? '我的小岛' : '聊天会话'}
              sidebarVariant="chat"
              hideSidebar={presentation === 'worksheet'}
              hideDesktopHeader={presentation === 'worksheet'}
              slots={{
                contentScroll: false,
                sidebar: (
                  <>
                    <div className={styles.islandSidebar} hidden={skinId !== 'pixel-island'}>
                      <IslandSidebar active={skinId === 'pixel-island'} />
                    </div>
                    {skinId !== 'pixel-island' && <ChatOnlineUsers groupName={groupName} />}
                  </>
                ),
                header: (
                  <div className={styles.header}>
                    <h1 title={groupName}>{groupName}</h1>
                    <div className={styles.headerActions}>
                      <IslandSidebarLauncher />
                      <div className={styles.mobileAppearance}>
                        <ThemePicker />
                      </div>
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
                    presentation={presentation}
                    decoration={skinId === 'pixel-island' ? 'island' : 'none'}
                    toolbarAction={
                      presentation === 'worksheet' && (
                        <>
                          <div className={styles.formulaIsland}>
                            <IslandSidebarLauncher />
                          </div>
                          <MobileOnlineUsers groupName={groupName} alwaysVisible />
                          <button
                            type="button"
                            ref={formulaTrigger}
                            className={`${styles.more} ${styles.formulaDetails}`}
                            aria-label="群聊详情"
                            aria-expanded={membersOpen}
                            aria-controls={membersOpen ? 'chat-online-members' : undefined}
                            onClick={() => setMembersOpen((open) => !open)}
                          >
                            <MoreHorizontal size={23} aria-hidden="true" />
                          </button>
                        </>
                      )
                    }
                  />
                ),
              }}
            />
          </ChatMembersProvider>
        </ChatListProvider>
      </IslandSidebarProvider>
    </MyIslandProvider>
  );
}
