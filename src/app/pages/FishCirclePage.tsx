import { FishCircleWorkspace } from '@/features/fish-circle';
import { CommentEmoticonsProvider } from '@/features/fish-circle';
import { chatEmoticons } from '@/app/config/chat';
import { useAuth } from '@/features/auth';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { fishCircleService } from '@/app/config/fish-circle';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { useNavigate, useSearchParams } from 'react-router';
export function FishCirclePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
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
