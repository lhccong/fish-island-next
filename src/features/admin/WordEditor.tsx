import { useState } from 'react';
import type { AdminPort, AdminWord } from '@/domain/admin';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Field, Choice } from './fields';
import { categories } from './options';
export function WordEditor({
  port,
  word,
  ...props
}: EditorProps & { port: AdminPort; word?: AdminWord }) {
  const [v, set] = useState(word ?? { id: '', word: '', category: 'undercover', wordType: '' });
  return (
    <EditorFrame
      {...props}
      title={word ? '修改词库' : '新建词库'}
      onSubmit={(s) => port.saveWord(v, s)}
    >
      <Field
        label="单词"
        required
        value={v.word}
        onChange={(e) => set({ ...v, word: e.target.value })}
      />
      <Choice
        label="分类"
        value={v.category}
        options={categories}
        onChange={(category) => set({ ...v, category })}
      />
      <Field
        label="类型"
        value={v.wordType}
        onChange={(e) => set({ ...v, wordType: e.target.value })}
      />
    </EditorFrame>
  );
}
