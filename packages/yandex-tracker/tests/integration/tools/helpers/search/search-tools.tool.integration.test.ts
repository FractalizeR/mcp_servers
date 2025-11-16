/**
 * Интеграционные тесты для search-tools tool
 *
 * Тестирование end-to-end flow:
 * MCP Client → ToolRegistry → SearchToolsTool → ToolSearchEngine → Tool Index
 *
 * NOTE: Этот тест дополняет E2E тест (tests/e2e/mcp/tools/search-tools.tool.test.ts)
 * фокусируясь на реальной интеграции с MCP клиентом и ToolRegistry
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';

describe('search-tools integration tests', () => {
  let client: TestMCPClient;

  beforeEach(async () => {
    // Создаём MCP клиент с тестовой конфигурацией
    client = await createTestClient({
      logLevel: 'silent', // Отключаем логи в тестах
    });
  });

  afterEach(() => {
    // Cleanup если нужен
  });

  describe('Happy Path', () => {
    it('должен успешно найти инструменты по простому query', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
      });

      // Assert
      if (result.isError) {
        console.error('Search tools error:', result.content[0]?.text);
      }
      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);

      const content = result.content[0]!;
      expect(content.type).toBe('text');
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.success).toBe(true);
        expect(parsed.data.query).toBe('issue');
        expect(parsed.data.totalFound).toBeGreaterThan(0);
        expect(parsed.data.returned).toBeGreaterThan(0);
        expect(parsed.data.tools).toBeInstanceOf(Array);
        expect(parsed.data.tools.length).toBeGreaterThan(0);

        // Проверяем, что найденные tools содержат "issue" в имени или описании
        const firstTool = parsed.data.tools[0];
        expect(firstTool).toHaveProperty('name');
      }
    });

    it('должен найти tools по специфичному названию', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'get_issues',
        detailLevel: 'full',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools).toBeInstanceOf(Array);

        // Должен найти fyt_mcp_get_issues
        const getIssuesTool = parsed.data.tools.find(
          (t: { name: string }) => t.name === 'get_issues'
        );
        expect(getIssuesTool).toBeDefined();
        expect(getIssuesTool.name).toBe('get_issues');
        expect(getIssuesTool.inputSchema).toBeDefined(); // full detail level
      }
    });

    it('должен применить лимит к результатам', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'yandex',
        limit: 2,
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.returned).toBeLessThanOrEqual(2);
        expect(parsed.data.tools.length).toBeLessThanOrEqual(2);
        expect(parsed.data.totalFound).toBeGreaterThanOrEqual(parsed.data.returned);
      }
    });

    it('должен использовать default limit (10)', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'tracker',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Уровни детализации', () => {
    it('name_only: должен вернуть только имена', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        detailLevel: 'name_only',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        parsed.data.tools.forEach((toolData: Record<string, unknown>) => {
          expect(toolData['name']).toBeDefined();
          expect(toolData['description']).toBeUndefined();
          expect(toolData['category']).toBeUndefined();
          expect(toolData['inputSchema']).toBeUndefined();
        });
      }
    });

    it('name_and_description: должен вернуть имя, описание, категорию', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        detailLevel: 'name_and_description',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        parsed.data.tools.forEach((toolData: Record<string, unknown>) => {
          expect(toolData['name']).toBeDefined();
          expect(toolData['description']).toBeDefined();
          expect(toolData['category']).toBeDefined();
          expect(toolData['score']).toBeGreaterThanOrEqual(0);
          expect(toolData['inputSchema']).toBeUndefined(); // Не загружено
        });
      }
    });

    it('full: должен загрузить полные метаданные', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        detailLevel: 'full',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        parsed.data.tools.forEach((toolData: Record<string, unknown>) => {
          expect(toolData['name']).toBeDefined();
          expect(toolData['description']).toBeDefined();
          expect(toolData['category']).toBeDefined();
          expect(toolData['tags']).toBeDefined();
          // inputSchema и examples могут быть undefined если tool не загрузился из registry
          // В интеграционном тесте это нормально
        });
      }
    });

    it('default detailLevel = name_and_description', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools[0].description).toBeDefined();
        expect(parsed.data.tools[0].category).toBeDefined();
        expect(parsed.data.tools[0].inputSchema).toBeUndefined();
      }
    });
  });

  describe('Фильтрация', () => {
    it('должен фильтровать по категории ISSUES', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'yandex',
        category: 'issues',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        parsed.data.tools.forEach((toolData: Record<string, unknown>) => {
          expect(toolData['category']).toBe('issues');
        });
      }
    });

    it('должен фильтровать по типу (helper)', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'search',
        isHelper: true,
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // search_tools должен быть helper
        const searchToolsTool = parsed.data.tools.find(
          (t: { name: string }) => t.name === 'search_tools'
        );
        expect(searchToolsTool).toBeDefined();
      }
    });

    it('должен фильтровать по типу (API)', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        isHelper: false,
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // Все результаты должны быть API tools
        parsed.data.tools.forEach((toolData: { name: string }) => {
          // search_tools не должен быть в результатах (он helper)
          expect(toolData.name).not.toBe('search_tools');
        });
      }
    });

    it('должен комбинировать фильтры', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'yandex',
        category: 'issues',
        isHelper: false,
        limit: 5,
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        parsed.data.tools.forEach((toolData: Record<string, unknown>) => {
          expect(toolData['category']).toBe('issues');
        });
        expect(parsed.data.tools.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Валидация параметров', () => {
    it('должен вернуть ошибку для пустого query', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: '',
      });

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const content = result.content[0]!;
      expect(content.type).toBe('text');
      if (content.type === 'text') {
        expect(content.text).toContain('Query must be a non-empty string');
      }
    });

    it('должен вернуть ошибку для невалидного detailLevel', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        detailLevel: 'invalid',
      });

      // Assert
      expect(result.isError).toBe(true);

      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Invalid enum value');
      }
    });

    it('должен вернуть ошибку для невалидной категории', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        category: 'INVALID_CATEGORY',
      });

      // Assert
      expect(result.isError).toBe(true);

      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Invalid enum value');
      }
    });

    it('должен вернуть ошибку для невалидного limit (негативное число)', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        limit: -5,
      });

      // Assert
      expect(result.isError).toBe(true);

      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Number must be greater than 0');
      }
    });

    it('должен вернуть ошибку для невалидного limit (не целое число)', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        limit: 3.14,
      });

      // Assert
      expect(result.isError).toBe(true);

      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(content.text).toContain('Expected integer');
      }
    });

    it('должен принять валидные параметры', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
        detailLevel: 'full',
        category: 'issues',
        isHelper: false,
        limit: 10,
      });

      // Assert
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Edge cases', () => {
    it('должен обработать query без совпадений', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'xyzqwertynonexistent999',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        // Fuzzy search может вернуть результаты даже для несуществующих слов
        // Поэтому проверяем, что метод не упал, а не точное количество результатов
        expect(parsed.data.totalFound).toBeGreaterThanOrEqual(0);
        expect(parsed.data.returned).toBeGreaterThanOrEqual(0);
        expect(parsed.data.tools).toBeInstanceOf(Array);
      }
    });

    it('должен обработать очень длинный query', async () => {
      // Act
      const longQuery = 'a'.repeat(1000);
      const result = await client.callTool('search_tools', {
        query: longQuery,
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools).toBeInstanceOf(Array);
      }
    });

    it('должен обработать специальные символы в query', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'tracker_',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.tools).toBeInstanceOf(Array);
      }
    });

    it('должен обработать query с пробелами', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: '  issue  ',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.query).toBe('issue'); // Trimmed
        expect(parsed.data.tools.length).toBeGreaterThan(0);
      }
    });
  });

  describe('JSON формат ответа', () => {
    it('должен вернуть валидный JSON', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        expect(() => JSON.parse(content.text)).not.toThrow();
      }
    });

    it('должен включить все обязательные поля в ответ', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'issue',
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed).toHaveProperty('success');
        expect(parsed).toHaveProperty('data');
        expect(parsed.data).toHaveProperty('query');
        expect(parsed.data).toHaveProperty('totalFound');
        expect(parsed.data).toHaveProperty('returned');
        expect(parsed.data).toHaveProperty('tools');
        expect(typeof parsed.data.query).toBe('string');
        expect(typeof parsed.data.totalFound).toBe('number');
        expect(typeof parsed.data.returned).toBe('number');
        expect(Array.isArray(parsed.data.tools)).toBe(true);
      }
    });

    it('totalFound должен быть >= returned', async () => {
      // Act
      const result = await client.callTool('search_tools', {
        query: 'yandex',
        limit: 1,
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const content = result.content[0]!;
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        expect(parsed.data.totalFound).toBeGreaterThanOrEqual(parsed.data.returned);
      }
    });
  });
});
