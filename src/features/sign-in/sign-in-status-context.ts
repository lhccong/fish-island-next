import { createContext, useContext } from 'react';

export const SignInStatusContext = createContext<{
  todaySigned: boolean | null;
  report: (signed: boolean) => void;
}>({
  todaySigned: null,
  report: () => {},
});

export const useSignInStatus = () => useContext(SignInStatusContext);
