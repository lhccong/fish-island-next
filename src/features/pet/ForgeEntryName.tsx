import type { EquipmentForge } from '@/domain/pet';
import styles from './ForgePanel.module.css';

const gradeNames: Readonly<Record<number, string>> = {
  1: '白',
  2: '蓝',
  3: '紫',
  4: '金',
  5: '红',
};

export function ForgeEntryName({ entry }: { entry: EquipmentForge['entries'][number] }) {
  const grade = entry.grade === null ? '未分级' : (gradeNames[entry.grade] ?? '未分级');
  return (
    <span className={styles.name}>
      <span className={styles.grade} aria-label={`词条品质：${grade}`}>
        {grade}
      </span>
      <span>{entry.name}</span>
    </span>
  );
}
