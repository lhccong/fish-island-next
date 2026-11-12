import { Heart, Sparkles, Orbit } from 'lucide-react';
import styles from './Payment.module.css';

export function PaymentIntro() {
  return (
    <div className={styles.intro}>
      <div className={styles.art} aria-hidden="true">
        <Orbit className={styles.orbit} size={108} strokeWidth={0.8} />
        <span className={styles.heart}>
          <Heart size={34} />
        </span>
        <Sparkles className={styles.sparkle} size={22} />
      </div>
      <div>
        <span className={styles.eyebrow}>和喜欢的鱼岛，一起发光</span>
        <h3>为快乐摸鱼，充一格能量</h3>
        <p>一份小小的心意，就是继续共建的动力。</p>
      </div>
    </div>
  );
}
