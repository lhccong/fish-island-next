import { BookOpen, GalleryVerticalEnd, History, PackageOpen } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import styles from './PetCards.module.css';

const views = [
  { id: 'pack', label: '开卡包', Icon: PackageOpen },
  { id: 'collection', label: '我的收藏', Icon: GalleryVerticalEnd },
  { id: 'encyclopedia', label: '图鉴', Icon: BookOpen },
  { id: 'history', label: '开包记录', Icon: History },
] as const;
const demoViews = [views[0], { ...views[1], label: '展示柜' }, views[2]];

export type PetCardView = (typeof views)[number]['id'];

export function PetCardNavigation({
  view,
  onChange,
  isDisabled,
  demo = false,
}: {
  view: PetCardView;
  onChange: (view: PetCardView) => void;
  isDisabled: (view: PetCardView) => boolean;
  demo?: boolean;
}) {
  return (
    <div role="group" aria-label={demo ? '卡包玩法' : '卡包功能'} className={styles.tabs}>
      {(demo ? demoViews : views).map(({ id, label, Icon }) => (
        <Button
          key={id}
          variant="secondary"
          aria-pressed={view === id}
          disabled={isDisabled(id)}
          onClick={() => onChange(id)}
        >
          <Icon size={16} aria-hidden="true" /> {label}
        </Button>
      ))}
    </div>
  );
}
