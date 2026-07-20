import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  listClients,
  listDeals,
  listProcesses,
  listProjects,
  listServices,
  listUsers,
  type Client,
  type Deal,
  type Process,
  type Project,
  type Service,
  type User,
} from '@app/api';
import { useAuth } from '@app/auth';

export type CalendarRefs = {
  projects: Project[];
  clients: Client[];
  deals: Deal[];
  services: Service[];
  users: User[];
  processes: Process[];
};

const EMPTY: CalendarRefs = {
  projects: [],
  clients: [],
  deals: [],
  services: [],
  users: [],
  processes: [],
};

/** Справочники — крупные списки, тянем один раз с запасом по размеру страницы. */
const REF_PAGE_SIZE = 200;

function pick<T>(r: PromiseSettledResult<{ items: T[] }>): T[] {
  return r.status === 'fulfilled' ? r.value.items : [];
}

/**
 * Справочники для форм создания/редактирования (проекты, клиенты, сделки, услуги,
 * операторы, процессы). Грузятся один раз в фоне и не блокируют рендер сетки —
 * к моменту, когда пользователь откроет форму, они обычно уже готовы.
 */
export function useCalendarRefs() {
  const { token, logout } = useAuth();
  const [refs, setRefs] = useState<CalendarRefs>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const { signal } = controller;
    const p = { page_size: REF_PAGE_SIZE };

    Promise.allSettled([
      listProjects(token, p, signal),
      listClients(token, p, signal),
      listDeals(token, p, signal),
      listServices(token, p, signal),
      listUsers(token, p, signal),
      listProcesses(token, p, signal),
    ]).then((results) => {
      if (signal.aborted) return;
      if (results.some((r) => r.status === 'rejected' && r.reason instanceof ApiError && r.reason.status === 401)) {
        void logout();
        return;
      }
      setRefs({
        projects: pick(results[0] as PromiseSettledResult<{ items: Project[] }>),
        clients: pick(results[1] as PromiseSettledResult<{ items: Client[] }>),
        deals: pick(results[2] as PromiseSettledResult<{ items: Deal[] }>),
        services: pick(results[3] as PromiseSettledResult<{ items: Service[] }>),
        users: pick(results[4] as PromiseSettledResult<{ items: User[] }>),
        processes: pick(results[5] as PromiseSettledResult<{ items: Process[] }>),
      });
    });

    return () => controller.abort();
  }, [token, logout, reloadKey]);

  return { refs, reload };
}
