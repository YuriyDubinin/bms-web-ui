import type { NavIconName } from './icons';

export type NavItem = {
  path: string;
  label: string;
  icon: NavIconName;
};

/** Единый источник пунктов навигации — используется и в сайдбаре, и в мобильном drawer. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', label: 'Дашборд', icon: 'dashboard' },
  { path: '/projects', label: 'Проекты', icon: 'projects' },
  { path: '/services', label: 'Услуги', icon: 'services' },
  { path: '/clients', label: 'Клиенты', icon: 'clients' },
  { path: '/deals', label: 'Сделки', icon: 'deals' },
  { path: '/tasks', label: 'Задачи', icon: 'tasks' },
  { path: '/calendar', label: 'Календарь', icon: 'calendar' },
  // Временно скрыты из навигации (роуты и страницы сохранены, доступны по прямому URL):
  // { path: '/bots', label: 'Боты', icon: 'bots' },
  // { path: '/settings', label: 'Настройки', icon: 'settings' },
];
