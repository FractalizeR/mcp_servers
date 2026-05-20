/**
 * Адаптер `YandexWikiMCPConfig` → `ServerLaunchSpec`.
 *
 * Превращает доменную конфигурацию (собранную из промптов) в спецификацию
 * запуска MCP сервера (`{ command, args, env }`), пригодную для передачи в
 * framework-агностичный `connectCommand`.
 */

import type { ServerLaunchSpec } from '@fractalizer/mcp-cli';
import { ENV_VAR_NAMES } from '#config';
import type { YandexWikiMCPConfig } from './types.js';
import { defaultBundleResolver, type BundleResolver } from './bundle-resolver.js';

/**
 * Построить спецификацию запуска MCP сервера Yandex Wiki.
 *
 * Маппинг env (имена — из {@link ENV_VAR_NAMES}, источник истины — серверный
 * `config-loader`):
 *   - `token`                                → `YANDEX_WIKI_TOKEN` (всегда);
 *   - `orgId` + `orgType: 'yandex360'`       → `YANDEX_ORG_ID`;
 *   - `orgId` + `orgType: 'cloud'`           → `YANDEX_CLOUD_ORG_ID`;
 *   - `requestTimeout`                        → `REQUEST_TIMEOUT` (String(...));
 *   - `logLevel`    (непустой после trim)    → `LOG_LEVEL`.
 *
 * Важно: никогда не устанавливаем обе `YANDEX_ORG_ID` и `YANDEX_CLOUD_ORG_ID` —
 * сервер отвергает такую конфигурацию (`validateOrgIds`).
 *
 * @param config   Доменная конфигурация.
 * @param resolver Резолвер пути к бандлу (DI — для тестируемости).
 */
export function buildYwServerLaunch(
  config: YandexWikiMCPConfig,
  resolver: BundleResolver = defaultBundleResolver
): ServerLaunchSpec {
  const bundlePath = resolver();

  const env: Record<string, string> = {
    [ENV_VAR_NAMES.YANDEX_WIKI_TOKEN]: config.token,
  };

  const orgEnvName =
    config.orgType === 'cloud' ? ENV_VAR_NAMES.YANDEX_CLOUD_ORG_ID : ENV_VAR_NAMES.YANDEX_ORG_ID;
  env[orgEnvName] = config.orgId;

  if (config.requestTimeout !== undefined) {
    env[ENV_VAR_NAMES.REQUEST_TIMEOUT] = String(config.requestTimeout);
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
