/**
 * Sprint Service - сервис для работы со спринтами
 *
 * Ответственность:
 * - Получение списка спринтов доски
 * - Получение спринта по ID
 * - Создание спринта
 * - Обновление спринта
 *
 * Архитектура:
 * - Прямая инъекция операций через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 * В отличие от Operations/Tools (ручная регистрация), новые сервисы
 * используют декораторы для более чистого и type-safe кода.
 */

import { injectable, inject } from 'inversify';
import { GetSprintsOperation } from '#tracker_api/api_operations/sprint/get-sprints.operation.js';
import { GetSprintOperation } from '#tracker_api/api_operations/sprint/get-sprint.operation.js';
import { CreateSprintOperation } from '#tracker_api/api_operations/sprint/create-sprint.operation.js';
import { UpdateSprintOperation } from '#tracker_api/api_operations/sprint/update-sprint.operation.js';
import { ManageSprintLifecycleOperation } from '#tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.js';
import type {
  CreateSprintDto,
  UpdateSprintDto,
  SprintOutput,
  SprintsListOutput,
  ManageSprintLifecycleDto,
} from '#tracker_api/dto/index.js';

@injectable()
export class SprintService {
  constructor(
    @inject(GetSprintsOperation)
    private readonly getSprintsOp: GetSprintsOperation,
    @inject(GetSprintOperation)
    private readonly getSprintOp: GetSprintOperation,
    @inject(CreateSprintOperation)
    private readonly createSprintOp: CreateSprintOperation,
    @inject(UpdateSprintOperation)
    private readonly updateSprintOp: UpdateSprintOperation,
    @inject(ManageSprintLifecycleOperation)
    private readonly manageLifecycleOp: ManageSprintLifecycleOperation
  ) {}

  /**
   * Получает список спринтов доски
   * @param boardId - идентификатор доски
   * @returns массив спринтов
   */
  async getSprints(boardId: string): Promise<SprintsListOutput> {
    return this.getSprintsOp.execute({ boardId });
  }

  /**
   * Получает спринт по ID
   * @param sprintId - идентификатор спринта
   * @returns данные спринта
   */
  async getSprint(sprintId: string): Promise<SprintOutput> {
    return this.getSprintOp.execute({ sprintId });
  }

  /**
   * Создает новый спринт
   * @param input - данные для создания спринта
   * @returns созданный спринт
   */
  async createSprint(input: CreateSprintDto): Promise<SprintOutput> {
    return this.createSprintOp.execute(input);
  }

  /**
   * Обновляет спринт
   * @param sprintId - идентификатор спринта
   * @param input - данные для обновления (тело PATCH, без version)
   * @param version - версия для оптимистичной блокировки (query-параметр);
   *   не передана — операция читает текущую версию сама
   * @returns обновленный спринт
   */
  async updateSprint(
    sprintId: string,
    input: UpdateSprintDto,
    version?: number
  ): Promise<SprintOutput> {
    return this.updateSprintOp.execute(sprintId, input, version);
  }

  /**
   * Управляет жизненным циклом спринта (старт/архивация/удаление)
   * @param dto - идентификатор спринта и действие
   * @returns обновлённый спринт для start/archive; `null` для delete
   */
  async manageSprintLifecycle(dto: ManageSprintLifecycleDto): Promise<SprintOutput | null> {
    return this.manageLifecycleOp.execute(dto);
  }
}
