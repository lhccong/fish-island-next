import { useEffect, useState } from 'react';
import type { OnlineMember, OnlineMembersPort } from '@/domain/chat';

type MembersState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; members: readonly OnlineMember[]; updatedAt: number };

export function useOnlineMembers(service: OnlineMembersPort, enabled: boolean) {
  const [state, setState] = useState<MembersState>({ status: 'idle' });
  const [started, setStarted] = useState(false);
  const [revision, setRevision] = useState(0);
  if (enabled && !started) setStarted(true);
  // 请求由账号作用域 Provider 统一拥有，不随面板关闭或外观切换重取。
  const active = started || enabled;
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void service.loadOnlineMembers(controller.signal).then(
      (members) => {
        if (!controller.signal.aborted)
          setState({ status: 'success', members, updatedAt: Date.now() });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '在线成员加载失败，请重试',
          });
      },
    );
    return () => controller.abort();
  }, [service, active, revision]);
  return {
    state,
    refresh: () => {
      setState({ status: 'loading' });
      setRevision((value) => value + 1);
    },
  };
}
