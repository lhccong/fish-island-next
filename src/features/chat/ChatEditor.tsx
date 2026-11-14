import { useLayoutEffect, useRef, useState, type ClipboardEventHandler } from 'react';
import { useStore } from 'zustand';
import { parseEmojiText } from '@/domain/chat';
import { useChatRealtime } from './realtime-context';
import { editorSelection, readEditor, renderEditor, selectEditor } from './composer-editor';
import styles from './ChatEditor.module.css';
import { ComposerMentions } from './ComposerMentions';
import type { ChatPresentation } from './chat-presentation';

export function ChatEditor({
  onSend,
  onPaste,
  presentation = 'conversation',
}: {
  onSend: () => void;
  onPaste: ClipboardEventHandler<HTMLDivElement>;
  presentation?: ChatPresentation;
}) {
  const { draft, composerRef } = useChatRealtime();
  const text = useStore(draft.store, (state) => state.text);
  const composing = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const remember = () => {
    const editor = composerRef.current;
    const selection = editor && editorSelection(editor);
    if (selection) {
      draft.select(selection.start, selection.end);
      setSelection(selection);
    }
  };
  const input = () => {
    const editor = composerRef.current;
    if (!editor) return;
    draft.setText(readEditor(editor));
    remember();
  };
  useLayoutEffect(() => {
    const editor = composerRef.current;
    if (!editor || composing.current) return;
    const plainEmoji = parseEmojiText(editor.textContent ?? '').some((part) => part.id);
    if (readEditor(editor) === text && !plainEmoji) return;
    renderEditor(editor, text);
    if (document.activeElement === editor) {
      const selection = draft.selection();
      selectEditor(editor, selection.start, selection.end);
    }
  }, [text, composerRef, draft]);
  return (
    <ComposerMentions text={text} selection={selection} composing={isComposing}>
      {(attributes) => (
        <div
          {...attributes}
          ref={composerRef}
          className={styles.editor}
          data-presentation={presentation}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="消息草稿"
          aria-multiline="true"
          data-placeholder="写点什么…"
          onInput={input}
          onFocus={remember}
          onBlur={remember}
          onKeyUp={remember}
          onPointerUp={remember}
          onCompositionStart={() => {
            composing.current = true;
            setIsComposing(true);
          }}
          onCompositionEnd={() => {
            composing.current = false;
            setIsComposing(false);
            input();
          }}
          onCopy={(event) => {
            const selection = window.getSelection();
            if (!selection?.rangeCount || selection.isCollapsed) return;
            event.preventDefault();
            event.clipboardData.setData(
              'text/plain',
              readEditor(selection.getRangeAt(0).cloneContents()),
            );
          }}
          onPaste={(event) => {
            onPaste(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            // insertText keeps the browser's native undo transaction and accepts no HTML.
            document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
            input();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const text = event.dataTransfer.getData('text/plain');
            if (text) {
              document.execCommand('insertText', false, text);
              input();
            }
          }}
          onKeyDown={(event) => {
            if (
              event.key !== 'Enter' ||
              event.nativeEvent.isComposing ||
              composing.current ||
              event.nativeEvent.keyCode === 229
            )
              return;
            if (!event.shiftKey && window.matchMedia('(min-width: 761px)').matches) {
              event.preventDefault();
              onSend();
            }
          }}
        />
      )}
    </ComposerMentions>
  );
}
