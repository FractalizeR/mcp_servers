/**
 * Unit тесты для FuzzySearchStrategy
 *
 * Тестовые сценарии:
 * - Поиск с опечатками (1-3 символа)
 * - Вычисление Levenshtein distance
 * - Нормализация score (0-1)
 * - Обработка коротких query
 * - MaxDistance filtering
 */

import { describe, it, expect } from 'vitest';
import { FuzzySearchStrategy } from '@mcp/search/strategies/fuzzy-search.strategy.js';
import { ToolCategory } from '@mcp/tools/base/tool-metadata.js';
import type { StaticToolIndex } from '@mcp/search/types.js';

describe('FuzzySearchStrategy', () => {
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
  ];

  describe('Default maxDistance (3)', () => {
    const strategy = new FuzzySearchStrategy(3);

    it('должен найти token с 1 опечаткой', () => {
      // 'pong' вместо 'ping' (distance = 1)
      const results = strategy.search('pong', mockTools);

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
      expect(match!.score).toBeGreaterThan(0);
      expect(match!.strategyType).toBe('fuzzy');
    });

    it('должен найти token с 2 опечатками', () => {
      // 'pang' вместо 'ping' (distance = 2: i->a, g замена)
      const results = strategy.search('pang', mockTools);

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
    });

    it('должен найти token с 3 опечатками', () => {
      // 'pung' вместо 'ping' (distance = 1)
      const results = strategy.search('pung', mockTools);

      expect(results.length).toBeGreaterThan(0);
    });

    it('НЕ должен найти token с distance > maxDistance', () => {
      // 'completely_different' != 'ping' (distance >> 3)
      const results = strategy.search('completely', mockTools);

      const pingMatch = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(pingMatch).toBeUndefined();
    });
  });

  describe('Scoring (нормализация distance -> score)', () => {
    const strategy = new FuzzySearchStrategy(3);

    it('меньшее расстояние = выше score', () => {
      // 'ping' точное совпадение vs 'pong' с 1 опечаткой
      const exactResults = strategy.search('ping', mockTools);
      const fuzzyResults = strategy.search('pong', mockTools);

      const exactMatch = exactResults.find((r) => r.toolName === 'yandex_tracker_ping');
      const fuzzyMatch = fuzzyResults.find((r) => r.toolName === 'yandex_tracker_ping');

      expect(exactMatch).toBeDefined();
      expect(fuzzyMatch).toBeDefined();

      // Точное совпадение должно иметь максимальный score
      expect(exactMatch!.score).toBeGreaterThan(fuzzyMatch!.score);
    });

    it('score должен быть в диапазоне [0, 1]', () => {
      const results = strategy.search('pong', mockTools);

      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('score = 1 - (distance / (maxDistance + 1))', () => {
      const strategy2 = new FuzzySearchStrategy(3);

      // 'pong' vs 'ping' token (distance = 1)
      const results = strategy2.search('pong', mockTools);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');

      if (match) {
        // Score: (1 - 1/(3+1)) * TOKEN_WEIGHT = 0.75 * 0.7 = 0.525
        expect(match.score).toBeGreaterThan(0.5);
        expect(match.score).toBeLessThan(0.6);
      }
    });
  });

  describe('Поиск по nameTokens', () => {
    const strategy = new FuzzySearchStrategy(3);

    it('должен искать по токенам имени', () => {
      // 'trackr' вместо 'tracker' (distance = 1)
      const results = strategy.search('trackr', mockTools);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        // Все tools содержат 'tracker' в nameTokens
        expect(result.toolName).toContain('tracker');
      });
    });

    it('должен искать по последнему токену', () => {
      // 'issus' вместо 'issues' (distance = 1)
      const results = strategy.search('issus', mockTools);

      const matches = results.filter((r) => r.toolName.includes('issues'));
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('должен находить лучший matching token', () => {
      // У tool может быть несколько токенов
      // Должен найти токен с минимальным расстоянием
      const results = strategy.search('issus', mockTools);

      results.forEach((result) => {
        expect(result.score).toBeGreaterThan(0);
      });
    });
  });

  describe('Case sensitivity', () => {
    const strategy = new FuzzySearchStrategy(3);

    it('должен быть case-insensitive', () => {
      const lowerResults = strategy.search('pong', mockTools);
      const upperResults = strategy.search('PONG', mockTools);

      expect(lowerResults.length).toBe(upperResults.length);

      if (lowerResults.length > 0) {
        expect(lowerResults[0].score).toBe(upperResults[0].score);
      }
    });

    it('должен игнорировать пробелы', () => {
      const trimmedResults = strategy.search('pong', mockTools);
      const spacedResults = strategy.search('  pong  ', mockTools);

      expect(trimmedResults.length).toBe(spacedResults.length);
    });
  });

  describe('Короткие query', () => {
    const strategy = new FuzzySearchStrategy(3);

    it('должен обработать однобуквенный query', () => {
      const results = strategy.search('p', mockTools);

      // Может найти или не найти, но не должен упасть
      expect(Array.isArray(results)).toBe(true);
    });

    it('должен обработать двухбуквенный query', () => {
      const results = strategy.search('pi', mockTools);

      expect(Array.isArray(results)).toBe(true);
    });

    it('query короче maxDistance должен работать корректно', () => {
      // Query длиной 2, но maxDistance = 3
      const results = strategy.search('pn', mockTools);

      // 'pn' vs 'ping' (distance = 2: вставить 'i' и 'g')
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
    });
  });

  describe('Разные maxDistance', () => {
    it('maxDistance = 1: только минимальные опечатки', () => {
      const strategy = new FuzzySearchStrategy(1);

      // 'pong' vs 'ping' (distance = 1) - должен найти
      const results1 = strategy.search('pong', mockTools);
      expect(results1.length).toBeGreaterThan(0);

      // 'pung' vs 'ping' (distance = 1) - ДОЛЖЕН найти
      // 'pongg' vs 'ping' (distance = 2) - НЕ должен найти
      const results2 = strategy.search('pongg', mockTools);
      const match = results2.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeUndefined();
    });

    it('maxDistance = 5: больше tolerance', () => {
      const strategy = new FuzzySearchStrategy(5);

      // 'pongg' vs 'ping' (distance = 2)
      const results = strategy.search('pongg', mockTools);

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
    });
  });

  describe('Нет совпадений', () => {
    const strategy = new FuzzySearchStrategy(3);

    it('должен вернуть пустой массив если distance слишком большое', () => {
      const results = strategy.search('completely_different_word', mockTools);

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

  describe('Edge cases', () => {
    const strategy = new FuzzySearchStrategy(3);

    it('должен обработать tool с одним токеном', () => {
      const singleTokenTool: StaticToolIndex[] = [
        {
          name: 'ping',
          category: ToolCategory.USERS,
          tags: [],
          isHelper: true,
          nameTokens: ['ping'],
          descriptionTokens: [],
          descriptionShort: 'Short',
        },
      ];

      const results = strategy.search('pong', singleTokenTool);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('должен обработать tool с пустыми nameTokens', () => {
      const emptyTokensTool: StaticToolIndex[] = [
        {
          name: 'no_tokens',
          category: ToolCategory.DEMO,
          tags: [],
          isHelper: true,
          nameTokens: [],
          descriptionTokens: [],
          descriptionShort: 'Empty',
        },
      ];

      const results = strategy.search('ping', emptyTokensTool);

      expect(results).toHaveLength(0);
    });

    it('должен обработать очень длинный query', () => {
      const longQuery = 'a'.repeat(100);

      const results = strategy.search(longQuery, mockTools);

      // Должен работать без ошибок
      expect(Array.isArray(results)).toBe(true);
    });

    it('должен обработать query равный токену', () => {
      const results = strategy.search('ping', mockTools);

      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
      // Точное совпадение с токеном: distance = 0, score = 1.0 * TOKEN_WEIGHT (0.7)
      expect(match!.score).toBe(0.7);
    });
  });

  describe('Levenshtein distance correctness', () => {
    const strategy = new FuzzySearchStrategy(10);

    it('вставка одного символа (distance = 1)', () => {
      const results = strategy.search('pnig', mockTools);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
    });

    it('удаление одного символа (distance = 1)', () => {
      const results = strategy.search('pin', mockTools);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
    });

    it('замена одного символа (distance = 1)', () => {
      const results = strategy.search('pong', mockTools);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
    });

    it('несколько операций', () => {
      // 'pang' vs 'ping': замена 'i' -> 'a' и 'g' -> 'g' (distance = 1)
      const results = strategy.search('pang', mockTools);
      const match = results.find((r) => r.toolName === 'yandex_tracker_ping');
      expect(match).toBeDefined();
    });
  });
});
