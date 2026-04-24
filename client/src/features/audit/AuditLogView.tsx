import { useState, useEffect } from 'react';
import { RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  module: string;
  action: string;
  recordId: string;
  recordType: string;
  changes: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const MODULE_LABELS: Record<string, string> = {
  customers: '客戶',
  bills: '賬單',
  inventory: '庫存',
  'service-records': '服務記錄',
  'prepaid-records': '預繳費',
  'cash-records': '現金進賬',
  users: '用戶',
};

const ACTION_LABELS: Record<string, string> = {
  create: '新增',
  update: '修改',
  delete: '刪除',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
};

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    module: '',
    action: '',
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [page, pageSize, filters.module, filters.action]);

  async function fetchAuditLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (filters.module) params.append('module', filters.module);
      if (filters.action) params.append('action', filters.action);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: AuditLogsResponse = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">審計日誌</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有資料變動記錄</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">篩選：</span>
          </div>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
          >
            <option value="">全部模組</option>
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          >
            <option value="">全部操作</option>
            <option value="create">新增</option>
            <option value="update">修改</option>
            <option value="delete">刪除</option>
          </select>
          <button
            onClick={() => fetchAuditLogs()}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            刷新
          </button>
        </div>
      </div>

      {/* Stats & Page Size */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          共 <span className="font-semibold text-gray-800">{total}</span> 條記錄
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">每頁顯示</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="border border-gray-200 bg-gray-50/50 rounded-lg px-2 py-1 text-sm outline-none"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-36">時間</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-28">操作者</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-24">模組</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-20">操作</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">變動內容</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">載入中...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">暫無記錄</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {MODULE_LABELS[log.module] || log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${ACTION_COLORS[log.action]}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.changes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={14} className="inline" /> 上一頁
            </button>
            <span className="text-sm text-gray-600">
              第 {page} 頁，共 {totalPages} 頁
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一頁 <ChevronRight size={14} className="inline" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}