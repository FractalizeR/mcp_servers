import { injectable, inject } from 'inversify';
import {
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
} from '#wiki_api/api_operations/index.js';
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
    @inject(CreateGridOperation) private readonly createGridOp: CreateGridOperation,
    @inject(GetGridOperation) private readonly getGridOp: GetGridOperation,
    @inject(UpdateGridOperation) private readonly updateGridOp: UpdateGridOperation,
    @inject(DeleteGridOperation) private readonly deleteGridOp: DeleteGridOperation,
    @inject(AddRowsOperation) private readonly addRowsOp: AddRowsOperation,
    @inject(RemoveRowsOperation) private readonly removeRowsOp: RemoveRowsOperation,
    @inject(AddColumnsOperation) private readonly addColumnsOp: AddColumnsOperation,
    @inject(RemoveColumnsOperation) private readonly removeColumnsOp: RemoveColumnsOperation,
    @inject(UpdateCellsOperation) private readonly updateCellsOp: UpdateCellsOperation,
    @inject(MoveRowsOperation) private readonly moveRowsOp: MoveRowsOperation,
    @inject(MoveColumnsOperation) private readonly moveColumnsOp: MoveColumnsOperation,
    @inject(CloneGridOperation) private readonly cloneGridOp: CloneGridOperation
  ) {}

  async createGrid(data: CreateGridDto): Promise<GridWithUnknownFields> {
    return this.createGridOp.execute(data);
  }

  async getGrid(params: GetGridParams): Promise<GridWithUnknownFields> {
    return this.getGridOp.execute(params);
  }

  async updateGrid(idx: string, data: UpdateGridDto): Promise<GridWithUnknownFields> {
    return this.updateGridOp.execute(idx, data);
  }

  async deleteGrid(idx: string): Promise<DeleteGridResult> {
    return this.deleteGridOp.execute(idx);
  }

  async addRows(idx: string, data: AddRowsDto): Promise<GridWithUnknownFields> {
    return this.addRowsOp.execute(idx, data);
  }

  async removeRows(idx: string, data: RemoveRowsDto): Promise<GridWithUnknownFields> {
    return this.removeRowsOp.execute(idx, data);
  }

  async addColumns(idx: string, data: AddColumnsDto): Promise<GridWithUnknownFields> {
    return this.addColumnsOp.execute(idx, data);
  }

  async removeColumns(idx: string, data: RemoveColumnsDto): Promise<GridWithUnknownFields> {
    return this.removeColumnsOp.execute(idx, data);
  }

  async updateCells(idx: string, data: UpdateCellsDto): Promise<GridWithUnknownFields> {
    return this.updateCellsOp.execute(idx, data);
  }

  async moveRows(idx: string, data: MoveRowDto): Promise<GridWithUnknownFields> {
    return this.moveRowsOp.execute(idx, data);
  }

  async moveColumns(idx: string, data: MoveColumnDto): Promise<GridWithUnknownFields> {
    return this.moveColumnsOp.execute(idx, data);
  }

  async cloneGrid(idx: string, data: CloneGridDto): Promise<AsyncOperation> {
    return this.cloneGridOp.execute(idx, data);
  }
}
