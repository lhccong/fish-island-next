import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { AuthUser } from '@/domain/auth';
import { IslandCircleProvider, CommentEmoticonsProvider } from '@/features/fish-circle';
import { fishCircleService } from '@/app/config/fish-circle';
import { chatEmoticons } from '@/app/config/chat';
import { IslandSidebarContext } from './island-sidebar-context';
import { useAppearanceStore } from '@/features/appearance';

export function IslandSidebarProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [tab, setTab] = useState<'notebook' | 'circle'>('circle');
  const [visited, setVisited] = useState(
    () =>
      useAppearanceStore.getState().skinId === 'pixel-island' &&
      window.matchMedia('(min-width: 761px)').matches,
  );
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const media = window.matchMedia('(min-width: 761px)');
    const activateVisibleSidebar = () => {
      if (media.matches && useAppearanceStore.getState().skinId === 'pixel-island')
        setVisited(true);
    };
    const unsubscribe = useAppearanceStore.subscribe(activateVisibleSidebar);
    media.addEventListener('change', activateVisibleSidebar);
    return () => {
      unsubscribe();
      media.removeEventListener('change', activateVisibleSidebar);
    };
  }, []);
  return (
    <IslandSidebarContext.Provider
      value={{
        tab,
        setTab: (next) => {
          setTab(next);
          if (next === 'circle') setVisited(true);
        },
        editing,
        setEditing,
        visited,
        activate: () => setVisited(true),
      }}
    >
      <CommentEmoticonsProvider value={chatEmoticons}>
        <IslandCircleProvider
          user={user}
          service={fishCircleService}
          active={visited}
          onViewUser={(id) => navigate(`/moments/fish-circle?userId=${encodeURIComponent(id)}`)}
        >
          {children}
        </IslandCircleProvider>
      </CommentEmoticonsProvider>
    </IslandSidebarContext.Provider>
  );
}
