import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useSocket } from '../../hooks/useSocket';

export function Layout() {
  useSocket();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
