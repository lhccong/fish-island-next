import { LifeAchievements } from './LifeAchievements';
import { LifeAlloc } from './LifeAlloc';
import { LifeCharacter } from './LifeCharacter';
import { LifeCultivation } from './LifeCultivation';
import { LifeHome } from './LifeHome';
import { LifeMode } from './LifeMode';
import { LifePick } from './LifePick';
import { LifePlay } from './LifePlay';
import { LifeSummary } from './LifeSummary';
import { useLife } from './useLife';
export function LifeGame() {
  const life = useLife();
  if (life.step === 'home') return <LifeHome {...life} />;
  if (life.step === 'cultivation') return <LifeCultivation {...life} />;
  if (life.step === 'mode') return <LifeMode {...life} />;
  if (life.step === 'pick') return <LifePick {...life} />;
  if (life.step === 'character') return <LifeCharacter {...life} />;
  if (life.step === 'alloc') return <LifeAlloc {...life} />;
  if (life.step === 'play') return <LifePlay {...life} />;
  if (life.step === 'summary') return <LifeSummary {...life} />;
  return <LifeAchievements {...life} />;
}
