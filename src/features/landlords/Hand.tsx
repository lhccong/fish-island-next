import { useState, type ReactNode } from 'react';
import { cardFace } from '@/domain/landlords';
import { Button } from '@/shared/ui/Button';
import styles from './Landlords.module.css';
export function Hand({
  cards,
  enabled,
  pending,
  onPlay,
  children,
}: {
  children: ReactNode;
  cards: string[];
  enabled: boolean;
  pending: boolean;
  onPlay: (cards: string[]) => void;
}) {
  const [selection, setSelection] = useState<string[]>([]);
  const selected = selection.filter((id) => cards.includes(id));
  return (
    <section className={styles.hand} aria-label="我的手牌">
      <div className={styles.row}>
        <h3>
          我的手牌 <small>{cards.length} 张</small>
        </h3>
        <span>已选 {selected.length} 张</span>
      </div>
      <div className={styles.handCards}>
        {[...cards]
          .sort((a, b) => cardFace(b).rank - cardFace(a).rank)
          .map((id) => {
            const face = cardFace(id);
            return (
              <button
                type="button"
                key={id}
                aria-label={`选择${face.suit}${face.label}`}
                aria-pressed={selected.includes(id)}
                disabled={pending}
                className={styles.poker}
                data-red={face.red}
                data-suit={face.suit}
                onClick={() =>
                  setSelection((old) =>
                    old.includes(id) ? old.filter((c) => c !== id) : [...old, id],
                  )
                }
              >
                <strong>{face.label}</strong>
                <span>{face.suit}</span>
              </button>
            );
          })}
      </div>
      {!cards.length && <p className={styles.muted}>发牌后，手牌会显示在这里。</p>}
      <div className={`${styles.actions} ${styles.handFooter}`}>
        {children}
        {cards.length > 0 && (
          <>
            <Button
              variant="secondary"
              disabled={!selected.length || pending}
              onClick={() => setSelection([])}
            >
              清空选择
            </Button>
            <Button
              disabled={!enabled || !selected.length || pending}
              onClick={() => onPlay(selected)}
            >
              出牌
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
