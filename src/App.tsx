import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import Layout from './layouts/MainLayout';

// Lazy load pages for better performance

const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClientManager = lazy(() => import('./pages/ClientManager'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const AiAgents = lazy(() => import('./pages/AiAgents'));
const Prospecting = lazy(() => import('./pages/Prospecting'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const AdministrationDashboard = lazy(() => import('./pages/Administration'));
const ToolsManager = lazy(() => import('./pages/ToolsManager'));
const WhatsAppVerifier = lazy(() => import('./pages/tools/WhatsAppVerifier'));
const ContactSynchronizer = lazy(() => import('./pages/tools/ContactSynchronizer'));
const ContactExporter = lazy(() => import('./pages/tools/ContactExporter'));
const GroupExtractor = lazy(() => import('./pages/tools/GroupExtractor'));
const WhatsAppHeater = lazy(() => import('./pages/tools/WhatsAppHeater'));

// Components for nested routing
const WhatsAppCampaignForm = lazy(() => import('./components/prospecting/WhatsAppCampaignForm'));
const GoogleMapsLeadSearch = lazy(() => import('./components/prospecting/GoogleMapsLeadSearch'));
const InstagramLeadSearch = lazy(() => import('./components/prospecting/InstagramLeadSearch'));
const CnpjLeadSearch = lazy(() => import('./components/prospecting/CnpjLeadSearch'));

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
            <Route path="/dashboard" element={
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
            <Route path="/agents" element={
              <ProtectedRoute>
                <Layout>
                  <AiAgents />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/prospecting" element={
              <ProtectedRoute>
                <Layout>
                  <Prospecting />
                </Layout>
              </ProtectedRoute>
            }>
              {/* Rota Padrão - Redireciona para /prospecting/messages */}
              <Route index element={<Navigate to="messages" replace />} />
            
              {/* Rotas das Abas */}
              <Route path="messages" element={<WhatsAppCampaignForm />} />
              <Route path="maps" element={<GoogleMapsLeadSearch />} />
              {/* <Route path="instagram" element={<InstagramLeadSearch />} /> */}
              <Route path="cnpj" element={<CnpjLeadSearch />} />
            </Route>
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
            <Route path="/tools" element={
              <ProtectedRoute>
                <Layout>
                  <ToolsManager />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/tools/whatsapp-verifier" element={
              <ProtectedRoute>
                <Layout>
                  <WhatsAppVerifier />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/tools/contact-synchronizer" element={
              <ProtectedRoute>
                <Layout>
                  <ContactSynchronizer />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/tools/contact-exporter" element={
              <ProtectedRoute>
                <Layout>
                  <ContactExporter />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/tools/group-extractor" element={
              <ProtectedRoute>
                <Layout>
                  <GroupExtractor />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/tools/whatsapp-heater" element={
              <ProtectedRoute>
                <Layout>
                  <WhatsAppHeater />
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

