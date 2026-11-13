import { useState, type ComponentProps, type ReactNode } from 'react';
import { InlineAutocomplete } from '@/shared/ui/InlineAutocomplete';
import { Button } from '@/shared/ui/Button';
import { useChatMembers } from './chat-members-context';
import { useChatRealtime } from './realtime-context';
import { readEditor, selectEditor } from './composer-editor';
import { mentionQuery } from './composer-mention';

export function ComposerMentions({
  text,
  selection,
  composing,
  children,
}: {
  text: string;
  selection: { start: number; end: number } | null;
  composing: boolean;
  children: ComponentProps<typeof InlineAutocomplete>['children'];
}) {
  const { draft, composerRef, user } = useChatRealtime();
  const { state, refresh } = useChatMembers();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const query = selection && mentionQuery(text, selection.start, selection.end);
  const scope = JSON.stringify([text, selection]);
  if (dismissed !== null && dismissed !== scope) setDismissed(null);
  const members =
    state.status === 'success'
      ? state.members.filter(
          (member) =>
            member.id !== user?.id &&
            member.name.toLocaleLowerCase().includes(query?.query.toLocaleLowerCase() ?? ''),
        )
      : [];
  let feedback: ReactNode;
  if (state.status === 'idle' || state.status === 'loading')
    feedback = <p role="status">正在获取在线成员…</p>;
  else if (state.status === 'error')
    feedback = (
      <div>
        <p role="alert">在线成员加载失败，请重试</p>
        <Button variant="secondary" onClick={refresh}>
          重试
        </Button>
      </div>
    );
  else if (state.status === 'success' && !members.length)
    feedback = <p role="status">{state.members.length ? '没有匹配的在线成员' : '暂无在线成员'}</p>;
  return (
    <InlineAutocomplete
      open={!!query && !composing && dismissed !== scope}
      scope={scope}
      label="提及在线成员"
      options={members.map((member) => ({ id: member.id, label: member.name }))}
      feedback={feedback}
      onClose={() => setDismissed(scope)}
      onSelect={(id) => {
        const member = members.find((item) => item.id === id);
        const editor = composerRef.current;
        if (!query || !member || !editor) return;
        const replacement = `@${member.name.trim().replace(/\s+/g, ' ')} `;
        editor.focus({ preventScroll: true });
        selectEditor(editor, query.start, query.end);
        document.execCommand('insertText', false, replacement);
        draft.setText(readEditor(editor), query.start + replacement.length);
        setDismissed(scope);
      }}
    >
      {children}
    </InlineAutocomplete>
  );
}
