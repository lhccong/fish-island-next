export interface Media {
  type: 'image' | 'video';
  url: string;
}
export interface CircleProfile {
  name: string;
  avatar: string;
  cover: string;
}
export interface Moment {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  createdAt: string;
  location: string;
  media: Media[];
  liked: boolean;
  likes: number;
  likeNames: string;
  comments: number;
  top: boolean;
  visibility: number;
}
export interface Comment {
  avatar: string;
  id: string;
  userId: string;
  userName: string;
  content: string;
  replyName: string;
  createdAt: string;
  top: boolean;
  children: Comment[];
  media: Media[];
}
export interface Page<T> {
  items: T[];
  total: number;
}
export interface Draft {
  content: string;
  location: string;
  media: Media[];
}
export type MomentAction = 'delete' | 'top' | 'reward' | 'lottery/start';
export interface FishCirclePort {
  profile(id: string, signal: AbortSignal): Promise<CircleProfile>;
  list(page: number, userId: string, signal: AbortSignal): Promise<Page<Moment>>;
  save(draft: Draft, original: Moment | null, signal: AbortSignal): Promise<boolean>;
  like(id: string, signal: AbortSignal): Promise<boolean>;
  action(action: MomentAction, id: string, value: number, signal: AbortSignal): Promise<string>;
  comments(id: string, page: number, signal: AbortSignal): Promise<Page<Comment>>;
  comment(
    id: string,
    content: string,
    parent: Comment | null,
    images: Media[],
    signal: AbortSignal,
  ): Promise<boolean>;
  commentAction(
    action: 'delete' | 'top',
    id: string,
    top: boolean,
    signal: AbortSignal,
  ): Promise<boolean>;
  upload(file: File, signal: AbortSignal): Promise<Media>;
  following(id: string, toggle: boolean, signal: AbortSignal): Promise<boolean>;
}
export class CircleError extends Error {
  readonly expired: boolean;
  constructor(message: string, expired = false) {
    super(message);
    this.name = 'CircleError';
    this.expired = expired;
  }
}
