/**
 * Component Service - сервис для работы с компонентами очередей
 *
 * Ответственность:
 * - Получение списка компонентов очереди
 * - Создание компонента
 * - Обновление компонента
 * - Удаление компонента
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
import { GetComponentsOperation } from '#tracker_api/api_operations/component/get-components.operation.js';
import { CreateComponentOperation } from '#tracker_api/api_operations/component/create-component.operation.js';
import { UpdateComponentOperation } from '#tracker_api/api_operations/component/update-component.operation.js';
import { DeleteComponentOperation } from '#tracker_api/api_operations/component/delete-component.operation.js';
import type { ComponentOutput, ComponentsListOutput } from '#tracker_api/dto/index.js';

@injectable()
export class ComponentService {
  constructor(
    @inject(GetComponentsOperation) private readonly getComponentsOp: GetComponentsOperation,
    @inject(CreateComponentOperation) private readonly createOp: CreateComponentOperation,
    @inject(UpdateComponentOperation) private readonly updateOp: UpdateComponentOperation,
    @inject(DeleteComponentOperation) private readonly deleteOp: DeleteComponentOperation
  ) {}

  /**
   * Получает список компонентов очереди
   * @param queueId - ключ или ID очереди
   * @returns массив компонентов очереди
   */
  async getComponents(params: { queueId: string }): Promise<ComponentsListOutput> {
    return this.getComponentsOp.execute(params.queueId);
  }

  /**
   * Создаёт новый компонент в очереди
   * @param queueId - ключ или ID очереди
   * @param componentData - данные компонента
   * @returns созданный компонент
   */
  async createComponent(params: {
    queueId: string;
    name: string;
    description?: string | undefined;
    lead?: string | undefined;
    assignAuto?: boolean | undefined;
  }): Promise<ComponentOutput> {
    const { queueId, ...componentData } = params;
    return this.createOp.execute(queueId, componentData);
  }

  /**
   * Обновляет существующий компонент
   * @param componentId - ID компонента
   * @param componentData - данные для обновления
   * @returns обновлённый компонент
   */
  async updateComponent(params: {
    componentId: string;
    name?: string | undefined;
    description?: string | undefined;
    lead?: string | undefined;
    assignAuto?: boolean | undefined;
  }): Promise<ComponentOutput> {
    const { componentId, ...componentData } = params;
    return this.updateOp.execute(componentId, componentData);
  }

  /**
   * Удаляет компонент из очереди
   * @param componentId - ID компонента
   */
  async deleteComponent(params: { componentId: string }): Promise<void> {
    return this.deleteOp.execute(params.componentId);
  }
}
