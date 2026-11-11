import type { HotSource } from '@/domain/hot-board';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { formatHeat, relativeUpdate } from './legacy-format';
import styles from './HotSourceCard.module.css';

export function HotSourceCard({
  source,
  onOpen,
}: {
  source: HotSource;
  onOpen: (id: string) => void;
}) {
  return (
    <section className={styles.card} aria-label={source.name}>
      <span className={styles.ribbon}>{source.badgeLabel}</span>
      <header className={styles.header}>
        <button
          className={styles.open}
          type="button"
          onClick={() => onOpen(source.id)}
          aria-label={`查看${source.name}消息`}
        >
          <SourceAvatar name={source.name} src={source.iconUrl} size="small" />
          <span className={styles.name}>{source.name}</span>
        </button>
        <span className={styles.update} title={source.updatedAt ?? '更新时间未知'}>
          （更新时间：{relativeUpdate(source.updatedAt)}）
        </span>
      </header>
      <div className={styles.body}>
        <ScrollArea label={`${source.name}榜单滚动区`}>
          <ol className={styles.entries}>
            {source.entries.map((entry) => {
              const content = (
                <>
                  <span className={styles.text}>
                    <span className={styles.rank} data-rank={entry.rank}>
                      {entry.rank}
                    </span>
                    {entry.title.length > 25 ? `${entry.title.slice(0, 25)}...` : entry.title}
                  </span>
                  {entry.heat !== null && (
                    <span className={styles.heat}>🔥 {formatHeat(entry.heat)}</span>
                  )}
                </>
              );
              return (
                <li key={entry.id} className={styles.entry} title={entry.title}>
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className={styles.link}
                      aria-label={entry.title}
                    >
                      {content}
                    </a>
                  ) : (
                    <span className={styles.link}>{content}</span>
                  )}
                </li>
              );
            })}
          </ol>
          {!source.entries.length && <p className={styles.empty}>该来源暂无内容</p>}
        </ScrollArea>
      </div>
    </section>
  );
}
