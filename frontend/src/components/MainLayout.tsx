import type { FC, ReactNode } from 'react';
import { MessageCircle, Users, Settings } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  currentView: 'chat' | 'contacts' | 'settings';
  onViewChange: (view: 'chat' | 'contacts' | 'settings') => void;
}

export const MainLayout: FC<MainLayoutProps> = ({ children, currentView, onViewChange }) => {
  return (
    <div className="flex h-screen bg-[--color-background] text-[--color-text] overflow-hidden select-none">
      <nav 
        className="w-16 flex flex-col items-center py-5 gap-0 shrink-0 z-10"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F6F3 100%)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        <div 
          className="w-10 h-10 rounded-2xl overflow-hidden mb-6 cursor-pointer transition-all duration-300 hover:scale-105"
          style={{
            boxShadow: '0 4px 12px rgba(234,120,80,0.25)',
            border: '2px solid rgba(234,120,80,0.3)',
          }}
        >
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky&backgroundColor=b6e3f4" 
            alt="me" 
            className="w-full h-full" 
          />
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <NavButton 
            active={currentView === 'chat'} 
            onClick={() => onViewChange('chat')}
            icon={<MessageCircle size={20} />}
            label="聊天"
          />
          <NavButton 
            active={currentView === 'contacts'} 
            onClick={() => onViewChange('contacts')}
            icon={<Users size={20} />}
            label="联系人"
          />
        </div>

        <div className="w-8 h-px my-3" style={{ background: 'rgba(0,0,0,0.06)' }} />
        
        <NavButton
          active={currentView === 'settings'}
          onClick={() => onViewChange('settings')}
          icon={<Settings size={18} />}
          label="设置"
        />
      </nav>

      {children}
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label?: string;
}

const NavButton: FC<NavButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className="relative w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer border-none transition-all duration-300 group"
      style={{
        background: active 
          ? 'linear-gradient(135deg, #EA7850 0%, #E86848 100%)' 
          : 'transparent',
        boxShadow: active 
          ? '0 4px 16px rgba(234,120,80,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' 
          : 'none',
        margin: '3px 0',
      }}
      aria-label={label}
    >
      <span 
        className="transition-all duration-300"
        style={{
          color: active ? '#fff' : 'var(--color-text-muted)',
          filter: active ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
        }}
      >
        {icon}
      </span>
      {!active && (
        <span 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ background: 'rgba(234,120,80,0.1)' }}
        />
      )}
      {active && (
        <span 
          className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
          style={{ background: 'var(--color-primary)' }}
        />
      )}
    </button>
  );
};
