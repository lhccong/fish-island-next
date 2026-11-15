import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, Suspense, type ComponentProps } from 'react';
const Panel = lazy(() => import('./AvatarFramesDialog'));

export function AvatarFramesPanel(props: ComponentProps<typeof Panel>) {
  return (
    <Suspense fallback={<LoadingIndicator>正在打开头像框…</LoadingIndicator>}>
      <Panel {...props} />
    </Suspense>
  );
}
