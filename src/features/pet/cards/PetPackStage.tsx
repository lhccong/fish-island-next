import { Disc3, PawPrint, ScrollText } from 'lucide-react';
import { petPackSize, type PetCardPack, type PetCardResult } from '@/domain/pet';
import { PetCardFace } from './PetCardFace';
import { PetPackCovers } from './PetPackCovers';
import type { MovePack } from './use-pack-swipe';
import styles from './PetCards.module.css';

const cardPositions = Array.from({ length: petPackSize }, (_, index) => index);

export function PetPackStage({
  pack,
  result,
  revealed,
  opening,
  firstPack,
  move,
  revealDisabled,
  onReveal,
}: {
  pack: PetCardPack;
  result: Pick<PetCardResult, 'cards'> | null;
  revealed: readonly number[];
  opening: boolean;
  firstPack: boolean;
  move: MovePack | undefined;
  revealDisabled: boolean;
  onReveal: (position: number, keyboard: boolean) => void;
}) {
  if (!result || opening) {
    return <PetPackCovers pack={pack} opening={opening} firstPack={firstPack} move={move} />;
  }

  const earned = result.cards.reduce((sum, pull) => sum + pull.points, 0);
  const materials = result.cards.filter((pull) => pull.duplicate).length;
  const complete = revealed.length === petPackSize;
  const PackIcon = pack.id === 'kingdoms' ? ScrollText : PawPrint;
  return (
    <section className={styles.results} aria-label="开卡结果">
      <div className={styles.resultHeading}>
        <h3>{complete ? '开包完成' : '翻开宠物卡'}</h3>
        <span>
          {revealed.length} / {petPackSize}
        </span>
      </div>
      <ul className={styles.drawGrid}>
        {cardPositions.map((position) => {
          const pull = result.cards[position];
          const visible = revealed.includes(position) && pull;
          return (
            <li key={position} className={styles.drawSlot} data-pack-position={position + 1}>
              {visible ? (
                <div className={styles.revealed}>
                  <PetCardFace id={pull.id} />
                  <span
                    className={pull.points || pull.duplicate ? styles.duplicate : styles.newCard}
                  >
                    {pull.points
                      ? `重复 · +${pull.points} 积分`
                      : pull.duplicate
                        ? '重复 · 升星材料'
                        : '新收藏'}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.cardBack}
                  aria-label={`翻开第 ${position + 1} 张卡`}
                  disabled={revealDisabled}
                  onClick={(event) => onReveal(position, event.detail === 0)}
                >
                  <PackIcon size={27} aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {complete && (
        <p className={styles.settlement} role="status">
          <Disc3 size={16} aria-hidden="true" />
          {earned
            ? `重复卡已分解，获得 ${earned} 试玩积分`
            : materials
              ? `${materials} 张重复卡已存为升星材料`
              : '五张新卡已加入收藏'}
        </p>
      )}
    </section>
  );
}
