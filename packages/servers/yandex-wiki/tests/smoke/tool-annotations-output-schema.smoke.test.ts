/**
 * Smoke Test: annotations + outputSchema + redactionAllowlist (пакет 3.1.C.wiki
 * плана .agentic-planning/plan_mcp_2026_modernization/3.1_tool_contracts_parallel.md)
 *
 * Обходом реестра (TOOL_CLASSES, а не списком имён в коде) проверяет для
 * КАЖДОГО из 23 инструментов Вики (22 существовавших + yw_diff_page пакета
 * 3.1.E):
 *
 * 1. `annotations` заполнены (все четыре хинта — булевы значения).
 * 2. `outputSchema` задан и является валидным JSON Schema 2020-12 (ajv
 *    компилирует без ошибок).
 * 3. `projectToolDefinitionsForList` (framework, пакет 3.1.B) корректно
 *    переносит title/outputSchema/annotations в форму ответа tools/list —
 *    хотя бы часть инструментов несёт title (DoD «tools/list отдаёт title»).
 * 4. `structuredContent` реального результата вызова валиден по outputSchema
 *    — представители каждой категории (pages/read/write/delete/async/append,
 *    grids/read/write, resources, system, raw, diff).
 * 5. `redactionAllowlist` не содержит имён параметров, несущих произвольный
 *    пользовательский текст (контент страниц, заголовки, поисковые запросы
 *    и т.п.) — allow-list из tool-metadata.ts (пакет 3.1.F).
 */

import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
// Именованный импорт, не default: под moduleResolution NodeNext TS типизирует
// default-биндинг этого CJS-модуля как namespace object (без construct
// signature) — известная нестыковка .d.ts (ESM export default) и рантайм-CJS
// ajv (module.exports = Ajv2020). Именованный `Ajv2020` резолвится в тот же
// класс (см. dist/2020.js: `module.exports.Ajv2020 = Ajv2020`), без этой
// проблемы.
import { Ajv2020 } from 'ajv/dist/2020.js';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { projectToolDefinitionsForList } from '@fractalizer/mcp-core';
import type { JsonObjectSchema } from '@fractalizer/mcp-core';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';
import {
  createMockFacade,
  createPageFixture,
  createAsyncOperationFixture,
  createGridFixture,
  createResourcesResponseFixture,
} from '#helpers/index.js';

const ajv = new Ajv2020({ strict: false });

/**
 * Имена параметров, которые НИКОГДА не должны попадать в redactionAllowlist
 * какого-либо инструмента Вики — все они несут произвольный пользовательский
 * текст (тела/контент страниц, заголовки, описания, поисковые запросы,
 * значения ячеек таблиц).
 */
const UNSAFE_PARAM_NAMES = [
  'content',
  'title',
  'q',
  'query',
  'filter',
  'anchor_name',
  'columns',
  'rows',
  'cells',
  'newContent',
  'default_sort',
];

