import { AuthError, type SessionToken } from '@/domain/auth';
import type { ForumPort } from '@/domain/forum';
import { record, text, id, safeUrl, post, comment, page } from './decode';

export function createForumClient(
  baseUrl: string,
  credential: () => SessionToken | null,
  onUnauthorized: () => void,
): ForumPort {
  async function request(
    path: string,
    signal: AbortSignal,
    body?: object | FormData,
    privateAction = false,
  ): Promise<unknown> {
    const token = credential();
    if (privateAction && !token) throw new AuthError('unauthorized', '请先登录');
    const headers = new Headers(token ? { [token.name]: token.value } : {});
    if (body && !(body instanceof FormData)) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error(`论坛服务暂不可用（HTTP ${response.status}）`);
      const data = record(await response.json());
      if (data.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (data.code !== 0) throw new Error(text(data.message) || '论坛操作失败，请重试');
      return data.data;
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof AuthError) onUnauthorized();
      if (error instanceof TypeError) throw new Error('连接论坛失败，请检查网络后重试');
      throw error;
    }
  }
  function confirmed(value: unknown) {
    if (value !== true) throw new Error('服务器未确认操作成功，请重试');
  }
  return {
    async list(filter, current, signal) {
      const suffix =
        filter.tab === 'my'
          ? 'my/list/page/vo'
          : filter.tab === 'saved'
            ? 'my/favour/list/page/vo'
            : 'list/page/vo';
      return page(
        await request(
          `post/${suffix}`,
          signal,
          {
            current,
            pageSize: 10,
            searchText: filter.search || undefined,
            tags: filter.tag ? [filter.tag] : undefined,
            isFeatured: filter.tab === 'featured' ? 1 : undefined,
            sortField: filter.tab === 'hot' ? 'thumbNum' : 'createTime',
            sortOrder: 'descend',
          },
          filter.tab === 'my' || filter.tab === 'saved',
        ),
        post,
      );
    },
    async tags(current, signal) {
      return page(await request('tags/list/page/vo', signal, { current, pageSize: 20 }), (v) => {
        const d = record(v);
        return { id: id(d.id), name: text(d.tagsName) };
      });
    },
    async detail(postId, signal) {
      return post(await request(`post/get/vo?id=${encodeURIComponent(postId)}`, signal));
    },
    async save(draft, postId, signal) {
      if (draft.coverImage && !safeUrl(draft.coverImage))
        throw new Error('封面地址须使用 HTTP 或 HTTPS');
      const value = await request(
        `post/${postId ? 'edit' : 'add'}`,
        signal,
        {
          ...draft,
          tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 5),
          ...(postId ? { id: postId } : {}),
        },
        true,
      );
      if (postId) {
        confirmed(value);
        return postId;
      }
      return id(value);
    },
    async remove(postId, signal) {
      confirmed(await request('post/delete', signal, { id: postId }, true));
    },
    async feature(postId, featured, signal) {
      confirmed(
        await request('post/featured', signal, { id: postId, isFeatured: featured ? 1 : 0 }, true),
      );
    },
    async react(postId, kind, signal) {
      const value = await request(
        kind === 'like' ? 'post_thumb/do' : kind === 'save' ? 'post_favour/' : 'comment_thumb/',
        signal,
        kind === 'comment' ? { commentId: postId } : { postId },
        true,
      );
      if (value !== 1 && value !== -1) throw new Error('服务器未确认互动状态，请重试');
      return value;
    },
    async comments(postId, rootId, current, signal) {
      return page(
        await request(`comment/list/${rootId ? 'children' : 'tree'}`, signal, {
          ...(rootId ? { rootId } : { postId }),
          current,
          pageSize: 10,
          sortField: 'createTime',
          sortOrder: 'descend',
        }),
        comment,
      );
    },
    async reply(postId, content, parentId, rootId, signal) {
      id(
        await request(
          'comment/add',
          signal,
          { postId, content, ...(parentId ? { parentId, rootId } : {}) },
          true,
        ),
      );
    },
    async removeComment(commentId, signal) {
      confirmed(await request('comment/delete', signal, { id: commentId }, true));
    },
    async upload(file, signal) {
      if (
        !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error('请选择 5MB 以内的 JPG、PNG、GIF 或 WebP 图片');
      const form = new FormData();
      form.append('file', file);
      form.append('biz', 'user_post');
      const url = safeUrl(await request('file/minio/upload', signal, form, true));
      if (!url) throw new Error('上传响应缺少有效图片地址');
      return url;
    },
    async reward(postId, action, index, signal) {
      if (action === 'draw' && (!Number.isSafeInteger(index) || index < 1))
        throw new Error('请输入有效的点赞序号');
      const value = await request(
        action === 'draw'
          ? 'post/random/thumb/user'
          : `post/reward/${action}?postId=${encodeURIComponent(postId)}`,
        signal,
        action === 'draw' ? { postId, randomIndex: index } : undefined,
        true,
      );
      if (!value) throw new Error('暂无中奖信息');
      const data = record(value);
      return { name: text(data.userName), token: text(data.rewardToken) };
    },
  };
}
