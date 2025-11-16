/**
 * Операция проверки подключения к API
 *
 * Ответственность (SRP):
 * - ТОЛЬКО проверка подключения через /v3/myself
 * - ТОЛЬКО форматирование результата ping
 * - НЕТ других операций с пользователями
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { User } from '@tracker_api/entities/user.entity.js';
import type { ApiError, ServerConfig } from '@mcp-framework/infrastructure';

/**
 * Результат проверки подключения
 */
export interface PingResult {
  success: boolean;
  message: string;
}

export class PingOperation extends BaseOperation {
  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    cacheManager: ConstructorParameters<typeof BaseOperation>[1],
    logger: ConstructorParameters<typeof BaseOperation>[2],
    _config: ServerConfig // Принимаем для единообразия DI, но не используем
  ) {
    super(httpClient, cacheManager, logger);
  }
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
      // ВАЖНО: withRetry УДАЛЁН — retry уже внутри httpClient.get
      return this.httpClient.get<User>('/v3/myself');
    });
  }
}
