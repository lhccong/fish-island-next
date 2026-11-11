import { useEffect, useState } from 'react';
import type { FishCirclePort } from '@/domain/fish-circle';
import { useOperation } from './use-operation';
export function FollowControl({ userId, service }: { userId: string; service: FishCirclePort }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const operation = useOperation();
  useEffect(() => {
    const controller = new AbortController();
    void service
      .following(userId, false, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setFollowing(value);
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : '关注状态加载失败');
      });
    return () => controller.abort();
  }, [service, userId, revision]);
  return (
    <>
      {error ? (
        <>
          <span role="alert">{error}</span>
          <button type="button" onClick={() => setRevision(revision + 1)}>
            重试关注状态
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={following === null || operation.pending}
          onClick={() => {
            void operation
              .run((signal) => service.following(userId, true, signal))
              .then((value) => {
                if (value !== undefined) setFollowing(value);
              });
          }}
        >
          {following === null ? '正在加载关注…' : following ? '取消关注' : '关注'}
        </button>
      )}
      {operation.error && <span role="alert">{operation.error}</span>}
    </>
  );
}
