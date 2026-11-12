import { useState } from 'react';
import type { OnlineMember } from '@/domain/chat';
import styles from './ChatWorkspace.module.css';

export function MemberAvatar({
  member,
  size = 'grid',
}: {
  member: OnlineMember;
  size?: 'grid' | 'list';
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.avatar} data-size={size}>
      {member.avatar && !failed ? (
        <img
          src={member.avatar}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        member.name.slice(0, 1)
      )}
    </span>
  );
}
