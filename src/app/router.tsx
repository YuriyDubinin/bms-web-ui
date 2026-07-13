import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from '@pages/login';

// Все приватные страницы — code-split через React.lazy. Fallback задан в AppLayout (Suspense).
const CorePage = lazy(async () => {
  const m = await import('@pages/core');
  return { default: m.CorePage };
});
const ServersPage = lazy(async () => {
  const m = await import('@pages/servers');
  return { default: m.ServersPage };
});
const ServerDetailPage = lazy(async () => {
  const m = await import('@pages/server-detail');
  return { default: m.ServerDetailPage };
});
const ConfigsPage = lazy(async () => {
  const m = await import('@pages/configs');
  return { default: m.ConfigsPage };
});
const RegistryPage = lazy(async () => {
  const m = await import('@pages/registry');
  return { default: m.RegistryPage };
});
const ProjectsPage = lazy(async () => {
  const m = await import('@pages/projects');
  return { default: m.ProjectsPage };
});
const BackupsPage = lazy(async () => {
  const m = await import('@pages/backups');
  return { default: m.BackupsPage };
});
const WorkflowPage = lazy(async () => {
  const m = await import('@pages/workflow');
  return { default: m.WorkflowPage };
});
const ClientsPage = lazy(async () => {
  const m = await import('@pages/clients');
  return { default: m.ClientsPage };
});
const NotFoundPage = lazy(async () => {
  const m = await import('@pages/not-found');
  return { default: m.NotFoundPage };
});

export function AppRoutes() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<LoginPage />} />

      {/* private — guard в AppLayout */}
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/core" replace />} />
        <Route path="/core" element={<CorePage />} />
        <Route path="/servers" element={<ServersPage />} />
        {/* splat — внутренняя табуляция страницы сервера (/servers/:id, /servers/:id/cicd) */}
        <Route path="/servers/:id/*" element={<ServerDetailPage />} />
        <Route path="/configs" element={<ConfigsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/backups" element={<BackupsPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/registry" element={<RegistryPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
