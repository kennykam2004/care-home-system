import { useState, useEffect, useCallback } from 'react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../api/client';

interface Customer {
  id: string;
  name: string;
}

interface PrepaidRecord {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  note?: string;
  customer?: Customer;
}

interface CustomerBalance {
  id: string;
  name: string;
  balance: number;
}

export function PrepaidRecordsView() {
  const [records, setRecords] = useState<PrepaidRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  const [addForm, setAddForm] = useState({
    customerId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const fetchData = async () => {
    try {
      const [recordsRes, customersRes] = await Promise.all([
        api.get('/prepaid-records'),
        api.get('/customers')
      ]);
      setRecords(recordsRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useSocketEvent('prepaid-records', useCallback(() => fetchData(), []));
  useSocketEvent('customers', useCallback(() => fetchData(), []));

  const filteredRecords = records.filter(r => {
    if (filterCustomerId && r.customerId !== filterCustomerId) return false;
    if (dateFilter.startDate && r.date < dateFilter.startDate) return false;
    if (dateFilter.endDate && r.date > dateFilter.endDate) return false;
    return true;
  });

  const paginationProps = usePagination(filteredRecords);

  const formatCurrency = (num: number) => {
    return num.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW');
  };

  const handleAdd = async () => {
    if (!addForm.customerId || !addForm.amount || !addForm.date) return;
    try {
      await api.post('/prepaid-records', {
        customerId: addForm.customerId,
        amount: parseFloat(addForm.amount),
        date: addForm.date,
        note: addForm.note
      });
      setIsAddModalOpen(false);
      setAddForm({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to add prepaid record:', error);
    }
  };

  const openAddModal = () => {
    setAddForm({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
    setIsAddModalOpen(true);
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
      <Breadcrumb items={['養老院管理', '收費管理', '預繳費記錄']} />

      <div className="mb-4 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <AppleButtonPrimary onClick={openAddModal}>新增預繳費</AppleButtonPrimary>

          <select
            value={filterCustomerId}
            onChange={e => setFilterCustomerId(e.target.value)}
            className="border border-gray-200 bg-gray-50/50 rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="">全部客戶</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="flex items-center border border-gray-200 bg-gray-50/50 rounded-xl overflow-hidden text-sm">
            <span className="text-gray-500 bg-gray-100/50 px-3 py-1.5 border-r border-gray-200/50">日期篩選</span>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={e => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              className="p-1.5 outline-none w-36 bg-transparent text-gray-800"
            />
            <span className="px-2 text-gray-400">-</span>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={e => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              className="p-1.5 outline-none w-36 bg-transparent text-gray-800"
            />
          </div>

          {(filterCustomerId || dateFilter.startDate || dateFilter.endDate) && (
            <AppleButtonSecondary onClick={() => { setFilterCustomerId(''); setDateFilter({ startDate: '', endDate: '' }); }}>
              重置
            </AppleButtonSecondary>
          )}
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
                <th className="py-3 px-4 font-medium">預繳金額 (MOP)</th>
                <th className="py-3 px-4 font-medium">日期</th>
                <th className="py-3 px-4 font-medium">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {paginationProps.currentData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">暫無預繳費記錄</td>
                </tr>
              ) : (
                paginationProps.currentData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium">{record.customer?.name || record.customerId}</td>
                    <td className="py-4 px-4 font-medium text-blue-600">+{formatCurrency(record.amount)}</td>
                    <td className="py-4 px-4">{formatDate(record.date)}</td>
                    <td className="py-4 px-4 text-gray-500">{record.note || '-'}</td>
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

      {/* Add Modal */}
      <AppleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="新增預繳費">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客戶</label>
              <select
                value={addForm.customerId}
                onChange={e => setAddForm({ ...addForm, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇客戶</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (餘額: {formatCurrency(c.balance)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預繳金額 (MOP)</label>
              <input
                type="number"
                value={addForm.amount}
                onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                type="date"
                value={addForm.date}
                onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
              <textarea
                value={addForm.note}
                onChange={e => setAddForm({ ...addForm, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="選填"
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
          <AppleButtonSecondary onClick={() => setIsAddModalOpen(false)}>取消</AppleButtonSecondary>
          <AppleButtonPrimary onClick={handleAdd}>確認新增</AppleButtonPrimary>
        </div>
      </AppleModal>
    </div>
  );
}
