export {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  attachTag,
  detachTag,
  useTagsQuery,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useAttachTag,
  useDetachTag,
  TAGS_QUERY_KEY,
} from './api';
export type { Tag, CreateTagInput, UpdateTagInput, TagListParams, DeleteTagResponse, AttachTagInput } from './model';
