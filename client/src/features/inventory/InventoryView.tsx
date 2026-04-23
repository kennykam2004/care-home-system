import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import { AppleButtonPrimary, AppleButtonSecondary, AppleModal } from '../../components/ui';
import { usePagination } from '../../hooks/usePagination';
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

export function InventoryView() {
  const [services, setServices] = useState<Service[]>([]);
  const [typeFilter, setTypeFilter] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [changeFormData, setChangeFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    qty: 0,
    reason: '',
    isInfinite: false
  });
  const [records, setRecords] = useState<any[]>([]);
  const [recordFilter, setRecordFilter] = useState({ startDate: '', endDate: '' });
  const [appliedFilter, setAppliedFilter] = useState({ startDate: '', endDate: '' });

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

  const fetchRecords = async () => {
    try {
      const { data } = await api.get('/inventory');
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch inventory records:', error);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchRecords();
  }, []);

  useSocketEvent('services', useCallback(() => {
    fetchServices();
  }, []));

  useSocketEvent('inventory', useCallback(() => {
    fetchRecords();
  }, []));

  const filteredServices = services.filter((item) => {
    const matchType = typeFilter === '全部' || item.type === typeFilter;
    const matchKeyword = !searchTerm ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.includes(searchTerm);
    return matchType && matchKeyword;
  });

  const paginationProps = usePagination(filteredServices);

  const handleReset = () => {
    setTypeFilter('全部');
    setSearchTerm('');
  };

  const openChangeModal = (service: Service) => {
    setSelectedService(service);
    setChangeFormData({
      date: new Date().toISOString().split('T')[0],
      qty: 0,
      reason: '',
      isInfinite: service.stock === null
    });
    setIsChangeModalOpen(true);
  };

  const handleChangeSubmit = async () => {
    if (!selectedService) return;
    try {
      if (changeFormData.isInfinite) {
        // Just set as infinite - no quantity change needed
        setIsChangeModalOpen(false);
        return;
      }

      if (changeFormData.qty !== 0) {
        const qty = changeFormData.reason.includes('增加') || !changeFormData.reason
          ? Math.abs(changeFormData.qty)
          : -Math.abs(changeFormData.qty);

        await api.post('/inventory', {
          itemId: selectedService.id,
          date: changeFormData.date,
          type: selectedService.type,
          reason: changeFormData.reason || (qty > 0 ? '增加' : '減少'),
          qty: Math.abs(changeFormData.qty)
        });
      }
      setIsChangeModalOpen(false);
      fetchServices();
      fetchRecords();
    } catch (error) {
      console.error('Failed to update inventory:', error);
    }
  };

  const openRecordModal = (service: Service) => {
    setSelectedService(service);
    setRecordFilter({ startDate: '', endDate: '' });
    setAppliedFilter({ startDate: '', endDate: '' });
    setIsRecordModalOpen(true);
  };

  const filteredRecords = records.filter((r) => {
    if (r.itemId !== selectedService?.id) return false;
    if (appliedFilter.startDate && r.date < appliedFilter.startDate) return false;
    if (appliedFilter.endDate && r.date > appliedFilter.endDate) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW');
  };

  const getPreviewStock = (): number | '無限' => {
    if (!selectedService) return 0;
    if (changeFormData.isInfinite) return '無限';
    const base = selectedService.stock === null ? 0 : selectedService.stock;
    return base + changeFormData.qty;
  };

  const getPreviewClass = () => {
    const preview = getPreviewStock();
    if (preview === '無限') return 'text-blue-600 text-xl';
    const base = selectedService?.stock === null ? 0 : (selectedService?.stock || 0);
    if (preview > base) return 'text-green-600';
    if (preview < base) return 'text-orange-500';
    return 'text-gray-900';
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
      <Breadcrumb items={['養老院管理', '庫存管理', '庫存概覽']} />

      <div className="mb-4 flex justify-between items-center flex-wrap gap-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <AppleButtonPrimary icon={Plus} onClick={() => {
            setSelectedService(null);
            setChangeFormData({
              date: new Date().toISOString().split('T')[0],
              qty: 0,
              reason: '',
              isInfinite: false
            });
            setIsChangeModalOpen(true);
          }}>
            新增庫存
          </AppleButtonPrimary>

          <div className="w-64">
            <div className="flex items-center border border-gray-200 bg-gray-50/50 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
              <span className="text-sm text-gray-500 bg-gray-100/50 px-3 py-1.5 border-r border-gray-200/50 whitespace-nowrap">查詢</span>
              <input
                type="text"
                placeholder="編號/名稱"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-1.5 px-3 outline-none text-sm w-full bg-transparent text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm border border-gray-200 bg-white rounded-xl px-3 py-[7px] shadow-sm">
            <span className="text-gray-500 font-medium whitespace-nowrap">服務類型</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent outline-none appearance-none text-center pr-5 text-gray-800 font-medium cursor-pointer"
            >
              <option value="全部">全部</option>
              <option value="護理服務">護理服務</option>
              <option value="照顧服務">照顧服務</option>
            </select>
          </div>

          <AppleButtonSecondary onClick={handleReset}>重置</AppleButtonSecondary>
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

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-medium">服務編號</th>
                <th className="py-3 px-4 font-medium">服務名稱</th>
                <th className="py-3 px-4 font-medium">服務類型</th>
                <th className="py-3 px-4 font-medium">常用品</th>
                <th className="py-3 px-4 font-medium">庫存數量</th>
                <th className="py-3 px-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {paginationProps.currentData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 text-xs font-mono text-gray-500">{item.id}</td>
                  <td className="py-4 px-4 font-medium">{item.name}</td>
                  <td className="py-4 px-4">{item.type}</td>
                  <td className="py-4 px-4">{item.isCommon ? '是' : '否'}</td>
                  <td className={`py-4 px-4 font-medium ${item.stock === null ? 'text-blue-600 text-xl' : 'text-gray-900'}`}>
                    {item.stock === null ? '∞' : item.stock}
                  </td>
                  <td className="py-4 px-4 text-blue-500 text-center font-medium">
                    <button className="hover:text-blue-600 mr-3 transition-colors" onClick={() => openChangeModal(item)}>變動</button>
                    <button className="hover:text-blue-600 transition-colors" onClick={() => openRecordModal(item)}>變動記錄</button>
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

      {/* Change Stock Modal */}
      <AppleModal isOpen={isChangeModalOpen} onClose={() => setIsChangeModalOpen(false)} title="新增庫存變動">
        <div className="p-6">
          {selectedService && (
            <>
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 mb-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center"><span className="text-gray-500 w-20">服務編號：</span><span className="font-mono text-gray-900">{selectedService.id}</span></div>
                <div className="flex items-center"><span className="text-gray-500 w-20">服務名稱：</span><span className="font-medium text-gray-900">{selectedService.name}</span></div>
                <div className="flex items-center">
                  <span className="text-gray-500 w-20">當前庫存：</span>
                  <span className={`font-medium ${selectedService.stock === null ? 'text-blue-600 text-2xl' : 'text-gray-900'}`}>
                    {selectedService.stock === null ? '∞' : selectedService.stock}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-[100px_1fr] gap-y-4 text-sm items-center">
                  <span className="text-gray-500 text-right pr-4 font-medium"><span className="text-red-500">* </span>日期</span>
                  <input
                    type="date"
                    value={changeFormData.date}
                    onChange={(e) => setChangeFormData({ ...changeFormData, date: e.target.value })}
                    className="border border-gray-200 bg-gray-50/50 rounded-xl px-4 py-2.5 outline-none w-[200px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-800"
                  />

                  <span className="text-gray-500 text-right pr-4 self-start mt-1 font-medium"><span className="text-red-500">* </span>變動數量</span>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={changeFormData.isInfinite}
                        onChange={(e) => setChangeFormData({ ...changeFormData, isInfinite: e.target.checked, qty: 0 })}
                        className="w-4 h-4 text-blue-500 focus:ring-blue-500 rounded border-gray-300"
                      />
                      <span className="text-gray-800 font-medium">設為無限庫存</span>
                    </label>

                    {!changeFormData.isInfinite && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setChangeFormData({ ...changeFormData, qty: changeFormData.qty - 1 })}
                            className="px-3 py-2.5 text-gray-500 hover:bg-gray-200/50 transition-colors font-bold"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            readOnly
                            value={changeFormData.qty}
                            className="w-14 text-center bg-transparent text-gray-800 font-medium outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setChangeFormData({ ...changeFormData, qty: changeFormData.qty + 1 })}
                            className="px-3 py-2.5 text-gray-500 hover:bg-gray-200/50 transition-colors font-bold"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-gray-500">
                          變動後庫存：
                          <span className={`font-medium ${getPreviewClass()}`}>
                            {getPreviewStock() === '無限' ? '∞' : getPreviewStock()}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="text-gray-500 text-right pr-4 self-start mt-1 font-medium">變動原因</span>
                  <textarea
                    value={changeFormData.reason}
                    onChange={(e) => setChangeFormData({ ...changeFormData, reason: e.target.value })}
                    placeholder="請輸入變動原因"
                    className="border border-gray-200 bg-gray-50/50 rounded-xl px-4 py-3 outline-none w-full h-24 resize-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-800"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
          <AppleButtonSecondary onClick={() => setIsChangeModalOpen(false)}>取消</AppleButtonSecondary>
          <AppleButtonPrimary onClick={handleChangeSubmit}>確認</AppleButtonPrimary>
        </div>
      </AppleModal>

      {/* Inventory Records Modal */}
      <AppleModal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="庫存變動記錄">
        <div className="p-6">
          {selectedService && (
            <>
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 mb-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center"><span className="text-gray-500 w-20">服務編號：</span><span className="font-mono text-gray-900">{selectedService.id}</span></div>
                <div className="flex items-center"><span className="text-gray-500 w-20">服務名稱：</span><span className="font-medium text-gray-900">{selectedService.name}</span></div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center border border-gray-200 bg-gray-50/50 rounded-xl overflow-hidden text-sm">
                  <span className="text-gray-500 bg-gray-100/50 px-3 py-1.5 border-r border-gray-200/50">日期篩選</span>
                  <input
                    type="date"
                    value={recordFilter.startDate}
                    onChange={(e) => setRecordFilter({ ...recordFilter, startDate: e.target.value })}
                    className="p-1.5 outline-none w-36 bg-transparent text-gray-700"
                  />
                  <span className="px-2 text-gray-400">-</span>
                  <input
                    type="date"
                    value={recordFilter.endDate}
                    onChange={(e) => setRecordFilter({ ...recordFilter, endDate: e.target.value })}
                    className="p-1.5 outline-none w-36 bg-transparent text-gray-700"
                  />
                </div>
                <AppleButtonSecondary onClick={() => {
                  setAppliedFilter(recordFilter);
                }}>查詢</AppleButtonSecondary>
                <AppleButtonSecondary onClick={() => {
                  setRecordFilter({ startDate: '', endDate: '' });
                  setAppliedFilter({ startDate: '', endDate: '' });
                }}>重置</AppleButtonSecondary>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="py-2 px-3 font-medium">日期</th>
                      <th className="py-2 px-3 font-medium">原因</th>
                      <th className="py-2 px-3 font-medium text-right">數量</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500">暫無變動記錄</td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3">{formatDate(r.date)}</td>
                          <td className="py-2 px-3">{r.reason}</td>
                          <td className={`py-2 px-3 text-right font-medium ${r.qty > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                            {r.qty > 0 ? '+' : ''}{r.qty}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </AppleModal>
    </div>
  );
}