import { useRef, useState } from 'react';
import type { AdminPetCardPort } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Choice, Field } from './fields';
import styles from './PetCardPoolSettings.module.css';

const layouts = [
  { value: 'square', label: '正方格（图集 5:2）' },
  { value: 'portrait', label: '4:5 竖格（图集 2:1）' },
];

export function PetCardAtlasEditor({ port, ...modal }: EditorProps & { port: AdminPetCardPort }) {
  const [file, setFile] = useState<File>();
  const [name, setName] = useState('');
  const [portrait, setPortrait] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function submit(signal: AbortSignal) {
    if (!file) throw new Error('请选择一张 5 列 2 行的图集。');
    if (file.size > 8 * 1024 * 1024) throw new Error('图集大小须在 8 MB 以内。');
    await port.uploadAtlas({ name, portrait, file }, signal);
  }
  return (
    <EditorFrame
      {...modal}
      bodyClassName={styles.editorBody ?? ''}
      title="上传十卡图集"
      submitLabel="上传"
      onSubmit={submit}
    >
      <Field
        label="图集名称"
        value={name}
        required
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
      />
      <Choice
        label="图集格位比例"
        value={portrait ? 'portrait' : 'square'}
        options={layouts}
        onChange={(layout) => setPortrait(layout === 'portrait')}
      />
      <p className={styles.help}>选择一张 5 列 2 行的 JPG 或 PNG，大小不超过 8 MB。</p>
      <input
        type="file"
        hidden
        ref={input}
        aria-label="图集文件"
        accept="image/jpeg,image/png"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) {
            setFile(selected);
            if (!name) setName(selected.name.replace(/\.[^.]+$/, '').slice(0, 80));
          }
        }}
      />
      <div className={styles.fileRow}>
        <Button variant="secondary" onClick={() => input.current?.click()}>
          选择图集文件
        </Button>
        <span>{file?.name ?? '未选择文件'}</span>
      </div>
    </EditorFrame>
  );
}
