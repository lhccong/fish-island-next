import { ArrowLeft, Leaf, RefreshCw } from 'lucide-react';
import type { Farmer, Friend } from '@/domain/farm';
import { Button } from '@/shared/ui/Button';
import { FarmAvatar } from './FarmAvatar';
import styles from './Farm.module.css';
export function FarmHeader({
  farmer,
  balance,
  friend,
  busy,
  loading,
  onHome,
  onRefresh,
}: {
  farmer: Farmer | undefined;
  balance: number | undefined;
  friend: Friend | null;
  busy: boolean;
  loading: boolean;
  onHome: () => void;
  onRefresh: () => void;
}) {
  const name = friend
    ? `${friend.name || '岛友'}的农场`
    : farmer?.name
      ? `${farmer.name}的小小农场`
      : '我的农场';
  return (
    <header className={styles.intro}>
      <h2 title={name}>
        {friend ? (
          <FarmAvatar name={friend.name} src={friend.avatar} small />
        ) : (
          <Leaf size={18} aria-hidden="true" />
        )}
        <span>{name}</span>
      </h2>
      {farmer && (
        <dl className={styles.stats} aria-label="农场概况">
          <div>
            <dt>等级</dt>
            <dd>Lv.{friend?.level ?? farmer.level}</dd>
          </div>
          <div>
            <dt>积分</dt>
            <dd>{balance}</dd>
          </div>
          <div>
            <dt>我的经验</dt>
            <dd>{farmer.experience}</dd>
          </div>
          <div>
            <dt>我的收获</dt>
            <dd>{farmer.harvests}</dd>
          </div>
        </dl>
      )}
      <div className={styles.headerActions}>
        {friend && (
          <Button variant="secondary" disabled={busy} onClick={onHome}>
            <ArrowLeft size={15} />
            回家
          </Button>
        )}
        <Button variant="secondary" disabled={busy || loading} onClick={onRefresh}>
          <RefreshCw size={15} />
          刷新
        </Button>
      </div>
    </header>
  );
}
