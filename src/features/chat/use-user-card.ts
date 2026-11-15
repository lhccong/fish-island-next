import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserCard, UserCardPort } from '@/domain/account-tools';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; card: UserCard | null; following: boolean | null; followError: string };
export function useUserCardResource(port: UserCardPort, id: string, self: boolean) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const task = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', error: false });
  useEffect(() => {
    const current = new AbortController();
    void (async () => {
      await Promise.resolve();
      if (current.signal.aborted) return;
      try {
        const [card, follow] = await Promise.all([
          port.userCard(id, current.signal),
          self
            ? Promise.resolve(false)
            : port
                .followingState(id, current.signal)
                .catch((e: unknown) => (e instanceof Error ? e.message : '关注状态读取失败')),
        ]);
        if (!current.signal.aborted)
          setState({
            status: 'ready',
            card,
            following: typeof follow === 'boolean' ? follow : null,
            followError: typeof follow === 'string' ? follow : '',
          });
      } catch (e) {
        if (!current.signal.aborted)
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : '读取资料失败，请重试',
          });
      }
    })();
    return () => current.abort();
  }, [port, id, self, revision]);
  useEffect(() => () => task.current?.abort(), []);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setRevision((v) => v + 1);
  }, []);
  async function toggleFollow() {
    if (task.current || state.status !== 'ready' || state.following === null || !state.card) return;
    const current = new AbortController();
    task.current = current;
    setBusy(true);
    setFeedback({ message: '', error: false });
    try {
      const following = await port.toggleFollow(id, current.signal);
      if (!current.signal.aborted) {
        setState((old) =>
          old.status === 'ready' && old.card
            ? {
                ...old,
                following,
                card: {
                  ...old.card,
                  followers:
                    old.card.followers === undefined
                      ? undefined
                      : Math.max(
                          0,
                          old.card.followers +
                            (following === old.following ? 0 : following ? 1 : -1),
                        ),
                },
              }
            : old,
        );
        setFeedback({ message: following ? '已关注' : '已取消关注', error: false });
      }
    } catch (e) {
      if (!current.signal.aborted)
        setFeedback({ message: e instanceof Error ? e.message : '操作失败，请重试', error: true });
    } finally {
      task.current = null;
      if (!current.signal.aborted) setBusy(false);
    }
  }
  return { state, retry, busy, feedback, setFeedback, toggleFollow };
}
