import { ArrowUpRight } from 'lucide-react';
import type { HotSource } from '@/domain/hot-board';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import styles from './HotSourceConversation.module.css';

const timeFormat = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
});

export function HotSourceConversation({ source }: { source: HotSource }) {
  return (
    <section className={styles.conversation} aria-label={`${source.name}消息`}>
      <div className={styles.timestamp}>
        {source.updatedAt ? (
          <time dateTime={source.updatedAt}>{timeFormat.format(new Date(source.updatedAt))}</time>
        ) : (
          '本次热榜'
        )}
      </div>
      <div className={styles.outgoing} aria-label="演示消息">
        <div>
          <span className={styles.demo}>我 · 界面演示</span>
          <p>看看今天的热榜</p>
        </div>
        <span className={styles.myAvatar} aria-hidden="true">
          我
        </span>
      </div>
      <ol className={styles.messages} aria-label="热榜消息列表">
        {source.entries.map((entry) => (
          <li className={styles.message} key={entry.id}>
            <SourceAvatar name={source.name} src={source.iconUrl} />
            <article className={styles.messageBody} aria-label={`第 ${entry.rank} 条热点`}>
              <div className={styles.bubble}>
                {entry.url ? (
                  <a
                    className={styles.title}
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    {entry.title}
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                ) : (
                  <p className={styles.title}>{entry.title}</p>
                )}
              </div>
            </article>
          </li>
        ))}
      </ol>
      <p className={styles.end}>
        {source.entries.length ? '以上为本次热榜内容' : '该来源暂无热榜消息'}
      </p>
    </section>
  );
}
