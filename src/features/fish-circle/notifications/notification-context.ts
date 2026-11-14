import { createContext, useContext } from 'react';

export const NotificationContext = createContext<{
  count: number | null;
  error: string;
  refresh: () => void;
}>({ count: null, error: '', refresh: () => {} });

export const useNotifications = () => useContext(NotificationContext);
