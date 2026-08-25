/**
 * Field Service - сервис для работы с полями трекера
 *
 * Ответственность:
 * - Получение списка всех полей (системных и кастомных)
 * - Получение конкретного поля
 * - Создание кастомного поля
 * - Обновление поля
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
import { GetFieldsOperation } from '#tracker_api/api_operations/field/get-fields.operation.js';
import { GetFieldOperation } from '#tracker_api/api_operations/field/get-field.operation.js';
import { CreateFieldOperation } from '#tracker_api/api_operations/field/create-field.operation.js';
import { UpdateFieldOperation } from '#tracker_api/api_operations/field/update-field.operation.js';
import type {
  FieldsListOutput,
  FieldOutput,
  CreateFieldDto,
  UpdateFieldDto,
} from '#tracker_api/dto/index.js';

@injectable()
export class FieldService {
  constructor(
    @inject(GetFieldsOperation) private readonly getFieldsOp: GetFieldsOperation,
    @inject(GetFieldOperation) private readonly getFieldOp: GetFieldOperation,
    @inject(CreateFieldOperation) private readonly createOp: CreateFieldOperation,
    @inject(UpdateFieldOperation) private readonly updateOp: UpdateFieldOperation
  ) {}

  /**
   * Получает список всех полей трекера
   * @returns массив всех полей (системных и кастомных)
   */
  async getFields(): Promise<FieldsListOutput> {
    return this.getFieldsOp.execute();
  }

  /**
   * Получает поле по ID
   * @param fieldId - идентификатор поля
   * @returns данные поля
   */
  async getField(fieldId: string): Promise<FieldOutput> {
    return this.getFieldOp.execute(fieldId);
  }

  /**
   * Создает кастомное поле
   * @param input - данные для создания поля
   * @returns созданное поле
   */
  async createField(input: CreateFieldDto): Promise<FieldOutput> {
    return this.createOp.execute(input);
  }

  /**
   * Обновляет поле
   * @param fieldId - идентификатор поля
   * @param input - данные для обновления
   * @returns обновленное поле
   */
  async updateField(fieldId: string, input: UpdateFieldDto): Promise<FieldOutput> {
    return this.updateOp.execute(fieldId, input);
  }
}
