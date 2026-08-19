/**
 * Источник секретов: `env` из записи MCP-клиента (только env — не команда, не путь).
 *
 * Почему только env — см. `.agentic-planning/plan_mcp_dev_interface/README.md`,
 * раздел «Почему бандл берётся локальный, а из конфига клиента — только env»:
 * запись клиента на машине разработчика указывает на основной checkout, а
 * агент дорабатывает код в отдельном git worktree — команда/путь оттуда
 * запустили бы чужой код молча. Секреты (токены) получить иначе нельзя.
 */

import { ClaudeCodeConnector } from '@fractalizer/mcp-cli';
import type { MCPConnector } from '@fractalizer/mcp-cli';

/**
 * Исходы {@link resolveSecretsEnv}.
 *
 * Первые четыре исхода — прямая проекция {@link MCPConnector.getLaunchSpec}
 * (см. `packages/framework/cli/src/types/launch.types.ts`, `GetLaunchSpecResult`).
 * Пятый (`emptyEnv`) и шестой (`maskedEnv`) специфичны для dev-client и
 * закрывают один риск README плана — «клиент начнёт маскировать env в своём
 * выводе» — с двух сторон: env исчез целиком либо значения пришли уже
 * замаскированными (`TOKEN=***`). И то и другое — не приглашение запускать
 * сервер: дочерний процесс получил бы нерабочий токен и отказал бы в
 * аутентификации тихо. Различать от `notConnected` обязательно, иначе такой
 * отказ выглядит как «сервер просто не подключён».
 */
export type SecretsEnvOutcome =
  | { readonly outcome: 'ok'; readonly env: Record<string, string> }
  | { readonly outcome: 'notConnected' }
  | { readonly outcome: 'notStdio'; readonly transport: string }
  | { readonly outcome: 'unparsable'; readonly reason: string }
  | { readonly outcome: 'commandFailed'; readonly message: string }
  | { readonly outcome: 'emptyEnv' }
  | { readonly outcome: 'maskedEnv'; readonly keys: readonly string[] };

/**
 * Значение выглядит замаскированным клиентом: состоит только из маскирующих
 * символов (`***`, `•••`) либо содержит подряд идущие звёздочки — ни один
 * реальный токен так не выглядит.
 */
function looksMasked(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return /^[*\u2022]+$/.test(trimmed) || trimmed.includes('***');
}

/** Опции {@link resolveSecretsEnv}. */
export interface ResolveSecretsEnvOptions {
  /**
   * Фабрика коннектора — точка внедрения для тестов (по умолчанию
   * `new ClaudeCodeConnector(serverName)`, единственный клиент, реально
   * используемый на машинах разработки этого монорепо).
   */
  connectorFactory?: (serverName: string) => MCPConnector;
}

/**
 * Получить секреты (`env`) MCP-сервера из записи в Claude Code.
 *
 * Никогда не возвращает сырой вывод клиента наружу — он содержит `env`
 * целиком; наружу идёт либо готовый объект `env`, либо безопасное для
 * печати описание причины отказа.
 */
export async function resolveSecretsEnv(
  serverName: string,
  options: ResolveSecretsEnvOptions = {}
): Promise<SecretsEnvOutcome> {
  const makeConnector =
    options.connectorFactory ?? ((name: string): MCPConnector => new ClaudeCodeConnector(name));
  const connector = makeConnector(serverName);
  const result = await connector.getLaunchSpec();

  switch (result.outcome) {
    case 'notConnected':
      return { outcome: 'notConnected' };
    case 'notStdio':
      return { outcome: 'notStdio', transport: result.transport };
    case 'unparsable':
      return { outcome: 'unparsable', reason: result.reason };
    case 'commandFailed':
      return { outcome: 'commandFailed', message: result.message };
    case 'found': {
      const entries = Object.entries(result.spec.env);
      if (entries.length === 0) {
        return { outcome: 'emptyEnv' };
      }
      const maskedKeys = entries.filter(([, value]) => looksMasked(value)).map(([key]) => key);
      if (maskedKeys.length > 0) {
        return { outcome: 'maskedEnv', keys: maskedKeys };
      }
      return { outcome: 'ok', env: result.spec.env };
    }
  }
}
