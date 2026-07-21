import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTheme } from '@app/theme';
import { useAuth } from '@app/auth';
import { AppLayout } from '@app/layout';
import { LoginPage } from '@app/pages/LoginPage';
// Дашборд тянет библиотеку графиков (recharts) — грузим его отдельным чанком по требованию,
// чтобы не утяжелять остальные маршруты.
const DashboardPage = lazy(() =>
  import('@app/pages/dashboard').then((m) => ({ default: m.DashboardPage })),
);
// Календарь тянет FullCalendar — грузим отдельным чанком по требованию, как дашборд.
const CalendarPage = lazy(() =>
  import('@app/pages/calendar').then((m) => ({ default: m.CalendarPage })),
);
import { ProjectsPage, ProjectDetailPage } from '@app/pages/projects';
import { ServicesPage, ServiceDetailPage } from '@app/pages/services';
import { ClientsPage, ClientDetailPage } from '@app/pages/clients';
import { DealsPage, DealDetailPage } from '@app/pages/deals';
import { TasksPage, TaskDetailPage } from '@app/pages/tasks';
import { ProcessesPage, ProcessDetailPage } from '@app/pages/processes';
import { BotsPage } from '@app/pages/BotsPage';
import { SettingsPage } from '@app/pages/SettingsPage';

/**
 * Роутинг + auth-guard. Тема и сессия живут здесь единственным инстансом.
 * Приватная зона обёрнута в AppLayout (сайдбар + Outlet); guard внутри layout.
 * Редиректы декларативны: смена статуса сессии уводит на нужный путь.
 */
export function App() {
  const { theme, setTheme } = useTheme();
  const { status, user, login, logout } = useAuth();
  const authenticated = status === 'authenticated';

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage theme={theme} onThemeChange={setTheme} onLogin={login} />
          )
        }
      />

      <Route
        element={
          <AppLayout
            authenticated={authenticated}
            theme={theme}
            onThemeChange={setTheme}
            user={user}
            onLogout={logout}
          />
        }
      >
        <Route
          path="/dashboard"
          element={
            <Suspense
              fallback={<div className="py-16 text-center text-sm text-fg-muted">Загрузка дашборда…</div>}
            >
              <DashboardPage />
            </Suspense>
          }
        />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/deals/:id" element={<DealDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/processes" element={<ProcessesPage />} />
        <Route path="/processes/:id" element={<ProcessDetailPage />} />
        <Route
          path="/calendar"
          element={
            <Suspense
              fallback={<div className="py-16 text-center text-sm text-fg-muted">Загрузка календаря…</div>}
            >
              <CalendarPage />
            </Suspense>
          }
        />
        <Route path="/bots" element={<BotsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
