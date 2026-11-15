import { createContext, use, type ReactNode } from 'react';

const FooterContext = createContext<ReactNode>(null);

export function PageFooterProvider({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  return <FooterContext value={footer}>{children}</FooterContext>;
}

export function PageFooterOutlet() {
  return use(FooterContext);
}
