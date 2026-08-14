/**
 * Smoke Test: достижимость поля схемы (пакет 7.1.B плана
 * .agentic-planning/plan_mcp_2026_modernization/7.1_api_defects_parallel.md,
 * DoD п.2 — "ни один инструмент не принимает параметр, который не доезжает
 * до API: тест обходит реестр и сверяет поля схемы с тем, что реально
 * отправляет операция").
 *
 * Это тест именно того класса дефектов, который уже дважды всплыл
 * независимо в этом проекте (create_page терял is_silent/fields — пакет
 * 7.1.B №1; delete_page не поддерживал allow_recursive/recursive — №4):
 * поле объявлено в Zod-схеме инструмента, доходит до валидации, но
 * ОПЕРАЦИЯ его не пересылает в HTTP-запрос.
 *
 * Метод (см. tests/helpers/zod-value-generator.ts):
 * 1. Обходом TOOL_CLASSES (реестр, не список имён в коде) для каждого
 *    инструмента получить его РЕАЛЬНУЮ Zod-схему через getParamsSchema()
 *    (protected — вызывается через приведение типа, чтобы не дублировать
 *    источник истины отдельным импортом схемы).
 * 2. Сгенерировать ПОЛНОСТЬЮ заполненный (включая опциональные поля)
 *    валидный объект параметров.
 * 3. Выполнить tool.execute(params) через РЕАЛЬНЫЙ DI-контейнер (facade →
 *    service → operation) с замоканным только на уровне httpClient —
 *    дефект живёт между операцией и httpClient, поэтому мок на уровне
 *    facade его не поймал бы.
 * 4. Для каждого поля верхнего уровня схемы проверить, что его имя (как
 *    JSON-ключ или query-параметр) или его значение (для полей вроде `idx`,
 *    уходящих в URL path, а не как именованный ключ) присутствует в
 *    сериализованном представлении вызовов httpClient.
 *
 * Осознанные исключения (см. константы ниже) — не баг, а контракт:
 * PingTool/RawApiRequestTool не имеют доменной DTO-операции 1:1 с полем
 * схемы; responseFields/newContent — намеренно клиентские поля, к API
 * отношения не имеющие.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { z } from 'zod';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { ServerConfig } from '#config';
import { generateFullParams } from '#helpers/index.js';

/**
 * Инструменты вне общей проверки:
 * - PingTool — без параметров.
 * - RawApiRequestTool — generic escape-hatch фабрики @fractalizer/mcp-core
 *   (метод/путь ЯВЛЯЮТСЯ HTTP-запросом как есть, это не доменная DTO-модель,
 *   у которой поле может "потеряться" между операцией и httpClient; сам
 *   фреймворк вне набора файлов этого пакета).
 */
const EXCLUDED_TOOLS = new Set(['PingTool', 'RawApiRequestTool']);

/**
 * Поля, которые НЕ обязаны достигать HTTP-запроса — осознанно клиентские:
 * - responseFields (yw_get_page) — локальная фильтрация НАШЕГО ответа
 *   (ResponseFieldFilter), к Wiki API отношения не имеет.
 * - newContent (yw_diff_page) — сравнивается локально с уже прочитанным
 *   содержимым, документировано в схеме как "не сохраняется".
 */
const CLIENT_SIDE_ONLY_FIELDS: Record<string, string[]> = {
  yw_get_page: ['responseFields'],
  yw_diff_page: ['newContent'],
};

/**
 * Поля, которые операция пересылает под ДРУГИМ именем (вложенный DTO).
 * Значение — список альтернативных ключей, любого из которых достаточно.
 */
const RENAMED_FIELDS: Record<string, Record<string, string[]>> = {
  yw_append_content: {
    body_location: ['location'],
    section_id: ['id'],
    section_location: ['location'],
    anchor_name: ['name'],
    anchor_fallback: ['fallback'],
    anchor_regex: ['regex'],
  },
  yw_create_grid: {
    page_id: ['id'],
    page_slug: ['slug'],
  },
};

/**
 * Глубокий self-consistent stub: любое обращение к свойству (включая
 * цепочки типа `operation.operation.id`) возвращает новый stub, а не
 * бросает исключение. Используется как ответ httpClient — реальный ответ
 * API нас не интересует, тест проверяет только ИСХОДЯЩИЙ запрос.
 */
