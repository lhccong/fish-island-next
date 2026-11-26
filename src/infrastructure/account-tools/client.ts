import { AuthError, type SessionToken } from '@/domain/auth';
import type { AccountToolsPort, DeveloperApp } from '@/domain/account-tools';
import type { UserCardPort } from '@/domain/account-tools';
import { decodeUserCard, readNonNegativeInteger } from './user-card';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('服务器返回的数据格式不正确');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
export function createAccountToolsClient(
  base: string,
  credential: () => SessionToken | null,
  expired: () => void,
): AccountToolsPort & UserCardPort {
  async function request(path: string, signal: AbortSignal, method = 'GET', body?: object) {
    const token = credential();
    if (!token) throw new AuthError('unauthorized', '请先登录');
    const headers = new Headers({ [token.name]: token.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/api/${path}`, {
        method,
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error(`服务暂不可用（HTTP ${response.status}）`);
      const result = record(await response.json());
      if (result.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (result.code !== 0) throw new Error(text(result.message) || '操作失败，请稍后重试');
      return result.data;
    } catch (error) {
      if (!signal.aborted && error instanceof AuthError) expired();
      if (error instanceof TypeError) throw new Error('连接失败，请检查网络后重试');
      throw error;
    }
  }
  return {
    async userCard(id, signal) {
      const card = decodeUserCard(
        await request(`user/get/vo?id=${encodeURIComponent(id)}`, signal),
      );
      if (card && card.id !== id) throw new Error('服务器返回的用户资料不匹配，请重试');
      return card;
    },
    async followRelationship(id, signal) {
      const value = await request(
        `follow/is-following?followUserId=${encodeURIComponent(id)}&includeIncoming=true`,
        signal,
      );
      if (typeof value === 'boolean') return { following: value };
      const relationship = record(value);
      if (
        typeof relationship.following !== 'boolean' ||
        typeof relationship.followedBy !== 'boolean'
      )
        throw new Error('未取得关注状态，请重试');
      return { following: relationship.following, followedBy: relationship.followedBy };
    },
    async addFollow(id, signal) {
      const value = await request(
        `follow/add?followUserId=${encodeURIComponent(id)}`,
        signal,
        'POST',
      );
      if (value !== true) throw new Error('服务器未确认关注成功，请重试');
    },
    async muteInfo(id, signal) {
      const value = record(
        await request(`user/mute/info?userId=${encodeURIComponent(id)}`, signal),
      );
      if (typeof value.isMuted !== 'boolean') throw new Error('未取得禁言状态，请重试');
      return { muted: value.isMuted, remaining: text(value.remainingTime) };
    },
    async mute(id, duration, signal) {
      const value =
        duration === null
          ? await request(`user/mute/remove?userId=${encodeURIComponent(id)}`, signal, 'POST')
          : await request('user/mute/add', signal, 'POST', { userId: id, duration });
      if (value !== true) throw new Error('服务器未确认禁言操作，请重试');
    },
    async card(id, signal) {
      const v = record(await request('user/get/login', signal));
      const accountId = typeof v.id === 'string' ? v.id : readNonNegativeInteger(v.id);
      if (accountId === undefined || String(accountId) !== id)
        throw new Error('服务器返回的用户资料不匹配，请重试');
      const following = readNonNegativeInteger(v.followingCount);
      const followers = readNonNegativeInteger(v.followerCount);
      const profile =
        following === undefined || followers === undefined
          ? decodeUserCard(await request(`user/get/vo?id=${encodeURIComponent(id)}`, signal))
          : null;
      if (profile && profile.id !== id) throw new Error('服务器返回的用户资料不匹配，请重试');
      return {
        points: readNonNegativeInteger(v.points),
        level: readNonNegativeInteger(v.level),
        followers: followers ?? profile?.followers,
        following: following ?? profile?.following,
        region:
          [text(v.country), text(v.region)].filter(Boolean).join(' · ') || profile?.region || '',
      };
    },
    async follows(kind, page, signal, ownerId) {
      const path = ownerId === undefined ? `follow/${kind}` : `follow/user/${kind}`;
      const params = new URLSearchParams({ current: String(page), pageSize: '20' });
      if (ownerId !== undefined) params.set('userId', ownerId);
      const value = record(await request(`${path}?${params}`, signal));
      const total = readNonNegativeInteger(value.total);
      if (!Array.isArray(value.records) || total === undefined)
        throw new Error('关注列表格式不正确');
      return {
        total,
        items: value.records.map((item) => {
          const v = record(item);
          const id =
            typeof v.userId === 'string' ? v.userId.trim() : readNonNegativeInteger(v.userId);
          if (id === undefined || id === '' || id === 0) throw new Error('关注用户资料不完整');
          const avatar = text(v.userAvatar);
          return {
            id: String(id),
            name: text(v.userName) || '岛友',
            profile: text(v.userProfile),
            avatar: /^https?:\/\//.test(avatar) ? avatar : '',
            mutual: v.isMutual === true,
          };
        }),
      };
    },
    async toggleFollow(id, signal) {
      const value = await request(`follow/toggle?followUserId=${encodeURIComponent(id)}`, signal);
      if (typeof value !== 'boolean') throw new Error('服务器未确认关注状态');
      return value;
    },
    async sendCode(email, signal) {
      if ((await request('user/email/send', signal, 'POST', { email })) !== true)
        throw new Error('服务器未确认验证码发送成功');
    },
    async resetPassword(values, signal) {
      if ((await request('user/email/resetPassword', signal, 'POST', values)) !== true)
        throw new Error('服务器未确认密码重置成功');
    },
    async redeem(code, signal) {
      const value = await request('redeemCode/use', signal, 'POST', { code });
      return text(record(value).message) || '兑换成功，奖励已发放到账户';
    },
    async apps(signal) {
      const value = await request('auth/app/list/my', signal);
      if (!Array.isArray(value)) throw new Error('应用列表格式不正确');
      return value.map((item): DeveloperApp => {
        const v = record(item);
        if ((typeof v.id !== 'number' && typeof v.id !== 'string') || !text(v.appName))
          throw new Error('应用资料不完整');
        return {
          id: String(v.id),
          appName: text(v.appName),
          appDesc: text(v.appDesc),
          appWebsite: text(v.appWebsite),
          redirectUri: text(v.redirectUri),
          clientId: text(v.clientId),
          status: v.status === 1 ? 1 : 0,
        };
      });
    },
    async saveApp(values, id, signal) {
      const result = await request(`auth/app/${id ? 'update' : 'create'}`, signal, 'POST', {
        ...values,
        ...(id ? { id } : {}),
      });
      if (id && result !== true) throw new Error('服务器未确认应用保存成功');
      if (!id && !record(result).id) throw new Error('服务器未返回创建的应用');
    },
    async deleteApp(id, signal) {
      if ((await request('auth/app/delete', signal, 'POST', { id })) !== true)
        throw new Error('服务器未确认应用删除成功');
    },
    async secret(id, reset, signal) {
      const value = await request(
        `auth/app/${reset ? 'reset-secret' : 'detail'}?id=${encodeURIComponent(id)}`,
        signal,
        reset ? 'POST' : 'GET',
      );
      const secret = reset ? text(value) : text(record(value).clientSecret);
      if (!secret) throw new Error('未取得应用密钥，请重试');
      return secret;
    },
  };
}
