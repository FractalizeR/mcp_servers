import { injectable, inject } from 'inversify';
import { GridCrudOperationsContainer } from './containers/grid-crud-operations.container.js';
import { GridDataOperationsContainer } from './containers/grid-data-operations.container.js';
import type { GetGridParams, DeleteGridResult } from '#wiki_api/api_operations/index.js';
import type { GridWithUnknownFields, AsyncOperation } from '#wiki_api/entities/index.js';
import type {
  CreateGridDto,
  UpdateGridDto,
  AddRowsDto,
  RemoveRowsDto,
  AddColumnsDto,
  RemoveColumnsDto,
  UpdateCellsDto,
  MoveRowDto,
  MoveColumnDto,
  CloneGridDto,
} from '#wiki_api/dto/index.js';

@injectable()
export class GridService {
  constructor(
    @inject(GridCrudOperationsContainer) private readonly crudOps: GridCrudOperationsContainer,
    @inject(GridDataOperationsContainer) private readonly dataOps: GridDataOperationsContainer
  ) {}

  async createGrid(data: CreateGridDto): Promise<GridWithUnknownFields> {
    return this.crudOps.create.execute(data);
  }

  async getGrid(params: GetGridParams): Promise<GridWithUnknownFields> {
    return this.crudOps.get.execute(params);
  }

  async updateGrid(idx: string, data: UpdateGridDto): Promise<GridWithUnknownFields> {
    return this.crudOps.update.execute(idx, data);
  }

  async deleteGrid(idx: string): Promise<DeleteGridResult> {
    return this.crudOps.remove.execute(idx);
  }

  async addRows(idx: string, data: AddRowsDto): Promise<GridWithUnknownFields> {
    return this.dataOps.addRows.execute(idx, data);
  }

  async removeRows(idx: string, data: RemoveRowsDto): Promise<GridWithUnknownFields> {
    return this.dataOps.removeRows.execute(idx, data);
  }

  async addColumns(idx: string, data: AddColumnsDto): Promise<GridWithUnknownFields> {
    return this.dataOps.addColumns.execute(idx, data);
  }

  async removeColumns(idx: string, data: RemoveColumnsDto): Promise<GridWithUnknownFields> {
    return this.dataOps.removeColumns.execute(idx, data);
  }

  async updateCells(idx: string, data: UpdateCellsDto): Promise<GridWithUnknownFields> {
    return this.dataOps.updateCells.execute(idx, data);
  }

  async moveRows(idx: string, data: MoveRowDto): Promise<GridWithUnknownFields> {
    return this.dataOps.moveRows.execute(idx, data);
  }

  async moveColumns(idx: string, data: MoveColumnDto): Promise<GridWithUnknownFields> {
    return this.dataOps.moveColumns.execute(idx, data);
  }

  async cloneGrid(idx: string, data: CloneGridDto): Promise<AsyncOperation> {
    return this.dataOps.clone.execute(idx, data);
  }
}
