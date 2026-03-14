import { useState, useEffect } from 'react';
import { useProviderStore, type Provider } from '../stores/providerStore';
import { MODEL_OPTIONS } from '../config/models';
import { Plus, Trash2, Edit2, Save, X, Loader2, Server, Wand2 } from 'lucide-react';
import Dropdown from '../components/Dropdown';

const MODEL_DROPDOWN_OPTIONS = MODEL_OPTIONS.flatMap(group =>
  group.models.map(model => ({
    value: model.value,
    label: `${model.label} (${group.group})`,
  }))
);

export default function SettingsPage() {
  const {
    providers, settings, isLoading,
    fetchProviders, createProvider, updateProvider, deleteProvider,
    fetchSettings, updateSettings,
  } = useProviderStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', api_key: '', api_base: '' });
  const [editData, setEditData] = useState({ name: '', api_key: '', api_base: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchProviders();
    fetchSettings();
  }, [fetchProviders, fetchSettings]);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.api_key.trim() || !formData.api_base.trim()) return;
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
    const data: { name?: string; api_key?: string; api_base?: string } = {
      name: editData.name,
      api_base: editData.api_base,
    };
    if (editData.api_key) data.api_key = editData.api_key;
    await updateProvider(editingId, data);
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await deleteProvider(id);
    setDeleteConfirmId(null);
  };

  const providerDropdownOptions = providers.map(p => ({
    value: p.id,
    label: `${p.name} (${p.api_base})`,
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-[--color-background]">
      <div className="max-w-2xl mx-auto py-8 px-6">
        <h1 className="text-2xl font-semibold text-text mb-8">设置</h1>

        {/* Section A: Providers */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-primary" />
              <h2 className="text-lg font-medium text-text">API 服务商</h2>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition"
              style={{
                background: showAddForm ? 'rgba(0,0,0,0.05)' : 'var(--color-primary)',
                color: showAddForm ? 'var(--color-text)' : '#fff',
              }}
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              {showAddForm ? '取消' : '添加服务商'}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="bg-surface rounded-xl p-4 mb-4 space-y-3" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                  placeholder="如 OpenAI、DashScope"
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">API Key</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData(d => ({ ...d, api_key: e.target.value }))}
                  placeholder="输入 API 密钥"
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">API Base URL</label>
                <input
                  type="text"
                  value={formData.api_base}
                  onChange={(e) => setFormData(d => ({ ...d, api_base: e.target.value }))}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={isLoading || !formData.name.trim() || !formData.api_key.trim() || !formData.api_base.trim()}
                className="w-full py-2 bg-primary text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                添加
              </button>
            </div>
          )}

          {/* Provider list */}
          <div className="space-y-2">
            {providers.length === 0 && !showAddForm && (
              <div className="text-center py-8 text-text-muted text-sm">
                暂无服务商，点击上方按钮添加
              </div>
            )}
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="bg-surface rounded-xl p-4"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              >
                {editingId === provider.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(d => ({ ...d, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none text-sm"
                      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                    />
                    <input
                      type="password"
                      value={editData.api_key}
                      onChange={(e) => setEditData(d => ({ ...d, api_key: e.target.value }))}
                      placeholder="留空则不修改密钥"
                      className="w-full px-3 py-2 rounded-lg focus:outline-none text-sm"
                      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                    />
                    <input
                      type="text"
                      value={editData.api_base}
                      onChange={(e) => setEditData(d => ({ ...d, api_base: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none text-sm"
                      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={isLoading}
                        className="flex-1 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
                      >
                        <Save size={14} />
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2 text-text-muted hover:text-text transition text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text">{provider.name}</div>
                      <div className="text-sm text-text-muted truncate">{provider.api_base}</div>
                      <div className="text-xs text-text-muted mt-0.5">密钥: ••••••••</div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      <button
                        onClick={() => handleEdit(provider)}
                        className="p-2 rounded-lg hover:bg-background transition"
                        aria-label="编辑"
                      >
                        <Edit2 size={15} className="text-text-muted" />
                      </button>
                      {deleteConfirmId === provider.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(provider.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs text-text-muted"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(provider.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition"
                          aria-label="删除"
                        >
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section B: Optimizer config */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Wand2 size={18} className="text-primary" />
            <h2 className="text-lg font-medium text-text">AI 优化配置</h2>
          </div>
          <div className="bg-surface rounded-xl p-4 space-y-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">服务商</label>
              {providerDropdownOptions.length > 0 ? (
                <Dropdown
                  options={providerDropdownOptions}
                  value={settings.optimizer_provider_id ?? ''}
                  onChange={(val) => updateSettings({ optimizer_provider_id: val as number })}
                  placeholder="选择服务商"
                />
              ) : (
                <p className="text-sm text-text-muted">请先添加服务商</p>
              )}
            </div>
            <Dropdown
              label="模型"
              options={MODEL_DROPDOWN_OPTIONS}
              value={settings.optimizer_model}
              onChange={(val) => updateSettings({ optimizer_model: val as string })}
              placeholder="选择模型"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
