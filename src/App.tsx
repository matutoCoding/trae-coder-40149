
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import PoolSchedule from '@/pages/PoolSchedule';
import CycleGenerator from '@/pages/CycleGenerator';
import QuotaManagement from '@/pages/QuotaManagement';
import Consumption from '@/pages/Consumption';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pool-schedule" element={<PoolSchedule />} />
          <Route path="cycle-generator" element={<CycleGenerator />} />
          <Route path="quota-management" element={<QuotaManagement />} />
          <Route path="consumption" element={<Consumption />} />
        </Route>
      </Routes>
    </Router>
  );
}
