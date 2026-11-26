import { FishCircleWorkspace } from '@/features/fish-circle';
import { CommentEmoticonsProvider } from '@/features/fish-circle';
import { chatEmoticons } from '@/app/config/chat';
import { accountTools } from '@/app/config/account-tools';
import { adminPort } from '@/app/config/admin';
import { useAuth } from '@/features/auth';
import { useUserCard } from '@/features/chat';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { fishCircleService } from '@/app/config/fish-circle';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { useNavigate, useSearchParams } from 'react-router';
export function FishCirclePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const openUserCard = useUserCard();
  const [params] = useSearchParams();
  const targetId = params.get('userId') || '';
  if (session.status !== 'authenticated') return null;
  return (
    <CommentEmoticonsProvider value={chatEmoticons}>
      <FishCircleWorkspace
        key={`${session.user.id}:${targetId}`}
        initialUserId={targetId}
        user={session.user}
        service={fishCircleService}
        reminderActions={{
          followPort: accountTools,
          openUserCard,
          releaseScriptMark: (id, signal) => adminPort.markScript(id, false, signal),
        }}
        onExit={() => navigate('/discover')}
        renderDiscoveryNavigation={(circleEntry) => (
          <DiscoveryNavigation circleEntry={circleEntry} />
        )}
        renderLayout={(slots) => (
          <WorkspaceLayout sidebarLabel="鱼小圈导航" hideMobileHeader slots={slots} />
        )}
      />
    </CommentEmoticonsProvider>
  );
}
