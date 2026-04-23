import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import { AppleInput, AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../api/client';

interface Service {
  id: string;
  type: string;
  name: string;
  price: number;
  stock: number | null;
  isCommon: boolean;
}

export function ServicesView() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ id: '', type: '', name: '', price: '', stock: '', isCommon: false });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const fetchServices = async () => {
    try {
      const { data } = await api.get('/services');
      setServices(data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useSocketEvent('services', useCallback(() => {
    fetchServices();
  }, []));

  const filteredServices = services.filter((s) => {
    return !searchTerm || s.id.includes(searchTerm) || s.name.includes(searchTerm) || s.type.includes(searchTerm);
  });

  const openAddModal = () => {
    setEditingService(null);
    setFormData({ id: '', type: '', name: '', price: '', stock: '', isCommon: false });
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      id: service.id,
      type: service.type,
      name: service.name,
      price: String(service.price),
      stock: service.stock !== null ? String(service.stock) : '',
      isCommon: service.isCommon
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: formData.id,
        type: formData.type,
        name: formData.name,
        price: Number(formData.price),
        stock: formData.stock ? Number(formData.stock) : null,
        isCommon: formData.isCommon
      };

      if (editingService) {
        await api.put(`/services/${editingService.id}`, payload);
      } else {
        await api.post('/services', payload);
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  const openDeleteModal = (service: Service) => {
    setDeletingService(service);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingService) return;
    try {
      await api.delete(`/services/${deletingService.id}`);
      setIsDeleteModalOpen(false);
      setDeletingService(null);
      fetchServices();
    } catch (error) {
      console.error('Failed to delete service:', error);
    }
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
      <Breadcrumb items={['養老院管理', '庫存管理', '服務管理']} />

      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <AppleButtonPrimary icon={Plus} onClick={openAddModal}>新增服務</AppleButtonPrimary>
          <div className="w-64">
            <AppleInput
              label="查詢"
              placeholder="請輸入"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium whitespace-nowrap">服務編號</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">服務類型</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">服務名稱</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">單價</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">庫存</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">常用</th>
                <th className="py-3 px-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium">{s.id}</td>
                  <td className="py-4 px-4">{s.type}</td>
                  <td className="py-4 px-4">{s.name}</td>
                  <td className="py-4 px-4">${s.price.toLocaleString()}</td>
                  <td className="py-4 px-4">{s.stock ?? '-'}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${s.isCommon ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.isCommon ? '是' : '否'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => openEditModal(s)} className="text-blue-500 hover:text-blue-600 transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => openDeleteModal(s)} className="text-red-500 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AppleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingService ? '編輯服務' : '新增服務'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AppleInput
              label="服務編號"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              required
            />
            <AppleInput
              label="服務類型"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            />
          </div>
          <AppleInput
            label="服務名稱"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <AppleInput
              label="單價"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
            <AppleInput
              label="庫存"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCommon"
              checked={formData.isCommon}
              onChange={(e) => setFormData({ ...formData, isCommon: e.target.checked })}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <label htmlFor="isCommon" className="text-sm text-gray-700">常用服務</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <AppleButtonSecondary type="button" onClick={() => setIsModalOpen(false)}>取消</AppleButtonSecondary>
            <AppleButtonPrimary type="submit">{editingService ? '儲存' : '新增'}</AppleButtonPrimary>
          </div>
        </form>
      </AppleModal>

      <AppleModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="刪除確認">
        <p className="text-gray-600 mb-6">確定要刪除服務「{deletingService?.name}」嗎？此操作無法撤銷。</p>
        <div className="flex justify-end gap-3">
          <AppleButtonSecondary onClick={() => setIsDeleteModalOpen(false)}>取消</AppleButtonSecondary>
          <AppleButtonPrimary onClick={handleDelete} className="!bg-red-500 hover:!bg-red-600">刪除</AppleButtonPrimary>
        </div>
      </AppleModal>
    </div>
  );
}