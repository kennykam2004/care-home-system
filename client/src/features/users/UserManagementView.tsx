import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Key } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleInput } from '../../components/ui';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api/client';

interface User {
  id: string;
  employeeId: string;
  name: string;
  status: string;
  phone?: string;
  email?: string;
  roles: string[];
}

interface Role {
  id: string;
  name: string;
  code: string;
}

export function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; user: User | null }>({ show: false, user: null });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    status: '啟動',
    roleId: '',
  });
  const [addFormData, setAddFormData] = useState({
    employeeId: '',
    name: '',
    password: '',
    confirmPassword: '',
    phone: '',
    email: '',
    roleId: '',
  });
  const [error, setError] = useState('');
  const { canCreateUser } = usePermission();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/users/roles');
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleAddUser = async () => {
    if (!addFormData.employeeId || !addFormData.name || !addFormData.password || !addFormData.roleId) {
      setError('請填寫所有必填欄位');
      return;
    }
    if (addFormData.password !== addFormData.confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }
    if (addFormData.password.length < 6) {
      setError('密碼至少需要 6 個字符');
      return;
    }

    try {
      await api.post('/users', {
        employeeId: addFormData.employeeId,
        name: addFormData.name,
        password: addFormData.password,
        phone: addFormData.phone,
        email: addFormData.email,
        roleIds: [addFormData.roleId],
        defaultRoleId: addFormData.roleId,
      });
      setShowAddModal(false);
      setAddFormData({ employeeId: '', name: '', password: '', confirmPassword: '', phone: '', email: '', roleId: '' });
      setError('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '新增用戶失敗');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formData.name || !formData.roleId) {
      setError('請填寫所有必填欄位');
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        status: formData.status,
        roleIds: [formData.roleId],
        defaultRoleId: formData.roleId,
      });
      setShowEditModal(false);
      setSelectedUser(null);
      setError('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '更新用戶失敗');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      setPasswordError('請輸入新密碼');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('兩次輸入的密碼不一致');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('密碼至少需要 6 個字符');
      return;
    }

    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, {
        newPassword: newPassword,
      });
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      alert('密碼重置成功！');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || '重置密碼失敗');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm.user) return;
    try {
      await api.delete(`/users/${deleteConfirm.user.id}`);
      setDeleteConfirm({ show: false, user: null });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || '刪除用戶失敗');
    }
  };

  const openDeleteConfirm = (user: User) => {
    setDeleteConfirm({ show: true, user });
    setError('');
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      phone: user.phone || '',
      email: user.email || '',
      status: user.status,
      roleId: roles.find(r => r.name === user.roles[0])?.id || '',
    });
    setShowEditModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
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
      <Breadcrumb items={['系統管理', '權限管理', '用戶管理']} />

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">用戶管理</h2>
        {canCreateUser() && (
          <AppleButtonPrimary icon={Plus} onClick={() => setShowAddModal(true)}>
            新增用戶
          </AppleButtonPrimary>
        )}
      </div>

      {!canCreateUser() && (
        <div className="mb-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-xl">
          只有院長可以新增、編輯或刪除用戶
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium">用戶名稱</th>
                <th className="py-3 px-4 font-medium">員工編號</th>
                <th className="py-3 px-4 font-medium">用戶狀態</th>
                <th className="py-3 px-4 font-medium">默認角色</th>
                <th className="py-3 px-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">{user.name}</td>
                  <td className="py-4 px-4 text-gray-500 font-mono">{user.employeeId}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      user.status === '啟動' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{user.roles[0] || '-'}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex gap-3 justify-end text-blue-500 font-medium">
                      {canCreateUser() ? (
                        <>
                          <button
                            className="hover:text-blue-600 transition-colors flex items-center gap-1"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil size={14} /> 編輯
                          </button>
                          <button
                            className="hover:text-blue-600 transition-colors flex items-center gap-1"
                            onClick={() => openResetPasswordModal(user)}
                          >
                            <Key size={14} /> 重置密碼
                          </button>
                          <button
                            className="hover:text-red-600 transition-colors flex items-center gap-1"
                            onClick={() => openDeleteConfirm(user)}
                          >
                            <Trash2 size={14} /> 刪除
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">無權限</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增用戶 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">新增用戶</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  員工編號 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  placeholder="請輸入員工編號"
                  value={addFormData.employeeId}
                  onChange={(e) => setAddFormData({ ...addFormData, employeeId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用戶名稱 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  placeholder="請輸入用戶名稱"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密碼 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  type="password"
                  placeholder="請輸入密碼（至少 6 個字符）"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  確認密碼 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  type="password"
                  placeholder="請再次輸入密碼"
                  value={addFormData.confirmPassword}
                  onChange={(e) => setAddFormData({ ...addFormData, confirmPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                <AppleInput
                  placeholder="請輸入電話"
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電子郵箱</label>
                <AppleInput
                  placeholder="請輸入電子郵箱"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={addFormData.roleId}
                    onChange={(e) => setAddFormData({ ...addFormData, roleId: e.target.value })}
                  >
                    <option value="">請選擇角色</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => { setShowAddModal(false); setError(''); }}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleAddUser}>確認</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}

      {/* 編輯用戶 Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">編輯用戶</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">員工編號</label>
                <div className="p-2.5 bg-gray-100 rounded-xl text-gray-500">{selectedUser.employeeId}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用戶名稱 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  placeholder="請輸入用戶名稱"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                <AppleInput
                  placeholder="請輸入電話"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電子郵箱</label>
                <AppleInput
                  placeholder="請輸入電子郵箱"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用戶狀態</label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="啟動">啟動</option>
                    <option value="停用">停用</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  >
                    <option value="">請選擇角色</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => { setShowEditModal(false); setError(''); }}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleEditUser}>確認</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}

      {/* 重置密碼 Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[400px] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">重置密碼</h2>
              <button onClick={() => setShowResetPasswordModal(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8 space-y-4">
              <p className="text-sm text-gray-600">
                為用戶 <strong>{selectedUser.name}</strong> 設定新密碼：
              </p>
              {passwordError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{passwordError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密碼 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  type="password"
                  placeholder="請輸入新密碼（至少 6 個字符）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  確認新密碼 <span className="text-red-500">*</span>
                </label>
                <AppleInput
                  type="password"
                  placeholder="請再次輸入新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => {
                setShowResetPasswordModal(false);
                setPasswordError('');
                setNewPassword('');
                setConfirmPassword('');
              }}>
                取消
              </AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleResetPassword}>確認</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleteConfirm.show && deleteConfirm.user && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[400px] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">確認刪除</h2>
              <button onClick={() => setDeleteConfirm({ show: false, user: null })} className="text-gray-400 hover:text-gray-700 p-2 rounded-full">
                ✕
              </button>
            </div>

            <div className="p-8">
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4">{error}</div>}
              <p className="text-gray-600">
                確定要刪除用戶「<span className="font-medium text-gray-900">{deleteConfirm.user.name}</span>」嗎？
              </p>
              <p className="text-sm text-gray-500 mt-2">此操作無法撤銷。</p>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => setDeleteConfirm({ show: false, user: null })}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handleDeleteUser} className="!bg-red-500 hover:!bg-red-600">確認刪除</AppleButtonPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
