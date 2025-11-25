import {
  // Page Operations
  GetPageOperation,
  GetPageByIdOperation,
  CreatePageOperation,
  UpdatePageOperation,
  DeletePageOperation,
  ClonePageOperation,
  AppendContentOperation,
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
] as const;
