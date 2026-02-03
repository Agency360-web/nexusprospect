import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ClientManager from './components/ClientManager';
import ClientDetail from './components/ClientDetail';
import SettingsPage from './components/SettingsPage';
import MessageDispatcher from './components/MessageDispatcher';
import AdministrationDashboard from './components/AdministrationDashboard';


const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

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
