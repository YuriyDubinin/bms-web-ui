import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  attachClientProject,
  detachClientProject,
  listClientProjects,
  type Project,
} from '@app/api';
import { useAuth } from '@app/auth';
import { SelectSearch } from '@app/ui';
import { StatusChip } from '../projects/StatusChip';

/**
 * Блок «Проекты клиента» (M:N): показывает все проекты, с которыми связан клиент —
 * основной (project_id из записи) + дополнительные членства. Управление членствами
 * (attach/detach) — немедленные операции. Основной проект меняется через селект формы
 * («Основной проект») и сохранение — поэтому у основного кнопки «Убрать» нет.
 */
export function ClientProjectsField({
  clientId,
  mainProjectId,
  allProjects,
}: {
  clientId: string;
  /** Текущее значение «основного проекта» (из селекта формы) — для бейджа и запрета detach. */
  mainProjectId: string;
  allProjects: Project[];
}) {
  const { token, logout } = useAuth();
  const [members, setMembers] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError(null);
    listClientProjects(token, clientId, signal)
      .then((items) => {
        if (!signal.aborted) setMembers(items);
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void logout();
          return;
        }
        setError('Не удалось загрузить проекты клиента.');
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, clientId, logout]);

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of allProjects) map.set(p.id, p);
    return map;
  }, [allProjects]);

  // Отображаем: основной (если задан) сверху + остальные членства. Основной берём из справочника,
  // даже если он ещё не в списке членств (только что выбран в селекте и не сохранён).
  const display = useMemo(() => {
    const main = mainProjectId ? (members.find((p) => p.id === mainProjectId) ?? projectById.get(mainProjectId)) : undefined;
    const others = members.filter((p) => p.id !== mainProjectId);
    return [...(main ? [main] : []), ...others];
  }, [members, mainProjectId, projectById]);

  const shownIds = useMemo(() => new Set(display.map((p) => p.id)), [display]);
  const available = useMemo(
    () => allProjects.filter((p) => !shownIds.has(p.id)),
    [allProjects, shownIds],
  );

  const runLink = async (projectId: string, action: 'attach' | 'detach') => {
    if (!token || busyId) return;
    setBusyId(projectId);
    setError(null);
    try {
      if (action === 'attach') {
        await attachClientProject(token, clientId, projectId);
        const proj = projectById.get(projectId);
        if (proj) setMembers((prev) => (prev.some((p) => p.id === projectId) ? prev : [...prev, proj]));
      } else {
        await detachClientProject(token, clientId, projectId);
        setMembers((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      setError(
        action === 'attach'
          ? 'Не удалось добавить клиента в проект.'
          : 'Не удалось убрать клиента из проекта.',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-md border border-border-subtle bg-bg-2" />
          ))}
        </div>
      ) : display.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {display.map((p) => {
            const isMain = p.id === mainProjectId;
            const busy = busyId === p.id;
            return (
              <li
                key={p.id}
                className="flex min-w-0 items-center gap-3 rounded-md border border-border-subtle bg-bg-1 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-fg-primary">{p.name}</span>
                <StatusChip status={p.status} />
                {isMain ? (
                  <span className="shrink-0 rounded-full bg-accent-muted px-2 py-0.5 text-[11px] font-medium text-accent">
                    Основной
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void runLink(p.id, 'detach')}
                    disabled={busy}
                    className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-fg-muted transition-colors hover:text-state-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  >
                    {busy ? '…' : 'Убрать'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-fg-muted">Клиент пока не связан ни с одним проектом.</p>
      )}

      {available.length > 0 ? (
        <SelectSearch
          value=""
          ariaLabel="Добавить в проект"
          placeholder="＋ Добавить в проект"
          searchPlaceholder="Поиск проекта…"
          disabled={!!busyId}
          onChange={(v) => {
            if (v) void runLink(v, 'attach');
          }}
          options={[
            { value: '', label: '＋ Добавить в проект' },
            ...available.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      ) : null}

      {error ? <p className="text-xs text-state-error">{error}</p> : null}
    </div>
  );
}
