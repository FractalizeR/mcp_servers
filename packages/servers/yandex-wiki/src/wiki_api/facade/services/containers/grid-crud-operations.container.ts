/**
 * Grid CRUD Operations Container
 *
 * Groups CRUD operations for GridService.
 * Reduces constructor parameters.
 *
 * Pattern: Parameter Object
 */

import { injectable, inject } from 'inversify';
import {
  CreateGridOperation,
  GetGridOperation,
  UpdateGridOperation,
  DeleteGridOperation,
} from '#wiki_api/api_operations/index.js';

@injectable()
export class GridCrudOperationsContainer {
  constructor(
    @inject(CreateGridOperation) readonly create: CreateGridOperation,
    @inject(GetGridOperation) readonly get: GetGridOperation,
    @inject(UpdateGridOperation) readonly update: UpdateGridOperation,
    @inject(DeleteGridOperation) readonly remove: DeleteGridOperation
  ) {}
}
