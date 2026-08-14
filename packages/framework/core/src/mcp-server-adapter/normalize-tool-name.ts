/**
 * Нормализация имени инструмента — удаление префикса сервера, который
 * некоторые MCP-клиенты добавляют к имени tool (`"<server>:<tool>"`).
 * Перенесено из server/handlers.ts трёх серверов (пакет 4.1.B), обобщено
 * через явно переданные префиксы вместо импорта constants.ts конкретного
 * сервера.
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';

export interface NormalizedToolName {
  name: string;
  removedPrefix: string | null;
}

/**
 * @param originalName - имя инструмента, как его прислал клиент
 * @param serverPrefixes - список возможных префиксов (обычно
 *   `${serverName}:` и, если задано, `${serverDisplayName}:`)
 * @param logger - для debug-логирования факта нормализации
 */
export function normalizeToolName(
  originalName: string,
  serverPrefixes: readonly string[],
  logger: Logger
): NormalizedToolName {
  for (const prefix of serverPrefixes) {
    if (originalName.startsWith(prefix)) {
      const name = originalName.slice(prefix.length);
      logger.debug(`✂️  Убран префикс сервера`, {
        original: originalName,
        normalized: name,
        prefix,
      });
      return { name, removedPrefix: prefix };
    }
  }

  logger.debug(`ℹ️  Префикс не обнаружен (прямой вызов)`, { toolName: originalName });
  return { name: originalName, removedPrefix: null };
}
