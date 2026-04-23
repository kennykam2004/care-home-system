import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './features/auth';
import { LoginPage } from './features/auth';
import { Layout } from './components/layout/Layout';
import { DashboardView } from './features/dashboard/DashboardView';
import { CustomerView } from './features/customers/CustomerView';
import { ServiceRecordView } from './features/customers/ServiceRecordView';
import { InventoryView } from './features/inventory/InventoryView';
import { ServicesView } from './features/services/ServicesView';
import { BillsView } from './features/customers/BillsView';
import { PrepaidRecordsView } from './features/customers/PrepaidRecordsView';
import { BillPublishView } from './features/customers/BillPublishView';
import { CashRecordsView } from './features/customers/CashRecordsView';
import { RoleManagementView } from './features/roles/RoleManagementView';
import { RoleAddView } from './features/roles/RoleAddView';
import { RoleEditView } from './features/roles/RoleEditView';
import { UserManagementView } from './features/users/UserManagementView';
import { UserEditView } from './features/users/UserEditView';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardView />} />
        <Route path="customers" element={<CustomerView />} />
        <Route path="customers/:customerId/services" element={<ServiceRecordView />} />
        <Route path="inventory" element={<InventoryView />} />
        <Route path="services" element={<ServicesView />} />
        <Route path="bills" element={<BillsView />} />
        <Route path="prepaid-records" element={<PrepaidRecordsView />} />
        <Route path="bill-publishes" element={<BillPublishView />} />
        <Route path="cash-records" element={<CashRecordsView />} />
        <Route path="roles" element={<RoleManagementView />} />
        <Route path="roles/add" element={<RoleAddView />} />
        <Route path="roles/edit" element={<RoleEditView />} />
        <Route path="users" element={<UserManagementView />} />
        <Route path="users/edit" element={<UserEditView />} />
      </Route>
    </Routes>
  );
}

export default App;
