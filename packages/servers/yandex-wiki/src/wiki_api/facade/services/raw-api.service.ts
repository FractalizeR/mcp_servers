/**
 * Raw API Service - сервис для прямого (raw) обращения к API Яндекс.Вики
 *
 * Ответственность:
 * - Делегирование raw-запроса соответствующей операции
 *
 * Архитектура:
 * - Прямая инъекция операции через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 */

import { injectable, inject } from 'inversify';
import { RawApiRequestOperation } from '#wiki_api/api_operations/index.js';
import type { RawApiRequestInput } from '@fractalizer/mcp-core';

@injectable()
export class RawApiService {
  constructor(
    @inject(RawApiRequestOperation) private readonly rawApiRequestOp: RawApiRequestOperation
  ) {}

  /**
   * Выполняет прямой запрос к API Яндекс.Вики.
   *
   * @param input - метод, путь и query-параметры
   * @returns необработанный ответ API
   */
  async request(input: RawApiRequestInput): Promise<unknown> {
    return this.rawApiRequestOp.request(input);
  }
}
