import { useState } from 'react';
import { useStore } from 'zustand';
import { useRemarks } from './remarks-context';
import { RemarkName } from './RemarkName';
import { ChevronDown, ChevronUp, RefreshCw, Search, X } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { MemberAvatar } from './MemberAvatar';
import { GroupNameEditor } from './GroupNameEditor';
import { ChatDisplaySettings } from './ChatDisplaySettings';
import { useOnlineMembers } from './use-online-members';
import styles from './ChatWorkspace.module.css';

export function OnlineMembers({
  state,
  onRefresh,
  onClose,
  groupName,
  onRenameGroup,
}: {
  state: ReturnType<typeof useOnlineMembers>['state'];
  onRefresh: () => void;
  onClose: () => void;
  groupName: string;
  onRenameGroup: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const { controller } = useRemarks();
  const remarks = useStore(controller.store, (state) => state.remarks);
  const [expanded, setExpanded] = useState(false);
  const members = state.status === 'success' ? state.members : [];
  const filtered = members.filter((member) =>
    `${member.name} ${Object.hasOwn(remarks, member.id) ? remarks[member.id] : ''}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const showAll = expanded || query.trim().length > 0;
  const visible = showAll ? filtered : filtered.slice(0, 16);
  const grid = (
    <ul className={styles.memberGrid} id="online-members-grid">
      {visible.map((member) => (
        <li key={member.id} title={member.name}>
          <MemberAvatar key={`${member.id}:${member.avatar}`} member={member} />
          <span className={styles.memberName}>
            <RemarkName id={member.id} name={member.name} />
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <aside className={styles.members} aria-label="在线成员" id="chat-online-members">
      <div className={styles.memberHeader}>
        <h2>在线成员{state.status === 'success' ? `（${members.length}）` : ''}</h2>
        <Button
          variant="secondary"
          className={styles.iconButton}
          aria-label="刷新"
          title="刷新在线状态"
          disabled={state.status === 'idle' || state.status === 'loading'}
          onClick={onRefresh}
        >
          <RefreshCw size={16} aria-hidden="true" />
        </Button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="关闭在线列表"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      <div className={styles.search}>
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          aria-label="搜索在线成员"
          placeholder="搜索在线成员"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className={styles.memberScroll}>
        <ScrollArea label="在线成员滚动区">
          <div className={styles.memberBody}>
            {(state.status === 'idle' || state.status === 'loading') && (
              <p role="status" className={styles.memberState}>
                正在获取在线成员…
              </p>
            )}
            {state.status === 'error' && (
              <div role="alert" className={styles.memberState}>
                <p>{state.message}</p>
                <Button variant="secondary" onClick={onRefresh}>
                  重试
                </Button>
              </div>
            )}
            {state.status === 'success' && (
              <>
                <div className={styles.memberList}>
                  {members.length === 0 ? (
                    <p role="status" className={styles.memberState}>
                      暂无在线成员，可稍后刷新查看。
                    </p>
                  ) : filtered.length === 0 ? (
                    <p role="status" className={styles.memberState}>
                      没有找到匹配的在线成员，请更换关键词。
                    </p>
                  ) : showAll && filtered.length > 16 ? (
                    <div className={styles.expandedMembers}>
                      <ScrollArea label="全部在线成员" gutter="reserved">
                        <div className={styles.expandedBody}>{grid}</div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className={styles.memberPreview}>{grid}</div>
                  )}
                  {filtered.length > 16 && !query.trim() && (
                    <div className={styles.memberControls}>
                      <Button
                        variant="secondary"
                        className={styles.expandMembers}
                        aria-expanded={expanded}
                        aria-controls="online-members-grid"
                        onClick={() => setExpanded((value) => !value)}
                      >
                        {expanded ? '收起成员' : '查看更多'}
                        {expanded ? (
                          <ChevronUp size={14} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={14} aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className={styles.groupInfo}>
              <GroupNameEditor name={groupName} onSave={onRenameGroup} />
              <ChatDisplaySettings />
            </div>
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
