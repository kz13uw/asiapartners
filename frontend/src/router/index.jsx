import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Лайауты
import MainLayout from '../layouts/MainLayout';
import PublicLayout from '../layouts/PublicLayout';

// Страницы
import IndexPage from '../pages/IndexPage';
import FAQPage from '../pages/FAQPage';
import PublicTenders from '../pages/PublicTenders';
import LoginPage from '../pages/LoginPage';
import AdminLoginPage from '../pages/AdminLoginPage';
import SupplierDashboard from '../pages/supplier/SupplierDashboard';
import OrganizerDashboard from '../pages/organizer/OrganizerDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import TenderSearch from '../pages/shared/TenderSearch';
import TenderDetails from '../pages/shared/TenderDetails';
import AuctionRoom from '../pages/shared/AuctionRoom';
import ProfileSettings from '../pages/shared/ProfileSettings';
import Notifications from '../pages/shared/Notifications';
import CreateTender from '../pages/organizer/CreateTender';
import DraftTenders from '../pages/organizer/DraftTenders';
import EvaluateTender from '../pages/organizer/EvaluateTender';
import OrgContracts from '../pages/organizer/OrgContracts';
import OrgProtocols from '../pages/organizer/OrgProtocols';
import SupplierHistory from '../pages/supplier/SupplierHistory';
import SupplierProfile from '../pages/supplier/SupplierProfile';
import MonitoringDashboard from '../pages/monitoring/MonitoringDashboard';
import { AdminSettings, AdminSecurity, AdminReports } from '../pages/admin/AdminPlaceholders';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import TermsOfUse from '../pages/TermsOfUse';
import DocumentsPage from '../pages/DocumentsPage';

import ReportsPage from '../pages/shared/ReportsPage';

// Защита роутов по ролям
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const userRole = (user?.role || '').toLowerCase();

  if (allowedRoles) {
    const rolesLower = allowedRoles.map(r => r.toLowerCase());
    if (!rolesLower.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }
  
  return children;
};

const AppRouter = () => {
  return (
    <Routes>
      {/* Публичные роуты */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<IndexPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/public-tenders" element={<PublicTenders />} />
        <Route path="/tenders/:id" element={<TenderDetails />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
      </Route>

      {/* Роуты с авторизацией */}
      <Route element={<MainLayout />}>
        
        {/* Общий реестр тендеров для всех ролей */}
        <Route path="/tenders" element={
          <ProtectedRoute allowedRoles={['supplier', 'organizer', 'monitoring', 'admin', 'commission']}>
            <TenderSearch />
          </ProtectedRoute>
        } />

        {/* Отчеты */}
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['supplier', 'organizer', 'monitoring', 'admin', 'commission']}>
            <ReportsPage />
          </ProtectedRoute>
        } />

        {/* Контрагент */}
        <Route path="/supplier/dashboard" element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierDashboard />
          </ProtectedRoute>
        } />
        <Route path="/supplier/history" element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierHistory />
          </ProtectedRoute>
        } />
        <Route path="/supplier/profile" element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierProfile />
          </ProtectedRoute>
        } />
        <Route path="/supplier/tenders/:id" element={
          <ProtectedRoute allowedRoles={['supplier', 'organizer', 'admin', 'monitoring', 'commission']}>
            <TenderDetails />
          </ProtectedRoute>
        } />
        <Route path="/organizer/tenders/:id" element={
          <ProtectedRoute allowedRoles={['organizer', 'admin', 'monitoring', 'commission']}>
            <TenderDetails />
          </ProtectedRoute>
        } />
        <Route path="/app/tenders/:id" element={
          <ProtectedRoute allowedRoles={['supplier', 'organizer', 'admin', 'monitoring', 'commission']}>
            <TenderDetails />
          </ProtectedRoute>
        } />
        
        {/* Организатор */}
        <Route path="/organizer/dashboard" element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <OrganizerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/organizer/tenders/create" element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <CreateTender />
          </ProtectedRoute>
        } />
        <Route path="/organizer/tenders/:id/edit" element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <CreateTender />
          </ProtectedRoute>
        } />
        <Route path="/organizer/tenders/drafts" element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <DraftTenders />
          </ProtectedRoute>
        } />
        <Route path="/organizer/tenders/:id/evaluate" element={
          <ProtectedRoute allowedRoles={['organizer', 'commission', 'admin']}>
            <EvaluateTender />
          </ProtectedRoute>
        } />
        <Route path="/organizer/protocols" element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <OrgProtocols />
          </ProtectedRoute>
        } />
        <Route path="/organizer/contracts" element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <OrgContracts />
          </ProtectedRoute>
        } />

        {/* Аукционный зал */}
        <Route path="/tenders/:id/auction" element={
          <ProtectedRoute>
            <AuctionRoom />
          </ProtectedRoute>
        } />
        <Route path="/profile/settings" element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        } />
        <Route path="/profile/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />

        {/* Мониторинг */}
        <Route path="/monitoring/dashboard" element={
          <ProtectedRoute allowedRoles={['monitoring', 'admin']}>
            <MonitoringDashboard />
          </ProtectedRoute>
        } />

        {/* Админ */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSettings />
          </ProtectedRoute>
        } />
        <Route path="/admin/security" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSecurity />
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
