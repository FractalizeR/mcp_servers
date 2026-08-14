/**
 * Entity API Service - сервис для работы с Goal/Project/Portfolio (Entity API)
 *
 * Ответственность:
 * - Поиск/список, получение, создание, обновление, удаление записей Entity API
 * - Key Results цели (Goal.keyResultItems): получение/добавление/замена/очистка
 *
 * Архитектура: прямая инъекция операций через декораторы (@injectable + @inject),
 * без зависимостей от других сервисов — делегирование вызовов операциям.
 */

import { injectable, inject } from 'inversify';
import {
  FindEntitiesOperation,
  GetEntityOperation,
  CreateEntityOperation,
  UpdateEntityOperation,
  DeleteEntityOperation,
  GetGoalKeyResultsOperation,
  AddGoalKeyResultOperation,
  SetGoalKeyResultsOperation,
  ClearGoalKeyResultsOperation,
} from '#tracker_api/api_operations/entity-api/index.js';
import type { FindEntitiesResult } from '#tracker_api/api_operations/entity-api/index.js';
import type {
  FindEntitiesDto,
  GetEntityDto,
  CreateEntityDto,
  UpdateEntityDto,
  DeleteEntityDto,
  GetGoalKeyResultsDto,
  AddGoalKeyResultDto,
  SetGoalKeyResultsDto,
  ClearGoalKeyResultsDto,
  EntityApiOutput,
} from '#tracker_api/dto/entity-api/index.js';
import type { KeyResultItemWithUnknownFields } from '#tracker_api/entities/index.js';

@injectable()
export class EntityApiService {
  constructor(
    @inject(FindEntitiesOperation) private readonly findEntitiesOp: FindEntitiesOperation,
    @inject(GetEntityOperation) private readonly getEntityOp: GetEntityOperation,
    @inject(CreateEntityOperation) private readonly createEntityOp: CreateEntityOperation,
    @inject(UpdateEntityOperation) private readonly updateEntityOp: UpdateEntityOperation,
    @inject(DeleteEntityOperation) private readonly deleteEntityOp: DeleteEntityOperation,
    @inject(GetGoalKeyResultsOperation)
    private readonly getGoalKeyResultsOp: GetGoalKeyResultsOperation,
    @inject(AddGoalKeyResultOperation)
    private readonly addGoalKeyResultOp: AddGoalKeyResultOperation,
    @inject(SetGoalKeyResultsOperation)
    private readonly setGoalKeyResultsOp: SetGoalKeyResultsOperation,
    @inject(ClearGoalKeyResultsOperation)
    private readonly clearGoalKeyResultsOp: ClearGoalKeyResultsOperation
  ) {}

  async findEntities(dto: FindEntitiesDto): Promise<FindEntitiesResult> {
    return this.findEntitiesOp.execute(dto);
  }

  async getEntity(dto: GetEntityDto): Promise<EntityApiOutput> {
    return this.getEntityOp.execute(dto);
  }

  async createEntity(dto: CreateEntityDto): Promise<EntityApiOutput> {
    return this.createEntityOp.execute(dto);
  }

  async updateEntity(dto: UpdateEntityDto): Promise<EntityApiOutput> {
    return this.updateEntityOp.execute(dto);
  }

  async deleteEntity(dto: DeleteEntityDto): Promise<void> {
    return this.deleteEntityOp.execute(dto);
  }

  async getGoalKeyResults(
    dto: GetGoalKeyResultsDto
  ): Promise<readonly KeyResultItemWithUnknownFields[]> {
    return this.getGoalKeyResultsOp.execute(dto);
  }

  async addGoalKeyResult(
    dto: AddGoalKeyResultDto
  ): Promise<readonly KeyResultItemWithUnknownFields[]> {
    return this.addGoalKeyResultOp.execute(dto);
  }

  async setGoalKeyResults(
    dto: SetGoalKeyResultsDto
  ): Promise<readonly KeyResultItemWithUnknownFields[]> {
    return this.setGoalKeyResultsOp.execute(dto);
  }

  async clearGoalKeyResults(dto: ClearGoalKeyResultsDto): Promise<void> {
    return this.clearGoalKeyResultsOp.execute(dto);
  }
}
