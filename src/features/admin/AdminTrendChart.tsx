import type { AdminTrend } from '@/domain/admin';
import styles from './AdminAnalytics.module.css';
export function AdminTrendChart({ items }: { items: AdminTrend[] }) {
  const max = Math.max(1, ...items.map((v) => v.count));
  const points = items.map((v, i) => ({
    x: 60 + (i * 900) / Math.max(1, items.length - 1),
    y: 250 - (v.count * 200) / max,
    ...v,
  }));
  return (
    <>
      <svg
        className={styles.chart}
        viewBox="0 0 1000 300"
        role="img"
        aria-label="新增用户走势图，横轴日期，纵轴新增用户人数"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <line x1="60" x2="960" y1={250 - i * 50} y2={250 - i * 50} />
            <text x="48" y={254 - i * 50} textAnchor="end">
              {Math.round((max * i) / 4)}
            </text>
          </g>
        ))}
        <text x="60" y="25">
          新增用户
        </text>
        <polyline points={points.map((v) => `${v.x},${v.y}`).join(' ')} />
        {points
          .filter(
            (_, i) =>
              i % Math.max(1, Math.ceil(points.length / 8)) === 0 || i === points.length - 1,
          )
          .map((v) => (
            <g key={v.date}>
              <circle cx={v.x} cy={v.y} r="3">
                <title>
                  {v.date}：{v.count} 人
                </title>
              </circle>
              <text x={v.x} y="280" textAnchor="middle">
                {v.date}
              </text>
            </g>
          ))}
      </svg>
      <table className={styles.accessible}>
        <caption>新增用户趋势明细</caption>
        <thead>
          <tr>
            <th scope="col">日期</th>
            <th scope="col">新增用户</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.date}>
              <td>{v.date}</td>
              <td>{v.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
