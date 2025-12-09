import { describe, it, expect } from 'vitest';
import type { ToolDefinition } from '@fractalizer/mcp-infrastructure/types.js';

/**
 * Интерфейс метрик инструментов
 */
interface ToolsMetrics {
  totalTools: number;
  descriptionLength: number;
  estimatedTokens: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  bySubcategory: Record<string, number>;
}

/**
 * Функция для подсчёта метрик инструментов
 * (копия из index.ts для тестирования)
 */
function calculateToolsMetrics(definitions: ToolDefinition[]): ToolsMetrics {
  const descriptionLength = definitions.reduce((sum, def) => sum + def.description.length, 0);

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const bySubcategory: Record<string, number> = {};

  for (const def of definitions) {
    // By category
    if (def.category) {
      byCategory[def.category] = (byCategory[def.category] || 0) + 1;
    }

    // By priority
    const priority = def.priority || 'normal';
    byPriority[priority] = (byPriority[priority] || 0) + 1;

    // By subcategory
    if (def.subcategory) {
      bySubcategory[def.subcategory] = (bySubcategory[def.subcategory] || 0) + 1;
    }
  }

  return {
    totalTools: definitions.length,
    descriptionLength,
    estimatedTokens: Math.ceil(descriptionLength / 4),
    byCategory,
    byPriority,
    bySubcategory,
  };
}

describe('calculateToolsMetrics', () => {
  describe('Basic metrics', () => {
    it('должна корректно подсчитать общее количество инструментов', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: '[Category] Tool 1',
          category: 'test',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: '[Category] Tool 2',
          category: 'test',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.totalTools).toBe(2);
    });

    it('должна корректно подсчитать общую длину descriptions', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Test', // 4 символа
          category: 'test',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: 'Another', // 7 символов
          category: 'test',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.descriptionLength).toBe(11);
    });

    it('должна корректно оценить количество токенов (symbols / 4)', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: '1234567890', // 10 символов
          category: 'test',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      // 10 / 4 = 2.5 → Math.ceil = 3
      expect(metrics.estimatedTokens).toBe(3);
    });

    it('должна вернуть 0 для пустого массива', () => {
      // Arrange
      const definitions: ToolDefinition[] = [];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.totalTools).toBe(0);
      expect(metrics.descriptionLength).toBe(0);
      expect(metrics.estimatedTokens).toBe(0);
      expect(Object.keys(metrics.byCategory)).toHaveLength(0);
      expect(Object.keys(metrics.byPriority)).toHaveLength(0);
      expect(Object.keys(metrics.bySubcategory)).toHaveLength(0);
    });
  });

  describe('Category distribution', () => {
    it('должна корректно группировать инструменты по категориям', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'issues',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'issues',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          category: 'helpers',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.byCategory).toEqual({
        issues: 2,
        helpers: 1,
      });
    });

    it('должна корректно обрабатывать несколько категорий', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'cat1',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'cat2',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          category: 'cat3',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(Object.keys(metrics.byCategory)).toHaveLength(3);
      expect(metrics.byCategory.cat1).toBe(1);
      expect(metrics.byCategory.cat2).toBe(1);
      expect(metrics.byCategory.cat3).toBe(1);
    });
  });

  describe('Priority distribution', () => {
    it('должна корректно группировать инструменты по приоритетам', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'test',
          priority: 'critical',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'test',
          priority: 'critical',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          category: 'test',
          priority: 'high',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool4',
          description: 'Tool 4',
          category: 'test',
          priority: 'low',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.byPriority).toEqual({
        critical: 2,
        high: 1,
        low: 1,
      });
    });

    it('должна трактовать undefined priority как normal', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'test',
          // priority не указан
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'test',
          priority: 'normal',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.byPriority.normal).toBe(2);
    });
  });

  describe('Subcategory distribution', () => {
    it('должна корректно группировать инструменты по subcategories', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'issues',
          subcategory: 'read',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'issues',
          subcategory: 'read',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          category: 'issues',
          subcategory: 'write',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.bySubcategory).toEqual({
        read: 2,
        write: 1,
      });
    });

    it('должна игнорировать инструменты без subcategory', () => {
      // Arrange
      const definitions: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'issues',
          subcategory: 'read',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'issues',
          // subcategory не указан
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.bySubcategory).toEqual({
        read: 1,
      });
    });
  });

  describe('Real-world scenario', () => {
    it('должна корректно подсчитать метрики для реального набора инструментов', () => {
      // Arrange - симуляция реальных инструментов
      const definitions: ToolDefinition[] = [
        {
          name: 'create_issue',
          description: '[Issues/Write] Создать задачу',
          category: 'issues',
          subcategory: 'write',
          priority: 'critical',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'get_issues',
          description: '[Issues/Read] Получить задачи',
          category: 'issues',
          subcategory: 'read',
          priority: 'critical',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'find_issues',
          description: '[Issues/Read] Найти задачи',
          category: 'issues',
          subcategory: 'read',
          priority: 'critical',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'ping',
          description: '[System/Health] Проверка доступности',
          category: 'system',
          subcategory: 'health',
          priority: 'normal',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'demo',
          description: '[Helpers/Demo] Демо инструмент',
          category: 'helpers',
          subcategory: 'demo',
          priority: 'low',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ];

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.totalTools).toBe(5);
      expect(metrics.byCategory).toEqual({
        issues: 3,
        system: 1,
        helpers: 1,
      });
      expect(metrics.byPriority).toEqual({
        critical: 3,
        normal: 1,
        low: 1,
      });
      expect(metrics.bySubcategory).toEqual({
        write: 1,
        read: 2,
        health: 1,
        demo: 1,
      });

      // Проверяем что tokens оценены корректно
      expect(metrics.estimatedTokens).toBeGreaterThan(0);
      expect(metrics.estimatedTokens).toBe(Math.ceil(metrics.descriptionLength / 4));
    });

    it('метрики должны быть полезны для оптимизации', () => {
      // Arrange
      const definitions: ToolDefinition[] = Array.from({ length: 50 }, (_, i) => ({
        name: `tool_${i}`,
        description: `[Category] This is a tool description for tool ${i}`, // ~50 chars
        category: i < 30 ? 'issues' : 'helpers',
        priority: i < 10 ? 'critical' : i < 25 ? 'high' : 'normal',
        inputSchema: { type: 'object', properties: {}, required: [] },
      }));

      // Act
      const metrics = calculateToolsMetrics(definitions);

      // Assert
      expect(metrics.totalTools).toBe(50);
      expect(metrics.estimatedTokens).toBeGreaterThan(500); // 50 tools * ~50 chars / 4 ≈ 625 tokens

      // Проверяем распределение
      expect(metrics.byCategory.issues).toBe(30);
      expect(metrics.byCategory.helpers).toBe(20);

      expect(metrics.byPriority.critical).toBe(10);
      expect(metrics.byPriority.high).toBe(15);
      expect(metrics.byPriority.normal).toBe(25);
    });
  });
});
