import { useRef } from 'react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
export function CommentUpload({
  busy,
  message,
  disabled,
  onUpload,
}: {
  busy: boolean;
  message: string;
  disabled: boolean;
  onUpload: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        variant="secondary"
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
      >
        添加图片
      </Button>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onUpload(file);
        }}
      />
      {busy && <LoadingIndicator compact>正在上传图片…</LoadingIndicator>}
      {message && <p role="status">{message}</p>}
    </>
  );
}
