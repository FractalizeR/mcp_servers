/**
 * User Service - сервис для работы с пользователями
 *
 * Ответственность:
 * - Проверка подключения к API (ping)
 * - Список пользователей организации (find) и batch-получение по login/uid (get)
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
import { PingOperation } from '#tracker_api/api_operations/user/ping.operation.js';
import type { PingResult } from '#tracker_api/api_operations/user/ping.operation.js';
import { FindUsersOperation } from '#tracker_api/api_operations/user/find-users.operation.js';
import { GetUsersOperation } from '#tracker_api/api_operations/user/get-users.operation.js';
import type { BatchUserResult } from '#tracker_api/api_operations/user/get-users.operation.js';
import type { FindUsersDto } from '#tracker_api/dto/index.js';
import type { UserWithUnknownFields, PaginatedResult } from '#tracker_api/entities/index.js';

@injectable()
export class UserService {
  constructor(
    @inject(PingOperation) private readonly pingOp: PingOperation,
    @inject(FindUsersOperation) private readonly findUsersOp: FindUsersOperation,
    @inject(GetUsersOperation) private readonly getUsersOp: GetUsersOperation
  ) {}

  /**
   * Проверяет подключение к API Яндекс.Трекера
   * @returns результат проверки
   */
  async ping(): Promise<PingResult> {
    return this.pingOp.execute();
  }

  /**
   * Получает список пользователей организации с пагинацией
   * @param params - параметры запроса (perPage, cursor, fetchAll, maxItems)
   * @returns страница пользователей + метаданные пагинации
   */
  async findUsers(params?: FindUsersDto): Promise<PaginatedResult<UserWithUnknownFields>> {
    return this.findUsersOp.execute(params);
  }

  /**
   * Получает несколько пользователей параллельно по login/uid
   * @param userIds - массив login/uid пользователей
   * @returns массив результатов (fulfilled | rejected) в том же порядке
   */
  async getUsers(userIds: string[]): Promise<BatchUserResult[]> {
    return this.getUsersOp.execute(userIds);
  }
}
