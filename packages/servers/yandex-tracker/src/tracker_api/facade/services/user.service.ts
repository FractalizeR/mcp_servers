/**
 * User Service - сервис для работы с пользователями
 *
 * Ответственность:
 * - Проверка подключения к API (ping)
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

@injectable()
export class UserService {
  constructor(@inject(PingOperation) private readonly pingOp: PingOperation) {}

  /**
   * Проверяет подключение к API Яндекс.Трекера
   * @returns результат проверки
   */
  async ping(): Promise<PingResult> {
    return this.pingOp.execute();
  }
}
