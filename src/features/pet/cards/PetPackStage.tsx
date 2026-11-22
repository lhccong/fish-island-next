import { Disc3, PawPrint, ScrollText, Sparkles } from 'lucide-react';
import {
  getPetCard,
  petCardPacks,
  petPackSize,
  type PetCardPackKind,
  type PetCardResult,
} from '@/domain/pet';
import { petCardArt } from './card-art';
import { PetCardFace } from './PetCardFace';
import styles from './PetCards.module.css';

const cardPositions = Array.from({ length: petPackSize }, (_, index) => index);

export function PetPackStage({
  kind,
  result,
  revealed,
  opening,
  firstPack,
}: {
  kind: PetCardPackKind;
  result: PetCardResult | null;
  revealed: number;
  opening: boolean;
  firstPack: boolean;
}) {
  const pack = petCardPacks[kind];
  const PackIcon = kind === 'kingdoms' ? ScrollText : PawPrint;
  if (!result || opening) {
    return (
      <div className={styles.packStage}>
        <div className={styles.pack} data-pack={kind} data-opening={opening} aria-hidden="true">
          <div className={styles.packSeal} />
          <div className={styles.packWrapper}>
            <span className={styles.packMark}>
              <PackIcon size={13} /> 鱼岛伙伴
            </span>
            <strong>{pack.name}</strong>
            <span
              className={styles.packIllustration}
              style={petCardArt(getPetCard(pack.cover).art)}
            />
            <span className={styles.packLabel}>
              <Sparkles size={13} /> {petPackSize} 张卡片
            </span>
          </div>
          <Sparkles className={styles.tornSpark} size={32} />
        </div>
        <div className={styles.packInfo}>
          <h3>{pack.name}</h3>
          <p>
            每包抽 {petPackSize} 张，共收录 {pack.ids.length} 张。
          </p>
          {firstPack && (
            <p className={styles.firstPack}>
              <Sparkles size={15} aria-hidden="true" /> 首包必有闪耀卡
            </p>
          )}
        </div>
      </div>
    );
  }

  const earned = result.cards.reduce((sum, pull) => sum + pull.points, 0);
  return (
    <section className={styles.results} aria-label="开卡结果">
      <div className={styles.resultHeading}>
        <h3>{revealed === petPackSize ? '开包完成' : '翻开宠物卡'}</h3>
        <span>
          {revealed} / {petPackSize}
        </span>
      </div>
      <ul className={styles.drawGrid}>
        {cardPositions.map((position) => {
          const pull = result.cards[position];
          const visible = position < revealed && pull;
          return (
            <li key={position} className={styles.drawSlot} data-pack-position={position + 1}>
              {visible ? (
                <div className={styles.revealed}>
                  <PetCardFace id={pull.id} />
                  <span className={pull.points ? styles.duplicate : styles.newCard}>
                    {pull.points ? `重复 · +${pull.points} 积分` : '新收藏'}
                  </span>
                </div>
              ) : (
                <div
                  className={styles.cardBack}
                  role="img"
                  aria-label={`第 ${position + 1} 张未翻开`}
                >
                  <PackIcon size={27} aria-hidden="true" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {revealed === petPackSize && (
        <p className={styles.settlement} role="status">
          <Disc3 size={16} aria-hidden="true" />
          {earned ? `重复卡已分解，获得 ${earned} 试玩积分` : '五张新卡已加入收藏'}
        </p>
      )}
    </section>
  );
}
