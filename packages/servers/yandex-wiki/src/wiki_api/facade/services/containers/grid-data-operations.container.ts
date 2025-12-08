/**
 * Grid Data Operations Container
 *
 * Groups row/column/cell operations for GridService.
 * Reduces constructor parameters.
 *
 * Pattern: Parameter Object
 */

import { injectable, inject } from 'inversify';
import {
  AddRowsOperation,
  RemoveRowsOperation,
  AddColumnsOperation,
  RemoveColumnsOperation,
  UpdateCellsOperation,
  MoveRowsOperation,
  MoveColumnsOperation,
  CloneGridOperation,
} from '#wiki_api/api_operations/index.js';

@injectable()
export class GridDataOperationsContainer {
  constructor(
    @inject(AddRowsOperation) readonly addRows: AddRowsOperation,
    @inject(RemoveRowsOperation) readonly removeRows: RemoveRowsOperation,
    @inject(AddColumnsOperation) readonly addColumns: AddColumnsOperation,
    @inject(RemoveColumnsOperation) readonly removeColumns: RemoveColumnsOperation,
    @inject(UpdateCellsOperation) readonly updateCells: UpdateCellsOperation,
    @inject(MoveRowsOperation) readonly moveRows: MoveRowsOperation,
    @inject(MoveColumnsOperation) readonly moveColumns: MoveColumnsOperation,
    @inject(CloneGridOperation) readonly clone: CloneGridOperation
  ) {}
}
