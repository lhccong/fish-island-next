import { createContext, useContext } from 'react';

export type SignInView = 'calendar' | 'tasks';

export const SignInStatusContext = createContext<{
  todaySigned: boolean | null;
  report: (signed: boolean) => void;
  view: SignInView;
  selectView: (view: SignInView) => void;
}>({
  todaySigned: null,
  report: () => {},
  view: 'calendar',
  selectView: () => {},
});

export const useSignInStatus = () => useContext(SignInStatusContext);
