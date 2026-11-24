import { Aperture, Bug, Layers, Sprout } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import type { UserCardDestination } from './user-card-context';
import styles from './UserCard.module.css';

const links = [
  { kind: 'pet', label: '宠物', Icon: Bug },
  { kind: 'farm', label: '农场', Icon: Sprout },
  { kind: 'collection', label: '卡片收藏', Icon: Layers },
  { kind: 'moments', label: '动态', Icon: Aperture },
] as const;

export function UserCardLinks({
  onVisit,
  onCollection,
}: {
  onVisit: (kind: UserCardDestination) => void;
  onCollection: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <div className={styles.links} role="group" aria-label="用户空间">
      {links.map(({ kind, label, Icon }) => (
        <Button
          key={kind}
          variant="secondary"
          className={styles.shortcut}
          onClick={(event) => {
            if (kind === 'collection') onCollection(event.currentTarget);
            else onVisit(kind);
          }}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </Button>
      ))}
    </div>
  );
}
