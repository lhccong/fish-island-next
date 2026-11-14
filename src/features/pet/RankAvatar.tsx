import { useState } from 'react';
import { PetSprite } from './PetSprite';
import styles from './Rankings.module.css';

export function RankAvatar({
  name,
  avatar,
  petUrl,
  petName,
}: {
  name: string;
  avatar: string;
  petUrl?: string;
  petName: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={styles.portrait}>
      <span className={styles.avatar}>
        {avatar && failed !== avatar ? (
          <img
            src={avatar}
            alt={`${name}的头像`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(avatar)}
          />
        ) : (
          <span role="img" aria-label={`${name}${avatar ? '的头像暂不可用' : '暂无头像'}`}>
            {Array.from(name.trim())[0] || '鱼'}
          </span>
        )}
      </span>
      {petUrl && (
        <span className={styles.pet}>
          <PetSprite url={petUrl} name={`${petName}的宠物形象`} size={22} />
        </span>
      )}
    </span>
  );
}
