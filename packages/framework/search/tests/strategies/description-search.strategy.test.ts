/**
 * Unit тесты для DescriptionSearchStrategy
 *
 * Тестовые сценарии:
 * - Поиск по single token
 * - Поиск по multiple tokens
 * - Case-insensitive поиск
 * - Partial token matching
 * - Пустой query
 * - Нет совпадений
 * - Score calculation
 */

import { describe, it, expect } from 'vitest';
import { DescriptionSearchStrategy } from '../../src/strategies/description-search.strategy.js';
import { ToolCategory } from '../../../core/src/tools/base/tool-metadata.js';
import type { StaticToolIndex } from '../../src/types.js';

describe('DescriptionSearchStrategy', () => {
  const strategy = new DescriptionSearchStrategy();

  // Mock tools для тестирования
  const mockTools: StaticToolIndex[] = [
    {
      name: 'get_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue'],
      isHelper: false,
      nameTokens: ['get', 'issues'],
      descriptionTokens: ['get', 'issues', 'from', 'tracker', 'batch', 'mode'],
      descriptionShort: 'Get issues from Tracker in batch mode',
    },
    {
      name: 'find_issues',
      category: ToolCategory.ISSUES,
      tags: ['issue'],
      isHelper: false,
      nameTokens: ['find', 'issues'],
      descriptionTokens: ['find', 'issues', 'query', 'filter', 'search'],
      descriptionShort: 'Find issues by query or filter (search)',
    },
    {
      name: 'create_issue',
      category: ToolCategory.ISSUES,
      tags: ['issue'],
      isHelper: false,
      nameTokens: ['create', 'issue'],
      descriptionTokens: ['create', 'new', 'issue', 'tracker'],
      descriptionShort: 'Create new issue in Tracker',
    },
  ];

  describe('Single token matching', () => {
    it('должен найти tools по одному токену', () => {
      const results = strategy.search('batch', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0]!.toolName).toBe('get_issues');
      expect(results[0]!.score).toBeGreaterThan(0);
      expect(results[0]!.strategyType).toBe('description');
    });

    it('должен рассчитать score для single token (100% match)', () => {
      const results = strategy.search('batch', mockTools);

      // Score = (1 matched / 1 total) * 0.7 = 0.7
      expect(results[0]!.score).toBe(0.7);
      expect(results[0]!.matchReason).toContain('1/1');
    });
  });

  describe('Multiple tokens matching', () => {
    it('должен найти tools по нескольким токенам', () => {
      const results = strategy.search('find issues search', mockTools);

      // "find", "issues", "search" находятся в find_issues
      expect(results.length).toBeGreaterThanOrEqual(1);
      const findResult = results.find((r) => r.toolName === 'find_issues');
      expect(findResult).toBeDefined();
    });

    it('должен рассчитать score для multiple tokens', () => {
      const results = strategy.search('find issues search', mockTools);

      // find_issues содержит все 3 токена: (3/3) * 0.7 = 0.7
      const findResult = results.find((r) => r.toolName === 'find_issues');
      expect(findResult).toBeDefined();
      expect(findResult!.score).toBe(0.7);
      expect(findResult!.matchReason).toContain('3/3');
    });

    it('должен рассчитать score для partial match', () => {
      const results = strategy.search('create new tracker', mockTools);

      // create_issue содержит "create", "new", "tracker": все 3 - (3/3) * 0.7 = 0.7
      const createResult = results.find((r) => r.toolName === 'create_issue');
      expect(createResult).toBeDefined();
      expect(createResult!.score).toBe(0.7);
    });
  });

  describe('Case-insensitive matching', () => {
    it('должен быть case-insensitive', () => {
      const results = strategy.search('BATCH', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0]!.toolName).toBe('get_issues');
    });

    it('должен работать с mixed case', () => {
      const results = strategy.search('BaTcH MoDe', mockTools);

      expect(results).toHaveLength(1);
      expect(results[0]!.toolName).toBe('get_issues');
    });
  });

  describe('Partial token matching', () => {
    it('должен находить partial matches (query contains token)', () => {
      const results = strategy.search('issues', mockTools);

      // "issues" содержится в description get_issues и find_issues
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('должен находить partial matches (token contains query)', () => {
      const results = strategy.search('issue', mockTools);

      // "issue" является частью "issues"
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Short tokens filtering', () => {
    it('должен игнорировать короткие токены (≤2 chars)', () => {
      const results = strategy.search('find in tracker by id', mockTools);

      // "in", "by", "id" должны быть отфильтрованы (≤2 chars)
      // Только "find" и "tracker" должны учитываться
      // find+tracker встречается только в find_issues или get_issues
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('должен вернуть пустой результат если все токены короткие', () => {
      const results = strategy.search('a b c id', mockTools);

      // Все токены ≤2 chars
      expect(results).toHaveLength(0);
    });
  });

  describe('No matches', () => {
    it('должен вернуть пустой результат для non-matching query', () => {
      const results = strategy.search('user login authentication', mockTools);

      expect(results).toHaveLength(0);
    });

    it('должен вернуть пустой результат для пустого query', () => {
      const results = strategy.search('', mockTools);

      expect(results).toHaveLength(0);
    });

    it('должен вернуть пустой результат для whitespace query', () => {
      const results = strategy.search('   ', mockTools);

      expect(results).toHaveLength(0);
    });
  });

  describe('Multiple results ordering', () => {
    it('должен вернуть результаты с правильными scores', () => {
      const results = strategy.search('issues tracker', mockTools);

      // Должны найтись несколько tools (содержат "issues" и/или "tracker")
      expect(results.length).toBeGreaterThanOrEqual(1);

      // get_issues должен быть найден (содержит оба токена)
      const getIssuesResult = results.find((r) => r.toolName === 'get_issues');
      expect(getIssuesResult).toBeDefined();
      expect(getIssuesResult!.score).toBe(0.7); // (2/2) * 0.7
    });
  });

  describe('Special characters handling', () => {
    it('должен обрабатывать запросы с знаками препинания', () => {
      const results = strategy.search('find, issues; search!', mockTools);

      // Знаки препинания должны быть удалены при токенизации
      const findResult = results.find((r) => r.toolName === 'find_issues');
      expect(findResult).toBeDefined();
      expect(findResult!.score).toBe(0.7); // все 3 токена matched
    });

    it('должен обрабатывать запросы с дефисами', () => {
      const results = strategy.search('find-issues', mockTools);

      // Дефис должен разделить на токены "find" и "issues"
      // Оба токена встречаются в find_issues и get_issues
      expect(results.length).toBeGreaterThanOrEqual(1);
      const findIssuesResult = results.find((r) => r.toolName === 'find_issues');
      expect(findIssuesResult).toBeDefined();
    });
  });
});
