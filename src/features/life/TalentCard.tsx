import { talents } from '@/domain/life';
import { Check } from 'lucide-react';
import styles from './Life.module.css';

const gradeClass = (value: number) => styles[`grade-${Math.max(0, Math.min(3, value))}`];

export const TalentCard = ({
  id,
  selected,
  onClick,
}: {
  id: number;
  selected?: boolean;
  onClick?: () => void;
}) => {
  const talent = talents.get(id);
  if (!talent) return null;
  return (
    <button
      type="button"
      aria-pressed={onClick ? !!selected : undefined}
      className={`${styles.talent} ${gradeClass(talent.grade)} ${selected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {selected && <Check size={18} className={styles.selectionMark} aria-hidden="true" />}
      <strong>{talent.name}</strong>
      <span>{talent.description}</span>
    </button>
  );
};
