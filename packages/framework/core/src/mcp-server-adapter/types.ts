/**
 * Публичные типы адаптера MCP-сервера (пакет 4.1.B плана модернизации).
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolRegistry } from '../tool-registry/index.js';
import type { ResourceRegistry } from '../resources/index.js';
import type { PromptRegistry } from '../prompts/index.js';

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
  /**
   * Реестр провайдеров ресурсов — источник `resources/list`/`resources/read`/
   * `resources/templates/list` (пакет 5.1.A). Опционален: composition root
   * сервера, ещё не зарегистрировавший ни одного `ResourceProvider`
   * (следующая волна — пакет 5.1.C), получает пустой реестр по умолчанию —
   * капабилити `resources` при этом всё равно объявлена и отвечает на все
   * три метода (пустым списком/`ResourceNotFoundError`), а не "Method not
   * found" — так требует спека для объявленной капабилити.
   */
  resourceRegistry?: ResourceRegistry;
  /**
   * Реестр провайдеров промптов — источник `prompts/list`/`prompts/get`
   * (пакет 5.1.A). Опционален по тому же контракту, что и
   * `resourceRegistry`: composition root сервера, ещё не зарегистрировавший
   * ни одного `PromptProvider` (следующая волна — пакет 5.1.C), получает
   * пустой реестр по умолчанию — капабилити `prompts` при этом всё равно
   * объявлена и отвечает пустым списком/`ProtocolError(-32602)`, а не
   * "Method not found".
   */
  promptRegistry?: PromptRegistry;
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
