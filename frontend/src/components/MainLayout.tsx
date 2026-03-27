import type { FC, ReactNode } from 'react';
import { MessageCircle, MoonStar, Settings, SunMedium, Users } from 'lucide-react';

import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

interface MainLayoutProps {
  children: ReactNode;
  currentView: 'chat' | 'contacts' | 'settings';
  onViewChange: (view: 'chat' | 'contacts' | 'settings') => void;
}

interface NavButtonProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

const navItems = [
  { key: 'chat' as const, label: '消息', icon: <MessageCircle size={18} /> },
  { key: 'contacts' as const, label: '联系人', icon: <Users size={18} /> },
  { key: 'settings' as const, label: '设置', icon: <Settings size={18} /> },
];

const NavButton: FC<NavButtonProps> = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    data-active={active ? 'true' : 'false'}
    className={`pluto-nav-button flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
      active
        ? 'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[--color-primary] shadow-[0_6px_20px_rgba(0,0,0,0.06)]'
        : 'text-[--color-text-muted] hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-[--color-text]'
    }`}
    aria-label={label}
  >
    {icon}
  </button>
);

export const MainLayout: FC<MainLayoutProps> = ({ children, currentView, onViewChange }) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex h-screen overflow-hidden bg-[--color-background] text-[--color-text]">
      <nav className="pluto-rail hidden h-full w-[72px] shrink-0 px-3 py-4 lg:flex lg:flex-col lg:items-center">
        <div className="pluto-brand-badge flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-secondary))] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
          P
        </div>

        <div className="pluto-nav-group mt-6 flex flex-col gap-2 rounded-[24px] bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => (
            <NavButton
              key={item.key}
              active={currentView === item.key}
              icon={item.icon}
              label={item.label}
              onClick={() => onViewChange(item.key)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'night' ? '切换到白天模式' : '切换到夜间模式'}
          className="pluto-rail-button mt-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] text-[--color-text-muted] shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition hover:text-[--color-text]"
          aria-label="切换日夜模式"
        >
          {theme === 'night' ? <SunMedium size={18} /> : <MoonStar size={18} />}
        </button>

        <div
          className="pluto-profile-badge flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] text-sm font-medium text-[--color-text] shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
          title={currentUser?.username || 'You'}
        >
          {(currentUser?.username || 'Y').slice(0, 1).toUpperCase()}
        </div>
      </nav>

      <main className="relative flex h-full min-h-0 flex-1 overflow-hidden p-3 pl-0 lg:pl-3">
        <div className="absolute inset-0 bg-[var(--app-radial)]" />
        <div className="pluto-main-shell relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--color-surface)_76%,transparent)] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          {children}
        </div>
      </main>
    </div>
  );
};

