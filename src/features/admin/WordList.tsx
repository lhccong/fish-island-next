import type { AdminPort } from '@/domain/admin';
import { WordEditor } from './WordEditor';
import { categories, labelOf } from './options';
import { AdminList } from './AdminList';
export function WordList({ port }: { port: AdminPort }) {
  return (
    <AdminList
      port={port}
      section="word"
      columns={[
        { key: 'id', label: 'id', render: (v) => v.id },
        { key: 'word', label: '单词', render: (v) => v.word, primary: true },
        { key: 'category', label: '分类', render: (v) => labelOf(categories, v.category) },
        { key: 'wordType', label: '类型', render: (v) => v.wordType },
        {
          key: 'createdAt',
          label: '创建时间',
          render: (v) => v.createdAt,
          sortField: 'createTime',
        },
        {
          key: 'updatedAt',
          label: '更新时间',
          render: (v) => v.updatedAt,
          sortField: 'updateTime',
        },
      ]}
      editor={(v, onClose, onSaved) => (
        <WordEditor port={port} {...(v ? { word: v } : {})} {...{ onClose, onSaved }} />
      )}
    />
  );
}
