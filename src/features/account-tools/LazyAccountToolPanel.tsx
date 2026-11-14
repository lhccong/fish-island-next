import { lazy } from 'react';
export const LazyAccountToolPanel = lazy(() =>
  import('./AccountToolPanel').then((module) => ({ default: module.AccountToolPanel })),
);
