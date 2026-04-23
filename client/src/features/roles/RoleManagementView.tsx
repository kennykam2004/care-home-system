import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleInput } from '../../components/ui';
import { usePermission, MODULES } from '../../hooks/usePermission';
import api from '../../api/client';

interface Role {
  id: string;
  code: string;
  name: string;
  org: string;
  description?: string;
  type: string;
}

interface ModulePermission {
  module: string;
  canView: boolean;
  canEdit: boolean;
}

export function RoleManagementView() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [addFormData, setAddFormData] = useState({ code: '', name: '', description: '', type: '普通角色' });
  const [editFormData, setEditFormData] = useState({ name: '', description: '', type: '' });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<ModulePermission[]>([]);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; role: Role | null }>({ show: false, role: null });
  const { canCreateUser } = usePermission();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/users/roles');
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!addFormData.code || !addFormData.name) {
      setError('請填寫所有必填欄位');
      return;
    }

    try {
      await api.post('/roles', {
        code: addFormData.code,
        name: addFormData.name,
        description: addFormData.description,
        type: addFormData.type,
      });
      setShowAddModal(false);
      setAddFormData({ code: '', name: '', description: '', type: '普通角色' });
      setError('');
      fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.error || '新增角色失敗');
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole || !editFormData.name) {
      setError('請填寫所有必填欄位');
      return;
    }

    try {
      await api.put(`/roles/${selectedRole.id}`, {
        name: editFormData.name,
        description: editFormData.description,
        type: editFormData.type,
      });
      setShowEditModal(false);
      setSelectedRole(null);
      setError('');
      fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.error || '更新角色失敗');
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setEditFormData({
      name: role.name,
      description: role.description || '',
      type: role.type,
    });
    setShowEditModal(true);
  };

  const openPermissionModal = async (role: Role) => {
    if (!canCreateUser()) return;
    setSelectedRole(role);
    setError('');
    try {
      const { data } = await api.get(`/permissions/roles/${role.id}`);
      // Always include all MODULES, merging with existing permissions
      const existingPerms = data || [];
      const mergedPermissions = MODULES.map((m) => {
        const found = existingPerms.find((p: { module: string }) => p.module === m.key);
        return found || { module: m.key, canView: false, canEdit: false };
      });
      setRolePermissions(mergedPermissions);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      setRolePermissions(MODULES.map((m) => ({ module: m.key, canView: false, canEdit: false })));
    }
    setShowPermissionModal(true);
  };

  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;
    try {
      await api.put(`/permissions/roles/${selectedRole.id}`, { permissions: rolePermissions });
      setShowPermissionModal(false);
      setSelectedRole(null);
    } catch (err: any) {
      setError(err.response?.data?.error || '更新權限失敗');
    }
  };

  const togglePermission = (module: string, field: 'canView' | 'canEdit') => {
    setRolePermissions((prev) =>
      prev.map((p) => (p.module === module ? { ...p, [field]: !p[field] } : p))
    );
  };

  const handleDeleteRole = async () => {
    if (!deleteConfirm.role) return;
    try {
      await api.delete(`/roles/${deleteConfirm.role.id}`);
      setDeleteConfirm({ show: false, role: null });
      fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.error || '刪除角色失敗');
    }
  };

  const openDeleteConfirm = (role: Role) => {
    setDeleteConfirm({ show: true, role });
    setError('');
  };

  if (isLoading) {
    return (
      <div className="p-8 flex-1 overflow-auto bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 overflow-auto bg-[#F5F5F7]">
      <Breadcrumb items={['系統管理', '權限管理', '角色管理']} />

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">角色管理</h2>
        {canCreateUser() && (
          <AppleButtonPrimary icon={Plus} onClick={() => setShowAddModal(true)}>
            新增角色
          </AppleButtonPrimary>
        )}
      </div>

      {!canCreateUser() && (
        <div className="mb-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-xl">
          只有院長可以新增或編輯角色
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium">角色名稱</th>
                <th className="py-3 px-4 font-medium">角色編號</th>
                <th className="py-3 px-4 font-medium">所屬機構</th>
                <th className="py-3 px-4 font-medium">角色類型</th>
                <th className="py-3 px-4 font-medium">角色描述</th>
                <th className="py-3 px-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">{role.name}</td>
                  <td className="py-4 px-4 text-gray-500 font-mono">{role.code}</td>
                  <td className="py-4 px-4 text-gray-600">{role.org}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      role.type === '管理員' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {role.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-500">{role.description || '-'}</td>
                  <td className="py-4 px-4 text-right">
                    {canCreateUser() ? (
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          className="hover:text-blue-600 transition-colors flex items-center gap-1"
                          onClick={() => openPermissionModal(role)}
                        >
                          權限
                        </button>
                        <button
                          className="hover:text-blue-600 transition-colors flex items-center gap-1"
                          onClick={() => openEditModal(role)}
                        >
                          <Pencil size={14} /> 編輯
                        </button>
                        <button
                          className="hover:text-red-600 transition-colors flex items-center gap-1"
                          onClick={() => openDeleteConfirm(role)}
                        >
                          <Trash2 size={14} /> 刪除
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">無權限</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增角色 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[500px] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">新增角色</h2>
              <button onClick={() => { setShowAddModal(false); setError(''); }} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8 space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色編號 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  placeholder="例如：AM06"
                  value={addFormData.code}
                  onChange={(e) => setAddFormData({ ...addFormData, code: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色名稱 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  placeholder="請輸入角色名稱"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色類型</label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={addFormData.type}
                    onChange={(e) => setAddFormData({ ...addFormData, type: e.target.value })}
                  >
                    <option value="普通角色">普通角色</option>
                    <option value="管理員">管理員</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
                <textarea
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  rows={3}
                  placeholder="請輸入角色描述"
                  value={addFormData.description}
                  onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => { setShowAddModal(false); setError(''); }}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleAddRole}>確認</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}

      {/* 編輯角色 Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[500px] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">編輯角色</h2>
              <button onClick={() => { setShowEditModal(false); setError(''); }} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8 space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色編號</label>
                <div className="p-2.5 bg-gray-100 rounded-xl text-gray-500">{selectedRole.code}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色名稱 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  placeholder="請輸入角色名稱"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色類型</label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                  >
                    <option value="普通角色">普通角色</option>
                    <option value="管理員">管理員</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
                <textarea
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl p-3 text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  rows={3}
                  placeholder="請輸入角色描述"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => { setShowEditModal(false); setError(''); }}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleEditRole}>確認</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}

      {/* 權限設定 Modal */}
      {showPermissionModal && selectedRole && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[500px] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">設定「{selectedRole.name}」權限</h2>
              <button onClick={() => { setShowPermissionModal(false); setError(''); }} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8 space-y-3">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

              <div className="grid grid-cols-4 gap-3 text-sm font-medium text-gray-600 mb-2 px-2">
                <div className="col-span-2">模組</div>
                <div className="text-center">檢視</div>
                <div className="text-center">編輯</div>
              </div>

              {MODULES.map((mod) => {
                const perm = rolePermissions.find((p) => p.module === mod.key) || { module: mod.key, canView: false, canEdit: false };
                return (
                  <div key={mod.key} className="grid grid-cols-4 gap-3 items-center px-2 py-2 hover:bg-gray-50 rounded-xl">
                    <div className="col-span-2 text-gray-800 font-medium">{mod.name}</div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => togglePermission(mod.key, 'canView')}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          perm.canView ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200'
                        }`}
                      >
                        {perm.canView && '✓'}
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => togglePermission(mod.key, 'canEdit')}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          perm.canEdit ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200'
                        }`}
                      >
                        {perm.canEdit && '✓'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => { setShowPermissionModal(false); setError(''); }}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleUpdatePermissions}>儲存</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleteConfirm.show && deleteConfirm.role && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[400px] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">確認刪除</h2>
              <button onClick={() => setDeleteConfirm({ show: false, role: null })} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4">{error}</div>}
              <p className="text-gray-600">
                確定要刪除角色「<span className="font-medium text-gray-900">{deleteConfirm.role.name}</span>」嗎？
              </p>
              <p className="text-sm text-gray-500 mt-2">此操作無法撤銷。</p>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => setDeleteConfirm({ show: false, role: null })}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleDeleteRole} className="!bg-red-500 hover:!bg-red-600">確認刪除</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
