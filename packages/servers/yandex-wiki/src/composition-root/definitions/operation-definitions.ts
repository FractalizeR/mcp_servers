import {
  GetPageOperation,
  GetPageByIdOperation,
  CreatePageOperation,
  UpdatePageOperation,
  DeletePageOperation,
  ClonePageOperation,
  AppendContentOperation,
} from '#wiki_api/api_operations/index.js';

/**
 * Все Operation классы для автоматической регистрации в DI
 */
export const OPERATION_CLASSES = [
  GetPageOperation,
  GetPageByIdOperation,
  CreatePageOperation,
  UpdatePageOperation,
  DeletePageOperation,
  ClonePageOperation,
  AppendContentOperation,
] as const;
