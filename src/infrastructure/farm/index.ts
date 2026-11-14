import type { FarmPort } from '@/domain/farm';
import type { SessionToken } from '@/domain/auth';
import { record, num, list, land, crop, farmer, friend, visitor } from './decode';
export function createFarmClient(
  base: string,
  token: () => SessionToken | null,
  expired: () => void,
): FarmPort {
  async function request(path: string, signal: AbortSignal, body?: object): Promise<unknown> {
    const credential = token();
    if (!credential) throw new Error('请先登录后进入农场');
    const headers = new Headers({ [credential.name]: credential.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/api/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) {
        expired();
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok) throw new Error(`农场服务暂不可用（HTTP ${response.status}），请重试`);
      const d = record(await response.json());
      if (d.code === 40100) {
        expired();
        throw new Error('登录已过期，请重新登录');
      }
      if (d.code !== 0)
        throw new Error(typeof d.message === 'string' ? d.message : '农场操作失败，请重试');
      return d.data;
    } catch (error) {
      if (error instanceof TypeError && !signal.aborted)
        throw new Error('连接农场失败，请检查网络后重试');
      throw error;
    }
  }
  return {
    async lands(friendId, signal) {
      return list(
        await request(
          friendId ? `farm/friend/lands?friendUserId=${encodeURIComponent(friendId)}` : 'land/my',
          signal,
        ),
        land,
      );
    },
    async crops(signal) {
      return list(await request('crop/all', signal), crop);
    },
    async farmer(signal) {
      return farmer(await request('farm/user/info', signal));
    },
    async balance(signal) {
      const d = record(await request('user/get/login', signal));
      return num(d.points) - num(d.usedPoints);
    },
    async friends(signal) {
      return list(await request('farm/friend/list', signal), friend);
    },
    async visitors(signal) {
      return list(await request('steal/my-stolen', signal), visitor);
    },
    async readVisitors(signal) {
      await request('steal/my-stolen/read-all', signal, {});
    },
    async act(action, ids, cropId, signal) {
      if (!ids.length) throw new Error('请先选择地块');
      const single = action === 'unlock' || action === 'water';
      const path =
        action === 'steal'
          ? 'steal'
          : action === 'waterBatch'
            ? 'land/water/batch'
            : `land/${action}`;
      const body =
        action === 'plant'
          ? { items: ids.map((landId) => ({ landId, cropId })) }
          : single
            ? { landId: ids[0] }
            : { landIds: ids };
      const result = await request(path, signal, body);
      if (action === 'waterBatch') {
        const results = list(result, record);
        const successes = results.filter((r) => r.success === true).length;
        const failures = results.filter((r) => r.success !== true);
        return `浇水完成：${successes} 块成功${failures.length ? `，${failures.length} 块未完成：${String(failures[0]?.message ?? '请刷新后重试')}` : ''}`;
      }
      if (action === 'steal')
        return `偷菜成功，获得 ${list(result, record).reduce((sum, r) => sum + num(r.coinGained), 0)} 积分`;
      return { plant: '播种成功', harvest: '收获成功', water: '浇水成功', unlock: '地块已解锁' }[
        action
      ];
    },
  };
}
