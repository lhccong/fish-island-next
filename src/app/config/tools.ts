import { lazy } from 'react';

export const tools = [
  {
    path: '/utils/json',
    label: 'JSON 格式化',
    Panel: lazy(() =>
      import('@/features/json-tools').then(({ JsonEditor }) => ({ default: JsonEditor })),
    ),
  },
  {
    path: '/utils/todo',
    label: '待办',
    Panel: lazy(() => import('@/app/pages/TodoTool')),
  },
] as const;

export const defaultToolPath = tools[0].path;
export type Tool = (typeof tools)[number];
export type ToolPath = Tool['path'];

export function findTool(path: string): Tool | undefined {
  return tools.find((tool) => tool.path === path);
}
