/**
 * Base connector interface for MCP clients
 * @packageDocumentation
 */

import type { MCPClientInfo, ConnectionStatus } from '../../types/client.types.js';
import type { GetLaunchSpecResult, ServerLaunchSpec } from '../../types/launch.types.js';

/**
 * Базовый интерфейс для всех MCP коннекторов.
 *
 * Framework-агностичен к доменной модели: коннектор оперирует «универсальной»
 * спецификацией запуска {@link ServerLaunchSpec} (`{ command, args, env }`).
 * Маппинг доменных полей в эту спецификацию выполняет вызывающая сторона.
 *
 * @example
 * ```typescript
 * class MyConnector implements MCPConnector {
 *   async connect(spec: ServerLaunchSpec): Promise<void> {
 *     // запись spec в конфиг клиента
 *   }
 *   // ... остальные методы
 * }
 * ```
 */
export interface MCPConnector {
  /**
   * Получить информацию о MCP клиенте
   * @returns Метаданные клиента (имя, описание, платформы и т.д.)
   */
  getClientInfo(): MCPClientInfo;

  /**
   * Проверить, установлен ли клиент в системе
   * @returns true если клиент установлен
   */
  isInstalled(): Promise<boolean>;

  /**
   * Получить текущий статус подключения MCP сервера
   * @returns Статус подключения с деталями или ошибками
   */
  getStatus(): Promise<ConnectionStatus>;

  /**
   * Подключить MCP сервер к клиенту
   * Записывает спецификацию запуска в конфигурацию клиента.
   *
   * @param spec - Спецификация запуска MCP сервера
   * @throws Если клиент не установлен или спецификация невалидна
   */
  connect(spec: ServerLaunchSpec): Promise<void>;

  /**
   * Отключить MCP сервер от клиента
   * Удаляет конфигурацию из файла клиента.
   *
   * @throws Если клиент не установлен или сервер не подключен
   */
  disconnect(): Promise<void>;

  /**
   * Валидировать спецификацию запуска перед подключением
   * @param spec - Спецификация для проверки
   * @returns Массив ошибок валидации (пустой если валидация успешна)
   */
  validateLaunchSpec(spec: ServerLaunchSpec): Promise<string[]>;

  /**
   * Получить текущую записанную в конфиге клиента спецификацию запуска.
   * Используется командой `doctor` для самодиагностики (например, проверка
   * существования `command` на диске) и пакетом `@fractalizer/mcp-dev-client`
   * для получения секретов из `env` записи.
   *
   * @returns Различимый исход — см. {@link GetLaunchSpecResult}.
   */
  getLaunchSpec(): Promise<GetLaunchSpecResult>;
}
