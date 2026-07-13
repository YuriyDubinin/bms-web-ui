import { useDocumentTitle } from '@shared/lib';
import { MainTab } from './tabs/MainTab';

/**
 * Корневая страница раздела Core. Раньше делилась на табы Main / CI-CD —
 * теперь сразу показывает содержимое Main, без переключателей.
 */
export function CorePage() {
  useDocumentTitle('Core');
  return <MainTab />;
}
