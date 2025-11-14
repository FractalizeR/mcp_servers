/**
 * Unit тесты для NameSearchStrategy
 *
 * Тестовые сценарии:
 * - Точное совпадение с именем (score = 1.0)
 * - Имя начинается с query (score = 0.8)
 * - Имя содержит query (score = 0.5)
 * - Нет совпадений (пустой результат)
 * - Case-insensitive поиск
 * - Поиск по части имени с underscores
 */

import { describe, it, expect } from 'vitest';
import { NameSearchStrategy } from '@mcp/search/strategies/name-search.strategy.js';
import { ToolCategory } from '@mcp/tools/base/tool-metadata.js';
import type { StaticToolIndex } from '@mcp/search/types.js';

describe('NameSearchStrategy', () => {
  const strategy = new NameSearchStrategy();

  // Mock tools для тестирования
  const mockTools: StaticToolIndex[] = [
    {
      name: 'yandex_tracker_ping',
      category: ToolCategory.USERS,
      tags: ['ping', 'health'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'ping'],
      descriptionTokens: [],
      descriptionShort: 'Ping tool',
    },
    {
      name: 'yandex_tracker_get_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue', 'get'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'get', 'issues'],
      descriptionTokens: [],
      descriptionShort: 'Get issues',
    },
    {
      name: 'yandex_tracker_find_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue', 'find'],
      isHelper: false,
      nameTokens: ['yandex', 'tracker', 'find', 'issues'],
      descriptionTokens: [],
      descriptionShort: 'Find issues',
    },
    {
      name: 'issue_helper',
      category: ToolCategory.ISSUES,
      tags: ['helper'],
      isHelper: true,
      nameTokens: ['issue', 'helper'],
      descriptionTokens: [],
      descriptionShort: 'Issue helper',
    },
  ];

  describe('Точное совпадение', () => {
    it('должен найти tool по точному имени с score 1.0', () => {
      const results = strategy.search('yandex_tracker_ping', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0].toolName).toBe('yandex_tracker_ping');
      expect(results[0].score).toBe(1.0);
      expect(results[0].strategyType).toBe('name');
      expect(results[0].matchReason).toContain('Exact match');
    });

    it('должен быть case-insensitive', () => {
      const results = strategy.search('YANDEX_TRACKER_PING', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0].toolName).toBe('yandex_tracker_ping');
      expect(results[0].score).toBe(1.0);
    });

    it('должен игнорировать пробелы', () => {
      const results = strategy.search('  yandex_tracker_ping  ', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(1.0);
    });
  });

  describe('Имя начинается с query', () => {
    it('должен найти tools, начинающиеся с query (score 0.8)', () => {
      const results = strategy.search('yandex_tracker', mockTools);

      expect(results.length).toBeGreaterThanOrEqual(3);

      // Все должны иметь score 0.8
      results.forEach((result) => {
        expect(result.score).toBe(0.8);
        expect(result.toolName).toMatch(/^yandex_tracker/);
        expect(result.matchReason).toContain('Name starts with');
      });
    });

    it('должен найти tools по короткому префиксу', () => {
      const results = strategy.search('yandex', mockTools);

      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((result) => {
        expect(result.score).toBe(0.8);
        expect(result.toolName).toMatch(/^yandex/);
      });
    });
  });

  describe('Имя содержит query', () => {
    it('должен найти tools, содержащие query (score 0.5)', () => {
      const results = strategy.search('ping', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0].toolName).toBe('yandex_tracker_ping');
      expect(results[0].score).toBe(1.0); // Точное совпадение с концом имени
    });

    it('должен найти tools по части имени', () => {
      const results = strategy.search('issues', mockTools);

      // Должны найтись get_issues и find_issues
      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach((result) => {
        expect(result.toolName).toContain('issues');
        expect(result.score).toBeGreaterThan(0);
      });
    });

    it('должен найти по слову в середине', () => {
      const results = strategy.search('tracker', mockTools);

      expect(results.length).toBeGreaterThanOrEqual(3);
      results.forEach((result) => {
        expect(result.toolName).toContain('tracker');
      });
    });
  });

  describe('Нет совпадений', () => {
    it('должен вернуть пустой массив если нет совпадений', () => {
      const results = strategy.search('nonexistent', mockTools);

      expect(results).toHaveLength(0);
    });

    it('должен вернуть пустой массив для пустого query', () => {
      const results = strategy.search('', mockTools);

      expect(results).toHaveLength(0);
    });

    it('должен вернуть пустой массив для пустого массива tools', () => {
      const results = strategy.search('ping', []);

      expect(results).toHaveLength(0);
    });
  });

  describe('Сортировка по релевантности', () => {
    it('точное совпадение должно быть выше "starts with"', () => {
      // Создаём tool с именем, которое полностью совпадает с query
      const toolsWithExact: StaticToolIndex[] = [
        ...mockTools,
        {
          name: 'ping',
          category: ToolCategory.USERS,
          tags: [],
          isHelper: true,
          nameTokens: ['ping'],
          descriptionTokens: [],
          descriptionShort: 'Short ping',
        },
      ];

      const results = strategy.search('ping', toolsWithExact);

      // Первым должен быть 'ping' с score 1.0
      const exactMatch = results.find((r) => r.toolName === 'ping');
      expect(exactMatch).toBeDefined();
      expect(exactMatch!.score).toBe(1.0);

      // Второй - yandex_tracker_ping с меньшим score
      const partialMatch = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(partialMatch).toBeDefined();
      expect(partialMatch!.score).toBeLessThan(1.0);
    });
  });

  describe('Edge cases', () => {
    it('должен обработать специальные символы в имени', () => {
      const specialTools: StaticToolIndex[] = [
        {
          name: 'tool_with_underscore',
          category: ToolCategory.DEMO,
          tags: [],
          isHelper: true,
          nameTokens: ['tool', 'with', 'underscore'],
          descriptionTokens: [],
          descriptionShort: 'Special tool',
        },
      ];

      const results = strategy.search('with', specialTools);

      expect(results).toHaveLength(1);
      expect(results[0].toolName).toBe('tool_with_underscore');
    });

    it('должен обработать query с специальными символами', () => {
      const results = strategy.search('tracker_', mockTools);

      // Должны найтись tools, содержащие 'tracker_'
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
