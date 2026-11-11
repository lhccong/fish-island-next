import { createContext } from 'react';
import type { AuthController } from './model/auth-controller';
export const AuthContext = createContext<AuthController | null>(null);
