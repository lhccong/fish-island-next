import type { Page } from '@playwright/test';
import { setup, post } from './fish-circle-fixture';

export async function setupDetailLayout(page: Page) {
  const feed = await setup(page, false, { visual: true, commentTotal: 0 });
  const state = {
    detailFailure: false,
    commentFailure: true,
    empty: false,
    detailRequests: 0,
    commentRequests: 0,
    target: '合成回复：请把评论放在右侧，方便同时阅读正文。',
    pages: [] as number[],
  };
  let releaseDetail: () => void = () => {};
  let releaseComments: () => void = () => {};
  const detailGate = new Promise<void>((resolve) => {
    releaseDetail = resolve;
  });
  const commentGate = new Promise<void>((resolve) => {
    releaseComments = resolve;
  });
  await page.route('**/api/event_remind/**', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: route.request().url().endsWith('/page')
          ? {
              total: 1,
              records: [
                {
                  id: '800',
                  senderId: '999',
                  senderUser: { userName: '通知岛友' },
                  action: 'comment',
                  sourceContent: state.target,
                  sourceType: 4,
                  sourceId: post.id,
                  state: 1,
                  createTime: '2026-11-12 10:00:00',
                },
              ],
            }
          : true,
      },
    }),
  );
  await page.route('**/api/moments/detail?*', async (route) => {
    state.detailRequests++;
    await detailGate;
    return route.fulfill({
      json: state.detailFailure
        ? { code: 40000, message: '合成详情加载失败' }
        : {
            code: 0,
            data: {
              ...post,
              content: '在岛上留一点自己的时间。周末的照片和一些日常，欢迎分享你的近况。\n'.repeat(
                3,
              ),
              location: '摸鱼岛',
              likeUserNames: '清风,海盐',
              commentNum: 18,
              mediaJson: Array.from({ length: 9 }, (_, i) => ({
                type: 'image',
                url: `https://circle.test/photo-${i}.svg`,
              })),
            },
          },
    });
  });
  await page.route('**/api/moments/comment/list', async (route) => {
    state.commentRequests++;
    const current = Number(route.request().postDataJSON().current);
    state.pages.push(current);
    await commentGate;
    if (state.commentFailure) return route.fulfill({ status: 503, json: {} });
    return route.fulfill({
      json: {
        code: 0,
        data: {
          total: state.empty ? 0 : 18,
          records: state.empty
            ? []
            : Array.from({ length: current === 1 ? 10 : 8 }, (_, index) => {
                const number = (current - 1) * 10 + index;
                return {
                  id: String(3000 + number),
                  userId: '123',
                  userName: `岛友${number}`,
                  content: `第${number + 1}条合成评论：保持内容和评论分区，窄屏也应能够阅读和操作。`,
                  createTime: '2026-11-12 09:00:00',
                  children:
                    number === 17
                      ? [
                          {
                            id: '4000',
                            userId: '888',
                            userName: '回复岛友',
                            content: '父级回复',
                            children: [
                              {
                                id: '5000',
                                userId: '999',
                                userName: '通知岛友',
                                content: state.target,
                                createTime: '2026-11-12 10:00:00',
                                children: feed.comment
                                  ? [
                                      {
                                        id: '6000',
                                        userId: '123',
                                        userName: '合成岛友',
                                        replyUserName: '通知岛友',
                                        content: feed.comment,
                                        children: [],
                                      },
                                    ]
                                  : [],
                              },
                            ],
                          },
                        ]
                      : [],
                };
              }),
        },
      },
    });
  });
  return { state, feed, releaseDetail, releaseComments };
}
