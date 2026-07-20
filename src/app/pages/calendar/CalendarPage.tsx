import { useMemo, useRef, useState, type ComponentProps } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ruLocale from '@fullcalendar/core/locales/ru';
import type { EventContentArg, EventInput } from '@fullcalendar/core';
import {
  ApiError,
  updateDeal,
  updateProcess,
  updateProject,
  updateTask,
  type AgendaItem,
  type Deal,
  type Process,
  type Project,
  type Task,
} from '@app/api';
import { useAuth } from '@app/auth';
import { TaskFormDialog } from '../tasks/TaskFormDialog';
import { DealFormDialog } from '../deals/DealFormDialog';
import { ProjectFormDialog } from '../projects/ProjectFormDialog';
import { ClientFormDialog } from '../clients/ClientFormDialog';
import { ServiceFormDialog } from '../services/ServiceFormDialog';
import { ProcessFormDialog } from '../processes/ProcessFormDialog';
import { CalendarToolbar } from './CalendarToolbar';
import { CreateChooser, type CreateKind } from './CreateChooser';
import { Agenda } from './Agenda';
import { EventChip } from './EventChip';
import {
  dealToEvent,
  dealDropInput,
  processToEvent,
  processDropInput,
  projectToEvent,
  projectDropInput,
  taskToEvent,
  taskDropInput,
  toLocalDatetime,
  toYMD,
  type CalendarView,
  type EventMeta,
} from './model';
import { useCalendarAgenda, useCalendarGrid, type CalendarFilters } from './useCalendar';
import { useCalendarRefs } from './useCalendarRefs';
import './theme.css';

// Точные типы аргументов колбэков выводим из самих пропсов FullCalendar — так они гарантированно
// совпадают с внутренними типами обёртки (публичные *Arg из core конфликтуют дублем деклараций).
type FCProps = ComponentProps<typeof FullCalendar>;
type FCArg<K extends keyof FCProps> = NonNullable<FCProps[K]> extends (arg: infer A) => unknown ? A : never;

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Число дней вперёд, которые показывает «Повестка» от текущей опорной даты. */
const AGENDA_SPAN_DAYS = 60;

function shiftDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function atNine(d: Date): Date {
  const x = new Date(d);
  x.setHours(9, 0, 0, 0);
  return x;
}

const INITIAL_FILTERS: CalendarFilters = {
  layers: { task: true, deal: true, project: true, process: true },
  assignedTo: '',
  projectId: '',
  taskStatus: '',
  taskPriority: '',
  dealStatus: '',
  dealType: '',
  projectStatus: '',
  processStatus: '',
};

type TaskFormState = { open: boolean; task: Task | null; due?: string };
type DealFormState = { open: boolean; deal: Deal | null; close?: string };
type ProjectFormState = { open: boolean; project: Project | null; starts?: string; ends?: string };
type ProcessFormState = { open: boolean; process: Process | null; starts?: string; ends?: string };

