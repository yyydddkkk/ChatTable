import { useMemo, useState } from 'react';
import { ArrowRight, Building2, Lock, Loader2, UserRound } from 'lucide-react';

import { useAuthStore } from '../stores/authStore';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const { error, isLoading, login, register, clearError } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [tenantId, setTenantId] = useState('local');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const submitLabel = useMemo(() => (mode === 'login' ? '进入 Pluto' : '创建账号'), [mode]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSuccessMessage('');
    clearError();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    clearError();

    if (mode === 'login') {
      await login({ tenant_id: tenantId, username, password });
      return;
    }

    const success = await register({ tenant_id: tenantId, username, password });
    if (success) {
      setSuccessMessage('注册成功，现在可以直接登录 Pluto。');
      setMode('login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-[32px] pluto-modal-shell">
        <div className="grid md:grid-cols-[0.95fr_1.05fr]">
          <section className="border-b border-[--color-border-light] px-8 py-10 md:border-b-0 md:border-r">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[--color-primary] pluto-inline-tag">
              Pluto
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-[--color-text] md:text-5xl">
              进入 Pluto
            </h1>
            <p className="mt-4 text-base leading-8 text-[--color-text-muted]">
              一个真人，一整个 Agent 宇宙。
            </p>
          </section>

          <section className="px-8 py-10">
            <div className="pluto-ios-group flex items-center gap-2 p-1.5">
              <AuthTab active={mode === 'login'} label="登录" onClick={() => switchMode('login')} />
              <AuthTab active={mode === 'register'} label="注册" onClick={() => switchMode('register')} />
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <LabeledInput autoComplete="organization" icon={Building2} label="工作区" onChange={setTenantId} placeholder="local / team-a" value={tenantId} />
              <LabeledInput autoComplete="username" icon={UserRound} label="用户名" onChange={setUsername} placeholder="alice" value={username} />
              <LabeledInput autoComplete={mode === 'login' ? 'current-password' : 'new-password'} icon={Lock} label="密码" onChange={setPassword} placeholder="至少 6 位" type="password" value={password} />

              {error && <p className="rounded-2xl border border-rose-400/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</p>}
              {successMessage && <p className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{successMessage}</p>}

              <button
                type="submit"
                disabled={isLoading || !tenantId.trim() || !username.trim() || !password.trim()}
                className="pluto-modal-primary inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    正在进入…
                  </>
                ) : (
                  <>
                    {submitLabel}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function AuthTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
        active ? 'pluto-ios-button pluto-ios-button--primary' : 'text-[--color-text-muted] hover:text-[--color-text]'
      }`}
    >
      {label}
    </button>
  );
}

function LabeledInput({
  autoComplete,
  icon: Icon,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  autoComplete: string;
  icon: typeof Building2;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'password' | 'text';
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[--color-text]">{label}</span>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[--color-text-subtle]" size={17} />
        <input
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
          className="pluto-modal-input h-12 w-full rounded-2xl pl-11 pr-4 text-sm outline-none"
        />
      </div>
    </label>
  );
}
