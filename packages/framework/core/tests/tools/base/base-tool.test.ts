/**
 * Прямые тесты `BaseTool` (пакет измерения покрытия framework/core,
 * 2026-08-14/15).
 *
 * До этого файла `base-tool.ts` — базовый класс всех 153 инструментов трёх
 * серверов — проверялся только косвенно, тестами конкретных инструментов
 * серверов. Здесь — тестовый инструмент фреймворка (не инструмент сервера),
 * как того требует задание, покрывающий:
 *  - envelope успеха/ошибки: одна и та же форма payload в structuredContent
 *    и в текстовом дубле content[0].text;
 *  - проекцию title/outputSchema/annotations/subcategory/priority из
 *    статических METADATA в ToolDefinition, включая случай отсутствия полей;
 *  - путь getParamsSchema() не переопределён → getDefinition() кидает явную
 *    ошибку (а не падает на вызове несуществующего legacy buildDefinition());
 *  - getMetadata(): совмещение definition + tags/isHelper/examples;
 *  - validateParams()/formatValidationError(): делегирование в formatError()
 *    при невалидных параметрах.
 *
 * Тесты formatCollectionResult() и его пороговых случаев — в соседнем файле
 * tests/tools/common/collection-result/format-collection-result.test.ts.
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Logger, ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ApiErrorClass, HttpStatusCode } from '@fractalizer/mcp-infrastructure';
import { BaseTool } from '../../../src/tools/base/base-tool.js';
import { ToolCategory, ToolPriority } from '../../../src/tools/base/tool-metadata.js';
import type { StaticToolMetadata } from '../../../src/tools/base/tool-metadata.js';
import { ToolWarningCode } from '../../../src/definition/tool-warning.js';
import type { ToolWarning } from '../../../src/definition/tool-warning.js';

function buildLogger(): Logger {
  const logger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  logger.child.mockReturnValue(logger);
  return logger;
}

const EchoParamsSchema = z.object({ id: z.string().min(1) });

/** Тестовый инструмент фреймворка с реальным getParamsSchema() и минимальными METADATA. */
class MinimalEchoTool extends BaseTool<void> {
  static override METADATA: StaticToolMetadata = {
    name: 'minimal_echo_tool',
    description: 'Минимальный тестовый инструмент без опциональных полей METADATA',
    category: ToolCategory.SYSTEM,
    tags: ['fake'],
    isHelper: true,
  };

  constructor(logger: Logger) {
    super(undefined, logger);
  }

  protected override getParamsSchema() {
    return EchoParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, EchoParamsSchema);
    if (!validation.success) {
      return validation.error;
    }
    return this.formatSuccess({ id: validation.data.id });
  }

  /** Публичный доступ к protected formatError() для прямого теста envelope ошибки. */
  public callFormatError(message: string, error?: unknown): ToolResult {
    return this.formatError(message, error);
  }

  /** Публичный доступ к protected formatSuccess() для теста envelope warnings. */
  public callFormatSuccess(data: unknown, warnings?: ToolWarning[]): ToolResult {
    return this.formatSuccess(data, warnings);
  }
}

/** Тестовый инструмент с полным набором опциональных METADATA-полей. */
class FullMetadataTool extends BaseTool<void> {
  static override METADATA: StaticToolMetadata = {
    name: 'full_metadata_tool',
    description: 'Инструмент со всеми опциональными полями METADATA',
    category: ToolCategory.ISSUES,
    subcategory: 'read',
    priority: ToolPriority.HIGH,
    tags: ['a', 'b'],
    isHelper: false,
    title: 'Full Metadata Tool',
    outputSchema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    examples: ['Пример использования'],
  };

  constructor(logger: Logger) {
    super(undefined, logger);
  }

  protected override getParamsSchema() {
    return z.object({});
  }

  async execute(): Promise<ToolResult> {
    return this.formatSuccess({ ok: true });
  }
}

/** Тестовый инструмент, НЕ переопределяющий getParamsSchema() — legacy-путь. */
class NoSchemaTool extends BaseTool<void> {
  static override METADATA: StaticToolMetadata = {
    name: 'no_schema_tool',
    description: 'Инструмент без getParamsSchema()',
    category: ToolCategory.SYSTEM,
    tags: [],
    isHelper: true,
  };

  constructor(logger: Logger) {
    super(undefined, logger);
  }

  async execute(): Promise<ToolResult> {
    return this.formatSuccess({});
  }
}

