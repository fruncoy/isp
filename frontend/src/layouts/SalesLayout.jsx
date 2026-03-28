import { Outlet } from 'react-router-dom';
import SalesSidebar from '../components/sidebar/SalesSidebar';
import Topbar from '../components/Topbar';

export default function SalesLayout() {
  return (
    <div className="app-shell sales-layout">
      <SalesSidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
