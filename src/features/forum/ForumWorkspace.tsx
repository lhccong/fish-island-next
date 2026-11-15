import { useEffect, useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { ForumPost, ForumPort } from '@/domain/forum';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Button } from '@/shared/ui/Button';
import { ForumList } from './ForumList';
import { ForumEditor } from './ForumEditor';
import { ForumDetail } from './ForumDetail';
import styles from './Forum.module.css';

export function ForumWorkspace({
  service,
  user,
  path,
  onNavigate,
  onLogin,
}: {
  service: ForumPort;
  user: AuthUser | null;
  path: string;
  onNavigate: (path: string) => void;
  onLogin: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const create = path === 'create';
  const edit = path.startsWith('edit/');
  const id = create ? '' : edit ? path.slice(5) : path;
  return (
    <div className={styles.workspace}>
      <div className={styles.layer} hidden={Boolean(path)}>
        <ForumList
          service={service}
          user={user}
          onLogin={onLogin}
          onOpen={(id) => onNavigate(`/post/${id}`)}
          onEdit={(id) => onNavigate(`/post/edit/${id}`)}
          onCreate={() => onNavigate('/post/create')}
          revision={revision}
        />
      </div>
      {create ? (
        user ? (
          <ForumEditor
            service={service}
            original={null}
            onSaved={(id) => {
              setRevision((n) => n + 1);
              onNavigate(`/post/${id}`);
            }}
            onClose={() => onNavigate('/post')}
          />
        ) : (
          <div className={styles.status}>
            <p>登录后即可发布帖子。</p>
            <Button onClick={onLogin}>登录</Button>
          </div>
        )
      ) : id ? (
        <PostResource
          key={`${id}:${edit}:${revision}`}
          id={id}
          edit={edit}
          service={service}
          user={user}
          onLogin={onLogin}
          onNavigate={onNavigate}
          onChanged={() => setRevision((n) => n + 1)}
        />
      ) : null}
    </div>
  );
}

function PostResource({
  id,
  edit,
  service,
  user,
  onLogin,
  onNavigate,
  onChanged,
}: {
  id: string;
  edit: boolean;
  service: ForumPort;
  user: AuthUser | null;
  onLogin: () => void;
  onNavigate: (path: string) => void;
  onChanged: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; post: ForumPost }
  >({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    service
      .detail(id, controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) setResult({ status: 'ready', post });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            status: 'error',
            message: error instanceof Error ? error.message : '帖子加载失败，请重试',
          });
      });
    return () => controller.abort();
  }, [service, id, revision]);
  if (result.status === 'loading')
    return (
      <div className={styles.status}>
        <LoadingIndicator>正在加载帖子…</LoadingIndicator>
      </div>
    );
  if (result.status === 'error')
    return (
      <div className={styles.status} role="alert">
        <p>{result.message}</p>
        <Button
          onClick={() => {
            setResult({ status: 'loading' });
            setRevision((n) => n + 1);
          }}
        >
          重试帖子
        </Button>
        <Button variant="secondary" onClick={() => onNavigate('/post')}>
          返回帖子列表
        </Button>
      </div>
    );
  if (edit)
    return user && (user.id === result.post.authorId || user.role === 'admin') ? (
      <ForumEditor
        service={service}
        original={result.post}
        onSaved={(id) => {
          onChanged();
          onNavigate(`/post/${id}`);
        }}
        onClose={() => onNavigate(`/post/${id}`)}
      />
    ) : (
      <div className={styles.status}>
        <p>仅作者和管理员可以编辑这篇帖子。</p>
        <Button onClick={() => onNavigate(`/post/${id}`)}>返回帖子</Button>
      </div>
    );
  return (
    <ForumDetail
      initial={result.post}
      service={service}
      user={user}
      onLogin={onLogin}
      onEdit={() => onNavigate(`/post/edit/${id}`)}
      onBack={() => onNavigate('/post')}
      onDeleted={() => {
        onChanged();
        onNavigate('/post');
      }}
    />
  );
}
