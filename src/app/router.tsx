import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from '@pages/login';

// Все приватные страницы — code-split через React.lazy. Fallback задан в AppLayout (Suspense).
const DashboardPage = lazy(async () => {
  const m = await import('@pages/dashboard');
  return { default: m.DashboardPage };
});
const ProjectsPage = lazy(async () => {
  const m = await import('@pages/projects');
  return { default: m.ProjectsPage };
});
const ProjectDetailPage = lazy(async () => {
  const m = await import('@pages/project-detail');
  return { default: m.ProjectDetailPage };
});
const ClientsPage = lazy(async () => {
  const m = await import('@pages/clients');
  return { default: m.ClientsPage };
});
const ServicesPage = lazy(async () => {
  const m = await import('@pages/services');
  return { default: m.ServicesPage };
});
const TasksPage = lazy(async () => {
  const m = await import('@pages/tasks');
  return { default: m.TasksPage };
});
const CalendarPage = lazy(async () => {
  const m = await import('@pages/calendar');
  return { default: m.CalendarPage };
});
const UsersPage = lazy(async () => {
  const m = await import('@pages/users');
  return { default: m.UsersPage };
});
const OrganizationPage = lazy(async () => {
  const m = await import('@pages/settings-organization');
  return { default: m.OrganizationPage };
});
const CustomFieldsPage = lazy(async () => {
  const m = await import('@pages/settings-custom-fields');
  return { default: m.CustomFieldsPage };
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings/organization" element={<OrganizationPage />} />
        <Route path="/settings/custom-fields" element={<CustomFieldsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
