import type { RefObject } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { AccountToolsPort, BlacklistPort } from '@/domain/account-tools';
import { Dialog } from '@/shared/ui/Dialog';
import { PasswordForm } from './PasswordForm';
import { RedeemForm } from './RedeemForm';
import { DeveloperApps } from './DeveloperApps';
import { PersonalCard } from './PersonalCard';
import { BlacklistPanel } from './BlacklistPanel';
import { SiteTour } from './SiteTour';
import styles from './Tools.module.css';
export type AccountTool = 'card' | 'blacklist' | 'password' | 'apps' | 'redeem' | 'tour';
const titles = {
  blacklist: '我的黑名单',
  password: '找回密码',
  apps: '开放平台',
  redeem: '兑换码',
  tour: '网站引导',
};
const sizes = {
  blacklist: '',
  password: styles.password,
  apps: styles.apps,
  redeem: styles.redeem,
  tour: styles.tour,
};
const descriptions = {
  blacklist: '仅在此浏览器屏蔽这些岛友的聊天消息，按账号保存。',
  password: '通过邮箱验证码重置密码，成功后需重新登录。',
  apps: '管理接入摸鱼岛登录的应用，请勿向他人提供应用密钥。',
  redeem: '奖励由服务器校验后发放，请勿重复提交。',
  tour: '了解当前工作台的常用入口。',
};
export function AccountToolPanel({
  tool,
  port,
  blacklist,
  user,
  returnFocusRef,
  onClose,
  onReset,
}: {
  tool: AccountTool;
  port: AccountToolsPort;
  blacklist: BlacklistPort;
  user: AuthUser;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onReset: () => void;
}) {
  if (tool === 'card')
    return (
      <PersonalCard user={user} port={port} returnFocusRef={returnFocusRef} onClose={onClose} />
    );
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      returnFocusRef={returnFocusRef}
      title={titles[tool]}
      description={descriptions[tool]}
      hideDescription={tool === 'tour'}
      className={`${styles.dialog} ${sizes[tool]}`}
      showCloseAction={false}
      dismissLabel={`关闭${titles[tool]}`}
    >
      {tool === 'blacklist' && <BlacklistPanel port={blacklist} account={user.id} />}
      {tool === 'password' && (
        <PasswordForm port={port} email={user.email ?? ''} onReset={onReset} />
      )}
      {tool === 'apps' && <DeveloperApps port={port} />}
      {tool === 'redeem' && <RedeemForm port={port} />}
      {tool === 'tour' && <SiteTour onDone={onClose} />}
    </Dialog>
  );
}
