import { useEffect, useState } from 'react';
import type { ForumPort, ForumPost } from '@/domain/forum';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './Forum.module.css';
export function ForumTopics({
  service,
  onOpen,
}: {
  service: ForumPort;
  onOpen: (id: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; items: ForumPost[] }
  >({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    service
      .list({ tab: 'hot', search: '', tag: '' }, 1, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ status: 'ready', items: data.items.slice(0, 10) });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            status: 'error',
            message: error instanceof Error ? error.message : '话题读取失败',
          });
      });
    return () => controller.abort();
  }, [service, revision]);
  return (
    <aside className={styles.aside}>
      <section className={styles.panel} aria-label="热门话题">
        <h2>热门话题</h2>
        {result.status === 'loading' ? (
          <div className={styles.topicStatus}>
            <LoadingIndicator>正在加载热门话题…</LoadingIndicator>
          </div>
        ) : result.status === 'error' ? (
          <div role="alert">
            <p>{result.message}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setResult({ status: 'loading' });
                setRevision((n) => n + 1);
              }}
            >
              重试热门话题
            </Button>
          </div>
        ) : !result.items.length ? (
          <p className={styles.muted}>暂无热门话题</p>
        ) : (
          <ol className={styles.topics}>
            {result.items.map((post, index) => (
              <li key={post.id}>
                <button type="button" onClick={() => onOpen(post.id)}>
                  <span className={styles.rank} data-top={index < 3}>
                    {index + 1}
                  </span>
                  <span className={styles.topicTitle}>{post.title}</span>
                  <span className={styles.topicCount}>{post.likes} 人点赞</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className={styles.panel}>
        <h2>论坛公告</h2>
        <p className={styles.notice}>🎉 欢迎来到文章广场！</p>
        <p className={styles.notice}>分享有趣见闻，友善交流。</p>
      </section>
    </aside>
  );
}
