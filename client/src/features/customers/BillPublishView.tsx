import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../api/client';

interface Customer {
  id: string;
  name: string;
  basicFee: number;
}

interface BillPublish {
  id: string;
  customerId: string;
  month: string;
  totalFee: number;
  publishedAt: string;
  note?: string;
  customer?: Customer;
}

export function BillPublishView() {
  const [publishes, setPublishes] = useState<BillPublish[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceRecords, setServiceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [publishForm, setPublishForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    note: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [publishesRes, customersRes, recordsRes] = await Promise.all([
        api.get('/bill-publishes'),
        api.get('/customers'),
        api.get('/service-records')
      ]);
      setPublishes(publishesRes.data);
      setCustomers(customersRes.data);
      setServiceRecords(recordsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocketEvent('bill-publishes', useCallback(() => fetchData(), [fetchData]));
  useSocketEvent('service-records', useCallback(() => fetchData(), [fetchData]));

  const filteredPublishes = publishes.filter(p => p.month === filterMonth);

  const paginationProps = usePagination(filteredPublishes);

  const formatCurrency = (num: number) => {
    return num.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${year}年${month}月`;
  };

  const calculateBillTotal = (customerId: string, month: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 0;

    const monthRecords = serviceRecords.filter(r =>
      r.customerId === customerId && r.date.startsWith(month)
    );
    const servicesTotal = monthRecords.reduce((sum, r) => {
      const amount = typeof r.amount === 'string' ? parseFloat(r.amount.replace(/,/g, '')) : r.amount;
      return sum + (amount || 0);
    }, 0);

    return customer.basicFee + servicesTotal;
  };

  const openPublishModal = (customer?: Customer) => {
    setSelectedCustomer(customer || null);
    setPublishForm({
      month: filterMonth,
      note: ''
    });
    setIsPublishModalOpen(true);
  };

  const handlePublish = async () => {
    if (!selectedCustomer) return;
    try {
      const totalFee = calculateBillTotal(selectedCustomer.id, publishForm.month);
      await api.post('/bill-publishes', {
        customerId: selectedCustomer.id,
        month: publishForm.month,
        totalFee,
        note: publishForm.note
      });
      setIsPublishModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to publish bill:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此發佈記錄嗎？')) return;
    try {
      await api.delete(`/bill-publishes/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete publish:', error);
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
      <Breadcrumb items={['養老院管理', '收費管理', '賬單發佈']} />

      <div className="mb-4 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <AppleButtonPrimary icon={Plus} onClick={() => openPublishModal()}>發佈賬單</AppleButtonPrimary>

          <div className="flex items-center border border-gray-200 bg-gray-50/50 rounded-xl overflow-hidden text-sm">
            <span className="text-gray-500 bg-gray-100/50 px-3 py-1.5 border-r border-gray-200/50 whitespace-nowrap">賬單月份</span>
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="p-1.5 outline-none w-36 bg-transparent text-gray-800 px-3"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">每頁顯示</span>
          <select
            value={paginationProps.pageSize}
            onChange={e => paginationProps.setPageSize(Number(e.target.value))}
            className="border border-gray-200 bg-gray-50/50 rounded-lg px-2 py-1 text-sm outline-none"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-gray-500">筆</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium">客戶姓名</th>
                <th className="py-3 px-4 font-medium">賬單月份</th>
                <th className="py-3 px-4 font-medium">費用合計 (MOP)</th>
                <th className="py-3 px-4 font-medium">發佈時間</th>
                <th className="py-3 px-4 font-medium">備註</th>
                <th className="py-3 px-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {paginationProps.currentData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">暫無發佈記錄</td>
                </tr>
              ) : (
                paginationProps.currentData.map((publish) => (
                  <tr key={publish.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium">{publish.customer?.name || publish.customerId}</td>
                    <td className="py-4 px-4">{formatMonth(publish.month)}</td>
                    <td className="py-4 px-4 font-medium">{formatCurrency(publish.totalFee)}</td>
                    <td className="py-4 px-4">{new Date(publish.publishedAt).toLocaleString('zh-TW')}</td>
                    <td className="py-4 px-4 text-gray-500">{publish.note || '-'}</td>
                    <td className="py-4 px-4 text-center">
                      <button
                        className="text-red-500 hover:text-red-600 transition-colors"
                        onClick={() => handleDelete(publish.id)}
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>顯示 {paginationProps.currentData.length} 筆</span>
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

      {/* Publish Modal */}
      <AppleModal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} title="發佈賬單">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客戶</label>
              <select
                value={selectedCustomer?.id || ''}
                onChange={e => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇客戶</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">賬單月份</label>
              <input
                type="month"
                value={publishForm.month}
                onChange={e => setPublishForm({ ...publishForm, month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {selectedCustomer && (
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 text-sm">
                <div className="flex items-center mb-2">
                  <span className="w-24 text-gray-500">客戶姓名：</span>
                  <span className="font-medium text-gray-900">{selectedCustomer.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-gray-500">費用合計：</span>
                  <span className="font-medium text-blue-600">{formatCurrency(calculateBillTotal(selectedCustomer.id, publishForm.month))} MOP</span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
              <textarea
                value={publishForm.note}
                onChange={e => setPublishForm({ ...publishForm, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="選填"
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
          <AppleButtonSecondary onClick={() => setIsPublishModalOpen(false)}>取消</AppleButtonSecondary>
          <AppleButtonPrimary onClick={handlePublish}>確認發佈</AppleButtonPrimary>
        </div>
      </AppleModal>
    </div>
  );
}
