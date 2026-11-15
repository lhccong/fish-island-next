import { useState } from 'react';
import type { AdminPort, AdminTitle } from '@/domain/admin';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Field } from './fields';
export function TitleEditor({
  port,
  title,
  ...props
}: EditorProps & { port: AdminPort; title?: AdminTitle }) {
  const [name, setName] = useState(title?.name ?? '');
  return (
    <EditorFrame
      {...props}
      title={title ? '修改称号' : '新建称号'}
      onSubmit={(s) => port.saveTitle({ id: title?.id ?? '', name }, s)}
    >
      <Field
        label="称号名称"
        required
        value={name}
        maxLength={64}
        onChange={(e) => setName(e.target.value)}
      />
    </EditorFrame>
  );
}
