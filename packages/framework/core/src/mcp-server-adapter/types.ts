/**
 * Публичные типы адаптера MCP-сервера (пакет 4.1.B плана модернизации).
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolRegistry } from '../tool-registry/index.js';

/**
 * Параметры создания адаптера. Идентичность сервера (имя/версия) и
 * ToolRegistry/Logger передаёт composition root конкретного сервера —
 * сам адаптер не знает, Трекер это, Вики или TickTick.
 */
export interface McpServerAdapterOptions {
  /**
   * Техническое имя сервера (совпадает с MCP_SERVER_NAME каждого сервера) —
   * используется и как serverInfo.name, и как один из префиксов, которые
   * normalizeToolName снимает с имени инструмента.
   */
  serverName: string;
  /**
   * Отображаемое имя сервера (MCP_SERVER_DISPLAY_NAME) — второй возможный
   * префикс, добавляемый некоторыми MCP-клиентами к имени инструмента.
   * Опционально: у сервера может не быть отдельного display name.
   */
  serverDisplayName?: string;
  /** Версия сервера (обычно — версия из package.json конкретного сервера). */
  version: string;
  /** Реестр инструментов — источник tools/list и исполнитель tools/call. */
  toolRegistry: ToolRegistry;
  /** Logger сервера (Pino-обёртка из @fractalizer/mcp-infrastructure). */
  logger: Logger;
}

/**
 * Хендл запущенного адаптера.
 */
export interface McpServerAdapterHandle {
  /**
   * Запускает сервер: подключает stdio-транспорт и ждёт входящих запросов.
   * Резолвится сразу после успешного connect (не блокируется на всё время
   * жизни процесса) — сигнатура симметрична текущему `await server.connect(transport)`.
   */
  start(): Promise<void>;
}
