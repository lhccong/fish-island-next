import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import type { SignInPort } from '@/domain/sign-in';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { SignInPanel } from './SignInPanel';
import styles from './SignIn.module.css';

export function SignInLauncher({ port }: { port: SignInPort }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      title="每日签到"
      description="记录在岛上的每一天"
      hideDescription
      className={`${styles.dialog}`}
      open={open}
      onOpenChange={setOpen}
      showCloseAction={false}
      dismissLabel="关闭签到"
      trigger={
        <Button variant="secondary">
          <CalendarCheck size={16} aria-hidden="true" />
          每日签到
        </Button>
      }
    >
      {open && <SignInPanel port={port} />}
    </Dialog>
  );
}
