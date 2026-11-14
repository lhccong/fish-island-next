import type { SessionToken } from '@/domain/auth';
import { chatImageUrl, type ChatImageUploadPort } from '@/domain/chat';

export function createChatImageUpload(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): ChatImageUploadPort {
  return {
    async upload(file, signal) {
      const credential = token();
      if (!credential) throw new Error('请登录后上传图片');
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, '')}/api/file/minio/upload?biz=user_file`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { [credential.name]: credential.value },
          body,
          signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
        },
      );
      if (response.status === 401) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      const payload: unknown = await response.json().catch(() => {
        signal.throwIfAborted();
        throw new Error(response.ok ? '图片上传结果异常，请重试' : '图片上传失败，请重试');
      });
      if (!payload || typeof payload !== 'object' || !('code' in payload))
        throw new Error('图片上传结果异常，请重试');
      if (payload.code === 40100) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok || payload.code !== 0) throw new Error('图片上传失败，请重试');
      const url = chatImageUrl('data' in payload ? payload.data : null);
      if (!url || url.includes('[/img]')) throw new Error('图片地址无效，请重试');
      return url;
    },
  };
}