describe('Tool annotations + outputSchema + redactionAllowlist (Smoke) — пакет 3.1.C.wiki', () => {
  let mockFacade: YandexWikiFacade;
  let mockLogger: Logger;

  beforeAll(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;
  });

  describe('Каждый инструмент имеет annotations', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: все четыре хинта заполнены`, () => {
        const tool = new ToolClass({} as YandexWikiFacade, mockLogger);
        const { annotations } = tool.getDefinition();

        expect(annotations, `${ToolClass.name} должен иметь annotations`).toBeDefined();
        expect(typeof annotations?.readOnlyHint).toBe('boolean');
        expect(typeof annotations?.destructiveHint).toBe('boolean');
        expect(typeof annotations?.idempotentHint).toBe('boolean');
        expect(typeof annotations?.openWorldHint).toBe('boolean');
      });
    });
  });

  describe('Каждый инструмент имеет валидный outputSchema (JSON Schema 2020-12)', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: outputSchema задан и компилируется ajv`, () => {
        const tool = new ToolClass({} as YandexWikiFacade, mockLogger);
        const { outputSchema } = tool.getDefinition();

        expect(outputSchema, `${ToolClass.name} должен иметь outputSchema`).toBeDefined();
        expect(() => ajv.compile(outputSchema as JsonObjectSchema)).not.toThrow();
      });
    });
  });

  describe('projectToolDefinitionsForList отдаёт title/outputSchema/annotations', () => {
    it('спроецированные записи 1:1 совпадают с полями definition', () => {
      const definitions = TOOL_CLASSES.map((ToolClass) =>
        new ToolClass({} as YandexWikiFacade, mockLogger).getDefinition()
      );
      const projected = projectToolDefinitionsForList(definitions);

      expect(projected).toHaveLength(TOOL_CLASSES.length);
      projected.forEach((entry, index) => {
        const original = definitions[index];
        expect(entry.title).toBe(original?.title);
        expect(entry.outputSchema).toEqual(original?.outputSchema);
        expect(entry.annotations).toEqual(original?.annotations);
      });

      // Явное подтверждение: хотя бы один инструмент реально несёт title
      expect(projected.some((entry) => entry.title !== undefined)).toBe(true);
    });
  });

  describe('redactionAllowlist не раскрывает пользовательский текст', () => {
    TOOL_CLASSES.forEach((ToolClass) => {
      it(`${ToolClass.name}: allow-list не содержит небезопасных имён`, () => {
        const allowlist = ToolClass.METADATA.redactionAllowlist ?? [];
        const unsafeHits = allowlist.filter((key) => UNSAFE_PARAM_NAMES.includes(key));

        expect(
          unsafeHits,
          `${ToolClass.name}.redactionAllowlist содержит небезопасные ключи: ${unsafeHits.join(', ')}`
        ).toEqual([]);
      });
    });

    it('get_resources: поисковый запрос q НЕ в allow-list (контрольный случай)', () => {
      const GetResourcesClass = TOOL_CLASSES.find(
        (ToolClass) => ToolClass.name === 'GetResourcesTool'
      );
      expect(GetResourcesClass).toBeDefined();
      expect(GetResourcesClass?.METADATA.redactionAllowlist).not.toContain('q');
    });

    it('create_page: title (пользовательский текст) НЕ в allow-list (контрольный случай)', () => {
      const CreatePageClass = TOOL_CLASSES.find((ToolClass) => ToolClass.name === 'CreatePageTool');
      expect(CreatePageClass).toBeDefined();
      expect(CreatePageClass?.METADATA.redactionAllowlist).not.toContain('title');
      expect(CreatePageClass?.METADATA.redactionAllowlist).not.toContain('content');
    });
  });

  describe('Результат вызова валиден по outputSchema (представители категорий)', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    beforeAll(() => {
      mockFacade = createMockFacade() as YandexWikiFacade;
    });

    it('ping (system): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'PingTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.getPage).mockResolvedValue(createPageFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({});

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('get_page (pages/read): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'GetPageTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.getPage).mockResolvedValue(createPageFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ slug: 'users/test' });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('create_page (pages/write): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'CreatePageTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.createPage).mockResolvedValue(createPageFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ page_type: 'page', slug: 'users/new', title: 'New' });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('delete_page (pages/delete): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'DeletePageTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.deletePage).mockResolvedValue({ recovery_token: 'tok-1' });

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ idx: 1 });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('clone_page (pages/async): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'ClonePageTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.clonePage).mockResolvedValue(createAsyncOperationFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ idx: 1, target: 'users/clone' });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('append_content (pages/append): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'AppendContentTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.appendContent).mockResolvedValue(createPageFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ idx: 1, content: 'hello' });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('get_grid (grids/read): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'GetGridTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.getGrid).mockResolvedValue(createGridFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ idx: '550e8400-e29b-41d4-a716-446655440000' });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('add_rows (grids/write, позиционная семантика): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'AddRowsTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.addRows).mockResolvedValue(createGridFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({
        idx: '550e8400-e29b-41d4-a716-446655440000',
        rows: [{ row: ['a', 'b'] }],
      });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('get_resources: structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'GetResourcesTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.getResources).mockResolvedValue(createResourcesResponseFixture());

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ idx: 1 });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('raw_api_request (system/raw): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'RawApiRequestTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.rawApiRequest).mockResolvedValue({ id: 1, title: 'x' });

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({
        method: 'GET',
        path: '/v1/pages/1',
        fields: ['id'],
      });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });

    it('diff_page (пакет 3.1.E): structuredContent валиден по outputSchema', async () => {
      const ToolClass = TOOL_CLASSES.find((candidate) => candidate.name === 'DiffPageTool');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tool = new ToolClass!(mockFacade, mockLogger);
      vi.mocked(mockFacade.getPageById).mockResolvedValue(createPageFixture({ content: 'a\nb' }));

      const { outputSchema } = tool.getDefinition();
      const validate = ajv.compile(outputSchema as JsonObjectSchema);
      const result = await tool.execute({ idx: 1, newContent: 'a\nc' });

      expect(result.isError).toBeFalsy();
      expect(validate(result['structuredContent']), JSON.stringify(validate.errors)).toBe(true);
    });
  });
});
