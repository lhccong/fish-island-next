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
  discoveryLinks?: ReactNode;
  renderLayout: (slots: {
    sidebar: ReactNode;
    header: ReactNode;
    content: ReactNode;
    contentKey: string;
  }) => ReactNode;
}
export function FishCircleWorkspace({ user, service, renderLayout, discoveryLinks }: Props) {
  const [view, setView] = useState({ id: '', name: '' });
  return (
    <CircleFeed
      key={view.id}
      service={service}
      user={user}
      userId={view.id}
      name={view.name}
      onViewUser={(id, name) => setView({ id, name })}
      renderLayout={({ header, content }) =>
        renderLayout({
          sidebar: (
            <div className={styles.sidebar}>
              <h2>发现</h2>
              <button
                type="button"
                aria-label="全部动态"
                aria-pressed={!view.id}
                onClick={() => setView({ id: '', name: '' })}
              >
                <Aperture size={19} aria-hidden="true" />
                <span>朋友圈</span>
                <CircleAvatar name={user.name} src={user.avatarUrl || ''} size="small" />
              </button>
              {discoveryLinks}
            </div>
          ),
          header,
          content,
          contentKey: `circle-${view.id}`,
        })
      }
    />
  );
}
