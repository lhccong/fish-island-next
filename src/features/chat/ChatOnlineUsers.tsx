import { useState } from 'react';
import { useStore } from 'zustand';
import { useRemarks } from './remarks-context';
import { RemarkName } from './RemarkName';
import { MessageCircle, RefreshCw, Search } from 'lucide-react';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { useChatMembers } from './chat-members-context';
import { MemberAvatar } from './MemberAvatar';
import { getWorkPreview } from './work-preview';
import { buildConversationEntries } from './camouflage-conversations';
import { CoverAvatar } from './CoverAvatar';
import styles from './ChatOnlineUsers.module.css';

export function ChatOnlineUsers({
  groupName,
  presentation = 'sidebar',
}: {
  groupName: string;
  presentation?: 'sidebar' | 'dialog';
}) {
  const { state, refresh } = useChatMembers();
  const [query, setQuery] = useState('');
  const { controller } = useRemarks();
  const remarks = useStore(controller.store, (state) => state.remarks);
  const showGroup =
    !query.trim() || groupName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const loading = state.status === 'idle' || state.status === 'loading';
  const users =
    state.status === 'success'
      ? buildConversationEntries(state.members).filter((entry) =>
          `${entry.name} ${entry.kind === 'member' && Object.hasOwn(remarks, entry.id) ? remarks[entry.id] : ''}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        )
      : [];
  const time =
    state.status === 'success'
      ? new Intl.DateTimeFormat('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(state.updatedAt)
      : '';
  return (
    <section className={styles.section} aria-label="聊天列表" data-presentation={presentation}>
      <div className={styles.heading}>
        <label className={styles.search}>
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            aria-label="搜索聊天"
            placeholder="搜索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.refresh}
          disabled={loading}
          onClick={refresh}
          aria-label="刷新聊天列表"
          title="刷新"
        >
          <RefreshCw size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.scroll}>
        <ScrollArea
          label="聊天列表滚动区"
          gutter={presentation === 'dialog' ? 'reserved' : 'overlay'}
        >
          <div className={styles.body}>
            {showGroup && (
              <div className={`${styles.row} ${styles.selected}`} aria-current="true">
                <span className={styles.groupAvatar}>
                  <MessageCircle size={24} aria-hidden="true" />
                </span>
                <div className={styles.text}>
                  <span className={styles.name} title={groupName}>
                    {groupName}
                  </span>
                  <span
                    className={styles.preview}
                    title="本地工作伪装摘要：项目进度已同步，请查看最新排期"
                  >
                    项目进度已同步，请查看最新排期
                  </span>
                </div>
                {time && (
                  <time className={styles.time} title="列表更新时间">
                    {time}
                  </time>
                )}
              </div>
            )}
            {loading && (
              <p className={styles.notice} role="status">
                正在加载列表…
              </p>
            )}
            {state.status === 'error' && (
              <div className={styles.notice} role="alert">
                <p>暂时无法加载列表，请检查网络后重试</p>
                <Button variant="secondary" onClick={refresh}>
                  重试
                </Button>
              </div>
            )}
            {state.status === 'success' &&
              (users.length === 0 ? (
                query.trim() && showGroup ? null : (
                  <p className={styles.notice} role="status">
                    {query.trim() ? '未找到匹配的联系人' : '暂无列表内容，稍后刷新看看'}
                  </p>
                )
              ) : (
                <ul className={styles.list}>
                  {users.map((entry) => {
                    const preview =
                      entry.kind === 'member' ? getWorkPreview(entry.id) : entry.preview;
                    return (
                      <li
                        className={styles.row}
                        key={`${entry.kind}:${entry.id}`}
                        data-kind={entry.kind}
                        title={entry.kind === 'cover' ? '本地伪装会话' : entry.name}
                      >
                        <span className={styles.avatarWrap}>
                          {entry.kind === 'member' ? (
                            <MemberAvatar
                              key={`${entry.id}:${entry.member.avatar}`}
                              member={entry.member}
                              size="list"
                            />
                          ) : (
                            <CoverAvatar conversation={entry} />
                          )}
                        </span>
                        <div className={styles.text}>
                          <span className={styles.name} title={entry.name}>
                            {entry.kind === 'member' ? (
                              <RemarkName id={entry.id} name={entry.name} />
                            ) : (
                              entry.name
                            )}
                          </span>
                          <span className={styles.preview} title={`本地工作伪装摘要：${preview}`}>
                            {preview}
                          </span>
                        </div>
                        <time className={styles.time} title="列表更新时间">
                          {time}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              ))}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
