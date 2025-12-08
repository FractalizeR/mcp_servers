/**
 * Base connector interface for MCP clients
 * @packageDocumentation
 */

import type {
  BaseMCPServerConfig,
  MCPClientInfo,
  ConnectionStatus,
} from '../../types/base.types.js';

/**
 * Базовый интерфейс для всех MCP коннекторов
 * Generic по типу конфигурации сервера
 *
 * @template TConfig - Тип конфигурации MCP сервера (расширяет BaseMCPServerConfig)
 *
 * @example
 * ```typescript
 * interface MyServerConfig extends BaseMCPServerConfig {
 *   apiKey: string;
 *   apiBase: string;
 * }
 *
 * class MyConnector implements MCPConnector<MyServerConfig> {
 *   // implementation
 * }
 * ```
 */
export interface MCPConnector<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig> {
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
   * Записывает конфигурацию в файл клиента
   *
   * @param config - Конфигурация MCP сервера
   * @throws Если клиент не установлен или конфигурация невалидна
   */
  connect(config: TConfig): Promise<void>;

  /**
   * Отключить MCP сервер от клиента
   * Удаляет конфигурацию из файла клиента
   *
   * @throws Если клиент не установлен или сервер не подключен
   */
  disconnect(): Promise<void>;

  /**
   * Валидировать конфигурацию перед подключением
   * @param config - Конфигурация для проверки
   * @returns Массив ошибок валидации (пустой если валидация успешна)
   */
  validateConfig(config: TConfig): Promise<string[]>;
}
