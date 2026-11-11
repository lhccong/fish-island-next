import { CircleError, type FishCirclePort } from '@/domain/fish-circle';
import type { SessionToken } from '@/domain/auth';
import { record, moment, comment, page, id, safeUrl, text } from './decode';
export function createFishCircleClient(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): FishCirclePort {
  async function request(
    path: string,
    body: object | FormData | null,
    signal: AbortSignal,
  ): Promise<unknown> {
    const headers = new Headers();
    const credential = token();
    if (!credential) throw new CircleError('请先登录', true);
    headers.set(credential.name, credential.value);
    const form = body instanceof FormData;
    if (body && !form) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
      });
      if (response.status === 401) throw new CircleError('登录已过期，请重新登录', true);
      if (!response.ok) throw new CircleError(`鱼小圈服务暂不可用（HTTP ${response.status}）`);
      const payload = record(await response.json());
      if (payload.code === 40100) throw new CircleError('登录已过期，请重新登录', true);
      if (payload.code !== 0)
        throw new CircleError(text(payload.message) || '操作失败，请稍后重试');
      return payload.data;
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof CircleError) {
        if (error.expired) onExpired();
        throw error;
      }
      throw new CircleError('连接鱼小圈失败，请检查网络后重试');
    }
  }
  function confirmed(v: unknown): boolean {
    if (v !== true) throw new CircleError('服务器未确认操作成功');
    return true;
  }
  return {
    async profile(userId, signal) {
      const user = record(
        await request(`user/get/vo?id=${encodeURIComponent(userId)}`, null, signal),
      );
      return {
        name: text(user.userName),
        avatar: safeUrl(user.userAvatar),
        cover: safeUrl(user.momentsBgUrl),
      };
    },
    async list(current, userId, signal) {
      return page(
        await request(
          'moments/list',
          { current, pageSize: 10, ...(userId ? { userId } : {}) },
          signal,
        ),
        moment,
      );
    },
    async save(draft, original, signal) {
      const result = await request(
        `moments/${original ? 'update' : 'publish'}`,
        {
          content: draft.content.trim(),
          location: draft.location.trim(),
          mediaJson: draft.media,
          ...(original ? { id: original.id } : { visibility: 0 }),
        },
        signal,
      );
      if (original) return confirmed(result);
      id(result);
      return true;
    },
    async like(momentId, signal) {
      const result = await request('moments/like', { momentId }, signal);
      if (typeof result !== 'boolean') throw new CircleError('点赞状态异常');
      return result;
    },
    async action(action, momentId, value, signal) {
      const result = await request(
        `moments/${action}`,
        action === 'delete'
          ? { id: momentId }
          : {
              momentId,
              ...(action === 'top'
                ? { top: value === 1 }
                : action === 'reward'
                  ? { points: value }
                  : { winnerCount: value }),
            },
        signal,
      );
      if (action !== 'lottery/start') {
        confirmed(result);
        return '操作成功';
      }
      const winners = record(result).winners;
      if (!Array.isArray(winners)) throw new CircleError('抽奖结果格式异常');
      return `中奖岛友：${winners.map((w: unknown) => text(record(w).userName)).join('、') || '无'}`;
    },
    async comments(momentId, current, signal) {
      return page(
        await request('moments/comment/list', { momentId, current, pageSize: 10 }, signal),
        comment,
      );
    },
    async comment(momentId, content, parent, images, signal) {
      id(
        await request(
          'moments/comment/add',
          {
            momentId,
            content: content + images.map((image) => `[img:${image.url}]`).join(''),
            ...(parent ? { parentId: parent.id, replyUserId: parent.userId } : {}),
          },
          signal,
        ),
      );
      return true;
    },
    async commentAction(action, commentId, top, signal) {
      return confirmed(
        await request(
          `moments/comment/${action}`,
          action === 'delete' ? { id: commentId } : { commentId, top },
          signal,
        ),
      );
    },
    async upload(file, signal) {
      if (
        !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new CircleError('请选择不超过 10MB 的 JPG、PNG、GIF 或 WebP 图片');
      const body = new FormData();
      body.append('file', file);
      const url = safeUrl(await request('file/minio/upload?biz=user_post', body, signal));
      if (!url) throw new CircleError('上传服务未返回有效图片地址');
      return { type: 'image', url };
    },
    async following(userId, toggle, signal) {
      const value = await request(
        `follow/${toggle ? 'toggle' : 'is-following'}?followUserId=${encodeURIComponent(userId)}`,
        null,
        signal,
      );
      if (typeof value !== 'boolean') throw new CircleError('关注状态异常');
      return value;
    },
  };
}
