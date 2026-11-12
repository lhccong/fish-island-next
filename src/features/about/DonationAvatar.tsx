import { useState } from 'react';
import type { Donation } from '@/domain/about';
import styles from './Donation.module.css';

export function DonationAvatar({ donor, large = false }: { donor: Donation; large?: boolean }) {
  const [failed, setFailed] = useState('');
  return (
    <span className={`${styles.avatar} ${large ? styles.largeAvatar : ''}`} aria-hidden="true">
      <span>{donor.name.slice(0, 1)}</span>
      {donor.avatar && failed !== donor.avatar && (
        <img src={donor.avatar} alt="" loading="lazy" onError={() => setFailed(donor.avatar)} />
      )}
      {large && donor.frame && (
        <img className={styles.frame} src={donor.frame} alt="" loading="lazy" />
      )}
    </span>
  );
}
