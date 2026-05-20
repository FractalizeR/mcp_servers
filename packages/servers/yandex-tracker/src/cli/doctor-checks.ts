/**
 * Доменные проверки `doctor` для Yandex Tracker MCP сервера.
 *
 * Закрывают класс багов «бандл не найден» и «локальная конфигурация сломана»,
 * которые невозможно обнаружить universal-проверками framework'а.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DoctorCheck, DoctorCheckResult } from '@fractalizer/mcp-cli';
import { defaultBundleResolver } from './bundle-resolver.js';
import { PROJECT_BASE_NAME } from '../constants.js';

/**
 * Проверка: путь к бандлу резолвится без исключения.
 *
 * Использует {@link defaultBundleResolver} (`require.resolve` + fallback по
 * `import.meta.url`). При неудаче сообщает, что пакет нужно собрать или
 * переустановить.
 */
function checkBundleResolvable(): DoctorCheck {
  return {
    name: 'bundle-resolve',
    description: 'Путь к серверному бандлу разрешим через resolver',
    group: 'Yandex Tracker',
    run: async (): Promise<DoctorCheckResult> => {
      try {
        const resolved = defaultBundleResolver();
        return {
          status: 'ok',
          message: `Путь к бандлу разрешён: ${resolved}`,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          status: 'fail',
          message: 'Не удалось разрешить путь к бандлу сервера',
          details: message
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          hint: 'Соберите пакет (`npm run build`) или переустановите глобально (`npm install -g @fractalizer/mcp-server-yandex-tracker`).',
        };
      }
    },
  };
}

/**
 * Проверка: резолвнутый путь к бандлу доступен на чтение.
 *
 * Запускается после `bundle-resolve`. Если резолвер падает — `fail`; иначе
 * выполняется `fs.access(R_OK)`.
 */
function checkBundleAccessible(): DoctorCheck {
  return {
    name: 'bundle-accessible',
    description: 'Файл бандла существует и доступен на чтение',
    group: 'Yandex Tracker',
    run: async (): Promise<DoctorCheckResult> => {
      let resolved: string;
      try {
        resolved = defaultBundleResolver();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          status: 'fail',
          message: `Не удалось разрешить путь к бандлу: ${message.split('\n')[0]}`,
        };
      }

      try {
        await fs.access(resolved, fs.constants.R_OK);
        return {
          status: 'ok',
          message: `Файл бандла читаем: ${resolved}`,
        };
      } catch {
        return {
          status: 'fail',
          message: `Файл бандла недоступен на чтение: ${resolved}`,
          hint: 'Пересоберите пакет или переустановите глобально.',
        };
      }
    },
  };
}

/**
 * Проверка: сохранённая в `~/.{PROJECT_BASE_NAME}/config.json` доменная
 * конфигурация валидна (JSON + непустой `orgId`).
 *
 * Кейсы:
 *  - файл отсутствует → `warn` («запустите `connect`»);
 *  - JSON некорректен → `fail`;
 *  - `orgId` отсутствует/пустой → `fail`.
 */
function checkSavedConfig(): DoctorCheck {
  const configPath = path.join(os.homedir(), `.${PROJECT_BASE_NAME}`, 'config.json');

  return {
    name: 'config-file',
    description: 'Локальная сохранённая конфигурация валидна',
    group: 'Yandex Tracker',
    run: async (): Promise<DoctorCheckResult> => {
      let raw: string;
      try {
        raw = await fs.readFile(configPath, 'utf8');
      } catch (err) {
        if (isENOENT(err)) {
          return {
            status: 'warn',
            message: `Файл конфигурации не найден: ${configPath}`,
            hint: 'Запустите `mcp-tracker-connect connect`, чтобы сохранить конфигурацию.',
          };
        }
        return {
          status: 'fail',
          message: `Не удалось прочитать файл конфигурации: ${configPath}`,
          details: [err instanceof Error ? err.message : String(err)],
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        return {
          status: 'fail',
          message: `Файл конфигурации содержит невалидный JSON: ${configPath}`,
          details: [err instanceof Error ? err.message : String(err)],
          hint: 'Удалите файл и выполните `connect` повторно.',
        };
      }

      if (!isPlainObject(parsed)) {
        return {
          status: 'fail',
          message: `Корень конфигурации не является объектом: ${configPath}`,
          hint: 'Удалите файл и выполните `connect` повторно.',
        };
      }

      const orgId = parsed['orgId'];
      if (typeof orgId !== 'string' || orgId.trim().length === 0) {
        return {
          status: 'fail',
          message: 'В конфигурации отсутствует или пуст `orgId`',
          details: [`Файл: ${configPath}`],
          hint: 'Запустите `connect` повторно — без `orgId` сервер не сможет обращаться к API.',
        };
      }

      return {
        status: 'ok',
        message: `Конфигурация валидна (orgId=${orgId})`,
        details: [`Файл: ${configPath}`],
      };
    },
  };
}

/**
 * Агрегатор доменных проверок Yandex Tracker для команды `doctor`.
 */
export function getYtDoctorChecks(): DoctorCheck[] {
  return [checkBundleResolvable(), checkBundleAccessible(), checkSavedConfig()];
}

// ----- internal helpers -----

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}
