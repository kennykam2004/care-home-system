import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function TopBar() {
  const { user, logout } = useAuth();

  const getDefaultRole = () => {
    if (!user?.roles) return '';
    const defaultRole = user.roles.find((r) => r.isDefault);
    return defaultRole?.name || user.roles[0]?.name || '';
  };

  return (
    <div className="bg-white/70 backdrop-blur-md text-gray-800 h-14 flex items-center justify-between px-6 border-b border-gray-200/50 w-full shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <img
          src="https://upload.wikimedia.org/wikipedia/zh/d/d9/Caritas_Macau_logo.svg"
          alt="明愛"
          className="h-9 object-contain drop-shadow-sm"
        />
        <div className="text-base font-bold text-gray-800 tracking-tight">頤安三院倉存管理系統</div>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="text-gray-600">
          👤 頤安(逸麗)護老院, {user?.name || '用戶'} {getDefaultRole()}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <LogOut size={16} />
          <span>登出</span>
        </button>
        <span className="text-gray-500 bg-gray-100/50 px-2 py-1 rounded-md">繁體中文</span>
      </div>
    </div>
  );
}
