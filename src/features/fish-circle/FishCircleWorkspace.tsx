import { useState, type ReactNode } from 'react';
import { Aperture } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { FishCirclePort } from '@/domain/fish-circle';
import { CircleFeed } from './CircleFeed';
import { CircleAvatar } from './CircleAvatar';
import styles from './Circle.module.css';
interface Props {
  user: AuthUser;
  service: FishCirclePort;
  onExit: () => void;
  renderDiscoveryNavigation: (circleEntry: ReactNode) => ReactNode;
  renderLayout: (slots: {
    sidebar: ReactNode;
    header: ReactNode;
    content: ReactNode;
    contentKey: string;
    contentScroll: false;
  }) => ReactNode;
}
export function FishCircleWorkspace({
  user,
  service,
  renderLayout,
  renderDiscoveryNavigation,
  onExit,
}: Props) {
  const [view, setView] = useState({ id: '', name: '' });
  return (
    <CircleFeed
      key={view.id}
      service={service}
      user={user}
      onExit={onExit}
      userId={view.id}
      name={view.name}
      onViewUser={(id, name) => setView({ id, name })}
      renderLayout={({ header, content, contentScroll }) =>
        renderLayout({
          sidebar: renderDiscoveryNavigation(
            <button
              className={styles.circleEntry}
              type="button"
              aria-label="全部动态"
              aria-pressed={!view.id}
              onClick={() => setView({ id: '', name: '' })}
            >
              <Aperture size={19} aria-hidden="true" />
              <span>朋友圈</span>
              <CircleAvatar name={user.name} src={user.avatarUrl || ''} size="small" />
            </button>,
          ),
          header,
          content,
          contentScroll,
          contentKey: `circle-${view.id}`,
        })
      }
    />
  );
}
