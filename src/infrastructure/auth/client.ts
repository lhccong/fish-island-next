import { AuthError, type AuthPort, type SessionToken } from '@/domain/auth';
import { asRecord, decodeToken, decodeUser, safeImageUrl, unwrap } from './decode';

export function createAuthClient(baseUrl: string): AuthPort {
  const base = baseUrl.replace(/\/+$/, '');
  async function request(
    path: string,
    method: 'GET' | 'POST',
    signal: AbortSignal,
    token?: SessionToken,
    body?: object,
  ): Promise<unknown> {
    const headers = new Headers();
    const form = body instanceof FormData;
    if (body && !form) headers.set('Content-Type', 'application/json');
    if (token) headers.set(token.name, token.value);
    try {
      const response = await fetch(
        `${base}/api/${path.startsWith('/file/') ? path.slice(1) : `user${path}`}`,
        {
          method,
          credentials: 'include',
          headers,
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
          ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
        },
      );
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok)
        throw new AuthError('network', `登录服务暂不可用（HTTP ${response.status}）`);
      const payload: unknown = await response.json();
      return unwrap(payload);
    } catch (error) {
      if (signal.aborted || error instanceof AuthError) throw error;
      if (error instanceof SyntaxError)
        throw new AuthError('invalid-response', '登录服务返回的数据格式异常');
      throw new AuthError('network', '连接登录服务失败，请检查网络后重试');
    }
  }
  return {
    async titles(token, signal) {
      const data = await request('/title/list', 'GET', signal, token);
      if (!Array.isArray(data)) throw new AuthError('invalid-response', '称号列表格式异常');
      return data.map((value: unknown) => {
        const title = asRecord(value);
        if (
          (typeof title.titleId !== 'string' && typeof title.titleId !== 'number') ||
          typeof title.name !== 'string'
        )
          throw new AuthError('invalid-response', '称号资料不完整');
        return { id: String(title.titleId), name: title.name };
      });
    },
    async membership(token, signal) {
      const [value, permanent] = await Promise.all([
        request('/vip/get/my', 'GET', signal, token),
        request('/vip/check/permanent', 'GET', signal, token),
      ]);
      if (typeof permanent !== 'boolean')
        throw new AuthError('invalid-response', '会员状态格式异常');
      if (value === null && !permanent) return null;
      const member = value === null ? {} : asRecord(value);
      return {
        type: typeof member.type === 'number' ? member.type : 0,
        permanent,
        expiresAt: typeof member.validDays === 'string' ? member.validDays : '',
        expired: member.isExpired === true,
      };
    },
    async setTitle(id, token, signal) {
      if (
        (await request(`/title/set?titleId=${encodeURIComponent(id)}`, 'POST', signal, token)) !==
        true
      )
        throw new AuthError('rejected', '服务器未确认称号设置成功');
    },
    async sendEmailCode(email, token, signal) {
      if ((await request('/email/send', 'POST', signal, token, { email })) !== true)
        throw new AuthError('rejected', '服务器未确认验证码发送成功');
    },
    async bindEmail(email, code, token, signal) {
      if ((await request('/email/bindToAccount', 'POST', signal, token, { email, code })) !== true)
        throw new AuthError('rejected', '服务器未确认邮箱绑定成功');
    },
    async updateProfile(values, token, signal) {
      const result = await request('/update/my', 'POST', signal, token, {
        userName: values.name,
        userAvatar: values.avatarUrl,
        momentsBgUrl: values.coverUrl,
        userProfile: values.profile,
      });
      if (result !== true) throw new AuthError('rejected', '服务器未确认资料保存成功');
    },
    async uploadProfileImage(file, token, signal) {
      if (
        !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new AuthError('rejected', '请选择不超过 10MB 的 JPG、PNG、GIF 或 WebP 图片');
      const body = new FormData();
      body.append('file', file);
      const url = safeImageUrl(
        await request('/file/minio/upload?biz=user_avatar', 'POST', signal, token, body),
      );
      if (!url) throw new AuthError('invalid-response', '上传服务未返回有效图片地址');
      return url;
    },
    async login({ account, password }, signal) {
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account);
      const payload = asRecord(
        await request(
          email ? '/email/login' : '/login',
          'POST',
          signal,
          undefined,
          email
            ? { email: account, userPassword: password }
            : { userAccount: account, userPassword: password },
        ),
      );
      return { user: decodeUser(payload), token: decodeToken(payload.saTokenInfo) };
    },
    async current(token, signal) {
      return decodeUser(await request('/get/login', 'GET', signal, token));
    },
    async logout(token, signal) {
      if ((await request('/logout', 'POST', signal, token)) !== true)
        throw new AuthError('rejected', '服务器未确认退出');
    },
  };
}
