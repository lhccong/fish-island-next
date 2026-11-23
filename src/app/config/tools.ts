import { lazy } from 'react';

export const tools = [
  {
    path: '/utils/json',
    label: 'JSON 格式化',
    Panel: lazy(() =>
      import('@/features/json-tools').then(({ JsonEditor }) => ({ default: JsonEditor })),
    ),
  },
] as const;

export const defaultToolPath = tools[0].path;
export type Tool = (typeof tools)[number];