function createDeepStub(): unknown {
  const handler: ProxyHandler<Record<PropertyKey, unknown>> = {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return () => 'stub';
      if (prop === 'valueOf' || prop === 'toString') return () => 'stub';
      if (prop === 'then') return undefined;
      if (prop === Symbol.iterator) return undefined;
      if (prop === 'length') return 0;
      return createDeepStub();
    },
  };
  return new Proxy({}, handler);
}

function requestContainsKey(requestText: string, key: string): boolean {
  return requestText.includes(`"${key}"`) || requestText.includes(`${key}=`);
}

function fieldReachesWire(
  requestText: string,
  fieldName: string,
  candidateValue: unknown,
  renamedTo: string[] | undefined
): boolean {
  const candidateKeys = renamedTo ?? [fieldName];
  if (candidateKeys.some((key) => requestContainsKey(requestText, key))) {
    return true;
  }
  // Фолбэк для полей-идентификаторов, уходящих в URL path (idx и т.п.) —
  // ключа в теле/query нет, но само значение присутствует в пути запроса.
  if (typeof candidateValue === 'string' || typeof candidateValue === 'number') {
    return requestText.includes(String(candidateValue));
  }
  return false;
}

const fakeConfig: ServerConfig = {
  token: 'OAuth fake-token',
  orgId: 'fake-org',
  apiBase: 'https://api.wiki.yandex.net',
  requestTimeout: 30000,
  maxBatchSize: 50,
  maxConcurrentRequests: 10,
  logLevel: 'error',
  prettyLogs: false,
  logsDir: '/tmp/logs',
  logMaxSize: 10485760,
  logMaxFiles: 5,
  retryAttempts: 3,
  retryMinDelay: 1000,
  retryMaxDelay: 10000,
};

interface ToolWithParamsSchema {
  getParamsSchema?: () => z.ZodObject<z.ZodRawShape>;
}

describe('Schema → Wire Reachability (Smoke) — пакет 7.1.B DoD п.2', () => {
  beforeAll(() => {
    const missing = TOOL_CLASSES.filter(
      (ToolClass) => !EXCLUDED_TOOLS.has(ToolClass.name) && !ToolClass.METADATA?.name
    );
    expect(missing, 'Инструмент без METADATA.name — тест не может его проверить').toHaveLength(0);
  });

  TOOL_CLASSES.forEach((ToolClass) => {
    if (EXCLUDED_TOOLS.has(ToolClass.name)) {
      return;
    }

    it(`${ToolClass.METADATA.name}: каждое поле схемы доезжает до HTTP-запроса`, async () => {
      const container = await createContainer(fakeConfig);
      const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
      const httpClient = container.get<IHttpClient>(TYPES.HttpClient);

      const calls: string[] = [];
      const recordCall = (...args: unknown[]): unknown => {
        calls.push(JSON.stringify(args));
        return createDeepStub();
      };
      // IHttpClient (@fractalizer/mcp-infrastructure) реально реализует только
      // эти четыре метода — put в интерфейсе нет.
      (['get', 'post', 'patch', 'delete'] as const).forEach((method) => {
        vi.spyOn(httpClient, method).mockImplementation(
          (...args: unknown[]) => Promise.resolve(recordCall(...args)) as never
        );
      });

      const tool = toolRegistry.getTool(ToolClass.METADATA.name);
      expect(tool, `${ToolClass.METADATA.name} не найден в ToolRegistry`).toBeDefined();

      const schema = (tool as unknown as ToolWithParamsSchema).getParamsSchema?.();
      expect(schema, `${ToolClass.name}: getParamsSchema() не определён`).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const definedSchema = schema!;

      const params = generateFullParams(definedSchema);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await tool!.execute(params);
      expect(result.isError, `Вызов упал: ${JSON.stringify(result)}`).toBeFalsy();

      const requestText = calls.join('\n');
      const excludedFields = new Set(CLIENT_SIDE_ONLY_FIELDS[ToolClass.METADATA.name] ?? []);
      const renamedFields = RENAMED_FIELDS[ToolClass.METADATA.name] ?? {};

      for (const fieldName of Object.keys(definedSchema.shape)) {
        if (excludedFields.has(fieldName)) {
          continue;
        }
        const reached = fieldReachesWire(
          requestText,
          fieldName,
          params[fieldName],
          renamedFields[fieldName]
        );
        expect(
          reached,
          `Поле "${fieldName}" инструмента ${ToolClass.METADATA.name} не найдено ни в одном HTTP-запросе.\n` +
            `Запросы: ${requestText.slice(0, 1000)}`
        ).toBe(true);
      }
    });
  });
});
