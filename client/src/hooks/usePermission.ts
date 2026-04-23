import { useAuthStore } from '../stores/authStore';

export const MODULES = [
  { key: 'customers', name: '客戶信息管理' },
  { key: 'inventory', name: '庫存概覽' },
  { key: 'services', name: '服務管理' },
  { key: 'bills', name: '賬單管理' },
  { key: 'users', name: '用戶管理' },
  { key: 'roles', name: '角色管理' },
];

export function usePermission() {
  const user = useAuthStore((state) => state.user);

  const hasRole = (roles: string[]) => {
    if (!user?.roles) return false;
    return user.roles.some((r) => roles.includes(r.name));
  };

  const isDirector = () => hasRole(['院長']);

  const canCreateUser = () => isDirector();
  const canEditUser = () => isDirector();
  const canDeleteUser = () => isDirector();
  const canResetPassword = () => isDirector();

  const canViewModule = (module: string) => {
    if (!user?.permissions || user.permissions.length === 0) {
      return isDirector();
    }
    return user.permissions.some((p: { module: string; canView: boolean }) => p.module === module && p.canView);
  };

  const canEditModule = (module: string) => {
    if (!user?.permissions || user.permissions.length === 0) {
      return isDirector();
    }
    return user.permissions.some((p: { module: string; canEdit: boolean }) => p.module === module && p.canEdit);
  };

  return {
    hasRole,
    isDirector,
    canCreateUser,
    canEditUser,
    canDeleteUser,
    canResetPassword,
    canViewModule,
    canEditModule,
  };
}
