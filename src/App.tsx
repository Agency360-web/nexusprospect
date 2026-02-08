import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import Layout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ClientManager from './pages/ClientManager';
import ClientDetail from './pages/ClientDetail';
import SettingsPage from './pages/Settings';
import MessageDispatcher from './pages/MessageDispatcher';
import AdministrationDashboard from './pages/Administration';


const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<ClientManager />} />
                  <Route path="/clients/:clientId" element={<ClientDetail />} />
                  <Route path="/admin" element={<AdministrationDashboard />} />
                  <Route path="/dispatcher" element={<MessageDispatcher />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />

          {/* Catch-all for sub-routes inside Layout to ensure they are also protected if accessed directly */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/clients" element={<ClientManager />} />
                  <Route path="/clients/:clientId" element={<ClientDetail />} />
                  <Route path="/admin" element={<AdministrationDashboard />} />
                  <Route path="/dispatcher" element={<MessageDispatcher />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />

        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
