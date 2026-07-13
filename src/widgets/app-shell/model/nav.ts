import {
  Cpu,
  DatabaseBackup,
  FileCog,
  FolderGit2,
  Package,
  Server,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: '/core', label: 'Core', icon: Cpu },
  { to: '/registry', label: 'Registry', icon: Package },
  { to: '/servers', label: 'Servers', icon: Server },
  { to: '/configs', label: 'Configs', icon: FileCog },
  { to: '/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/backups', label: 'Backups', icon: DatabaseBackup },
  { to: '/workflow', label: 'Workflow', icon: Workflow },
];
