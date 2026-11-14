import { createContext } from 'react';
import type { ChatEmoticonPort } from '@/domain/chat';
export const CommentEmoticonsContext = createContext<Pick<ChatEmoticonPort, 'list'> | null>(null);
export const CommentEmoticonsProvider = CommentEmoticonsContext.Provider;
