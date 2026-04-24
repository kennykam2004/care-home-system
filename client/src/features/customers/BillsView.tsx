import { useState, useEffect, useCallback } from 'react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../api/client';

interface Bill {
  id: string;
  customerId: string;
  name: string;
  month: string;
  basicFee: number;
  serviceFee: number;
  totalFee: number;
  prepaid: number;
  debt: number;
  status?: string;
  date: string;
  customer?: { name: string };
}

interface Customer {
  id: string;
  name: string;
  basicFee: number;
  balance: number;
}

interface ServiceRecord {
  recordId: string;
  customerId: string;
  date: string;
  type: string;
  name: string;
  qty: number;
  amount: number | string;
  note?: string;
}

const formatCurrency = (num: number | string) => {
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  return n.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function BillsView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [searchMonth, setSearchMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPrepaidModalOpen, setIsPrepaidModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [prepaidAmount, setPrepaidAmount] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [customersRes, recordsRes] = await Promise.all([
        api.get('/customers'),
        api.get('/service-records')
      ]);
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

  useSocketEvent('bills', useCallback(() => fetchData(), [fetchData]));
  useSocketEvent('customers', useCallback(() => fetchData(), [fetchData]));
  useSocketEvent('service-records', useCallback(() => fetchData(), [fetchData]));

  // Generate bills dynamically from customers and their service records
  const generatedBills = customers.map(c => {
    const monthRecords = serviceRecords.filter(r =>
      r.customerId === c.id && r.date.startsWith(searchMonth)
    );
    const servicesTotal = monthRecords.reduce((sum, r) => {
      const amount = typeof r.amount === 'string' ? parseFloat(r.amount.replace(/,/g, '')) : r.amount;
      return sum + (amount || 0);
    }, 0);

    const basicFee = c.basicFee || 0;
    const prepaid = c.balance || 0;
    const totalFee = basicFee + servicesTotal;
    const debt = totalFee - prepaid;

    return {
      id: `B${searchMonth.replace('-', '')}${c.id.padStart(5, '0')}`,
      customerId: c.id,
      name: c.name,
      month: searchMonth,
      basicFee,
      serviceFee: servicesTotal,
      totalFee,
      prepaid,
      debt,
      status: debt <= 0 ? '已繳費' : '待繳費',
      date: new Date().toISOString().slice(0, 10)
    };
  });

  const paginationProps = usePagination(generatedBills);

  const openDetailsModal = (bill: Bill) => {
    setSelectedBill(bill);
    setIsDetailsModalOpen(true);
  };

  const openPrepaidModal = (bill: Bill) => {
    setSelectedBill(bill);
    setPrepaidAmount(String(bill.debt > 0 ? bill.debt : 0));
    setIsPrepaidModalOpen(true);
  };

  const handlePrepaidDeduct = async () => {
    if (!selectedBill) return;
    try {
      await api.post('/bills/deduct-prepaid', {
        customerId: selectedBill.customerId,
        amount: parseFloat(prepaidAmount)
      });
      setIsPrepaidModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to deduct prepaid:', error);
    }
  };

  const handlePayment = async (bill: Bill) => {
    try {
      // Mark as paid - deduct full debt from prepaid balance
      if (bill.debt > 0) {
        await api.post('/bills/deduct-prepaid', {
          customerId: bill.customerId,
          amount: bill.debt
        });
      }
      fetchData();
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  };

  const handleDownloadExcel = (bill: Bill) => {
    const monthRecords = serviceRecords.filter(r =>
      r.customerId === bill.customerId && r.date.startsWith(bill.month)
    );

    let csvContent = '﻿';
    csvContent += `頤安(逸麗)護老院 - 賬單明細\n\n`;
    csvContent += `賬單編號,${bill.id}\n`;
    csvContent += `住院號,${bill.customerId}\n`;
    csvContent += `客戶姓名,${bill.name}\n`;
    csvContent += `賬單月份,${bill.month}\n\n`;
    csvContent += `日期,收費項目,服務名稱,金額(MOP),備註\n`;
    csvContent += `,基本院費 (交下月院費),,${bill.basicFee.toFixed(2)},\n`;

    monthRecords.forEach(r => {
      const safeName = `"${(r.name || '').replace(/"/g, '""')}"`;
      const safeNote = `"${(r.note || '').replace(/"/g, '""')}"`;
      const safeAmount = typeof r.amount === 'string' ? r.amount : r.amount.toFixed(2);
      csvContent += `${r.date},服務收費,${safeName},${safeAmount},${safeNote}\n`;
    });

    csvContent += `\n`;
    csvContent += `費用合計,,,${bill.totalFee.toFixed(2)},\n`;
    csvContent += `預繳費用,,,-${bill.prepaid.toFixed(2)},\n`;
    csvContent += `應繳費用,,,${bill.debt.toFixed(2)},\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `賬單_${bill.customerId}_${bill.name}_${bill.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${year}年${month}月`;
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
      <Breadcrumb items={['養老院管理', '收費管理', '賬單管理']} />

      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-gray-200 bg-gray-50/50 rounded-xl overflow-hidden text-sm">
            <span className="text-gray-500 bg-gray-100/50 px-3 py-1.5 border-r border-gray-200/50 whitespace-nowrap">賬單月份</span>
            <input
              type="month"
              value={searchMonth}
              onChange={e => setSearchMonth(e.target.value)}
              className="p-1.5 outline-none w-36 bg-transparent text-gray-800 px-3"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
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
          <table className="w-full text-sm text-left min-w-[1300px]">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium whitespace-nowrap">賬單編號</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">住院號</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">客戶姓名</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">賬單日期</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">賬單狀態</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">賬單費用(MOP)</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">欠繳費用(MOP)</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">發佈時間</th>
                <th className="py-3 px-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {paginationProps.currentData.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 text-xs font-mono text-gray-500">{bill.id}</td>
                  <td className="py-4 px-4">{bill.customerId}</td>
                  <td className="py-4 px-4 font-medium">{bill.name}</td>
                  <td className="py-4 px-4">{formatMonth(bill.month)}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      bill.status === '已繳費' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium">{formatCurrency(bill.totalFee)}</td>
                  <td className="py-4 px-4 font-medium text-red-500">{formatCurrency(bill.debt)}</td>
                  <td className="py-4 px-4 text-xs text-gray-500">{bill.date}</td>
                  <td className="py-4 px-4 text-blue-500 text-center">
                    <div className="flex gap-3 justify-center">
                      <button className="hover:text-blue-600 transition-colors whitespace-nowrap" onClick={() => openDetailsModal(bill)}>查看</button>
                      <button className="hover:text-blue-600 transition-colors whitespace-nowrap" onClick={() => handlePayment(bill)}>繳費</button>
                      <button className="hover:text-blue-600 transition-colors whitespace-nowrap" onClick={() => openPrepaidModal(bill)}>預繳費劃扣</button>
                      <button className="hover:text-blue-600 transition-colors whitespace-nowrap" onClick={() => handleDownloadExcel(bill)}>下載賬單</button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Bill Details Modal */}
      <AppleModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="結算詳情">
        {selectedBill && (
          <div className="p-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-6 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
              <div className="flex gap-8">
                <span>住院號: <span className="font-medium text-gray-900">{selectedBill.customerId}</span></span>
                <span>客戶姓名: <span className="font-medium text-gray-900">{selectedBill.name}</span></span>
              </div>
              <span>賬單月份: <span className="font-medium text-gray-900">{formatMonth(selectedBill.month)}</span></span>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">收費項目</th>
                    <th className="py-3 px-4 font-medium">服務名稱</th>
                    <th className="py-3 px-4 font-medium text-right">金額(MOP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr>
                    <td className="py-4 px-4 font-medium text-gray-900">
                      基本院費 <span className="text-xs text-gray-400 font-normal ml-1">(交下月院費)</span>
                    </td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right font-medium">{formatCurrency(selectedBill.basicFee)}</td>
                  </tr>
                  {serviceRecords
                    .filter(r => r.customerId === selectedBill.customerId && r.date.startsWith(selectedBill.month))
                    .map((r) => (
                      <tr key={r.recordId}>
                        <td className="py-4 px-4 text-gray-500">服務收費</td>
                        <td className="py-4 px-4">{r.name}</td>
                        <td className="py-4 px-4 text-right">{typeof r.amount === 'number' ? formatCurrency(r.amount) : r.amount}</td>
                      </tr>
                    ))}
                  <tr className="bg-gray-50/30">
                    <td className="py-4 px-4 font-bold text-gray-900">費用合計</td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency(selectedBill.totalFee)}</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-medium text-gray-900">預繳費用</td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right text-blue-600 font-medium">
                      {selectedBill.prepaid > 0 ? `-${formatCurrency(selectedBill.prepaid)}` : '0.00'}
                    </td>
                  </tr>
                  <tr className="bg-blue-50/30">
                    <td className="py-4 px-4 font-bold text-gray-900">應繳費用</td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right font-bold text-red-600 text-base">{formatCurrency(selectedBill.debt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AppleModal>

      {/* Prepaid Deduction Modal */}
      <AppleModal isOpen={isPrepaidModalOpen} onClose={() => setIsPrepaidModalOpen(false)} title="預繳費劃扣">
        {selectedBill && (
          <div className="p-6">
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 mb-6 text-sm">
              <div className="flex items-center mb-2">
                <span className="w-24 text-gray-500">客戶姓名：</span>
                <span className="font-medium text-gray-900">{selectedBill.name}</span>
              </div>
              <div className="flex items-center mb-2">
                <span className="w-24 text-gray-500">當前餘額：</span>
                <span className="font-medium text-blue-600">{formatCurrency(selectedBill.prepaid)} MOP</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-gray-500">應繳費用：</span>
                <span className="font-medium text-red-600">{formatCurrency(selectedBill.debt)} MOP</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">劃扣金額</label>
              <input
                type="number"
                value={prepaidAmount}
                onChange={(e) => setPrepaidAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max={selectedBill.prepaid}
              />
            </div>

            <div className="flex justify-end gap-3">
              <AppleButtonSecondary onClick={() => setIsPrepaidModalOpen(false)}>取消</AppleButtonSecondary>
              <AppleButtonPrimary onClick={handlePrepaidDeduct}>確認劃扣</AppleButtonPrimary>
            </div>
          </div>
        )}
      </AppleModal>
    </div>
  );
}