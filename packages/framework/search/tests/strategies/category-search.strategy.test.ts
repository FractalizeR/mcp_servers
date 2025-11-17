/**
 * Unit тесты для CategorySearchStrategy
 *
 * Тестовые сценарии:
 * - Точное совпадение категории (score = 1.0)
 * - Частичное совпадение категории (score = 0.8)
 * - Точное совпадение тега (score = 0.9)
 * - Частичное совпадение тега (score = 0.7)
 * - Query содержит тег (score = 0.6)
 * - Приоритет категории над тегами
 */

import { describe, it, expect } from 'vitest';
import { CategorySearchStrategy } from '../../src/strategies/category-search.strategy.js';
import { ToolCategory } from '../../../core/src/tools/base/tool-metadata.js';
import type { StaticToolIndex } from '../../src/types.js';

describe('CategorySearchStrategy', () => {
  const strategy = new CategorySearchStrategy();

  const mockTools: StaticToolIndex[] = [
    {
      name: 'fractalizer_mcp_yandex_tracker_get_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue', 'get', 'batch', 'read'],
      isHelper: false,
      nameTokens: [],
      descriptionTokens: [],
      descriptionShort: 'Get issues',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_find_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue', 'find', 'search', 'jql'],
      isHelper: false,
      nameTokens: [],
      descriptionTokens: [],
      descriptionShort: 'Find issues',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_ping',
      category: ToolCategory.USERS,
      tags: ['ping', 'health', 'check', 'diagnostics'],
      isHelper: false,
      nameTokens: [],
      descriptionTokens: [],
      descriptionShort: 'Ping',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_search_tools',
      category: ToolCategory.SEARCH,
      tags: ['search', 'tools', 'discovery', 'find', 'helper'],
      isHelper: true,
      nameTokens: [],
      descriptionTokens: [],
      descriptionShort: 'Search tools',
    },
    {
      name: 'fractalizer_mcp_yandex_tracker_issue_get_url',
      category: ToolCategory.URL_GENERATION,
      tags: ['url', 'link', 'helper', 'issue'],
      isHelper: true,
      nameTokens: [],
      descriptionTokens: [],
      descriptionShort: 'Get URL',
    },
  ];

  describe('Точное совпадение категории', () => {
    it('должен найти tools по точной категории (score 1.0)', () => {
      const results = strategy.search('issues', mockTools);

      // Фильтруем только category matches (не tag matches)
      const categoryMatches = results.filter((r) => r.strategyType === 'category');

      expect(categoryMatches.length).toBeGreaterThanOrEqual(2);
      categoryMatches.forEach((result) => {
        expect(result.score).toBe(1.0);
        expect(result.strategyType).toBe('category');
        expect(result.matchReason).toContain('Category match');
      });
    });

    it('должен быть case-insensitive', () => {
      const results = strategy.search('ISSUES', mockTools);

      // Фильтруем только category matches
      const categoryMatches = results.filter((r) => r.strategyType === 'category');

      expect(categoryMatches.length).toBeGreaterThanOrEqual(2);
      categoryMatches.forEach((result) => {
        expect(result.score).toBe(1.0);
      });
    });

    it('должен найти tools с составной категорией', () => {
      const results = strategy.search('url-generation', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0]!.toolName).toBe('fractalizer_mcp_yandex_tracker_issue_get_url');
      expect(results[0]!.score).toBe(1.0);
    });

    it('должен игнорировать пробелы', () => {
      const results = strategy.search('  users  ', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0]!.score).toBe(1.0);
    });
  });

  describe('Частичное совпадение категории', () => {
    it('должен найти категории, содержащие query (score 0.8)', () => {
      const results = strategy.search('url', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0]!.toolName).toBe('fractalizer_mcp_yandex_tracker_issue_get_url');
      expect(results[0]!.score).toBe(0.8);
      expect(results[0]!.matchReason).toContain('Category match');
    });

    it('должен найти категории, где query является частью', () => {
      // 'issue' является частью 'issues'
      const results = strategy.search('issue', mockTools);

      // Должны найтись tools с категорией ISSUES (score 0.8)
      const categoryMatches = results.filter((r) => r.matchReason?.includes('Category'));
      expect(categoryMatches.length).toBeGreaterThanOrEqual(2);
      categoryMatches.forEach((result) => {
        expect(result.score).toBe(0.8);
      });
    });
  });

  describe('Точное совпадение тега', () => {
    it('должен найти tools по точному тегу (score 0.9)', () => {
      const results = strategy.search('ping', mockTools);

      const tagMatch = results.find((r) => r.matchReason?.includes('Tag match'));
      expect(tagMatch).toBeDefined();
      expect(tagMatch!.score).toBe(0.9);
      expect(tagMatch!.strategyType).toBe('tags');
    });

    it('должен найти несколько tools с одинаковым тегом', () => {
      // Тег 'issue' есть у get_issues, find_issues, и get_issue_url
      const results = strategy.search('issue', mockTools);

      // Должны быть и совпадения по категории (ISSUES), и по тегу
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it('должен быть case-insensitive для тегов', () => {
      const results = strategy.search('PING', mockTools);

      const tagMatch = results.find((r) => r.matchReason?.includes('Tag match'));
      expect(tagMatch).toBeDefined();
      expect(tagMatch!.score).toBe(0.9);
    });
  });

  describe('Частичное совпадение тега', () => {
    it('должен найти теги, содержащие query (score 0.7)', () => {
      const results = strategy.search('bat', mockTools);

      // 'bat' содержится в 'batch'
      const partialMatch = results.find((r) => r.matchReason?.includes('batch'));
      expect(partialMatch).toBeDefined();
      expect(partialMatch!.score).toBe(0.7);
    });

    it('должен найти по началу тега', () => {
      const results = strategy.search('dia', mockTools);

      // 'dia' в начале 'diagnostics'
      const partialMatch = results.find((r) => r.matchReason?.includes('diagnostics'));
      expect(partialMatch).toBeDefined();
      expect(partialMatch!.score).toBe(0.7);
    });
  });

  describe('Query содержит тег', () => {
    it('должен найти когда query содержит короткий тег (score 0.6)', () => {
      const results = strategy.search('url generation helper', mockTools);

      // Query содержит 'url' и 'helper'
      const matches = results.filter(
        (r) =>
          r.toolName === 'fractalizer_mcp_yandex_tracker_issue_get_url' &&
          r.matchReason?.includes('Tag match')
      );

      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Приоритет категории над тегами', () => {
    it('не должен проверять теги если нашёл совпадение по категории', () => {
      // 'search' есть и в категории (SEARCH), и в тегах (у find_issues)
      const results = strategy.search('search', mockTools);

      // search_tools должен найтись по категории (score 1.0)
      const categoryMatch = results.find(
        (r) => r.toolName === 'fractalizer_mcp_yandex_tracker_search_tools'
      );
      expect(categoryMatch).toBeDefined();
      expect(categoryMatch!.score).toBe(1.0);
      expect(categoryMatch!.matchReason).toContain('Category match');

      // find_issues должен найтись по тегу (score 0.9)
      const tagMatch = results.find(
        (r) => r.toolName === 'fractalizer_mcp_yandex_tracker_find_issues'
      );
      expect(tagMatch).toBeDefined();
      expect(tagMatch!.matchReason).toContain('Tag match');
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
      const results = strategy.search('issues', []);

      expect(results).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('должен обработать tool без тегов', () => {
      const toolsWithoutTags: StaticToolIndex[] = [
        {
          name: 'no_tags_tool',
          category: ToolCategory.DEMO,
          tags: [],
          isHelper: true,
          nameTokens: [],
          descriptionTokens: [],
          descriptionShort: 'No tags',
        },
      ];

      const results = strategy.search('demo', toolsWithoutTags);

      expect(results).toHaveLength(1);
      expect(results[0]!.score).toBe(1.0);
      expect(results[0]!.matchReason).toContain('Category match');
    });

    it('должен обработать query с дефисами', () => {
      const results = strategy.search('url-generation', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0]!.score).toBe(1.0);
    });

    it('должен найти первый matching тег', () => {
      // У tool может быть несколько matching тегов
      const results = strategy.search('find', mockTools);

      // 'find' есть в тегах find_issues и search_tools
      const matches = results.filter((r) => r.matchReason?.includes('Tag match: find'));
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
