import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import Layout from './layouts/MainLayout';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ClientManager = lazy(() => import('./pages/ClientManager'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const MessageDispatcher = lazy(() => import('./pages/MessageDispatcher'));
const AdministrationDashboard = lazy(() => import('./pages/Administration'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-slate-50">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute>
                <Layout>
                  <ClientManager />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/clients/:clientId" element={
              <ProtectedRoute>
                <Layout>
                  <ClientDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Layout>
                  <AdministrationDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dispatcher" element={
              <ProtectedRoute>
                <Layout>
                  <MessageDispatcher />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;

