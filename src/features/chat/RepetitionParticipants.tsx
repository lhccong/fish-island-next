import { useStore } from 'zustand';
import { senderTitle } from '@/domain/chat';
import { MemberAvatar } from './MemberAvatar';
import { useChatRealtime } from './realtime-context';
import styles from './Repetition.module.css';
function Participant({ id }: { id: string }) {
  const { controller } = useChatRealtime();
  const message = useStore(controller.store, (state) => state.messages[id]);
  if (!message) return null;
  const title = senderTitle(message.senderTitleId, message.senderLevel);
  return (
    <li
      className={styles.participant}
      aria-label={`${message.senderName}：${title}`}
      title={`${message.senderName}：${title}`}
    >
      <span className={styles.avatar}>
        <MemberAvatar
          key={`${message.senderId}:${message.senderAvatar ?? ''}`}
          member={{
            id: message.senderId,
            name: message.senderName,
            avatar: message.senderAvatar ?? null,
          }}
        />
      </span>
    </li>
  );
}
export function RepetitionParticipants({ ids }: { ids: readonly string[] }) {
  const { controller } = useChatRealtime();
  // Identity changes are delivered through the group's stable IDs; each participant subscribes to its entity.
  const participants = new Map<string, string>();
  for (const id of ids) {
    const message = controller.store.getState().messages[id];
    if (message) participants.set(message.senderId, id);
  }
  return (
    <div className={styles.participants} role="group" aria-label={`连续复读：${ids.length}条`}>
      <ul className={styles.people} aria-label="复读参与者">
        {[...participants.values()].map((id) => (
          <Participant key={id} id={id} />
        ))}
      </ul>
    </div>
  );
}
