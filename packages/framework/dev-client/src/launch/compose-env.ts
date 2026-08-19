/**
 * Композиция окружения дочернего процесса: родительское окружение + секреты записи.
 *
 * Полностью подменять окружение нельзя — сервер останется без `PATH`, `HOME`,
 * прокси и `NODE_EXTRA_CA_CERTS`, что на машине с split-tunnel VPN даёт ложные
 * падения (см. README плана, раздел «Резолв запуска»). Секреты записи
 * побеждают при коллизии ключей — они специфичнее родительского окружения.
 */

/**
 * Собрать итоговое окружение дочернего процесса.
 *
 * @param secretsEnv - `env` из записи MCP-клиента (см. {@link resolveSecretsEnv}).
 * @param parentEnv - Родительское окружение. По умолчанию `process.env`;
 *   параметризовано для тестируемости без монки-патчинга глобального `process.env`.
 */
export function composeEnv(
  secretsEnv: Record<string, string>,
  parentEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const composed: Record<string, string> = {};
  for (const [key, value] of Object.entries(parentEnv)) {
    if (value !== undefined) {
      composed[key] = value;
    }
  }
  return { ...composed, ...secretsEnv };
}
