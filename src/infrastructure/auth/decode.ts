import { AuthError, type AuthUser, type SessionToken } from '@/domain/auth';

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AuthError('invalid-response', '登录服务返回的数据格式异常');
  return value as Record<string, unknown>;
}

export function decodeToken(value: unknown): SessionToken {
  const token = asRecord(value);
  const name = token.tokenName ?? token.name;
  const content = token.tokenValue ?? token.value;
  if (
    typeof name !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(name) ||
    ['cookie', 'host', 'origin', 'content-type'].includes(name.toLowerCase()) ||
    typeof content !== 'string' ||
    !content.trim() ||
    /[\r\n]/.test(content) ||
    content.length > 8192
  )
    throw new AuthError('invalid-response', '登录凭证无效，请重新登录');
  return { name, value: content };
}

export function decodeUser(value: unknown): AuthUser {
  const user = asRecord(value);
  const id =
    typeof user.id === 'string'
      ? user.id
      : typeof user.id === 'number' && Number.isFinite(user.id)
        ? String(user.id)
        : '';
  if (!id.trim()) throw new AuthError('invalid-response', '登录用户信息不完整');
  let avatarUrl: string | null = null;
  if (typeof user.userAvatar === 'string') {
    try {
      const url = new URL(user.userAvatar);
      if (['https:', 'http:'].includes(url.protocol)) avatarUrl = url.href;
    } catch {
      /* 使用默认头像 */
    }
  }
  return {
    id,
    name: typeof user.userName === 'string' && user.userName.trim() ? user.userName : '鱼岛用户',
    avatarUrl,
    role: typeof user.userRole === 'string' ? user.userRole : 'user',
  };
}

export function unwrap(payload: unknown): unknown {
  const response = asRecord(payload);
  if (response.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
  if (response.code !== 0)
    throw new AuthError(
      'rejected',
      typeof response.message === 'string' ? response.message : '操作失败，请稍后重试',
    );
  return response.data;
}
