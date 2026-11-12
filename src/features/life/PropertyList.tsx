import type { Properties } from '@/domain/life';
import { judge, judgeGradeByValue } from '@/domain/life';
import { judgeNames, properties } from './display';
import styles from './Life.module.css';

const propertyKeys = ['charm', 'intelligence', 'strength', 'money', 'spirit'] as const;
const gradeClass = (value: number) => styles[`grade-${Math.max(0, Math.min(3, value))}`];

export const PropertyList = ({
  values,
  includeAge = false,
  living = false,
}: {
  values: Properties;
  includeAge?: boolean;
  living?: boolean;
}) => (
  <div className={styles.propertyGrid}>
    {[...propertyKeys, ...(includeAge ? ['age' as const] : [])].map((key) => (
      <div
        key={key}
        className={`${styles.property} ${gradeClass(judgeGradeByValue(key, values[key]))}`}
      >
        <span>{key === 'age' && living ? '年龄' : properties[key]}</span>
        <b>{values[key]}</b>
        <small>
          {key === 'age' && living
            ? values.age === 0
              ? '出生'
              : '岁'
            : judgeNames[key]![judge(key, values[key])]}
        </small>
      </div>
    ))}
  </div>
);
