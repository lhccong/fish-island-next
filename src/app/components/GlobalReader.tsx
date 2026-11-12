import { ReaderHost } from '@/features/reader';
import { readerController } from '@/app/config/reader';
import { useLocation } from 'react-router';
export function GlobalReader() {
  const location = useLocation();
  return <ReaderHost controller={readerController} pageActive={location.pathname === '/reader'} />;
}
