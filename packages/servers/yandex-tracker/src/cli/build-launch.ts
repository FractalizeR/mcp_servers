/**
 * Адаптер `YandexTrackerMCPConfig` → `ServerLaunchSpec`.
 *
 * Превращает доменную конфигурацию (собранную из промптов) в спецификацию
 * запуска MCP сервера (`{ command, args, env }`), пригодную для передачи в
 * framework-агностичный `connectCommand`.
 */

import type { ServerLaunchSpec } from '@fractalizer/mcp-cli';
import { ENV_VAR_NAMES } from '#config';
import type { YandexTrackerMCPConfig } from './types.js';
import { defaultBundleResolver, type BundleResolver } from './bundle-resolver.js';

/**
 * Построить спецификацию запуска MCP сервера Yandex Tracker.
 *
 * Маппинг env (имена — из {@link ENV_VAR_NAMES}, источник истины — серверный
 * `config-loader`):
 *   - `token`                                → `YANDEX_TRACKER_TOKEN` (всегда);
 *   - `orgId` + `orgType: 'yandex360'`       → `YANDEX_ORG_ID`;
 *   - `orgId` + `orgType: 'cloud'`           → `YANDEX_CLOUD_ORG_ID`;
 *   - `apiBase`     (непустая после trim)    → `YANDEX_TRACKER_API_BASE`;
 *   - `requestTimeout`                        → `REQUEST_TIMEOUT` (String(...));
 *   - `logLevel`    (непустой после trim)    → `LOG_LEVEL`.
 *
 * Важно: никогда не устанавливаем обе `YANDEX_ORG_ID` и `YANDEX_CLOUD_ORG_ID` —
 * сервер отвергает такую конфигурацию (`validateOrgIds`).
 *
 * @param config   Доменная конфигурация.
 * @param resolver Резолвер пути к бандлу (DI — для тестируемости).
 */
export function buildYtServerLaunch(
  config: YandexTrackerMCPConfig,
  resolver: BundleResolver = defaultBundleResolver
): ServerLaunchSpec {
  const bundlePath = resolver();

  const env: Record<string, string> = {
    [ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]: config.token,
  };

  // orgId → одна из двух env-переменных в зависимости от типа организации.
  const orgEnvName =
    config.orgType === 'cloud' ? ENV_VAR_NAMES.YANDEX_CLOUD_ORG_ID : ENV_VAR_NAMES.YANDEX_ORG_ID;
  env[orgEnvName] = config.orgId;

  const apiBase = config.apiBase?.trim();
  if (apiBase && apiBase.length > 0) {
    env[ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE] = apiBase;
  }

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
