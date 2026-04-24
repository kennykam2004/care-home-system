import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';

interface SidebarProps {}

export function Sidebar({}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { canViewModule } = usePermission();

  type MenuKey = '系統管理' | '養老院管理' | '庫存管理' | '收費管理';

  const [expandedMenus, setExpandedMenus] = useState<Record<MenuKey, boolean>>({
    '系統管理': true,
    '養老院管理': true,
    '庫存管理': false,
    '收費管理': false,
  });

  const toggleMenu = (menu: MenuKey) => {
    setExpandedMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItemClass = (path: string) =>
    `pl-9 pr-3 py-2 rounded-xl cursor-pointer transition-colors ${
      isActive(path)
        ? 'bg-blue-500 text-white shadow-sm font-medium'
        : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-800'
    }`;

  const subMenuItemClass = (path: string) =>
    `pl-4 pr-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
      isActive(path)
        ? 'bg-blue-50 text-blue-600 font-medium'
        : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-800'
    }`;

  return (
    <div className="w-64 bg-white/50 backdrop-blur-xl h-full flex flex-col text-base border-r border-gray-200/50 overflow-y-auto shrink-0 transition-all">
      <div className="flex-1 px-3 pt-4 pb-4 space-y-1">
        {/* 系統管理 */}
        <div>
          <button
            onClick={() => toggleMenu('系統管理')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100/50 text-gray-700 font-medium transition-colors"
          >
            <span>系統管理</span>
            {expandedMenus['系統管理'] ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>
          {expandedMenus['系統管理'] && (
            <div className="mt-1 mb-2 space-y-0.5">
              {(canViewModule('roles') || canViewModule('users')) && (
                <>
                  {canViewModule('roles') && (
                    <div className={menuItemClass('/roles')} onClick={() => navigate('/roles')}>
                      角色管理
                    </div>
                  )}
                  {canViewModule('users') && (
                    <div className={menuItemClass('/users')} onClick={() => navigate('/users')}>
                      用戶管理
                    </div>
                  )}
                  {canViewModule('users') && (
                    <div className={menuItemClass('/audit-logs')} onClick={() => navigate('/audit-logs')}>
                      審計日誌
                    </div>
                  )}
                </>
              )}
              {(!canViewModule('roles') && !canViewModule('users')) && (
                <div className="pl-9 pr-3 py-2 text-xs text-gray-400">
                  無權限訪問系統管理
                </div>
              )}
            </div>
          )}
        </div>

        {/* 養老院管理 */}
        <div>
          <button
            onClick={() => toggleMenu('養老院管理')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100/50 text-gray-700 font-medium transition-colors"
          >
            <span>養老院管理</span>
            {expandedMenus['養老院管理'] ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>
          {expandedMenus['養老院管理'] && (
            <div className="mt-1 mb-2 space-y-0.5">
              {canViewModule('customers') && (
                <div className={menuItemClass('/customers')} onClick={() => navigate('/customers')}>
                  客戶信息管理
                </div>
              )}
              {!canViewModule('customers') && (
                <div className="pl-9 pr-3 py-2 text-xs text-gray-400">
                  無權限訪問
                </div>
              )}

              {/* 庫存管理子選單 */}
              {canViewModule('inventory') && (
                <div>
                  <button
                    onClick={() => toggleMenu('庫存管理')}
                    className="w-full flex items-center justify-between pl-9 pr-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100/50 hover:text-gray-800 cursor-pointer transition-colors"
                  >
                    <span>庫存管理</span>
                    {expandedMenus['庫存管理'] ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                  </button>
                  {expandedMenus['庫存管理'] && (
                    <div className="mt-1 mb-1 space-y-0.5 border-l-2 border-gray-100 ml-10 pl-2">
                      {canViewModule('inventory') && (
                        <div className={subMenuItemClass('/inventory')} onClick={() => navigate('/inventory')}>
                          庫存概覽
                        </div>
                      )}
                      {canViewModule('services') && (
                        <div className={subMenuItemClass('/services')} onClick={() => navigate('/services')}>
                          服務管理
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 收費管理子選單 */}
              {canViewModule('bills') && (
                <div>
                  <button
                    onClick={() => toggleMenu('收費管理')}
                    className="w-full flex items-center justify-between pl-9 pr-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100/50 hover:text-gray-800 cursor-pointer transition-colors"
                  >
                    <span>收費管理</span>
                    {expandedMenus['收費管理'] ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                  </button>
                  {expandedMenus['收費管理'] && (
                    <div className="mt-1 mb-1 space-y-0.5 border-l-2 border-gray-100 ml-10 pl-2">
                      {canViewModule('bills') && (
                        <div className={subMenuItemClass('/bills')} onClick={() => navigate('/bills')}>
                          賬單管理
                        </div>
                      )}
                      {canViewModule('bills') && (
                        <div className={subMenuItemClass('/prepaid-records')} onClick={() => navigate('/prepaid-records')}>
                          預繳費記錄
                        </div>
                      )}
                      {canViewModule('bills') && (
                        <div className={subMenuItemClass('/bill-publishes')} onClick={() => navigate('/bill-publishes')}>
                          賬單發佈
                        </div>
                      )}
                      {canViewModule('bills') && (
                        <div className={subMenuItemClass('/cash-records')} onClick={() => navigate('/cash-records')}>
                          現金進賬
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
