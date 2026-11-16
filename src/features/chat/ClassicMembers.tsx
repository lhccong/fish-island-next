import { useState } from 'react';
import { EyeOff, UsersRound } from 'lucide-react';
import { memberLevelEmoji, sortMembersByLevel } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useChatMembers } from './chat-members-context';
import { MemberAvatar } from './MemberAvatar';
import { RemarkName } from './RemarkName';
import styles from './ClassicMembers.module.css';

export function ClassicMembers() {
  const { state, refresh } = useChatMembers();
  const [open, setOpen] = useState(true);
  return (
    <aside className={styles.members} data-open={open} aria-label="经典在线成员">
      <header>
        {open && <h2>在线成员{state.status === 'success' ? ` (${state.members.length})` : ''}</h2>}
        <Button
          variant="secondary"
          aria-label={open ? '隐藏在线成员' : '展开在线成员'}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <EyeOff size={14} aria-hidden="true" />
          ) : (
            <UsersRound size={16} aria-hidden="true" />
          )}
        </Button>
      </header>
      {open && (
        <div className={styles.scroll}>
          <ScrollArea label="经典在线成员滚动区" gutter="reserved">
            <div className={styles.body}>
              {(state.status === 'idle' || state.status === 'loading') && (
                <LoadingIndicator>正在获取在线成员…</LoadingIndicator>
              )}
              {state.status === 'error' && (
                <div role="alert">
                  <p>{state.message}</p>
                  <Button variant="secondary" onClick={refresh}>
                    重试
                  </Button>
                </div>
              )}
              {state.status === 'success' &&
                (state.members.length ? (
                  <ul>
                    {sortMembersByLevel(state.members).map((member) => (
                      <li key={member.id}>
                        <MemberAvatar member={member} size="classic" showFrame={false} />
                        <div className={styles.identity}>
                          <RemarkName id={member.id} name={member.name} level={member.level} />
                          <span className={styles.status}>在线</span>
                        </div>
                        {memberLevelEmoji(member.level) && (
                          <span
                            className={styles.level}
                            aria-label={`等级 ${member.level}`}
                            title={`等级 ${member.level}`}
                          >
                            {memberLevelEmoji(member.level)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>
                    <p>暂无在线成员</p>
                    <Button variant="secondary" onClick={refresh}>
                      刷新成员
                    </Button>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </aside>
  );
}
