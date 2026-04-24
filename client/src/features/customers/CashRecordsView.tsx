import { useState, useEffect, useCallback } from 'react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../api/client';

interface Customer {
  id: string;
  name: string;
  balance: number;
}

interface CashRecord {
  id: string;
  customerId: string;
  type: string;
  amount: number;
  date: string;
  reason: string;
  note?: string;
  customer?: Customer;
}

export function CashRecordsView() {
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  const [addForm, setAddForm] = useState({
    customerId: '',
    type: '收入',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    note: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [recordsRes, customersRes] = await Promise.all([
        api.get('/cash-records'),
        api.get('/customers')
      ]);
      setRecords(recordsRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocketEvent('cash-records', useCallback(() => fetchData(), [fetchData]));
  useSocketEvent('customers', useCallback(() => fetchData(), [fetchData]));

  const filteredRecords = records.filter(r => {
    if (filterCustomerId && r.customerId !== filterCustomerId) return false;
    if (filterType && r.type !== filterType) return false;
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

  const getTotalByType = (type: string) => {
    return filteredRecords
      .filter(r => r.type === type)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const handleAdd = async () => {
    if (!addForm.customerId || !addForm.type || !addForm.amount || !addForm.date || !addForm.reason) return;
    try {
      await api.post('/cash-records', {
        customerId: addForm.customerId,
        type: addForm.type,
        amount: parseFloat(addForm.amount),
        date: addForm.date,
        reason: addForm.reason,
        note: addForm.note
      });
      setIsAddModalOpen(false);
      setAddForm({ customerId: '', type: '收入', amount: '', date: new Date().toISOString().split('T')[0], reason: '', note: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to add cash record:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此記錄嗎？')) return;
    try {
      await api.delete(`/cash-records/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete cash record:', error);
    }
  };

  const openAddModal = () => {
    setAddForm({ customerId: '', type: '收入', amount: '', date: new Date().toISOString().split('T')[0], reason: '', note: '' });
    setIsAddModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex-1 overflow-auto bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  const totalIncome = getTotalByType('收入');
  const totalExpense = getTotalByType('支出');

  return (
    <div className="p-8 flex-1 overflow-auto bg-[#F5F5F7]">
      <Breadcrumb items={['養老院管理', '收費管理', '現金進賬']} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">收入合計</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">支出合計</div>
          <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">結餘</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalIncome - totalExpense)}</div>
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <AppleButtonPrimary onClick={openAddModal}>新增記錄</AppleButtonPrimary>

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

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 bg-gray-50/50 rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="">全部類型</option>
            <option value="收入">收入</option>
            <option value="支出">支出</option>
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

          {(filterCustomerId || filterType || dateFilter.startDate || dateFilter.endDate) && (
            <AppleButtonSecondary onClick={() => { setFilterCustomerId(''); setFilterType(''); setDateFilter({ startDate: '', endDate: '' }); }}>
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
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium">客戶姓名</th>
                <th className="py-3 px-4 font-medium">類型</th>
                <th className="py-3 px-4 font-medium">金額 (MOP)</th>
                <th className="py-3 px-4 font-medium">日期</th>
                <th className="py-3 px-4 font-medium">事由</th>
                <th className="py-3 px-4 font-medium">備註</th>
                <th className="py-3 px-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {paginationProps.currentData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">暫無現金進賬記錄</td>
                </tr>
              ) : (
                paginationProps.currentData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium">{record.customer?.name || record.customerId}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        record.type === '收入' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className={`py-4 px-4 font-medium ${record.type === '收入' ? 'text-green-600' : 'text-red-500'}`}>
                      {record.type === '收入' ? '+' : '-'}{formatCurrency(record.amount)}
                    </td>
                    <td className="py-4 px-4">{formatDate(record.date)}</td>
                    <td className="py-4 px-4">{record.reason}</td>
                    <td className="py-4 px-4 text-gray-500">{record.note || '-'}</td>
                    <td className="py-4 px-4 text-center">
                      <button
                        className="text-red-500 hover:text-red-600 transition-colors"
                        onClick={() => handleDelete(record.id)}
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

      {/* Add Modal */}
      <AppleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="新增現金記錄">
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
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
              <select
                value={addForm.type}
                onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="收入">收入</option>
                <option value="支出">支出</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額 (MOP)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">事由</label>
              <input
                type="text"
                value={addForm.reason}
                onChange={e => setAddForm({ ...addForm, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入事由"
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
