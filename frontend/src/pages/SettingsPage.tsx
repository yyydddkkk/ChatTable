import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BellRing,
  Bot,
  ChevronDown,
  ChevronRight,
  Database,
  FlaskConical,
  Loader2,
  LogOut,
  MoonStar,
  Plus,
  Save,
  Server,
  Shield,
  SunMedium,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { getFirstModelForProvider, getModelOptionsForProvider } from '../config/models';
import { useAuthStore } from '../stores/authStore';
import { useProviderStore, type Provider } from '../stores/providerStore';
import { useTenantStore } from '../stores/tenantStore';
import { useThemeStore } from '../stores/themeStore';

type SettingsSectionKey =
  | 'account'
  | 'chat'
  | 'agent'
  | 'debug'
  | 'security';

interface SettingsHomeItem {
  key: SettingsSectionKey;
  title: string;
  description: string;
  meta?: string;
  icon: LucideIcon;
}

interface NativeOption {
  label: string;
  value: number | string;
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="mb-3 px-1 text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-subtle]">
        {title}
      </p>
      <div className="pluto-ios-group p-1.5">{children}</div>
    </section>
  );
}

function SettingsHomeRow({
  icon: Icon,
  title,
  description,
  meta,
  onClick,
}: SettingsHomeItem & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pluto-ios-row flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left"
    >
      <div className="pluto-ios-icon-button flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] text-[--color-text-subtle]">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-[--color-text]">{title}</p>
        <p className="mt-1 truncate text-[13px] text-[--color-text-muted]">{description}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2.5 self-center">
        {meta && (
          <span className="max-w-[132px] truncate text-[13px] font-medium text-[--color-text-subtle]">
            {meta}
          </span>
        )}
        <ChevronRight size={16} className="shrink-0 text-[--color-text-subtle]" />
      </div>
    </button>
  );
}

function DetailHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={onBack}
        className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[--color-text]"
      >
        <ArrowLeft size={16} />
        返回设置
      </button>
      <div className="mt-4">
        <h1 className="text-[28px] font-semibold text-[--color-text]">{title}</h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">{description}</p>
      </div>
    </section>
  );
}

function DetailCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="pluto-ios-group p-4">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-[--color-text]">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-[--color-text-muted]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function NativeSelect({
  disabled = false,
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  disabled?: boolean;
  label: string;
  options: NativeOption[];
  value: number | string;
  onChange: (value: number | string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[--color-text]">{label}</span>
      <div className="relative">
        <select
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pluto-native-select h-11 w-full appearance-none rounded-[20px] border border-[--color-border-light] bg-[color-mix(in_srgb,var(--color-surface-elevated)_86%,var(--color-background)_14%)] px-4 pr-11 text-sm text-[--color-text] outline-none transition disabled:cursor-not-allowed disabled:opacity-55"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[--color-text-subtle]"
        />
      </div>
    </label>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] px-1 py-2">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[--color-text]">{title}</p>
        <p className="mt-1 text-[13px] text-[--color-text-muted]">{description}</p>
      </div>
      <label className="switch" aria-label={title}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="slider" />
      </label>
    </div>
  );
}