describe('BaseTool', () => {
  describe('getDefinition() — проекция METADATA', () => {
    it('минимальные METADATA: не добавляет title/outputSchema/annotations/subcategory/priority', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const definition = tool.getDefinition();

      expect(definition.name).toBe('minimal_echo_tool');
      expect(definition.description).toBe(
        'Минимальный тестовый инструмент без опциональных полей METADATA'
      );
      expect(definition.category).toBe(ToolCategory.SYSTEM);
      expect(definition.inputSchema.type).toBe('object');
      // Ключи отсутствуют полностью (не просто undefined) — код использует
      // условное присваивание, а не `field: metadata.field`.
      expect('title' in definition).toBe(false);
      expect('outputSchema' in definition).toBe(false);
      expect('annotations' in definition).toBe(false);
      expect('subcategory' in definition).toBe(false);
      expect('priority' in definition).toBe(false);
    });

    it('полные METADATA: проецирует title/outputSchema/annotations/subcategory/priority', () => {
      const tool = new FullMetadataTool(buildLogger());

      const definition = tool.getDefinition();

      expect(definition.title).toBe('Full Metadata Tool');
      expect(definition.outputSchema).toEqual({
        type: 'object',
        properties: { ok: { type: 'boolean' } },
      });
      expect(definition.annotations).toEqual({ readOnlyHint: true, idempotentHint: true });
      expect(definition.subcategory).toBe('read');
      expect(definition.priority).toBe(ToolPriority.HIGH);
      expect(definition.category).toBe(ToolCategory.ISSUES);
    });

    it('inputSchema генерируется из getParamsSchema(), а не задаётся вручную', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const definition = tool.getDefinition();

      // EchoParamsSchema = z.object({ id: z.string().min(1) })
      expect(definition.inputSchema.properties).toHaveProperty('id');
      expect(definition.inputSchema.required).toContain('id');
    });

    it('без getParamsSchema() кидает явную ошибку вместо вызова legacy buildDefinition()', () => {
      const tool = new NoSchemaTool(buildLogger());

      expect(() => tool.getDefinition()).toThrow(
        /getParamsSchema\(\) не определён.*buildDefinition\(\) удалён/s
      );
    });
  });

  describe('getMetadata()', () => {
    it('совмещает definition со static METADATA (category/tags/isHelper)', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const metadata = tool.getMetadata();

      expect(metadata.definition.name).toBe('minimal_echo_tool');
      expect(metadata.category).toBe(ToolCategory.SYSTEM);
      expect(metadata.tags).toEqual(['fake']);
      expect(metadata.isHelper).toBe(true);
      // examples не заполнены в METADATA → ключ отсутствует полностью.
      expect('examples' in metadata).toBe(false);
    });

    it('включает examples, когда они заданы в METADATA', () => {
      const tool = new FullMetadataTool(buildLogger());

      const metadata = tool.getMetadata();

      expect(metadata.examples).toEqual(['Пример использования']);
    });
  });

  describe('formatSuccess() — envelope успеха', () => {
    it('structuredContent и текстовый дубль content[0].text — один и тот же payload', async () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = await tool.execute({ id: 'TASK-1' });

      const expectedPayload = { success: true, data: { id: 'TASK-1' } };
      expect(result['structuredContent']).toEqual(expectedPayload);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.['type']).toBe('text');
      expect(JSON.parse(result.content[0]?.['text'] as string)).toEqual(expectedPayload);
      expect(result.isError).toBeUndefined();
    });
  });

  /**
   * DoD 1 пакета 1.1 (plan_tool_contract_unification): `warnings` отсутствует
   * в ответе, когда предупреждений нет — проверено И в content[0].text, И в
   * structuredContent (два разных ассерта, не один общий).
   */
  describe('formatSuccess(data, warnings) — инвариант «warnings только когда непусто»', () => {
    it('без второго аргумента: ключ warnings отсутствует в обеих проекциях', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = tool.callFormatSuccess({ id: 'TASK-1' });

      const structured = result['structuredContent'] as object;
      const fromText = JSON.parse(result.content[0]?.['text'] as string) as object;
      expect('warnings' in structured).toBe(false);
      expect('warnings' in fromText).toBe(false);
    });

    it('с пустым массивом warnings: ключ всё равно отсутствует (не пустой массив в ответе)', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = tool.callFormatSuccess({ id: 'TASK-1' }, []);

      const structured = result['structuredContent'] as object;
      const fromText = JSON.parse(result.content[0]?.['text'] as string) as object;
      expect('warnings' in structured).toBe(false);
      expect('warnings' in fromText).toBe(false);
    });

    it('с непустым warnings: ключ присутствует и одинаков в обеих проекциях', () => {
      const tool = new MinimalEchoTool(buildLogger());
      const warnings: ToolWarning[] = [
        { code: ToolWarningCode.FIELDS_WITHOUT_VALUE, message: 'assignee.login не пришёл' },
      ];

      const result = tool.callFormatSuccess({ id: 'TASK-1' }, warnings);

      const structured = result['structuredContent'] as { warnings?: ToolWarning[] };
      const fromText = JSON.parse(result.content[0]?.['text'] as string) as {
        warnings?: ToolWarning[];
      };
      expect(structured.warnings).toEqual(warnings);
      expect(fromText.warnings).toEqual(warnings);
    });
  });

  describe('formatError() — envelope ошибки', () => {
    it('без error: structuredContent не содержит ключ error, isError=true', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = tool.callFormatError('Просто сообщение');

      const expectedPayload = { success: false, message: 'Просто сообщение' };
      expect(result['structuredContent']).toEqual(expectedPayload);
      expect(JSON.parse(result.content[0]?.['text'] as string)).toEqual(expectedPayload);
      expect(result.isError).toBe(true);
      expect('error' in (result['structuredContent'] as object)).toBe(false);
    });

    it('обычный Error: error-поле — только message', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = tool.callFormatError('Что-то сломалось', new Error('boom'));

      expect(result['structuredContent']).toMatchObject({
        success: false,
        message: 'Что-то сломалось',
        error: 'boom',
      });
    });

    it('ApiErrorClass: error-поле — полный toJSON() (statusCode/errors/retryAfter/errorsData)', () => {
      const tool = new MinimalEchoTool(buildLogger());
      const apiError = new ApiErrorClass(
        HttpStatusCode.BAD_REQUEST,
        'Validation failed',
        { summary: ['Required field'] },
        undefined,
        { code: 'FIELD_REQUIRED' }
      );

      const result = tool.callFormatError('Ошибка API', apiError);

      expect(result['structuredContent']).toMatchObject({
        success: false,
        message: 'Ошибка API',
        error: apiError.toJSON(),
      });
    });

    it('нераспознанное значение error (не Error и не ApiErrorClass): ключ error отсутствует', () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = tool.callFormatError('Странная ошибка', { unexpected: true });

      expect('error' in (result['structuredContent'] as object)).toBe(false);
    });

    it('логирует message и исходный error через this.logger.error', () => {
      const logger = buildLogger();
      const tool = new MinimalEchoTool(logger);
      const error = new Error('boom');

      tool.callFormatError('Что-то сломалось', error);

      expect(logger.error).toHaveBeenCalledWith('Что-то сломалось', error);
    });
  });

  describe('validateParams() / formatValidationError() — путь невалидных параметров', () => {
    it('валидные параметры: execute() возвращает success envelope', async () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = await tool.execute({ id: 'TASK-1' });

      expect(result.isError).toBeUndefined();
      expect(result['structuredContent']).toEqual({ success: true, data: { id: 'TASK-1' } });
    });

    it('невалидные параметры: execute() делегирует в formatError() с текстом ошибки валидации', async () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const payload = result['structuredContent'] as {
        success: false;
        message: string;
        error?: string;
      };
      expect(payload.success).toBe(false);
      expect(payload.message).toBe('Ошибка валидации параметров');
      // Форматирование самого текста проверено в zod-error-formatter.test.ts;
      // здесь важно, что путь делегирования сохраняет имя поля в сообщении.
      expect(payload.error).toContain('id');
    });

    /**
     * Находка 4 (README §5 плана plan_tool_contract_unification): запрос
     * невалиден (id отсутствует) И содержит лишний параметр — сообщение
     * обязано назвать ОБА промаха, а не только недостающий id.
     */
    it('невалидные параметры + лишний параметр: сообщение называет оба промаха', async () => {
      const tool = new MinimalEchoTool(buildLogger());

      const result = await tool.execute({ issueIds: ['TEST-1'] });

      const payload = result['structuredContent'] as { error?: string };
      expect(payload.error).toContain('id');
      expect(payload.error).toContain('issueIds');
    });
  });
});
