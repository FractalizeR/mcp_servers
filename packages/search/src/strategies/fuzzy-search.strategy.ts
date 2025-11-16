/**
 * Стратегия fuzzy поиска с использованием Levenshtein distance
 *
 * Алгоритм:
 * - Вычисление Levenshtein distance между query и именем
 * - Score уменьшается с ростом distance
 * - Поиск в имени и токенах
 *
 * Полезно для:
 * - Опечатки (get_isseu → get_issues)
 * - Частичные совпадения (get_iss → get_issues)
 *
 * Responsibilities:
 * - Fuzzy matching с допустимой погрешностью
 * - Вычисление Levenshtein distance
 * - Оценка релевантности с учётом distance
 */

import type { ISearchStrategy } from './search-strategy.interface.js';
import type { SearchResult, StaticToolIndex } from '../types.js';

/**
 * Стратегия fuzzy поиска
 */
export class FuzzySearchStrategy implements ISearchStrategy {
  /**
   * Максимальная допустимая distance
   *
   * distance = количество операций (insert/delete/replace)
   * для преобразования одной строки в другую
   */
  private readonly maxDistance: number;

  /**
   * Вес для token matches
   *
   * Поиск в токенах менее точен, чем в полном имени
   */
  private readonly TOKEN_WEIGHT = 0.7;

  constructor(maxDistance = 3) {
    this.maxDistance = maxDistance;
  }

  search(query: string, tools: StaticToolIndex[]): SearchResult[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return [];
    }

    const results: SearchResult[] = [];
    const seen = new Set<string>(); // Для дедупликации

    for (const tool of tools) {
      const name = tool.name.toLowerCase();

      // Проверка полного имени
      const distance = this.levenshteinDistance(lowerQuery, name);

      if (distance <= this.maxDistance) {
        const score = this.calculateScore(distance);

        results.push({
          toolName: tool.name,
          score,
          matchReason: `Fuzzy match (distance: ${distance})`,
          strategyType: 'fuzzy',
        });

        seen.add(tool.name);
        continue; // Если нашли в имени, не проверяем токены
      }

      // Проверка токенов
      if (!seen.has(tool.name)) {
        const tokenMatch = this.findTokenMatch(lowerQuery, tool.nameTokens);

        if (tokenMatch) {
          results.push({
            toolName: tool.name,
            score: tokenMatch.score,
            matchReason: `Fuzzy token match: ${tokenMatch.token} (distance: ${tokenMatch.distance})`,
            strategyType: 'fuzzy',
          });
        }
      }
    }

    return results;
  }

  /**
   * Найти fuzzy match в токенах
   */
  private findTokenMatch(
    query: string,
    tokens: string[]
  ): { token: string; distance: number; score: number } | undefined {
    let bestMatch: { token: string; distance: number; score: number } | undefined;

    for (const token of tokens) {
      const distance = this.levenshteinDistance(query, token);

      if (distance <= this.maxDistance) {
        const score = this.calculateScore(distance) * this.TOKEN_WEIGHT;

        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { token, distance, score };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Вычислить score на основе distance
   *
   * Score уменьшается линейно с ростом distance:
   * - distance = 0 → score = 1.0
   * - distance = maxDistance → score ≈ 0
   */
  private calculateScore(distance: number): number {
    return 1 - distance / (this.maxDistance + 1);
  }

  /**
   * Levenshtein distance algorithm
   *
   * Вычисляет минимальное количество операций (insert/delete/replace)
   * для преобразования одной строки в другую
   *
   * Complexity: O(m * n), где m и n - длины строк
   *
   * @param a - первая строка
   * @param b - вторая строка
   * @returns количество операций редактирования
   */
  private levenshteinDistance(a: string, b: string): number {
    // Оптимизация: пустые строки
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Оптимизация: одинаковые строки
    if (a === b) return 0;

    // Создаём матрицу distance
    const matrix: number[][] = [];

    // Инициализация первой строки и столбца
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      if (matrix[0]) {
        matrix[0][j] = j;
      }
    }

    // Заполнение матрицы
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const prevRow = matrix[i - 1];
        const currRow = matrix[i];
        const prevCell = matrix[i - 1]?.[j - 1];

        if (!prevRow || !currRow || prevCell === undefined) {
          continue;
        }

        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          // Символы совпадают — без изменений
          currRow[j] = prevCell;
        } else {
          // Выбираем минимальную стоимость операции
          currRow[j] = Math.min(
            prevCell + 1, // замена (substitution)
            (currRow[j - 1] ?? Infinity) + 1, // вставка (insertion)
            (prevRow[j] ?? Infinity) + 1 // удаление (deletion)
          );
        }
      }
    }

    return matrix[b.length]?.[a.length] ?? 0;
  }
}
