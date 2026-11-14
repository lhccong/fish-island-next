import { ListTodo } from 'lucide-react';
import { useChatListAppearance } from './chat-list-context';
import styles from './ChatOnlineUsers.module.css';

export function CustomChatEntries({ query }: { query: string }) {
  const { appearance } = useChatListAppearance();
  const entries = appearance.entries.filter((entry) =>
    `${entry.name} ${entry.preview}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  if (!entries.length)
    return (
      <p className={styles.notice} role="status">
        {query.trim() ? '未找到匹配的条目' : '暂无清单内容，点击上方自定义按钮添加'}
      </p>
    );
  return (
    <ul className={styles.list} aria-label="自定义清单">
      {entries.map((entry) => (
        <li key={entry.id} className={styles.row} data-kind="custom">
          <span className={styles.groupAvatar}>
            <ListTodo size={22} aria-hidden="true" />
          </span>
          <div className={styles.text}>
            <span className={styles.name} title={entry.name}>
              {entry.name}
            </span>
            {entry.preview && (
              <span className={styles.preview} title={entry.preview}>
                {entry.preview}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
