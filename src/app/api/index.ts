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
export { listClients, createClient, updateClient, deleteClient } from './clients';
export type {
  Client,
  ClientStatus,
  ClientSortBy,
  ClientListParams,
  ClientInput,
  UpdateClientInput,
  DeleteClientResponse,
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
  DealSortBy,
  DealListParams,
  DealInput,
  UpdateDealInput,
  DeleteDealResponse,
} from './deals';
export { API_BASE_URL } from './config';
