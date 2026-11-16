import { useNavigate } from 'react-router';
import { chatPreferences, chatService } from '@/app/config/chat';
import {
  ChatMembersProvider,
  ChatWindowProvider,
  ChatWorkspace,
  useLocalGroupName,
} from '@/features/chat';

export function ChatMiniPage() {
  const navigate = useNavigate();
  const { groupName, saveGroupName } = useLocalGroupName(chatPreferences);
  return (
    <main id="main-content" aria-label="独立聊天小窗">
      <ChatWindowProvider
        suspended={false}
        initialPresentation="worksheet"
        onOpen={() => undefined}
        onRestore={() => void navigate('/chat')}
      >
        <ChatMembersProvider service={chatService}>
          <ChatWorkspace
            standalone
            groupName={groupName}
            onRenameGroup={saveGroupName}
            membersOpen={false}
            classicMembersOpen={false}
            onToggleClassicMembers={() => undefined}
            onCloseMembers={() => undefined}
          />
        </ChatMembersProvider>
      </ChatWindowProvider>
    </main>
  );
}
