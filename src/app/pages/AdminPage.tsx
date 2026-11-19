import { useNavigate, useSearchParams } from 'react-router';
import type { AdminFilter, AdminSection } from '@/domain/admin';
import {
  AdminAnalytics,
  BigFishSettings,
  BroadcastPublisher,
  UserList,
  TitleList,
  TagList,
  WordList,
  EquipmentList,
  ReportList,
} from '@/features/admin';
import { useAuth } from '@/features/auth';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { AdminNavigation } from '@/app/components/AdminNavigation';
import { adminSections } from '@/app/components/admin-sections';
import { adminPort } from '@/app/config/admin';
import pageStyles from './AdminPage.module.css';
export function AdminPage({ section }: { section: AdminSection | 'overview' }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = Number(params.get('type') ?? 0);
  const initial: AdminFilter = {};
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (type === 1) initial.createTimeRange = [date, date];
  if (type === 2) initial.updateTimeRange = [date, date];
  if (type === 3) initial.updateTimeRange = [`${date.slice(0, 8)}01`, date];
  return (
    <WorkspaceLayout
      sidebarLabel="管理导航"
      hideSidebar={section === 'overview'}
      slots={{
        sidebar: <AdminNavigation />,
        header: (
          <h1 className={pageStyles.heading}>
            {adminSections.find((s) => s.id === section)?.label ?? '管理页'}
          </h1>
        ),
        content: (
          <div key={session.status === 'authenticated' ? session.user.id : 'anonymous'}>
            {section === 'overview' ? (
              <AdminNavigation hideHeading />
            ) : section === 'broadcast' ? (
              <BroadcastPublisher port={adminPort} />
            ) : section === 'big-fish' ? (
              <BigFishSettings port={adminPort} />
            ) : section === 'data' ? (
              <AdminAnalytics port={adminPort} onUsers={(t) => navigate(`/admin/user?type=${t}`)} />
            ) : section === 'user' ? (
              <UserList key={type} port={adminPort} initial={initial} />
            ) : section === 'title' ? (
              <TitleList port={adminPort} />
            ) : section === 'tags' ? (
              <TagList port={adminPort} />
            ) : section === 'word' ? (
              <WordList port={adminPort} />
            ) : section === 'equipment' ? (
              <EquipmentList port={adminPort} />
            ) : (
              <ReportList port={adminPort} />
            )}
          </div>
        ),
      }}
    />
  );
}
