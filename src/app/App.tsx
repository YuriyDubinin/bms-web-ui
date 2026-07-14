import { Navigate, Route, Routes } from 'react-router-dom';
import { useTheme } from '@app/theme';
import { useAuth } from '@app/auth';
import { AppLayout } from '@app/layout';
import { LoginPage } from '@app/pages/LoginPage';
import { DashboardPage } from '@app/pages/DashboardPage';
import { ProjectsPage } from '@app/pages/projects';
import { ServicesPage } from '@app/pages/ServicesPage';
import { ClientsPage } from '@app/pages/ClientsPage';
import { DealsPage } from '@app/pages/DealsPage';
import { TasksPage } from '@app/pages/TasksPage';
import { CalendarPage } from '@app/pages/CalendarPage';
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/bots" element={<BotsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
