import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, ChevronDown } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../api/client';

interface ServiceRecord {
  recordId: string;
  customerId: string;
  date: string;
  type: string;
  serviceId: string;
  name: string;
  qty: number;
  amount: number | string;
  note?: string;
}

interface Service {
  id: string;
  type: string;
  name: string;
  price: number | string;
  stock: number | null;
}

interface Customer {
  id: string;
  name: string;
  gender: string;
  idCard: string;
  bed: string;
  balance: number;
  basicFee: number;
}

const formatCurrency = (num: number | string) => {
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  return n.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function ServiceRecordView() {
  const { customerId } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ServiceRecord | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    serviceId: '',
    qty: 1,
    note: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [customersRes, recordsRes, servicesRes] = await Promise.all([
        api.get('/customers'),
        api.get('/service-records', { params: { customerId } }),
        api.get('/services')
      ]);

      const c = customersRes.data.find((cust: Customer) => cust.id === customerId);
      setCustomer(c || null);
      setRecords(recordsRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocketEvent('service-records', useCallback(() => {
    fetchData();
  }, [fetchData]));

  useSocketEvent('customers', useCallback(() => {
    fetchData();
  }, [fetchData]));

  const filteredRecords = records.filter((r) => {
    if (appliedStartDate && r.date < appliedStartDate) return false;
    if (appliedEndDate && r.date > appliedEndDate) return false;
    return true;
  });

  const paginationProps = usePagination(filteredRecords);

  const totalAmount = filteredRecords.reduce((sum: number, r) => {
    const amount = typeof r.amount === 'string' ? parseFloat(r.amount.replace(/,/g, '')) : r.amount;
    return sum + (amount || 0);
  }, 0);

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
  };

  const handleSearch = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const openAddModal = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      serviceId: '',
      qty: 1,
      note: ''
    });
    setIsModalOpen(true);
  };

  const handleServiceChange = (serviceId: string) => {
    setFormData((prev) => ({ ...prev, serviceId }));
  };

  const handleQtyChange = (delta: number) => {
    setFormData((prev) => ({ ...prev, qty: Math.max(1, prev.qty + delta) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedService = services.find((s) => s.id === formData.serviceId);
      if (!selectedService) return;

      const priceNum = typeof selectedService.price === 'string'
        ? parseFloat(selectedService.price.replace(/,/g, ''))
        : selectedService.price;

      const payload = {
        customerId,
        date: formData.date,
        type: selectedService.type,
        serviceId: formData.serviceId,
        name: selectedService.name,
        qty: formData.qty,
        amount: priceNum * formData.qty,
        note: formData.note
      };

      await api.post('/service-records', payload);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create service record:', error);
    }
  };

  const openDeleteModal = (record: ServiceRecord) => {
    setDeletingRecord(record);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      await api.delete(`/service-records/${deletingRecord.recordId}`);
      setIsDeleteModalOpen(false);
      setDeletingRecord(null);
      fetchData();
    } catch (error) {
      console.error('Failed to delete service record:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW');
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
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb items={['養老院管理', '客戶信息管理']} />
        <AppleButtonSecondary onClick={() => window.history.back()}>返回</AppleButtonSecondary>
      </div>

      {customer && (
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">基本資料</h3>
          <div className="grid grid-cols-3 gap-y-4 gap-x-8 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">住院號</span> <span className="font-medium text-gray-900">{customer.id}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">客戶姓名</span> <span className="font-medium text-gray-900">{customer.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">性別</span> <span className="font-medium text-gray-900">{customer.gender}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">身份證號</span> <span className="font-medium text-gray-900">{customer.idCard}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">地址</span> <span className="font-medium text-gray-900 text-right">頤安(逸麗)護老院</span></div>
            <div className="flex justify-between"><span className="text-gray-500">基本院費</span> <span className="font-medium text-gray-900">{formatCurrency(customer.basicFee)} MOP</span></div>
            <div className="flex justify-between"><span className="text-gray-500">預繳費餘額</span> <span className="font-medium text-blue-600">{formatCurrency(customer.balance)} MOP</span></div>
            <div className="flex justify-between"><span className="text-gray-500">床位號</span> <span className="font-medium text-gray-900">{customer.bed || '-'}</span></div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center border border-gray-200 bg-gray-50/50 rounded-xl overflow-hidden shadow-sm text-sm">
            <span className="text-gray-500 bg-gray-100/50 px-3 py-1.5 border-r border-gray-200/50">日期篩選</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 outline-none w-36 bg-transparent text-gray-700"
            />
            <span className="px-2 text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 outline-none w-36 bg-transparent text-gray-700"
            />
          </div>
          <AppleButtonSecondary onClick={handleReset}>重置</AppleButtonSecondary>
          <AppleButtonPrimary onClick={handleSearch}>查詢</AppleButtonPrimary>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div>
            <AppleButtonPrimary icon={Plus} onClick={openAddModal}>新增服務費用</AppleButtonPrimary>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">每頁顯示</span>
            <select
              value={paginationProps.pageSize}
              onChange={(e) => paginationProps.setPageSize(Number(e.target.value))}
              className="border border-gray-200 bg-gray-50/50 rounded-lg px-2 py-1 text-sm outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-gray-500">筆</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[900px]">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">日期</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">服務類別</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">服務編號</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">名稱</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">數量</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">金額(MOP)</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">備註</th>
                  <th className="py-3 px-4 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {paginationProps.currentData.map((r) => (
                  <tr key={r.recordId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">{formatDate(r.date)}</td>
                    <td className="py-4 px-4">{r.type}</td>
                    <td className="py-4 px-4 text-xs text-gray-400 font-mono">{r.serviceId}</td>
                    <td className="py-4 px-4 font-medium">{r.name}</td>
                    <td className="py-4 px-4">{r.qty}</td>
                    <td className="py-4 px-4 font-medium">{typeof r.amount === 'number' ? formatCurrency(r.amount) : r.amount}</td>
                    <td className="py-4 px-4 text-gray-500 text-xs">{r.note || ''}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center gap-3 font-medium">
                        <button className="text-red-500 hover:text-red-600 transition-colors" onClick={() => openDeleteModal(r)}>刪除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50/80 font-bold text-gray-900 border-t border-gray-200">
                <tr>
                  <td colSpan={5} className="py-4 px-4 text-right text-gray-600">總金額 (MOP)：</td>
                  <td colSpan={3} className="py-4 px-4 text-blue-600 text-base">{formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
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
              <span className="px-3 py-1">第 {paginationProps.currentPage} / {paginationProps.totalPages} 頁</span>
              <button
                onClick={() => paginationProps.setCurrentPage(paginationProps.currentPage + 1)}
                disabled={paginationProps.currentPage >= paginationProps.totalPages}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                下一頁
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="客戶服務新增">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-[100px_1fr] gap-y-4 text-sm items-center">
              <span className="text-gray-500 text-right pr-6 font-medium"><span className="text-red-500">* </span>日期</span>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="border border-gray-200 bg-gray-50/50 rounded-xl px-4 py-2.5 outline-none w-[200px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-800"
                required
              />

              <span className="text-gray-500 text-right pr-6 font-medium"><span className="text-red-500">* </span>服務名稱</span>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <select
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="border border-gray-200 bg-gray-50/50 rounded-xl px-4 py-2.5 outline-none w-full appearance-none text-gray-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                    required
                  >
                    <option value="">請選擇</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({formatCurrency(typeof s.price === 'string' ? parseFloat(s.price) : s.price)} MOP)</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-medium">數量</span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/50 overflow-hidden">
                    <button type="button" onClick={() => handleQtyChange(-1)} className="px-3 py-2.5 text-gray-500 hover:bg-gray-200/50 transition-colors font-bold">-</button>
                    <input type="text" readOnly value={formData.qty} className="w-12 text-center bg-transparent text-gray-800 font-medium outline-none" />
                    <button type="button" onClick={() => handleQtyChange(1)} className="px-3 py-2.5 text-gray-500 hover:bg-gray-200/50 transition-colors font-bold">+</button>
                  </div>
                </div>
              </div>

              <span className="text-gray-500 text-right pr-6 self-start mt-3 font-medium">備註</span>
              <textarea
                name="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="請輸入備註"
                className="border border-gray-200 bg-gray-50/50 rounded-xl px-4 py-3 outline-none w-full h-32 resize-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
            <AppleButtonSecondary type="button" onClick={() => setIsModalOpen(false)}>取消</AppleButtonSecondary>
            <AppleButtonPrimary type="submit">確定</AppleButtonPrimary>
          </div>
        </form>
      </AppleModal>

      <AppleModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="刪除確認">
        <p className="text-gray-600 mb-6">確定要刪除此服務記錄嗎？此操作無法撤銷。</p>
        <div className="flex justify-end gap-3">
          <AppleButtonSecondary onClick={() => setIsDeleteModalOpen(false)}>取消</AppleButtonSecondary>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition-all shadow-sm"
          >
            刪除
          </button>
        </div>
      </AppleModal>
    </div>
  );
}