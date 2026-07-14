export type Tag = {
  id: string;
  name: string;
  color?: string;
  created_at: string;
};

export type CreateTagInput = {
  name: string;
  color?: string;
};

export type UpdateTagInput = CreateTagInput & { id: string };

export type TagListParams = {
  entity_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
  order?: 'asc' | 'desc';
};

export type DeleteTagResponse = {
  id: string;
};

export type AttachTagInput = {
  tag_id: string;
  entity_id: string;
};
