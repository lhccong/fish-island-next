import { AuthError, type SessionToken } from '@/domain/auth';
import type { AdminPort, AdminCollection, AdminEntities } from '@/domain/admin';
import { isAssignableTitle } from '@/domain/admin';
import { record, text, number, user, title, tag, word, equipment, report } from './decode';

const paths = {
  user: 'user',
  title: 'user/title',
  tags: 'tags',
  word: 'word/library',
  equipment: 'itemTemplates',
  report: 'report/admin',
} as const;
const decoders: { [K in AdminCollection]: (value: unknown) => AdminEntities[K] } = {
  user,
  title,
  tags: tag,
  word,
  equipment,
  report,
};
export function createAdminClient(
  baseUrl: string,
  credential: () => SessionToken | null,
  allowed: () => boolean,
  onUnauthorized: () => void,
  onPermissionDenied: (signal: AbortSignal) => void = () => {},
): AdminPort {
  async function request(path: string, signal: AbortSignal, body?: object, method = 'POST') {
    const token = credential();
    if (!token || !allowed()) throw new Error('仅管理员可以使用管理功能');
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method,
        credentials: 'include',
        headers: {
          [token.name]: token.value,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (response.status === 403) {
        onPermissionDenied(signal);
        throw new Error('没有管理权限，请重新登录确认账号权限');
      }
      if (!response.ok) throw new Error(`管理服务暂不可用（HTTP ${response.status}）`);
      const r = record(await response.json());
      if (r.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (r.code === 40101 || r.code === 40300) onPermissionDenied(signal);
      if (r.code !== 0) throw new Error(text(r.message) || '管理操作失败，请重试');
      return r.data;
    } catch (error) {
      if (!signal.aborted && error instanceof AuthError) onUnauthorized();
      if (!signal.aborted && error instanceof TypeError)
        throw new Error('连接管理服务失败，请检查网络后重试');
      throw error;
    }
  }
  async function mutate(
    path: string,
    signal: AbortSignal,
    body?: object,
    result: 'create' | 'edit' | 'boolean' = 'boolean',
  ) {
    const data = await request(path, signal, body);
    if (
      result === 'boolean'
        ? data !== true
        : result === 'create'
          ? !/^[1-9]\d*$/.test(text(data))
          : !data || typeof data !== 'object'
    )
      throw new Error('服务器未确认操作成功，请刷新核对后再试');
  }
  return {
    async list<K extends AdminCollection>(
      section: K,
      page: number,
      filter: Parameters<AdminPort['list']>[2],
      signal: AbortSignal,
    ) {
      const body = { ...filter, current: page, pageSize: 20 };
      const suffix = section === 'equipment' ? '/list/page/vo' : '/list/page';
      const data =
        section === 'report'
          ? await request(
              `report/admin/list?${new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]))}`,
              signal,
              undefined,
              'GET',
            )
          : await request(`${paths[section]}${suffix}`, signal, body);
      const r = record(data);
      if (!Array.isArray(r.records)) throw new Error('管理列表格式异常，请重试');
      return { items: r.records.map(decoders[section]), total: number(r.total) };
    },
    saveUser: (v, s) =>
      mutate(
        `user/${v.id ? 'update' : 'add'}`,
        s,
        {
          ...(v.id ? { id: v.id, userProfile: v.profile } : { userAccount: v.account }),
          userName: v.name,
          userAvatar: v.avatar,
          userRole: v.role,
        },
        v.id ? 'boolean' : 'create',
      ),
    saveTitle: (v, s) =>
      mutate(
        `user/title/${v.id ? 'update' : 'add'}`,
        s,
        { ...(v.id ? { titleId: v.id } : {}), name: v.name },
        v.id ? 'boolean' : 'create',
      ),
    saveTag: (v, s) =>
      mutate(
        `tags/${v.id ? 'update' : 'add'}`,
        s,
        {
          ...(v.id ? { id: v.id } : {}),
          tagsName: v.name,
          color: v.color,
          icon: v.icon,
          type: v.type,
          sort: v.sort,
        },
        v.id ? 'boolean' : 'create',
      ),
    saveWord: (v, s) =>
      mutate(
        `word/library/${v.id ? 'update' : 'add'}`,
        s,
        { ...(v.id ? { id: v.id } : {}), word: v.word, category: v.category, wordType: v.wordType },
        v.id ? 'boolean' : 'create',
      ),
    saveEquipment: (v, s) => {
      const { id, attributes, ...values } = v;
      return mutate(
        `itemTemplates/${id ? 'edit' : 'add'}`,
        s,
        { ...values, ...(id ? { id } : {}), mainAttr: attributes },
        id ? 'edit' : 'create',
      );
    },
    remove: (section, id, s) => mutate(`${paths[section]}/delete`, s, { id }),
    async userTitles(userId, s) {
      const r = await request(
        `user/title/list/byUserId?userId=${encodeURIComponent(userId)}`,
        s,
        undefined,
        'GET',
      );
      if (!Array.isArray(r)) throw new Error('用户称号格式异常');
      return r.map(title);
    },
    assignTitle: (userId, titleId, assign, s) => {
      if (!isAssignableTitle(titleId))
        return Promise.reject(new Error('系统等级称号不能手动分配或移除'));
      return mutate(
        `user/title/${assign ? 'add/toUser' : 'remove/fromUser'}?${new URLSearchParams({ userId, titleId })}`,
        s,
      );
    },
    markScript: (userId, marked, s) =>
      mutate(`redpacket/script/mark?${new URLSearchParams({ userId, mark: String(marked) })}`, s),
    handleReport: (id, status, remark, s) =>
      mutate('report/admin/handle', s, { id, status, handleRemark: remark }),
    muteUser: (userId, duration, s) => mutate('user/mute/add', s, { userId, duration }),
    async statistics(s) {
      const r = record(await request('user/get/UserDataWebVO', s));
      return {
        totalUsers: number(r.totalUsers),
        todayNewUsers: number(r.todayNewUsers),
        todayActiveUsers: number(r.todayActiveUsers),
        thisMonthActiveUsers: number(r.thisMonthActiveUsers),
      };
    },
    async trend(type, begin, end, s) {
      const r = await request('user/get/NewUserDataWebVO', s, {
        type,
        beginTime: begin,
        endTime: end,
      });
      if (!Array.isArray(r)) throw new Error('趋势数据格式异常');
      return r.map((v: unknown) => {
        const a = record(v);
        return { date: text(a.date), count: number(a.newUserCount) };
      });
    },
  };
}
