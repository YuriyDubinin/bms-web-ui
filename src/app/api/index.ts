export { api, ApiError } from './client';
export type { ApiErrorDetail } from './client';
export { login, logout, me } from './auth';
export type { Role, SessionUser, Session, MeResponse, LogoutResponse } from './auth';
export { listProjects, createProject, updateProject, deleteProject } from './projects';
export type {
  Project,
  ProjectStatus,
  ProjectSortBy,
  SortOrder,
  ProjectListParams,
  ProjectInput,
  UpdateProjectInput,
  DeleteProjectResponse,
  Pagination,
  Paginated,
} from './projects';
export { listServices, createService, updateService, deleteService } from './services';
export type {
  Service,
  ServiceStatus,
  ServiceSortBy,
  ServiceListParams,
  ServiceInput,
  UpdateServiceInput,
  DeleteServiceResponse,
} from './services';
export {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  listClientProjects,
  attachClientProject,
  detachClientProject,
} from './clients';
export type {
  Client,
  ClientStatus,
  ClientSubjectType,
  ClientSortBy,
  ClientListParams,
  ClientInput,
  UpdateClientInput,
  DeleteClientResponse,
  ClientProjectLinkResponse,
} from './clients';
export { listTasks, createTask, updateTask, deleteTask } from './tasks';
export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskSortBy,
  TaskListParams,
  TaskInput,
  UpdateTaskInput,
  DeleteTaskResponse,
} from './tasks';
export { listUsers } from './users';
export type { User, UserListParams } from './users';
export { listDeals, createDeal, updateDeal, deleteDeal } from './deals';
export type {
  Deal,
  DealStatus,
  DealType,
  DealSortBy,
  DealListParams,
  DealInput,
  UpdateDealInput,
  DeleteDealResponse,
} from './deals';
export {
  listProcesses,
  createProcess,
  updateProcess,
  deleteProcess,
  listProcessStages,
} from './processes';
export type {
  Process,
  ProcessStage,
  ProcessStatus,
  ProcessSortBy,
  ProcessListParams,
  ProcessInput,
  UpdateProcessInput,
  DeleteProcessResponse,
} from './processes';
export {
  getSummaryStats,
  getDealsStats,
  getClientsStats,
  getTasksStats,
  getProjectsStats,
  getServicesStats,
  getProcessesStats,
  getTimeseries,
} from './stats';
export type {
  StatsBucket,
  FinanceStat,
  StatsPeriod,
  SummaryStats,
  DealsStats,
  ClientsStats,
  TasksStats,
  ProjectsStats,
  ServicesStats,
  ProcessesStats,
  TimeseriesMetric,
  TimeseriesInterval,
  TimeseriesPoint,
  TimeseriesResponse,
  TimeseriesParams,
} from './stats';
export { getCalendarAgenda } from './calendar';
export type { CalendarEntityType, AgendaItem, AgendaParams } from './calendar';
export { API_BASE_URL } from './config';
