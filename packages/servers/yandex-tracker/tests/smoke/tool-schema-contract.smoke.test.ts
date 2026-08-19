/**
 * Smoke Test: контракт JSON Schema 2020-12 (пакет 3.1.A/3.1.B плана
 * .agentic-planning/plan_mcp_2026_modernization/3.1_tool_contracts_parallel.md)
 *
 * Обходом реестра (TOOL_CLASSES, а не списком имён в коде) проверяет для
 * КАЖДОГО инструмента этого сервера:
 * 1. inputSchema — валидный документ JSON Schema draft 2020-12 (ajv компилирует
 *    его без ошибок).
 * 2. inputSchema не содержит циклических $ref (рекурсия ломает programmatic
 *    tool calling на стороне клиента с ошибкой "Circular $ref detected",
 *    хотя обычный вызов того же инструмента продолжает работать — без этого
 *    теста дефект вскрылся бы только у пользователя).
 * 3. Инструмент без параметров (ping) отдаёт { type: 'object',
 *    additionalProperties: false } — валидную форму, а не {}.
 * 4. Результат вызова инструмента (ping, с мок HttpClient) содержит
 *    одновременно structuredContent и текстовый дубль в content[0].text.
 */

import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import ajv2020Module from 'ajv/dist/2020.js';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import { detectCircularRefs } from '@fractalizer/mcp-core';
import type { ToolRegistry, ToolInputSchema } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { ServerConfig } from '#config';
import { getTextContent } from '#helpers/tool-result.helper.js';

const Ajv2020 = ajv2020Module.default;
const ajv = new Ajv2020({ strict: false });

describe('Tool Schema Contract (Smoke) — JSON Schema 2020-12', () => {
  let mockFacade: YandexTrackerFacade;
  let mockLogger: Logger;

  beforeAll(() => {
    mockFacade = {} as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;
  });

  describe('inputSchema валиден как JSON Schema draft 2020-12', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: ajv компилирует inputSchema без ошибок`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const inputSchema = tool.getDefinition().inputSchema as ToolInputSchema;

        expect(() => ajv.compile(inputSchema)).not.toThrow();
      });
    });
  });

  describe('inputSchema не содержит циклических $ref', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: нет цикла $ref`, () => {
        const tool = new ToolClass(mockFacade, mockLogger);
        const inputSchema = tool.getDefinition().inputSchema as ToolInputSchema;

        const result = detectCircularRefs(inputSchema);

        expect(result.hasCycle, `Найден циклический $ref: ${result.cyclePath?.join(' -> ')}`).toBe(
          false
        );
      });
    });
  });

  describe('Граничное условие: инструмент без параметров', () => {
    it('ping tool отдаёт валидную форму без параметров, а не {}', () => {
      const PingClass = TOOL_CLASSES.find((ToolClass) => ToolClass.name === 'PingTool');
      expect(PingClass).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new PingClass!(mockFacade, mockLogger);
      const inputSchema = tool.getDefinition().inputSchema as ToolInputSchema;

      expect(inputSchema).not.toEqual({});
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.additionalProperties).toBe(false);
      expect(inputSchema.properties).toEqual({});
    });
  });

  describe('Результат вызова содержит structuredContent и текстовый дубль', () => {
    const fakeConfig: ServerConfig = {
      token: 'fake-token-for-testing',
      orgId: 'fake-org-id',
      apiBase: 'https://api.tracker.yandex.net',
      requestTimeout: 30000,
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      logLevel: 'error',
      prettyLogs: false,
      logsDir: '/tmp/logs',
      logMaxSize: 10485760,
      logMaxFiles: 10,
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('ping tool: structuredContent совпадает по содержимому с content[0].text', async () => {
      const container = await createContainer(fakeConfig);
      const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
      const httpClient = container.get<IHttpClient>(TYPES.HttpClient);

      vi.spyOn(httpClient, 'get').mockResolvedValue({
        status: 'ok',
        message: 'Yandex Tracker API is accessible',
      });

      const pingTool = toolRegistry.getTool('fr_yandex_tracker_ping');
      expect(pingTool).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = await pingTool!.execute({});

      expect(result['structuredContent']).toBeDefined();
      expect(result.content[0]?.type).toBe('text');

      const textPayload = JSON.parse(getTextContent(result)) as unknown;
      expect(textPayload).toEqual(result['structuredContent']);
    });
  });
});
