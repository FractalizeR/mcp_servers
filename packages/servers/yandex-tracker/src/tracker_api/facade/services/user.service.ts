/**
 * User Service - сервис для работы с пользователями
 *
 * Ответственность:
 * - Проверка подключения к API (ping)
 *
 * Архитектура:
 * - Прямая инъекция операций (type-safe DI)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
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