export default function SettingsPage() {
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);
  const tenantId = useTenantStore((state) => state.tenantId);
  const setTenantId = useTenantStore((state) => state.setTenantId);
  const { theme, setTheme } = useThemeStore();
  const {
    providers,
    settings,
    isLoading,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    fetchSettings,
    updateSettings,
  } = useProviderStore();

  const [activeSection, setActiveSection] = useState<SettingsSectionKey | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', api_key: '', api_base: '' });
  const [editData, setEditData] = useState({ name: '', api_key: '', api_base: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [tenantInput, setTenantInput] = useState(tenantId);
  const [notificationSettings, setNotificationSettings] = useState({
    desktop: true,
    sound: false,
    enterToSend: true,
  });
  const [debugSettings, setDebugSettings] = useState({
    traceRouting: false,
    experimentalUi: false,
    verboseHints: false,
  });

  useEffect(() => {
    void fetchProviders();
    void fetchSettings();
  }, [fetchProviders, fetchSettings, tenantId]);

  useEffect(() => {
    setTenantInput(tenantId);
  }, [tenantId]);

  const providerOptions: NativeOption[] = useMemo(
    () =>
      providers.map((provider) => ({
        value: provider.id,
        label: provider.name,
      })),
    [providers],
  );

  const selectedOptimizerProvider = useMemo(
    () =>
      settings.optimizer_provider_id == null
        ? null
        : providers.find((provider) => provider.id === settings.optimizer_provider_id) ?? null,
    [providers, settings.optimizer_provider_id],
  );

  const optimizerModelOptions: NativeOption[] = useMemo(
    () =>
      getModelOptionsForProvider(selectedOptimizerProvider?.name).map((model) => ({
        value: model.value,
        label: model.label,
      })),
    [selectedOptimizerProvider?.name],
  );

  useEffect(() => {
    if (!selectedOptimizerProvider || optimizerModelOptions.length === 0) {
      return;
    }

    if (!optimizerModelOptions.some((option) => option.value === settings.optimizer_model)) {
      void updateSettings({ optimizer_model: String(optimizerModelOptions[0].value) });
    }
  }, [
    optimizerModelOptions,
    selectedOptimizerProvider,
    settings.optimizer_model,
    updateSettings,
  ]);

  const homeItems: SettingsHomeItem[] = useMemo(
    () => [
      {
        key: 'account',
        title: '账户与资料',
        description: '查看账户、当前身份与基本资料。',
        meta: currentUser?.username || '未命名',
        icon: UserRound,
      },
      {
        key: 'chat',
        title: '聊天与通知',
        description: '界面模式、提醒方式与聊天偏好。',
        meta: theme === 'night' ? '夜间' : theme === 'soft' ? '护眼' : '白天',
        icon: BellRing,
      },
      {
        key: 'agent',
        title: 'Agent 与模型',
        description: '管理 Provider、优化模型与调用配置。',
        meta: `${providers.length} 个 Provider`,
        icon: Bot,
      },
      {
        key: 'debug',
        title: '调试与实验功能',
        description: '用于开发联调的实验开关与调试入口。',
        meta: '本地开关',
        icon: FlaskConical,
      },
      {
        key: 'security',
        title: '数据与安全',
        description: '工作区、会话安全与数据相关操作。',
        meta: tenantId,
        icon: Shield,
      },
    ],
    [currentUser?.username, providers.length, tenantId, theme],
  );

  const handleApplyTenant = () => {
    const nextTenant = tenantInput.trim();
    if (nextTenant) {
      setTenantId(nextTenant);
    }
  };

  const handleOptimizerProviderChange = (value: number | string) => {
    if (value === '') {
      void updateSettings({ optimizer_model: '', optimizer_provider_id: null });
      return;
    }

    const nextProvider = providers.find((provider) => provider.id === Number(value)) ?? null;
    const nextModelOptions = getModelOptionsForProvider(nextProvider?.name);
    const nextModel = nextModelOptions.some((option) => option.value === settings.optimizer_model)
      ? settings.optimizer_model
      : getFirstModelForProvider(nextProvider?.name) ?? '';

    void updateSettings({
      optimizer_model: nextModel,
      optimizer_provider_id: Number(value),
    });
  };

  const handleAddProvider = async () => {
    if (!formData.name.trim() || !formData.api_key.trim() || !formData.api_base.trim()) {
      return;
    }

    const result = await createProvider(formData);
    if (result) {
      setFormData({ name: '', api_key: '', api_base: '' });
      setShowAddForm(false);
    }
  };

  const handleEdit = (provider: Provider) => {
    setEditingId(provider.id);
    setEditData({ name: provider.name, api_key: '', api_base: provider.api_base });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const payload: { api_base?: string; api_key?: string; name?: string } = {
      name: editData.name,
      api_base: editData.api_base,
    };
    if (editData.api_key.trim()) {
      payload.api_key = editData.api_key;
    }
    await updateProvider(editingId, payload);
    setEditingId(null);
  };

  const handleDelete = async (providerId: number) => {
    await deleteProvider(providerId);
    setDeleteConfirmId(null);
  };

  const renderAccountSection = () => (
    <div className="space-y-4">
      <DetailHeader
        title="账户与资料"
        description="管理当前登录身份与资料信息。"
        onBack={() => setActiveSection(null)}
      />

      <DetailCard title="当前账户" description="这些信息来自当前登录会话。">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-[20px] px-1 py-2">
            <span className="text-[13px] text-[--color-text-muted]">用户名</span>
            <span className="text-sm font-medium text-[--color-text]">
              {currentUser?.username || '未登录'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-[20px] px-1 py-2">
            <span className="text-[13px] text-[--color-text-muted]">账户 ID</span>
            <span className="text-sm font-medium text-[--color-text]">
              {currentUser?.id ?? '--'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-[20px] px-1 py-2">
            <span className="text-[13px] text-[--color-text-muted]">当前工作区</span>
            <span className="pluto-inline-tag rounded-full px-3 py-1 text-[11px]">{tenantId}</span>
          </div>
        </div>
      </DetailCard>

      <DetailCard title="会话操作" description="退出当前账号，重新登录其他身份。">
        <button
          type="button"
          onClick={logout}
          className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[--color-text]"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </DetailCard>
    </div>
  );

  const renderChatSection = () => (
    <div className="space-y-4">
      <DetailHeader
        title="聊天与通知"
        description="调整界面模式、通知方式与聊天习惯。"
        onBack={() => setActiveSection(null)}
      />

      <DetailCard title="外观模式" description="切换 Pluto 的日夜主题。">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTheme('day')}
            className={`pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ${
              theme === 'day' ? 'pluto-ios-button--primary' : 'text-[--color-text]'
            }`}
          >
            <SunMedium size={16} />
            白天模式
          </button>
          <button
            type="button"
            onClick={() => setTheme('soft')}
            className={`pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ${
              theme === 'soft' ? 'pluto-ios-button--primary' : 'text-[--color-text]'
            }`}
          >
            <SunMedium size={16} />
            护眼模式
          </button>
          <button
            type="button"
            onClick={() => setTheme('night')}
            className={`pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ${
              theme === 'night' ? 'pluto-ios-button--primary' : 'text-[--color-text]'
            }`}
          >
            <MoonStar size={16} />
            夜间模式
          </button>
        </div>
      </DetailCard>

      <DetailCard title="通知偏好" description="这部分先作为本地偏好设置。">
        <div className="space-y-1">
          <SwitchRow
            title="桌面通知"
            description="收到新消息时弹出系统提醒。"
            checked={notificationSettings.desktop}
            onChange={(desktop) =>
              setNotificationSettings((previous) => ({ ...previous, desktop }))
            }
          />
          <SwitchRow
            title="消息提示音"
            description="收到新消息时播放提示音。"
            checked={notificationSettings.sound}
            onChange={(sound) =>
              setNotificationSettings((previous) => ({ ...previous, sound }))
            }
          />
          <SwitchRow
            title="回车发送"
            description="按 Enter 直接发送，Shift + Enter 换行。"
            checked={notificationSettings.enterToSend}
            onChange={(enterToSend) =>
              setNotificationSettings((previous) => ({ ...previous, enterToSend }))
            }
          />
        </div>
      </DetailCard>
    </div>
  );

  const renderAgentSection = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Agent 与模型"
        description="在详情中管理 Provider 和优化模型，不再在首页堆满配置表单。"
        onBack={() => setActiveSection(null)}
      />

      <DetailCard title="优化模型" description="先选 Provider，再选择该 Provider 下可用的模型。">
        <div className="grid gap-4 md:grid-cols-2">
          <NativeSelect
            label="Provider"
            options={providerOptions}
            value={settings.optimizer_provider_id ?? ''}
            onChange={handleOptimizerProviderChange}
            placeholder={providerOptions.length > 0 ? '请选择 Provider' : '请先添加 Provider'}
          />
          <NativeSelect
            disabled={!selectedOptimizerProvider || optimizerModelOptions.length === 0}
            label="模型"
            options={optimizerModelOptions}
            value={
              optimizerModelOptions.some((option) => option.value === settings.optimizer_model)
                ? settings.optimizer_model
                : ''
            }
            onChange={(value) => void updateSettings({ optimizer_model: String(value) })}
            placeholder={
              !selectedOptimizerProvider
                ? '请先选择 Provider'
                : optimizerModelOptions.length > 0
                  ? '请选择模型'
                  : '该 Provider 暂无可选模型'
            }
          />
        </div>
        <p className="mt-3 text-[12px] text-[--color-text-muted]">
          {selectedOptimizerProvider
            ? optimizerModelOptions.length > 0
              ? `当前仅展示 ${selectedOptimizerProvider.name} 对应模型，不再混入其他平台选项。`
              : `${selectedOptimizerProvider.name} 暂未匹配到模型列表，请检查 Provider 命名。`
            : '先选择一个 Provider，模型列表会自动切换。'}
        </p>
      </DetailCard>

      <DetailCard title="Provider 列表" description="添加、编辑或移除模型服务提供方。">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-[--color-text-muted]">当前共 {providers.length} 个 Provider</p>
          <button
            type="button"
            onClick={() => setShowAddForm((previous) => !previous)}
            className="pluto-ios-button pluto-ios-button--primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? '收起' : '新增 Provider'}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 rounded-[22px] border border-[--color-border] bg-[color-mix(in_srgb,var(--color-surface)_78%,var(--color-background)_22%)] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                value={formData.name}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, name: event.target.value }))
                }
                placeholder="名称"
                className="h-11 rounded-2xl border border-[--color-border] bg-transparent px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
              />
              <input
                type="password"
                value={formData.api_key}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, api_key: event.target.value }))
                }
                placeholder="API Key"
                className="h-11 rounded-2xl border border-[--color-border] bg-transparent px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
              />
              <input
                type="text"
                value={formData.api_base}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, api_base: event.target.value }))
                }
                placeholder="API Base"
                className="h-11 rounded-2xl border border-[--color-border] bg-transparent px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
              />
            </div>
            <button
              type="button"
              onClick={handleAddProvider}
              disabled={
                isLoading ||
                !formData.name.trim() ||
                !formData.api_key.trim() ||
                !formData.api_base.trim()
              }
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[--color-primary] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              保存 Provider
            </button>
          </div>
        )}

        <div className="space-y-3">
          {providers.length === 0 ? (
            <div className="rounded-[20px] px-2 py-8 text-center text-sm text-[--color-text-muted]">
              还没有 Provider，先添加一个即可开始配置。
            </div>
          ) : (
            providers.map((provider) => (
              <div
                key={provider.id}
                className="rounded-[22px] border border-[--color-border] bg-[color-mix(in_srgb,var(--color-surface)_78%,var(--color-background)_22%)] p-4"
              >
                {editingId === provider.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(event) =>
                        setEditData((previous) => ({ ...previous, name: event.target.value }))
                      }
                      className="h-11 w-full rounded-2xl border border-[--color-border] bg-transparent px-4 text-sm text-[--color-text] outline-none"
                    />
                    <input
                      type="password"
                      value={editData.api_key}
                      onChange={(event) =>
                        setEditData((previous) => ({ ...previous, api_key: event.target.value }))
                      }
                      placeholder="留空则不修改 Key"
                      className="h-11 w-full rounded-2xl border border-[--color-border] bg-transparent px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
                    />
                    <input
                      type="text"
                      value={editData.api_base}
                      onChange={(event) =>
                        setEditData((previous) => ({ ...previous, api_base: event.target.value }))
                      }
                      className="h-11 w-full rounded-2xl border border-[--color-border] bg-transparent px-4 text-sm text-[--color-text] outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-full bg-[--color-primary] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        <Save size={14} />
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[--color-text]"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[--color-text]">{provider.name}</p>
                      <p className="mt-1 truncate text-[13px] text-[--color-text-muted]">
                        {provider.api_base}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(provider)}
                        className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[--color-text]"
                      >
                        <Server size={14} />
                        编辑
                      </button>
                      {deleteConfirmId === provider.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(provider.id)}
                            className="rounded-full bg-rose-500 px-3 py-2 text-xs font-medium text-white"
                          >
                            确认删除
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="pluto-ios-button rounded-full px-3 py-2 text-xs font-medium text-[--color-text]"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(provider.id)}
                          className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-rose-500"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DetailCard>
    </div>
  );

  const renderDebugSection = () => (
    <div className="space-y-4">
      <DetailHeader
        title="调试与实验功能"
        description="面向开发联调使用，默认保持关闭。"
        onBack={() => setActiveSection(null)}
      />

      <DetailCard title="本地调试开关" description="这些开关暂时只在本地界面中生效。">
        <div className="space-y-1">
          <SwitchRow
            title="路由调试信息"
            description="显示更多会话调度过程信息。"
            checked={debugSettings.traceRouting}
            onChange={(traceRouting) =>
              setDebugSettings((previous) => ({ ...previous, traceRouting }))
            }
          />
          <SwitchRow
            title="实验性界面"
            description="启用仍在尝试中的实验 UI。"
            checked={debugSettings.experimentalUi}
            onChange={(experimentalUi) =>
              setDebugSettings((previous) => ({ ...previous, experimentalUi }))
            }
          />
          <SwitchRow
            title="详细提示"
            description="在操作区显示更多辅助说明。"
            checked={debugSettings.verboseHints}
            onChange={(verboseHints) =>
              setDebugSettings((previous) => ({ ...previous, verboseHints }))
            }
          />
        </div>
      </DetailCard>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-4">
      <DetailHeader
        title="数据与安全"
        description="管理工作区、会话安全和数据相关操作。"
        onBack={() => setActiveSection(null)}
      />

      <DetailCard title="工作区" description="切换当前租户或工作区环境。">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={tenantInput}
            onChange={(event) => setTenantInput(event.target.value)}
            placeholder="local / team-a"
            className="h-11 flex-1 rounded-2xl border border-[--color-border] bg-transparent px-4 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
          />
          <button
            type="button"
            onClick={handleApplyTenant}
            className="rounded-full bg-[--color-primary] px-4 py-2.5 text-sm font-medium text-white"
          >
            应用工作区
          </button>
        </div>
      </DetailCard>

      <DetailCard title="会话安全" description="退出当前会话或查看安全相关操作。">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={logout}
            className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[--color-text]"
          >
            <LogOut size={16} />
            退出登录
          </button>
          <button
            type="button"
            disabled
            className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[--color-text-subtle] opacity-60"
          >
            <Database size={16} />
            导出数据（待实现）
          </button>
        </div>
      </DetailCard>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return renderAccountSection();
      case 'chat':
        return renderChatSection();
      case 'agent':
        return renderAgentSection();
      case 'debug':
        return renderDebugSection();
      case 'security':
        return renderSecuritySection();
      default:
        return null;
    }
  };

  return (
    <div className="pluto-settings-shell flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        {activeSection ? (
          renderSection()
        ) : (
          <div className="space-y-7">
            <section>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[--color-text-subtle]">
                设置
              </p>
              <h1 className="mt-2 text-[28px] font-semibold text-[--color-text]">设置</h1>
              <p className="mt-2 text-sm text-[--color-text-muted]">
                先按分类查看，再进入详情进行更专业的配置。
              </p>
            </section>

            <SettingsGroup title="基础设置">
              {homeItems
                .filter((item) => ['account', 'chat', 'security'].includes(item.key))
                .map((item) => (
                  <SettingsHomeRow
                    icon={item.icon}
                    key={item.key}
                    title={item.title}
                    description={item.description}
                    meta={item.meta}
                    onClick={() => setActiveSection(item.key)}
                  />
                ))}
            </SettingsGroup>

            <SettingsGroup title="能力设置">
              {homeItems
                .filter((item) => ['agent', 'debug'].includes(item.key))
                .map((item) => (
                  <SettingsHomeRow
                    icon={item.icon}
                    key={item.key}
                    title={item.title}
                    description={item.description}
                    meta={item.meta}
                    onClick={() => setActiveSection(item.key)}
                  />
                ))}
            </SettingsGroup>

            <section className="pluto-ios-group p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-[--color-text]">当前账号</p>
                  <p className="mt-1 text-[13px] text-[--color-text-muted]">
                    {currentUser?.username || '未登录'} · {tenantId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[--color-text]"
                >
                  <LogOut size={16} />
                  退出
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}