export function CalendarPage() {
  const { token, logout } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);

  const [view, setView] = useState<CalendarView>('dayGridMonth');
  const [gridRange, setGridRange] = useState({ from: '', to: '' });
  const [gridTitle, setGridTitle] = useState('');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [filters, setFilters] = useState<CalendarFilters>(INITIAL_FILTERS);
  const [actionError, setActionError] = useState<string | null>(null);

  // Диалоги
  const [chooser, setChooser] = useState<{
    open: boolean;
    date: Date | null;
    endDate: Date | null;
    allDay: boolean;
  }>({ open: false, date: null, endDate: null, allDay: true });
  const [taskForm, setTaskForm] = useState<TaskFormState>({ open: false, task: null });
  const [dealForm, setDealForm] = useState<DealFormState>({ open: false, deal: null });
  const [projectForm, setProjectForm] = useState<ProjectFormState>({ open: false, project: null });
  const [processForm, setProcessForm] = useState<ProcessFormState>({ open: false, process: null });
  const [clientOpen, setClientOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const isAgenda = view === 'agenda';

  const agendaRange = useMemo(
    () => ({ from: toYMD(anchorDate), to: toYMD(shiftDays(anchorDate, AGENDA_SPAN_DAYS)) }),
    [anchorDate],
  );

  const grid = useCalendarGrid(gridRange, filters, !isAgenda);
  const agenda = useCalendarAgenda(agendaRange, filters.layers, isAgenda);
  const { refs, reload: reloadRefs } = useCalendarRefs();

  const events = useMemo<EventInput[]>(() => {
    const out: EventInput[] = [];
    for (const t of grid.tasks) {
      const e = taskToEvent(t);
      if (e) out.push(e);
    }
    for (const d of grid.deals) {
      const e = dealToEvent(d);
      if (e) out.push(e);
    }
    for (const p of grid.projects) {
      const e = projectToEvent(p);
      if (e) out.push(e);
    }
    for (const pr of grid.processes) {
      const e = processToEvent(pr);
      if (e) out.push(e);
    }
    return out;
  }, [grid.tasks, grid.deals, grid.projects, grid.processes]);

  const reloadAll = () => {
    grid.reload();
    agenda.reload();
  };

  // ─── Навигация ───
  const onPrev = () =>
    isAgenda ? setAnchorDate((d) => shiftDays(d, -30)) : calendarRef.current?.getApi().prev();
  const onNext = () =>
    isAgenda ? setAnchorDate((d) => shiftDays(d, 30)) : calendarRef.current?.getApi().next();
  const onToday = () => (isAgenda ? setAnchorDate(new Date()) : calendarRef.current?.getApi().today());
  const onView = (v: CalendarView) => {
    if (v !== 'agenda' && !isAgenda) calendarRef.current?.getApi().changeView(v);
    setView(v);
  };

  const agendaTitle = `${dateFmt.format(new Date(`${agendaRange.from}T00:00:00`))} — ${dateFmt.format(new Date(`${agendaRange.to}T00:00:00`))}`;
  const title = isAgenda ? agendaTitle : gridTitle;

  // ─── Обработчики FullCalendar ───
  const onDatesSet = (arg: FCArg<'datesSet'>) => {
    setGridRange({ from: toYMD(arg.start), to: toYMD(shiftDays(arg.end, -1)) });
    setGridTitle(arg.view.title);
    const api = calendarRef.current?.getApi();
    if (api) setAnchorDate(api.getDate());
  };

  const onSelect = (arg: FCArg<'select'>) => {
    calendarRef.current?.getApi().unselect();
    // Один день/слот (по сути клик) → меню создания с датой; несколько дней → меню с диапазоном
    // (проект/процесс получат период, задача/сделка — начальную дату).
    const oneDay = arg.end.getTime() - arg.start.getTime() <= 24 * 60 * 60 * 1000;
    setChooser({
      open: true,
      date: arg.start,
      endDate: oneDay ? null : shiftDays(arg.end, -1),
      allDay: arg.allDay,
    });
  };

  const onEventClick = (arg: FCArg<'eventClick'>) => {
    const meta = arg.event.extendedProps as EventMeta;
    if (meta.type === 'task') setTaskForm({ open: true, task: meta.raw });
    else if (meta.type === 'deal') setDealForm({ open: true, deal: meta.raw });
    else if (meta.type === 'project') setProjectForm({ open: true, project: meta.raw });
    else setProcessForm({ open: true, process: meta.raw });
  };

  const persistMove = async (meta: EventMeta, start: Date, end: Date | null, revert: () => void) => {
    if (!token) {
      revert();
      return;
    }
    setActionError(null);
    try {
      if (meta.type === 'task') await updateTask(token, taskDropInput(meta.raw, start));
      else if (meta.type === 'deal') await updateDeal(token, dealDropInput(meta.raw, start));
      else if (meta.type === 'project') await updateProject(token, projectDropInput(meta.raw, start, end));
      else await updateProcess(token, processDropInput(meta.raw, start, end));
      reloadAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      revert();
      setActionError('Не удалось перенести элемент — изменения отменены. Попробуйте ещё раз.');
    }
  };

  const onEventDrop = (arg: FCArg<'eventDrop'>) => {
    const meta = arg.event.extendedProps as EventMeta;
    if (!arg.event.start) {
      arg.revert();
      return;
    }
    void persistMove(meta, arg.event.start, arg.event.end, arg.revert);
  };

  const onEventResize = (arg: FCArg<'eventResize'>) => {
    const meta = arg.event.extendedProps as EventMeta;
    if (!arg.event.start) {
      arg.revert();
      return;
    }
    void persistMove(meta, arg.event.start, arg.event.end, arg.revert);
  };

  // ─── Создание из диалога выбора ───
  const onPickCreate = (kind: CreateKind) => {
    const { date, endDate, allDay } = chooser;
    setChooser({ open: false, date: null, endDate: null, allDay: true });
    const startYMD = date ? toYMD(date) : undefined;
    const endYMD = endDate ? toYMD(endDate) : undefined;
    if (kind === 'task') {
      setTaskForm({
        open: true,
        task: null,
        due: date ? toLocalDatetime(allDay ? atNine(date) : date) : undefined,
      });
    } else if (kind === 'deal') {
      setDealForm({ open: true, deal: null, close: startYMD });
    } else if (kind === 'project') {
      setProjectForm({ open: true, project: null, starts: startYMD, ends: endYMD });
    } else if (kind === 'process') {
      setProcessForm({ open: true, process: null, starts: startYMD, ends: endYMD });
    } else if (kind === 'client') setClientOpen(true);
    else setServiceOpen(true);
  };

  // Клик по элементу повестки → перейти к его дню в детальном виде.
  const onAgendaItemClick = (item: AgendaItem) => {
    setAnchorDate(new Date(item.start));
    setView('timeGridDay');
  };

  const activeError = isAgenda ? agenda.error : grid.error;
  const activeLoading = isAgenda ? agenda.isLoading : grid.isLoading;

  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Календарь</h1>
        <p className="mt-1 text-sm text-fg-secondary">Задачи, сделки и проекты на одной оси времени</p>
      </div>

      <CalendarToolbar
        title={title}
        view={view}
        onView={onView}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        users={refs.users}
        projects={refs.projects}
        onCreate={() => setChooser({ open: true, date: null, endDate: null, allDay: true })}
        isLoading={activeLoading}
      />

      {actionError ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-state-error-muted px-4 py-2.5 text-sm text-state-error">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="shrink-0 font-medium hover:underline">
            Скрыть
          </button>
        </div>
      ) : null}

      {activeError && !isAgenda ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-state-error-muted px-4 py-2.5 text-sm text-state-error">
          <span>{activeError}</span>
          <button type="button" onClick={reloadAll} className="shrink-0 font-medium hover:underline">
            Повторить
          </button>
        </div>
      ) : null}

      {isAgenda ? (
        <Agenda
          items={agenda.items}
          isLoading={agenda.isLoading}
          error={agenda.error}
          onItemClick={onAgendaItemClick}
        />
      ) : (
        <div className="bms-calendar rounded-lg border border-border-subtle bg-bg-1 p-2 shadow-sm sm:p-3">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isAgenda ? 'dayGridMonth' : view}
            initialDate={anchorDate}
            locale={ruLocale}
            headerToolbar={false}
            height="auto"
            events={events}
            eventContent={(arg: EventContentArg) => <EventChip arg={arg} />}
            eventDisplay="block"
            editable
            selectable
            selectMirror
            dayMaxEvents={3}
            nowIndicator
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            expandRows
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            datesSet={onDatesSet}
            select={onSelect}
            eventClick={onEventClick}
            eventDrop={onEventDrop}
            eventResize={onEventResize}
          />
        </div>
      )}

      {/* Диалог выбора создаваемой сущности */}
      <CreateChooser
        open={chooser.open}
        dateLabel={
          chooser.date
            ? chooser.endDate
              ? `${dateFmt.format(chooser.date)} — ${dateFmt.format(chooser.endDate)}`
              : dateFmt.format(chooser.date)
            : null
        }
        onPick={onPickCreate}
        onClose={() => setChooser({ open: false, date: null, endDate: null, allDay: true })}
      />

      {/* Формы датированных сущностей (создание с подставленной датой / редактирование) */}
      <TaskFormDialog
        open={taskForm.open}
        task={taskForm.task}
        projects={refs.projects}
        clients={refs.clients}
        deals={refs.deals}
        users={refs.users}
        services={refs.services}
        processes={refs.processes}
        defaultDueAt={taskForm.due}
        onClose={() => setTaskForm({ open: false, task: null })}
        onSaved={() => {
          setTaskForm({ open: false, task: null });
          reloadAll();
        }}
      />
      <DealFormDialog
        open={dealForm.open}
        deal={dealForm.deal}
        projects={refs.projects}
        clients={refs.clients}
        services={refs.services}
        users={refs.users}
        defaultCloseAt={dealForm.close}
        onClose={() => setDealForm({ open: false, deal: null })}
        onSaved={() => {
          setDealForm({ open: false, deal: null });
          reloadAll();
          reloadRefs();
        }}
      />
      <ProjectFormDialog
        open={projectForm.open}
        project={projectForm.project}
        defaultStartsAt={projectForm.starts}
        defaultEndsAt={projectForm.ends}
        onClose={() => setProjectForm({ open: false, project: null })}
        onSaved={() => {
          setProjectForm({ open: false, project: null });
          reloadAll();
          reloadRefs();
        }}
      />

      {/* Быстрое создание без даты */}
      <ClientFormDialog
        open={clientOpen}
        client={null}
        projects={refs.projects}
        onClose={() => setClientOpen(false)}
        onSaved={() => {
          setClientOpen(false);
          reloadRefs();
        }}
      />
      <ServiceFormDialog
        open={serviceOpen}
        service={null}
        projects={refs.projects}
        onClose={() => setServiceOpen(false)}
        onSaved={() => {
          setServiceOpen(false);
          reloadRefs();
        }}
      />
      <ProcessFormDialog
        open={processForm.open}
        process={processForm.process}
        projects={refs.projects}
        defaultStartsAt={processForm.starts}
        defaultEndsAt={processForm.ends}
        onClose={() => setProcessForm({ open: false, process: null })}
        onSaved={() => {
          setProcessForm({ open: false, process: null });
          reloadAll();
          reloadRefs();
        }}
      />
    </>
  );
}
