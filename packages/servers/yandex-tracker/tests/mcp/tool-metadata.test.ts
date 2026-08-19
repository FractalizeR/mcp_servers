import { describe, it, expect } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';

describe('Tool Metadata Validation', () => {
  describe('Required fields', () => {
    it('все инструменты должны иметь обязательное поле category', () => {
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        expect(metadata.category, `Tool ${metadata.name} должен иметь category`).toBeDefined();
        expect(typeof metadata.category, `category должна быть строкой для ${metadata.name}`).toBe(
          'string'
        );
        expect(
          metadata.category.length,
          `category не должна быть пустой для ${metadata.name}`
        ).toBeGreaterThan(0);
      }
    });

    it('все инструменты должны иметь name', () => {
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        expect(metadata.name, `Tool должен иметь name`).toBeDefined();
        expect(typeof metadata.name, `name должно быть строкой`).toBe('string');
        expect(metadata.name.length, `name не должно быть пустым`).toBeGreaterThan(0);
      }
    });

    it('все инструменты должны иметь description', () => {
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        expect(
          metadata.description,
          `Tool ${metadata.name} должен иметь description`
        ).toBeDefined();
        expect(
          typeof metadata.description,
          `description должно быть строкой для ${metadata.name}`
        ).toBe('string');
        expect(
          metadata.description.length,
          `description не должно быть пустым для ${metadata.name}`
        ).toBeGreaterThan(0);
      }
    });

    it('все инструменты должны генерировать inputSchema через getParamsSchema()', () => {
      // Единственный поддерживаемый путь (пакет 3.1.B плана модернизации):
      // buildDefinition() (legacy) удалён из BaseTool — ни один из 97
      // инструментов его не переопределял (подтверждено грепом перед удалением).
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;
        const hasGetParamsSchemaMethod =
          typeof Reflect.get(ToolClass.prototype, 'getParamsSchema') === 'function';

        expect(
          hasGetParamsSchemaMethod,
          `Tool ${metadata.name} должен переопределять getParamsSchema()`
        ).toBe(true);
      }
    });
  });

  describe('Description format', () => {
    it('все descriptions должны иметь префикс категории [Category] или [Category/Subcategory]', () => {
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;
        const description = metadata.description;

        // Проверяем формат: [Category] или [Category/Subcategory]
        expect(
          description,
          `Description для ${metadata.name} должно начинаться с префикса категории`
        ).toMatch(/^\[[\w/]+\]/);
      }
    });

    it('все descriptions должны быть достаточно краткими (≤120 символов)', () => {
      // Лимит поднят с 80 до 120 (пакет 3.5, discoverability): при 80 символах
      // клиентский поиск по имени/тексту не находил `get_issues` даже по точному
      // запросу — короткое "[Category] Глагол Существительное" без английских
      // ключевых слов и без разбора со смежным инструментом систематически
      // проигрывало более многословным соседям (воспроизведено вживую). 80 символов
      // физически не вмещают префикс категории + суть + 2-4 английских ключевых
      // слова + короткую дизамбигуацию вида "быстрее find_issues, если ключи уже
      // известны" — на выходе такой правки максимум по серверу составил 114 символов
      // (get_issues), 120 оставляет запас ~5% без ухода в абзацы. Расширены точечно
      // только исходно бедные описания (< 45 символов, будущие аутсайдеры поиска) —
      // медиана длины по серверу осталась короткой, см.
      // .agentic-planning/plan_tracker_tool_fixes/3.5_descriptions_table.md.
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;
        const description = metadata.description;

        expect(
          description.length,
          `Description для ${metadata.name} слишком длинное: ${description.length} символов (лимит 120)`
        ).toBeLessThanOrEqual(120);
      }
    });
  });

  describe('Priority validation', () => {
    it('priority должно быть из валидного enum', () => {
      const validPriorities = ['critical', 'high', 'normal', 'low', undefined];

      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        expect(
          validPriorities,
          `Tool ${metadata.name} имеет невалидный priority: ${metadata.priority}`
        ).toContain(metadata.priority);
      }
    });

    it('critical priority должен быть назначен только ключевым инструментам', () => {
      // Это скорее рекомендация, чем жёсткое правило
      // Проверим что critical инструментов не слишком много
      const criticalCount = TOOL_CLASSES.filter(
        (ToolClass) => (ToolClass as any).METADATA.priority === 'critical'
      ).length;

      // Не больше 50% инструментов должны быть critical
      expect(criticalCount).toBeLessThanOrEqual(Math.ceil(TOOL_CLASSES.length / 2));
    });
  });

  describe('Tags validation', () => {
    it('tags должны быть массивом строк если указаны', () => {
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        if (metadata.tags !== undefined) {
          expect(
            Array.isArray(metadata.tags),
            `tags для ${metadata.name} должны быть массивом`
          ).toBe(true);
          for (const tag of metadata.tags) {
            expect(typeof tag, `все tags для ${metadata.name} должны быть строками`).toBe('string');
          }
        }
      }
    });

    it('tags не должны быть пустым массивом', () => {
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        if (metadata.tags !== undefined) {
          expect(
            metadata.tags.length,
            `tags для ${metadata.name} не должны быть пустым массивом`
          ).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Subcategory validation', () => {
    it('subcategory должна быть строкой если указана', () => {
      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        if (metadata.subcategory !== undefined) {
          expect(
            typeof metadata.subcategory,
            `subcategory для ${metadata.name} должна быть строкой`
          ).toBe('string');
          expect(
            metadata.subcategory.length,
            `subcategory для ${metadata.name} не должна быть пустой`
          ).toBeGreaterThan(0);
        }
      }
    });

    it('для subcategory рекомендуются стандартные значения (read/write/workflow)', () => {
      const recommendedSubcategories = ['read', 'write', 'workflow', 'url', 'demo', 'health'];

      for (const ToolClass of TOOL_CLASSES) {
        const metadata = (ToolClass as any).METADATA;

        if (metadata.subcategory !== undefined) {
          // Это warning, а не ошибка - можно использовать кастомные subcategories
          if (!recommendedSubcategories.includes(metadata.subcategory)) {
            console.warn(
              `⚠️  Tool ${metadata.name} использует нестандартную subcategory: ${metadata.subcategory}`
            );
          }
        }
      }
    });
  });

  describe('Overall quality metrics', () => {
    it('должно быть хотя бы несколько инструментов с разными приоритетами', () => {
      const priorities = new Set(
        TOOL_CLASSES.map((ToolClass) => (ToolClass as any).METADATA.priority || 'normal')
      );

      // Должно быть хотя бы 2 разных приоритета
      expect(priorities.size).toBeGreaterThanOrEqual(2);
    });

    it('должно быть хотя бы несколько категорий', () => {
      const categories = new Set(
        TOOL_CLASSES.map((ToolClass) => (ToolClass as any).METADATA.category)
      );

      // Должно быть хотя бы 2 разные категории
      expect(categories.size).toBeGreaterThanOrEqual(2);
    });

    it('средняя длина description должна быть в разумных пределах', () => {
      const totalLength = TOOL_CLASSES.reduce(
        (sum, ToolClass) => sum + (ToolClass as any).METADATA.description.length,
        0
      );

      const avgLength = totalLength / TOOL_CLASSES.length;

      // Средняя длина должна быть 30-60 символов (оптимально для экономии токенов)
      expect(avgLength).toBeGreaterThan(20);
      expect(avgLength).toBeLessThan(70);
    });
  });
});
