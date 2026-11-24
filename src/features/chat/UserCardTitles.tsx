import { SenderTitle } from './SenderTitle';
import styles from './UserCard.module.css';

export function UserCardTitles({
  current,
  owned,
  level,
}: {
  current: string | undefined;
  owned: readonly string[] | undefined;
  level: number | undefined;
}) {
  const primary = current && current !== '0' ? current : level !== undefined ? '0' : undefined;
  const titles = new Set(primary === undefined ? owned : [primary, ...(owned ?? [])]);
  if (titles.size === 0) return null;
  return (
    <ul className={styles.titles} aria-label="称号">
      {[...titles].map((id) => (
        <li key={id}>
          <SenderTitle titleId={id} level={level} preview />
        </li>
      ))}
    </ul>
  );
}
