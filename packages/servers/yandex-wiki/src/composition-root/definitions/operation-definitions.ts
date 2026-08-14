import {
  // Page Operations
  GetPageOperation,
  GetPageByIdOperation,
  CreatePageOperation,
  UpdatePageOperation,
  DeletePageOperation,
  ClonePageOperation,
  AppendContentOperation,
  GetDescendantsByIdOperation,
  GetDescendantsBySlugOperation,
  // Grid Operations
  CreateGridOperation,
  GetGridOperation,
  UpdateGridOperation,
  DeleteGridOperation,
  AddRowsOperation,
  RemoveRowsOperation,
  AddColumnsOperation,
  RemoveColumnsOperation,
  UpdateCellsOperation,
  MoveRowsOperation,
  MoveColumnsOperation,
  CloneGridOperation,
  // Resource Operations
  GetResourcesOperation,
  // Search Operations
  SearchOperation,
  // Comment Operations
  GetCommentsOperation,
  CreateCommentOperation,
  GetCommentThreadOperation,
  DeleteCommentOperation,
  // Page Access Operations
  CreatePageAccessOperation,
  UpdatePageAccessOperation,
  DeletePageAccessOperation,
  DeleteAllPageAccessesOperation,
  // Attachment Operations
  UploadAttachmentOperation,
  DownloadAttachmentOperation,
  // Raw Operations
  RawApiRequestOperation,
} from '#wiki_api/api_operations/index.js';

/**
 * Все Operation классы для автоматической регистрации в DI
 */
export const OPERATION_CLASSES = [
  // Page Operations
  GetPageOperation,
  GetPageByIdOperation,
  CreatePageOperation,
  UpdatePageOperation,
  DeletePageOperation,
  ClonePageOperation,
  AppendContentOperation,
  GetDescendantsByIdOperation,
  GetDescendantsBySlugOperation,
  // Grid Operations
  CreateGridOperation,
  GetGridOperation,
  UpdateGridOperation,
  DeleteGridOperation,
  AddRowsOperation,
  RemoveRowsOperation,
  AddColumnsOperation,
  RemoveColumnsOperation,
  UpdateCellsOperation,
  MoveRowsOperation,
  MoveColumnsOperation,
  CloneGridOperation,
  // Resource Operations
  GetResourcesOperation,
  // Search Operations
  SearchOperation,
  // Comment Operations
  GetCommentsOperation,
  CreateCommentOperation,
  GetCommentThreadOperation,
  DeleteCommentOperation,
  // Page Access Operations
  CreatePageAccessOperation,
  UpdatePageAccessOperation,
  DeletePageAccessOperation,
  DeleteAllPageAccessesOperation,
  // Attachment Operations
  UploadAttachmentOperation,
  DownloadAttachmentOperation,
  // Raw Operations
  RawApiRequestOperation,
] as const;
