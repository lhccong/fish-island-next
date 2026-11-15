export interface ForumPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  cover: string;
  tags: string[];
  authorId: string;
  author: string;
  avatar: string;
  createdAt: string;
  likes: number;
  favourites: number;
  comments: number;
  views: number;
  liked: boolean;
  saved: boolean;
  featured: boolean;
}
export interface ForumComment {
  id: string;
  authorId: string;
  author: string;
  content: string;
  createdAt: string;
  liked: boolean;
  likes: number;
  childCount: number;
}
export interface ForumPage<T> {
  items: T[];
  total: number;
}
export type ForumTab = 'latest' | 'hot' | 'featured' | 'my' | 'saved';
export interface ForumFilter {
  tab: ForumTab;
  search: string;
  tag: string;
}
export interface ForumDraft {
  title: string;
  content: string;
  coverImage: string;
  tags: string[];
}
export interface ForumPort {
  list(filter: ForumFilter, page: number, signal: AbortSignal): Promise<ForumPage<ForumPost>>;
  tags(page: number, signal: AbortSignal): Promise<ForumPage<{ id: string; name: string }>>;
  detail(id: string, signal: AbortSignal): Promise<ForumPost>;
  save(draft: ForumDraft, id: string | null, signal: AbortSignal): Promise<string>;
  remove(id: string, signal: AbortSignal): Promise<void>;
  feature(id: string, featured: boolean, signal: AbortSignal): Promise<void>;
  react(id: string, kind: 'like' | 'save' | 'comment', signal: AbortSignal): Promise<number>;
  comments(
    postId: string,
    rootId: string | null,
    page: number,
    signal: AbortSignal,
  ): Promise<ForumPage<ForumComment>>;
  reply(
    postId: string,
    content: string,
    parentId: string | null,
    rootId: string | null,
    signal: AbortSignal,
  ): Promise<void>;
  removeComment(id: string, signal: AbortSignal): Promise<void>;
  upload(file: File, signal: AbortSignal): Promise<string>;
  reward(
    postId: string,
    action: 'draw' | 'user' | 'token',
    index: number,
    signal: AbortSignal,
  ): Promise<{ name: string; token: string }>;
}
