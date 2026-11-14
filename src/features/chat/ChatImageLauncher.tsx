import { useRef } from 'react';
import { useStore } from 'zustand';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';

export function ChatImageLauncher() {
  const input = useRef<HTMLInputElement>(null);
  const { imageUpload, user } = useChatRealtime();
  const status = useStore(imageUpload.store, (state) => state.status);
  return (
    <>
      <Button
        variant="secondary"
        aria-label="上传图片"
        title={status === 'empty' ? '上传图片' : '请先发送或移除当前图片'}
        disabled={!user || status !== 'empty'}
        onClick={() => input.current?.click()}
      >
        <ImagePlus size={22} aria-hidden="true" />
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label="选择聊天图片"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file && user) imageUpload.paste(file);
        }}
      />
    </>
  );
}
