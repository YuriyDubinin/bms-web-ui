import type { EntityType, SortOrder } from '@shared/api';

export type Link = {
  link_id: string;
  entity_id: string;
  linked_entity_id: string;
  linked_type: EntityType;
  relation_type: string;
  attributes: Record<string, unknown>;
  created_at: string;
};

export type CreateLinkInput = {
  src_entity_id: string;
  dst_entity_id: string;
  relation_type?: string;
  attributes?: Record<string, unknown>;
};

export type LinkListParams = {
  entity_id?: string;
  relation_type?: string;
  linked_type?: EntityType;
  page?: number;
  page_size?: number;
  order?: SortOrder;
};

export type DeleteLinkResponse = {
  id: string;
};
