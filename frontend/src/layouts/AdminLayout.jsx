import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/sidebar/AdminSidebar';
import Topbar from '../components/Topbar';

export default function AdminLayout() {
  return (
    <div className="app-shell admin-layout">
      <AdminSidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
