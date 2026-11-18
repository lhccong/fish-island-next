import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { chatImageAccept } from './prepare-image';
import styles from './EmoticonPanel.module.css';

export function EmoticonUploadTile({ pending }: { pending: boolean }) {
  const { emoticons, user } = useChatRealtime();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        variant="secondary"
        className={styles.upload ?? ''}
        aria-label="上传本地表情包"
        title="上传本地表情包"
        disabled={!user || pending}
        onClick={() => input.current?.click()}
      >
        <Plus size={24} aria-hidden="true" />
      </Button>
      <input
        ref={input}
        type="file"
        accept={chatImageAccept}
        aria-label="选择本地表情图片"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file && user) void emoticons.upload(file);
        }}
      />
    </>
  );
}
