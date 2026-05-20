/**
 * Адаптер `TickTickMCPConfig` → `ServerLaunchSpec`.
 *
 * Превращает доменную конфигурацию (собранную из промптов) в спецификацию
 * запуска MCP сервера (`{ command, args, env }`), пригодную для передачи в
 * framework-агностичный `connectCommand`.
 */

import type { ServerLaunchSpec } from '@fractalizer/mcp-cli';
import { ENV_VAR_NAMES } from '#config';
import type { TickTickMCPConfig } from './types.js';
import { defaultBundleResolver, type BundleResolver } from './bundle-resolver.js';

/**
 * Построить спецификацию запуска MCP сервера TickTick.
 *
 * Маппинг env (имена — из {@link ENV_VAR_NAMES}, источник истины — серверный
 * `config-loader`):
 *   - `clientId`                              → `TICKTICK_CLIENT_ID` (всегда);
 *   - `clientSecret`                          → `TICKTICK_CLIENT_SECRET` (всегда);
 *   - `redirectUri` (непустой после trim)     → `TICKTICK_REDIRECT_URI`;
 *   - `logLevel`    (непустой после trim)     → `LOG_LEVEL`.
 *
 * Поля `TICKTICK_ACCESS_TOKEN` и `TICKTICK_REFRESH_TOKEN` сервер получает в
 * результате OAuth flow (на этапе CLI не собираются — они не в доменной модели).
 *
 * @param config   Доменная конфигурация.
 * @param resolver Резолвер пути к бандлу (DI — для тестируемости).
 */
export function buildTickTickServerLaunch(
  config: TickTickMCPConfig,
  resolver: BundleResolver = defaultBundleResolver
): ServerLaunchSpec {
  const bundlePath = resolver();

  const env: Record<string, string> = {
    [ENV_VAR_NAMES.TICKTICK_CLIENT_ID]: config.clientId,
    [ENV_VAR_NAMES.TICKTICK_CLIENT_SECRET]: config.clientSecret,
  };

  const redirectUri = config.redirectUri?.trim();
  if (redirectUri && redirectUri.length > 0) {
    env[ENV_VAR_NAMES.TICKTICK_REDIRECT_URI] = redirectUri;
  }

  const logLevel = config.logLevel?.trim();
  if (logLevel && logLevel.length > 0) {
    env[ENV_VAR_NAMES.LOG_LEVEL] = logLevel;
  }

  return {
    command: 'node',
    args: [bundlePath],
    env,
  };
}
