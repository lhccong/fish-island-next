import { useRef, useState } from 'react';
import { MessageCircle, MoreHorizontal, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { chatService, chatPreferences, chatListPreferences } from '@/app/config/chat';
import { useAuth } from '@/features/auth';
import { ThemePicker, useAppearanceStore, useChatPanelStore } from '@/features/appearance';
import { MyIslandProvider } from '@/features/my-island';
import { IslandSidebarLauncher } from '@/app/components/IslandSidebarLauncher';
import { IslandSidebar } from '@/app/components/IslandSidebar';
import { IslandSidebarProvider } from '@/app/components/IslandSidebarProvider';
import { ClassicCircleSidebar } from '@/app/components/ClassicCircleSidebar';
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
  const circleCollapsed = useChatPanelStore((state) => state.circleCollapsed);
  const setCircleCollapsed = useChatPanelStore((state) => state.setCircleCollapsed);
  const membersCollapsed = useChatPanelStore((state) => state.membersCollapsed);
  const setMembersCollapsed = useChatPanelStore((state) => state.setMembersCollapsed);
  const circleExpand = useRef<HTMLButtonElement>(null);
  const circleCollapse = useRef<HTMLButtonElement>(null);
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
              hideSidebar={
                presentation === 'worksheet' || (skinId === 'moyu-island' && circleCollapsed)
              }
              hideDesktopHeader={presentation === 'worksheet'}
              slots={{
                contentScroll: false,
                sidebar: (
                  <>
                    <div className={styles.islandSidebar} hidden={skinId !== 'pixel-island'}>
                      <IslandSidebar active={skinId === 'pixel-island'} />
                    </div>
                    {skinId === 'moyu-island' && (
                      <ClassicCircleSidebar
                        collapseRef={circleCollapse}
                        onCollapse={() => {
                          setCircleCollapsed(true);
                          requestAnimationFrame(() => circleExpand.current?.focus());
                        }}
                      />
                    )}
                    {skinId !== 'pixel-island' && skinId !== 'moyu-island' && (
                      <ChatOnlineUsers groupName={groupName} />
                    )}
                  </>
                ),
                header: (
                  <div className={styles.header} data-classic={skinId === 'moyu-island'}>
                    <div className={styles.headerTitle}>
                      {skinId === 'moyu-island' && circleCollapsed && (
                        <Button
                          ref={circleExpand}
                          variant="secondary"
                          className={styles.circleToggle}
                          aria-label="展开鱼小圈"
                          title="展开鱼小圈"
                          aria-expanded={false}
                          aria-controls="classic-circle-sidebar"
                          onClick={() => {
                            setCircleCollapsed(false);
                            requestAnimationFrame(() => circleCollapse.current?.focus());
                          }}
                        >
                          <PanelLeftOpen size={16} aria-hidden="true" />
                        </Button>
                      )}
                      <h1 title={groupName} aria-label={groupName}>
                        {skinId === 'moyu-island' ? (
                          <MessageCircle size={18} aria-hidden="true" />
                        ) : (
                          groupName
                        )}
                      </h1>
                    </div>
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
                    miniChatHref="/chat/mini"
                    key={session.user.id}
                    membersOpen={membersOpen}
                    classicMembersOpen={!membersCollapsed}
                    onToggleClassicMembers={() => setMembersCollapsed(!membersCollapsed)}
                    onCloseMembers={closeMembers}
                    groupName={groupName}
                    onRenameGroup={saveGroupName}
                    presentation={presentation}
                    decoration={
                      skinId === 'moyu-island'
                        ? 'classic'
                        : skinId === 'pixel-island'
                          ? 'island'
                          : 'none'
                    }
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
