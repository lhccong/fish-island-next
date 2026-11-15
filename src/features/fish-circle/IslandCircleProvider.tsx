import { lazy, Suspense, useCallback, useRef, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { FishCirclePort, Moment } from '@/domain/fish-circle';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Dialog } from '@/shared/ui/Dialog';
import { usePage } from './use-page';
import { IslandCircleContext, type IslandCircleValue } from './island-circle-context';
const MomentEditor = lazy(() =>
  import('./MomentEditor').then((module) => ({ default: module.MomentEditor })),
);

export function IslandCircleProvider({
  service,
  user,
  active,
  onViewUser,
  children,
}: {
  service: FishCirclePort;
  user: AuthUser;
  active: boolean;
  onViewUser: (id: string) => void;
  children: ReactNode;
}) {
  const load = useCallback(
    (page: number, signal: AbortSignal) =>
      active ? service.list(page, '', signal) : Promise.resolve({ items: [], total: 0 }),
    [active, service],
  );
  const page = usePage<Moment>(load);
  const [publishing, setPublishing] = useState(false);
  const [overrides, setOverrides] = useState<IslandCircleValue['overrides']>({});
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <IslandCircleContext.Provider
      value={{
        page,
        service,
        user,
        overrides,
        patch: (id, change) => setOverrides((old) => ({ ...old, [id]: { ...old[id], ...change } })),
        publish: (button) => {
          trigger.current = button;
          setPublishing(true);
        },
        onViewUser,
      }}
    >
      {children}
      {publishing && (
        <Suspense
          fallback={
            <Dialog
              open
              title="发布朋友圈"
              description="正在打开编辑器"
              dismissLabel="关闭编辑器"
              showCloseAction={false}
              onOpenChange={(next) => {
                if (!next) setPublishing(false);
              }}
            >
              <LoadingIndicator>正在打开动态编辑器…</LoadingIndicator>
            </Dialog>
          }
        >
          <MomentEditor
            service={service}
            original={null}
            returnFocusRef={trigger}
            onClose={() => setPublishing(false)}
            onSaved={() => {
              setPublishing(false);
              page.refresh();
            }}
          />
        </Suspense>
      )}
    </IslandCircleContext.Provider>
  );
}
