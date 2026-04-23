import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Package, Receipt, Calendar, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { Breadcrumb } from '../../components/layout';
import api from '../../api/client';

interface Stats {
  totalCustomers: number;
  inHospitalCustomers: number;
  outHospitalCustomers: number;
  totalServices: number;
  lowStockItems: number;
  totalPrepaidBalance: number;
  monthlyRevenue: number;
  serviceRecordsCount: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  date: string;
}

export function DashboardView() {
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    inHospitalCustomers: 0,
    outHospitalCustomers: 0,
    totalServices: 0,
    lowStockItems: 0,
    totalPrepaidBalance: 0,
    monthlyRevenue: 0,
    serviceRecordsCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [customersRes, servicesRes, serviceRecordsRes] = await Promise.all([
        api.get('/customers'),
        api.get('/services'),
        api.get('/service-records')
      ]);

      const customers = customersRes.data;
      const services = servicesRes.data;
      const serviceRecords = serviceRecordsRes.data;

      // Calculate stats
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const inHospital = customers.filter((c: any) => c.status === '在院').length;
      const outHospital = customers.filter((c: any) => c.status === '離院').length;

      const totalPrepaidBalance = customers.reduce((sum: number, c: any) => sum + (c.balance || 0), 0);

      // Monthly revenue from service records
      const monthlyRecords = serviceRecords.filter((r: any) => r.date.startsWith(currentMonth));
      const monthlyRevenue = monthlyRecords.reduce((sum: number, r: any) => {
        const amount = typeof r.amount === 'string' ? parseFloat(r.amount.replace(/,/g, '')) : r.amount;
        return sum + (amount || 0);
      }, 0);

      // Low stock items (stock < 20 and not null)
      const lowStockItems = services.filter((s: any) => s.stock !== null && s.stock < 20).length;

      setStats({
        totalCustomers: customers.length,
        inHospitalCustomers: inHospital,
        outHospitalCustomers: outHospital,
        totalServices: services.length,
        lowStockItems,
        totalPrepaidBalance,
        monthlyRevenue,
        serviceRecordsCount: serviceRecords.length
      });

      // Recent activity from service records
      const recent = serviceRecords
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map((r: any) => ({
          id: r.recordId,
          type: 'service',
          description: `服務記錄：${r.name}`,
          date: r.date
        }));

      setRecentActivity(recent);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (num: number) => {
    return num.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      <Breadcrumb items={['首頁']} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">歡迎回來</h1>
        <p className="text-gray-500 mt-1">以下是系統概覽</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users size={24} className="text-blue-500" />
            </div>
            <span className="text-xs text-green-500 flex items-center gap-1">
              <TrendingUp size={12} /> 在院
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalCustomers}</div>
          <div className="text-sm text-gray-500">總客戶數</div>
          <div className="mt-2 text-xs text-gray-400">
            在院 {stats.inHospitalCustomers} | 離院 {stats.outHospitalCustomers}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Package size={24} className="text-green-500" />
            </div>
            <span className={`text-xs ${stats.lowStockItems > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {stats.lowStockItems > 0 ? '注意' : '正常'}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalServices}</div>
          <div className="text-sm text-gray-500">服務項目</div>
          {stats.lowStockItems > 0 && (
            <div className="mt-2 text-xs text-orange-500 cursor-pointer hover:underline" onClick={() => navigate('/inventory')}>
              {stats.lowStockItems} 項庫存不足
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <DollarSign size={24} className="text-purple-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalPrepaidBalance)}</div>
          <div className="text-sm text-gray-500">客戶預繳費餘額</div>
          <div className="mt-2 text-xs text-gray-400 cursor-pointer hover:underline" onClick={() => navigate('/prepaid-records')}>
            查看預繳費記錄
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Receipt size={24} className="text-orange-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(stats.monthlyRevenue)}</div>
          <div className="text-sm text-gray-500">本月服務收入</div>
          <div className="mt-2 text-xs text-gray-400">
            共 {stats.serviceRecordsCount} 筆記錄
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">快速操作</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/customers')}
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
            >
              <Users size={20} className="text-blue-500" />
              <div>
                <div className="font-medium text-gray-900">客戶管理</div>
                <div className="text-xs text-gray-500">查看所有客戶</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/services')}
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
            >
              <Package size={20} className="text-green-500" />
              <div>
                <div className="font-medium text-gray-900">服務管理</div>
                <div className="text-xs text-gray-500">管理服務項目</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/bills')}
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
            >
              <Receipt size={20} className="text-purple-500" />
              <div>
                <div className="font-medium text-gray-900">賬單管理</div>
                <div className="text-xs text-gray-500">查看月度賬單</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/inventory')}
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
            >
              <Activity size={20} className="text-orange-500" />
              <div>
                <div className="font-medium text-gray-900">庫存管理</div>
                <div className="text-xs text-gray-500">查看庫存狀態</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">最近活動</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center text-gray-400 py-8">暫無最近活動</div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar size={16} className="text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{activity.description}</div>
                    <div className="text-xs text-gray-500">{formatDate(activity.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
