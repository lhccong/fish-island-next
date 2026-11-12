import styles from './Life.module.css';

import { Home } from './LifeWelcome';
import type { LifeController } from './useLife';

export function LifeHome({ profile, setStep, begin }: LifeController) {
  return (
    <div className={styles.container}>
      <Home profile={profile} onStart={begin} onAchievements={() => setStep('achievements')} />
    </div>
  );
}
