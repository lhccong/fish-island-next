import { useState } from 'react';
import type { OnlineMember } from '@/domain/chat';
import styles from './ChatWorkspace.module.css';
import { AvatarFrame } from '@/shared/ui/AvatarFrame';

export function MemberAvatar({
  member,
  size = 'grid',
  showFrame = true,
}: {
  member: OnlineMember;
  size?: 'grid' | 'list' | 'compact' | 'classic';
  showFrame?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <AvatarFrame src={showFrame ? member.avatarFrameUrl : null}>
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
    </AvatarFrame>
  );
}
