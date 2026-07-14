import type { SortOrder } from '@shared/api';

export const PROJECT_STATUSES = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Project = {
  id: string;
  name: string;
  slug?: string;
  direction?: string;
  description?: string;
  status: ProjectStatus;
  attributes: Record<string, unknown>;
  /** YYYY-MM-DD */
  starts_at: string | null;
  /** YYYY-MM-DD */
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectSortBy = 'created_at' | 'updated_at' | 'name' | 'status';

export type ProjectListParams = {
  page?: number;
  page_size?: number;
  status?: ProjectStatus;
  search?: string;
  sort_by?: ProjectSortBy;
  order?: SortOrder;
};

export type CreateProjectInput = {
  name: string;
  slug?: string;
  direction?: string;
  description?: string;
  status?: ProjectStatus;
  attributes?: Record<string, unknown>;
  starts_at?: string;
  ends_at?: string;
};

export type UpdateProjectInput = CreateProjectInput & { id: string };

export type DeleteProjectResponse = {
  id: string;
  deleted_at: string;
};
