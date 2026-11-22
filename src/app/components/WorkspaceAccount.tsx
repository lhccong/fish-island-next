import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useLocation, useNavigate } from 'react-router';
import { AccountControl, useAuth } from '@/features/auth';
import { Suspense, useRef, useState } from 'react';
import { signInPort } from '@/app/config/sign-in';
import { SignInLauncher } from '@/features/sign-in';
import {
  ContactRound,
  Ban,
  LockKeyhole,
  Plug,
  Settings,
  Clock,
  Gift,
  Compass,
  Moon,
  Sun,
} from 'lucide-react';
import { useAppearanceStore, WebsiteSettingsForm } from '@/features/appearance';
import { Dialog } from '@/shared/ui/Dialog';
import type { AccountTool } from '@/features/account-tools';
import { accountTools, blacklist } from '@/app/config/account-tools';
import { useWorkTimeVisibility, AccountToolPanel } from '@/features/account-tools';
import styles from './AccountTools.module.css';
import { useDailyPointTaskNavigation } from './use-daily-point-task-navigation';

export function WorkspaceAccount() {
  const { session, logout, notify } = useAuth();
  const [tool, setTool] = useState<AccountTool | 'website' | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const colorMode = useAppearanceStore((s) => s.colorMode);
  const setColorMode = useAppearanceStore((s) => s.setColorMode);
  const showTime = useWorkTimeVisibility((state) => state.visible);
  const setShowTime = useWorkTimeVisibility((state) => state.change);
  const open = (value: AccountTool | 'website') => {
    origin.current =
      wrapper.current?.querySelector<HTMLButtonElement>('[aria-label="用户菜单"]') ?? null;
    setTool(value);
  };
  const location = useLocation();
  const navigate = useNavigate();
  const navigateToTask = useDailyPointTaskNavigation();
  return (
    <div ref={wrapper}>
      <AccountControl
        menuItems={[
          { label: '我的卡片', icon: <ContactRound size={16} />, onSelect: () => open('card') },
          { label: '我的黑名单', icon: <Ban size={16} />, onSelect: () => open('blacklist') },
          { label: '找回密码', icon: <LockKeyhole size={16} />, onSelect: () => open('password') },
          { label: '开放平台', icon: <Plug size={16} />, onSelect: () => open('apps') },
          {
            label: '网站设置',
            separatorBefore: true,
            icon: <Settings size={16} />,
            onSelect: () => open('website'),
          },
          {
            label: showTime ? '隐藏工作时间' : '显示工作时间',
            icon: <Clock size={16} />,
            onSelect: () => {
              try {
                setShowTime(!showTime);
              } catch {
                notify('无法保存，请检查浏览器存储权限');
              }
            },
          },
          {
            label: '兑换码',
            separatorBefore: true,
            icon: <Gift size={16} />,
            onSelect: () => open('redeem'),
          },
          { label: '网站引导', icon: <Compass size={16} />, onSelect: () => open('tour') },
          {
            label: colorMode === 'dark' ? '切换明亮模式' : '切换深色模式',
            icon: colorMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
            onSelect: () => setColorMode(colorMode === 'dark' ? 'light' : 'dark'),
          },
        ]}
        accountActions={(closeProfile) =>
          session.status === 'authenticated' ? (
            <Suspense>
              <SignInLauncher
                key={session.user.id}
                port={signInPort}
                onNavigate={(task) => {
                  closeProfile();
                  if (task === 'redeem_code') open('redeem');
                  else navigateToTask(task);
                }}
              />
            </Suspense>
          ) : null
        }
        onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
      />
      {session.status === 'authenticated' && (
        <>
          {tool === 'website' ? (
            <Dialog
              open
              onOpenChange={(value) => {
                if (!value) setTool(null);
              }}
              returnFocusRef={origin}
              title="网站设置"
              description="设置保存在此浏览器。"
              dismissLabel="关闭网站设置"
              showCloseAction={false}
              className={styles.dialog ?? ''}
            >
              <WebsiteSettingsForm />
            </Dialog>
          ) : (
            tool && (
              <Suspense fallback={<LoadingIndicator>正在打开账号工具…</LoadingIndicator>}>
                <AccountToolPanel
                  key={`${session.user.id}:${tool}`}
                  tool={tool}
                  port={accountTools}
                  blacklist={blacklist}
                  user={session.user}
                  returnFocusRef={origin}
                  onClose={() => setTool(null)}
                  onReset={() => {
                    setTool(null);
                    void logout()
                      .then(() => notify('密码已重置，请重新登录'))
                      .catch(() => notify('密码已重置，请退出后重新登录'));
                  }}
                />
              </Suspense>
            )
          )}
        </>
      )}
    </div>
  );
}
