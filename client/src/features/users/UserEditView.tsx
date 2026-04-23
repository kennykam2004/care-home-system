import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary } from '../../components/ui';

export function UserEditView() {
  const navigate = useNavigate();

  return (
    <div className="p-8 flex-1 overflow-auto bg-[#F5F5F7]">
      <Breadcrumb items={['系統管理', '權限管理', '用戶管理']} />
      <div className="bg-white p-10 rounded-2xl shadow-[0_2px-10px_rgba(0,0,0,0.02)] border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">新增用戶</h2>
        <p className="text-gray-500">新增用戶功能開發中...</p>
        <div className="flex gap-3 mt-8">
          <AppleButtonPrimary>提交</AppleButtonPrimary>
          <AppleButtonSecondary onClick={() => navigate('/users')}>取消</AppleButtonSecondary>
        </div>
      </div>
    </div>
  );
}
