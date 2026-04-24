import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import { AppleInput, AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../api/client';

interface Customer {
  id: string;
  careId: string;
  name: string;
  bed?: string;
  gender: string;
  idCard: string;
  birth: string;
  phone?: string;
  status: string;
  basicFee: number;
  subsidy: number;
  deposit: number;
  balance: number;
  admissionDate?: string;
  note?: string;
  family?: FamilyMember[];
}

interface FamilyMember {
  id?: string;
  name: string;
  phone: string;
  isMain: boolean;
}

const formatCurrency = (num: number) => {
  return num.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function CustomerView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState('在院');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await api.get('/customers');
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useSocketEvent('customers', useCallback(() => {
    fetchCustomers();
  }, [fetchCustomers]));

  const filteredCustomers = customers.filter((c) => {
    const matchStatus = statusFilter === '全部' || c.status === statusFilter;
    const matchKeyword =
      !searchTerm ||
      c.id?.includes(searchTerm) ||
      c.name?.includes(searchTerm) ||
      c.bed?.includes(searchTerm);
    return matchStatus && matchKeyword;
  });

  const paginationProps = usePagination(filteredCustomers);

  const openDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const openAdd = () => {
    setSelectedCustomer(null);
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = customer.status === '在院' ? '離院' : '在院';
    try {
      await api.put(`/customers/${customer.id}`, { ...customer, status: newStatus });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to update status:', error);
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
      <Breadcrumb items={['養老院管理', '客戶信息管理']} />

      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <AppleButtonPrimary icon={Plus} onClick={openAdd}>入院新增</AppleButtonPrimary>
          <div className="w-64">
            <AppleInput
              label="查詢"
              placeholder="請輸入"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm border border-gray-200 bg-white rounded-xl px-3 py-[7px] shadow-sm">
            <span className="text-gray-500 font-medium whitespace-nowrap">狀態</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent outline-none appearance-none text-center pr-5 text-gray-800 font-medium cursor-pointer"
            >
              <option value="全部">全部</option>
              <option value="在院">在院</option>
              <option value="離院">離院</option>
            </select>
          </div>
          <AppleButtonSecondary onClick={() => setSearchTerm('')}>重置</AppleButtonSecondary>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">每頁顯示</span>
          <select
            value={paginationProps.pageSize}
            onChange={(e) => paginationProps.setPageSize(Number(e.target.value))}
            className="border border-gray-200 bg-gray-50/50 rounded-lg px-2 py-1 text-sm outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1200px]">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium whitespace-nowrap">住院號</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">養老院編號</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">客戶姓名</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">床位號</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">性別</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">身份證號</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">出生日期</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">狀態</th>
                <th className="py-3 px-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {paginationProps.currentData.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-medium">{c.id}</td>
                  <td className="py-4 px-4 text-gray-500">{c.careId}</td>
                  <td className="py-4 px-4">{c.name}</td>
                  <td className="py-4 px-4">{c.bed || '-'}</td>
                  <td className="py-4 px-4">{c.gender}</td>
                  <td className="py-4 px-4">{c.idCard}</td>
                  <td className="py-4 px-4">{c.birth ? new Date(c.birth).toLocaleDateString('zh-TW') : '-'}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        c.status === '在院' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-3 justify-center text-blue-500 font-medium">
                      <button className="hover:text-blue-600 transition-colors" onClick={() => openDetails(c)}>詳情</button>
                      <button className="hover:text-blue-600 transition-colors" onClick={() => openEdit(c)}>修改</button>
                      <button
                        className="hover:text-blue-600 transition-colors"
                        onClick={() => navigate(`/customers/${c.id}/services`)}
                      >
                        服務
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>顯示 {paginationProps.currentData.length} 筆中的 {(paginationProps.currentPage - 1) * paginationProps.pageSize + 1}-{(paginationProps.currentPage * paginationProps.pageSize)} 筆</span>
          <div className="flex gap-2">
            <button
              onClick={() => paginationProps.setCurrentPage(paginationProps.currentPage - 1)}
              disabled={paginationProps.currentPage === 1}
              className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              上一頁
            </button>
            <button
              onClick={() => paginationProps.setCurrentPage(paginationProps.currentPage + 1)}
              disabled={paginationProps.currentPage === paginationProps.totalPages}
              className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <AppleModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="入院詳情">
        {selectedCustomer && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-y-4 text-sm bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">住院號</span><span className="font-medium text-gray-900">{selectedCustomer.id}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">客戶姓名</span><span className="font-medium text-gray-900">{selectedCustomer.name}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">性別</span><span className="font-medium text-gray-900">{selectedCustomer.gender}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">身份證號</span><span className="font-mono text-gray-900">{selectedCustomer.idCard}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">床位號</span><span className="font-medium text-gray-900">{selectedCustomer.bed || '-'}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">電話</span><span className="font-mono text-gray-900">{selectedCustomer.phone || '-'}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">出生日期</span><span className="font-medium text-gray-900">{selectedCustomer.birth ? new Date(selectedCustomer.birth).toLocaleDateString('zh-TW') : '-'}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">基本院費</span><span className="font-medium text-gray-900">{formatCurrency(selectedCustomer.basicFee)} MOP</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">社工局津助</span><span className="font-medium text-gray-900">{formatCurrency(selectedCustomer.subsidy)} MOP</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">按金金額</span><span className="font-medium text-gray-900">{formatCurrency(selectedCustomer.deposit)} MOP</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">入院日期</span><span className="font-medium text-gray-900">{selectedCustomer.admissionDate ? new Date(selectedCustomer.admissionDate).toLocaleDateString('zh-TW') : '-'}</span></div>
              <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">預繳費餘額</span><span className="font-medium text-blue-600">{formatCurrency(selectedCustomer.balance)} MOP</span></div>
            </div>

            <h3 className="text-base font-bold text-gray-900 mt-6 mb-3">家屬聯絡資訊</h3>
            {selectedCustomer.family && selectedCustomer.family.length > 0 ? (
              selectedCustomer.family.map((member, index) => (
                <div key={index} className="mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">家屬{index + 1}姓名</span><span className="font-medium text-gray-900">{member.name}</span></div>
                    <div className="flex items-center"><span className="w-24 text-right pr-4 text-gray-500">家屬{index + 1}手機</span><span className="font-mono font-medium text-gray-900">{member.phone}</span></div>
                  </div>
                  <div className="mt-2 ml-24 text-xs text-gray-500 flex items-center gap-2">
                    {member.isMain && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">主聯繫人</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">暫無家屬聯絡資訊</div>
            )}

            <div className="mt-4">
              <span className="w-24 text-right pr-4 text-gray-500 text-sm">備註</span>
              <div className="bg-gray-50 mt-2 h-20 rounded-xl border border-gray-200/60 p-3 text-gray-500 text-sm">{selectedCustomer.note || '無特別備註'}</div>
            </div>
          </div>
        )}
      </AppleModal>

      {/* Edit Modal */}
      <AppleModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="客戶資料修改">
        {selectedCustomer && (
          <CustomerForm customer={selectedCustomer} onClose={() => setIsEditModalOpen(false)} onSave={fetchCustomers} isEdit />
        )}
      </AppleModal>

      {/* Add Modal */}
      <AppleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="入院新增">
        <CustomerForm onClose={() => setIsAddModalOpen(false)} onSave={fetchCustomers} isEdit={false} />
      </AppleModal>
    </div>
  );
}

interface CustomerFormProps {
  customer?: Customer | null;
  onClose: () => void;
  onSave: () => void;
  isEdit: boolean;
}

function CustomerForm({ customer, onClose, onSave, isEdit }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    careId: customer?.careId || '',
    name: customer?.name || '',
    bed: customer?.bed || '',
    gender: customer?.gender || '男',
    idCard: customer?.idCard || '',
    birth: customer?.birth ? new Date(customer.birth).toISOString().split('T')[0] : '',
    phone: customer?.phone || '',
    basicFee: customer?.basicFee?.toString() || '9900.00',
    subsidy: customer?.subsidy?.toString() || '0.00',
    deposit: customer?.deposit?.toString() || '0.00',
    admissionDate: customer?.admissionDate ? new Date(customer.admissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    note: customer?.note || '',
    status: customer?.status || '在院',
    familyName: customer?.family?.[0]?.name || '',
    familyPhone: customer?.family?.[0]?.phone || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        careId: formData.careId || formData.name.substring(0, 4) + Math.floor(Math.random() * 1000),
        name: formData.name,
        bed: formData.bed,
        gender: formData.gender,
        idCard: formData.idCard,
        birth: formData.birth,
        phone: formData.phone,
        basicFee: parseFloat(formData.basicFee) || 0,
        subsidy: parseFloat(formData.subsidy) || 0,
        deposit: parseFloat(formData.deposit) || 0,
        admissionDate: formData.admissionDate,
        note: formData.note,
        status: formData.status,
      };

      if (isEdit && customer) {
        await api.put(`/customers/${customer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客戶姓名</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">身份證號</label>
            <input
              type="text"
              name="idCard"
              value={formData.idCard}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">床位號</label>
            <input
              type="text"
              name="bed"
              value={formData.bed}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
            <input
              type="date"
              name="birth"
              value={formData.birth}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">基本院費 (MOP)</label>
            <input
              type="number"
              name="basicFee"
              value={formData.basicFee}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社工局津助</label>
            <input
              type="number"
              name="subsidy"
              value={formData.subsidy}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">按金</label>
            <input
              type="number"
              name="deposit"
              value={formData.deposit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">入院日期</label>
            <input
              type="date"
              name="admissionDate"
              value={formData.admissionDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="在院">在院</option>
                <option value="離院">離院</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">家屬姓名</label>
          <input
            type="text"
            name="familyName"
            value={formData.familyName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">家屬電話</label>
          <input
            type="text"
            name="familyPhone"
            value={formData.familyPhone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
        {isEdit && customer && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`確定要刪除客戶「${customer.name}」嗎？此操作無法撤銷。`)) {
                api.delete(`/customers/${customer.id}`).then(() => {
                  onSave();
                  onClose();
                });
              }
            }}
            className="mr-auto px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            刪除客戶
          </button>
        )}
        <AppleButtonSecondary type="button" onClick={onClose}>取消</AppleButtonSecondary>
        <AppleButtonPrimary type="submit">儲存</AppleButtonPrimary>
      </div>
    </form>
  );
}