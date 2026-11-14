import { useState } from 'react';
import { Search, Gift, Clock } from 'lucide-react';
import type { Friend } from '@/domain/farm';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { FarmAvatar } from './FarmAvatar';
import styles from './FarmSocial.module.css';
export function FarmFriendList({
  friends,
  now,
  onVisit,
}: {
  friends: Friend[];
  now: number;
  onVisit: (friend: Friend) => void;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('desc');
  const items = friends
    .filter((f) => f.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => (sort === 'desc' ? b.level - a.level : a.level - b.level));
  return (
    <>
      <div className={styles.filters}>
        <Select
          appearance="pixel"
          label="好友等级排序"
          value={sort}
          onValueChange={setSort}
          options={[
            { value: 'desc', label: '等级从高到低' },
            { value: 'asc', label: '等级从低到高' },
          ]}
        />
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="搜索好友昵称"
            placeholder="搜索昵称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {!items.length && (
        <p className={styles.empty}>
          {search.trim() ? '没有匹配的好友' : '还没有同玩好友，互相关注后会出现在这里。'}
        </p>
      )}
      <ul className={styles.list}>
        {items.map((f, index) => {
          const wait = f.cooldown === null ? 0 : Math.max(0, Math.ceil((f.cooldown - now) / 60000));
          return (
            <li className={styles.row} key={f.id}>
              <span className={styles.rank}>{index + 1}</span>
              <FarmAvatar name={f.name} src={f.avatar} />
              <div className={styles.info}>
                <strong>{f.name || '农场好友'}</strong>
                <div className={styles.meta}>
                  <span>Lv.{f.level}</span>
                  <span data-available={f.canSteal && !wait}>
                    {wait ? (
                      <>
                        <Clock size={12} aria-hidden="true" />
                        {wait >= 60 ? `${Math.ceil(wait / 60)}小时` : `${wait}分钟`}
                      </>
                    ) : f.canSteal ? (
                      <>
                        <Gift size={12} aria-hidden="true" />
                        可偷
                      </>
                    ) : (
                      '不可偷'
                    )}
                  </span>
                </div>
              </div>
              <Button variant="secondary" onClick={() => onVisit(f)}>
                拜访
              </Button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
