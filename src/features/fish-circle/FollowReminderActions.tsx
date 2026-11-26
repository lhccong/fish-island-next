import { useEffect, useRef, useState } from 'react';
import type { FollowRelationship } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { ReminderActions } from './reminder-actions';
import { useOperation } from './use-operation';
import styles from './ReminderDetail.module.css';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; relationship: FollowRelationship };

export function FollowReminderActions({
  id,
  name,
  actions,
}: {
  id: string;
  name: string;
  actions: ReminderActions;
}) {
  const { followPort, openUserCard } = actions;
  const trigger = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const { run, pending, error } = useOperation();
  function refresh() {
    setState({ status: 'loading' });
    setRevision((current) => current + 1);
  }
  useEffect(() => {
    const request = new AbortController();
    void Promise.resolve().then(async () => {
      if (request.signal.aborted) return;
      try {
        const relationship = await followPort.followRelationship(id, request.signal);
        if (!request.signal.aborted) setState({ status: 'ready', relationship });
      } catch (cause) {
        if (!request.signal.aborted)
          setState({
            status: 'error',
            message: cause instanceof Error ? cause.message : '关注状态读取失败，请重试',
          });
      }
    });
    return () => request.abort();
  }, [followPort, id, revision]);

  async function follow() {
    if (state.status !== 'ready' || state.relationship.following || pending) return;
    const applied = await run(async (signal) => {
      await followPort.addFollow(id, signal);
      return true;
    });
    if (applied)
      setState({
        status: 'ready',
        relationship: { ...state.relationship, following: true },
      });
  }
  return (
    <>
      <div className={styles.actions}>
        <Button
          ref={trigger}
          variant="secondary"
          disabled={pending}
          onClick={() => openUserCard({ id, name, returnFocusRef: trigger, onClose: refresh })}
        >
          查看用户信息
        </Button>
        {state.status === 'loading' && (
          <LoadingIndicator compact>正在读取关注状态…</LoadingIndicator>
        )}
        {state.status === 'error' && (
          <Button variant="secondary" onClick={refresh}>
            重试关注状态
          </Button>
        )}
        {state.status === 'ready' &&
          (state.relationship.following ? (
            <span role="status">已关注</span>
          ) : (
            <Button disabled={pending} onClick={() => void follow()}>
              {pending ? (
                <LoadingIndicator compact>正在关注…</LoadingIndicator>
              ) : state.relationship.followedBy === false ? (
                '关注'
              ) : (
                '回关'
              )}
            </Button>
          ))}
      </div>
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {error && !pending && state.status === 'ready' && !state.relationship.following && (
        <p role="alert">{error}</p>
      )}
    </>
  );
}
