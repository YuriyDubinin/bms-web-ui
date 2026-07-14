import {
  Building2,
  CalendarDays,
  FolderGit2,
  LayoutDashboard,
  ListChecks,
  Package,
  SlidersHorizontal,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/services', label: 'Services', icon: Package },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/users', label: 'Team', icon: UserCog },
  { to: '/settings/organization', label: 'Organization', icon: Building2 },
  { to: '/settings/custom-fields', label: 'Custom fields', icon: SlidersHorizontal },
];
