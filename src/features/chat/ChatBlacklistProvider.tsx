import { useState, type ReactNode } from 'react';
import { setUserBlocked } from '@/domain/account-tools';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import {
  BlacklistConfirmationContext,
  type BlacklistTarget,
} from './blacklist-confirmation-context';
import { useChatRealtime } from './realtime-context';

export function ChatBlacklistProvider({ children }: { children: ReactNode }) {
  const { blacklist, composerRef, draft, userId } = useChatRealtime();
  const [target, setTarget] = useState<BlacklistTarget | null>(null);
  return (
    <BlacklistConfirmationContext.Provider value={setTarget}>
      {children}
      {target && (
        <ConfirmDialog
          title="加入黑名单"
          description={`加入后，将在此浏览器屏蔽「${target.user.name}」的聊天消息。`}
          confirmLabel="确认加入"
          errorMessage="无法保存黑名单，请检查浏览器存储权限后重试。"
          returnFocusRef={{
            get current() {
              const origin = target.returnFocusRef.current;
              return origin?.isConnected ? origin : composerRef.current;
            },
          }}
          onClose={() => setTarget(null)}
          onConfirm={() => {
            setUserBlocked(blacklist, userId, target.user, true);
            draft.notify('已屏蔽，可在我的黑名单中移除');
          }}
        />
      )}
    </BlacklistConfirmationContext.Provider>
  );
}
