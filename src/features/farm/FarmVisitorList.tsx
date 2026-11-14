import type { Visitor } from '@/domain/farm';
import { FarmAvatar } from './FarmAvatar';
import styles from './FarmSocial.module.css';
export function FarmVisitorList({ visitors }: { visitors: Visitor[] }) {
  return (
    <ul className={styles.list}>
      {!visitors.length && <li className={styles.empty}>还没有访客记录，安心种田吧。</li>}
      {visitors.map((v) => (
        <li key={v.id} className={styles.row}>
          <FarmAvatar name={v.name} src={v.avatar} />
          <div className={styles.info}>
            <strong>
              {v.name || '岛友'} {v.read ? '' : '· 未读'}
            </strong>
            <small>
              收走 {v.crop || '作物'} · {v.coin} 积分
            </small>
            <small>{v.time}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}
