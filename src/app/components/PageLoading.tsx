import { Fish } from 'lucide-react';
import styles from './PageLoading.module.css';

export function PageLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.content} role="status" aria-live="polite">
        <div className={styles.mark} aria-hidden="true">
          <span className={styles.ring} />
          <Fish size={28} strokeWidth={1.6} />
        </div>
        <h1 className={styles.title}>正在打开页面</h1>
        <p className={styles.hint}>稍等片刻，马上就好</p>
      </div>
    </main>
  );
}
