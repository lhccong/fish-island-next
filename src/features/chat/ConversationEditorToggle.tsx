import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ChatListEntry } from './camouflage-conversations';
import { ConversationAvatar } from './ConversationAvatar';
import styles from './ChatListEditor.module.css';

export function ConversationEditorToggle({
  entry,
  name,
  preview,
  expanded,
  fieldsId,
  onToggle,
}: {
  entry: ChatListEntry;
  name: string;
  preview: string;
  expanded: boolean;
  fieldsId: string;
  onToggle: () => void;
}) {
  const press = useRef<{ id: number; x: number; y: number; time: number } | null>(null);
  const handledTouch = useRef(false);
  return (
    <button
      type="button"
      className={styles.conversationToggle}
      aria-label={`编辑${name}`}
      aria-expanded={expanded}
      aria-controls={expanded ? fieldsId : undefined}
      onPointerDown={(event) => {
        if (!event.isPrimary) return;
        handledTouch.current = false;
        press.current =
          event.pointerType === 'touch'
            ? { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
            : null;
      }}
      onPointerCancel={() => {
        press.current = null;
      }}
      onPointerUp={(event) => {
        const start = press.current;
        if (start?.id !== event.pointerId) return;
        press.current = null;
        if (
          event.timeStamp - start.time > 500 ||
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
        )
          return;
        // A browser may suppress the synthesized click after a captured drag.
        handledTouch.current = true;
        onToggle();
      }}
      onClick={(event) => {
        if (event.detail === 0 || !handledTouch.current) onToggle();
        handledTouch.current = false;
      }}
    >
      <span className={styles.conversationAvatar} aria-hidden="true">
        <ConversationAvatar entry={entry} />
      </span>
      <span className={styles.conversationText}>
        <span className={styles.conversationName}>{name}</span>
        <span className={styles.conversationPreview}>{preview}</span>
      </span>
      <ChevronDown className={styles.editChevron} size={16} aria-hidden="true" />
    </button>
  );
}
