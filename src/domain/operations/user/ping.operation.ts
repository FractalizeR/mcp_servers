/**
 * Операция проверки подключения к API
 *
 * Ответственность (SRP):
 * - ТОЛЬКО проверка подключения через /v3/myself
 * - ТОЛЬКО форматирование результата ping
 * - НЕТ других операций с пользователями
 */

import { BaseOperation } from '@domain/operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@domain/utils/entity-cache-key.js';
import type { User } from '@domain/entities/user.entity.js';
import type { ApiError } from '@types';

/**
 * Результат проверки подключения
 */
export interface PingResult {
  success: boolean;
  message: string;
}

export class PingOperation extends BaseOperation {
  /**
   * Выполняет проверку подключения к API
   * @returns результат проверки
   */
  async execute(): Promise<PingResult> {
    try {
      this.logger.info('Проверка подключения к API Яндекс.Трекера (v3)...');

      const user = await this.getCurrentUser();

      // Используем display name пользователя (всегда присутствует в API v3)
      const userName = user.display;

      this.logger.info('Подключение успешно', { user: userName });

      return {
        success: true,
        message: `Подключение к API Яндекс.Трекера v3 успешно. Пользователь: ${userName}`,
      };
    } catch (error) {
      const apiError = error as ApiError;
      this.logger.error('Ошибка подключения к API', apiError);

      return {
        success: false,
        message: `Ошибка подключения: ${apiError.message} (код: ${apiError.statusCode})`,
      };
    }
  }

  /**
   * Вспомогательный метод для получения текущего пользователя
   * Используется внутри ping для проверки подключения
   */
  private async getCurrentUser(): Promise<User> {
    const cacheKey = EntityCacheKey.createKey(EntityType.USER, 'myself');

    return this.withCache(cacheKey, async () => {
      return this.withRetry(() =>
        this.httpClient.get<User>('/v3/myself')
      );
    });
  }
}
