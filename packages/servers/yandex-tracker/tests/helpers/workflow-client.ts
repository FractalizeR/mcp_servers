// tests/e2e/helpers/workflow-client.ts
import type { TestMCPClient } from '#integration/helpers/mcp-client.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { getTextContent } from '#helpers/tool-result.helper.js';

/**
 * Helper для E2E workflows с автоматическим извлечением данных
 * Используется в Фазе 2 для упрощения multi-step сценариев
 */
export class WorkflowClient {
  constructor(private client: TestMCPClient) {}

  /**
   * Создать задачу и вернуть её ключ
   */
  async createIssue(params: {
    queue: string;
    summary: string;
    description?: string;
  }): Promise<string> {
    const result = await this.client.callTool(buildToolName('create_issue', MCP_TOOL_PREFIX), {
      ...params,
      fields: ['key'],
    });

    if (result.isError) {
      throw new Error(`Failed to create issue: ${getTextContent(result)}`);
    }

    const response = JSON.parse(getTextContent(result));
    return response.data.issueKey;
  }

  /**
   * Получить задачу по ключу
   */
  async getIssue(issueKey: string): Promise<unknown> {
    const result = await this.client.callTool(buildToolName('get_issues', MCP_TOOL_PREFIX), {
      issueKeys: [issueKey],
      fields: ['key', 'summary', 'status'],
    });

    if (result.isError) {
      throw new Error(`Failed to get issue: ${getTextContent(result)}`);
    }

    const response = JSON.parse(getTextContent(result));
    return response.data.issues[0]?.issue;
  }

  /**
   * Обновить задачу
   */
  async updateIssue(issueKey: string, updates: Record<string, unknown>): Promise<void> {
    const result = await this.client.callTool(buildToolName('update_issue', MCP_TOOL_PREFIX), {
      issueKey,
      ...updates,
      fields: ['key'],
    });

    if (result.isError) {
      throw new Error(`Failed to update issue: ${getTextContent(result)}`);
    }
  }

  /**
   * Перевести задачу в новый статус
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const result = await this.client.callTool(buildToolName('transition_issue', MCP_TOOL_PREFIX), {
      issueKey,
      transitionId,
      fields: ['key', 'status'],
    });

    if (result.isError) {
      throw new Error(`Failed to transition issue: ${getTextContent(result)}`);
    }
  }

  /**
   * Найти задачи по query
   */
  async findIssues(query: string): Promise<unknown[]> {
    const result = await this.client.callTool(buildToolName('find_issues', MCP_TOOL_PREFIX), {
      query,
      fields: ['key', 'summary', 'status'],
    });

    if (result.isError) {
      throw new Error(`Failed to find issues: ${getTextContent(result)}`);
    }

    const response = JSON.parse(getTextContent(result));
    // find_issues (пакет 5.1.C.tracker): формат коллекции — data.items в
    // режиме full (результаты воркфлоу-тестов малы, ниже порога — mode='auto'
    // всегда резолвится в 'full').
    return response.data.items;
  }

  /**
   * Получить changelog задачи (использует batch API)
   */
  async getChangelog(issueKey: string): Promise<unknown[]> {
    const result = await this.client.callTool(
      buildToolName('get_issue_changelog', MCP_TOOL_PREFIX),
      {
        issueKeys: [issueKey],
        fields: ['id', 'updatedAt', 'updatedBy'],
      }
    );

    if (result.isError) {
      throw new Error(`Failed to get changelog: ${getTextContent(result)}`);
    }

    const response = JSON.parse(getTextContent(result));
    // Извлекаем результат для первой (единственной) задачи из batch результата
    if (response.data.successful && response.data.successful.length > 0) {
      return response.data.successful[0].changelog;
    }
    if (response.data.failed && response.data.failed.length > 0) {
      throw new Error(`Failed to get changelog: ${response.data.failed[0].error}`);
    }
    return [];
  }

  /**
   * Получить доступные transitions для задачи
   */
  async getTransitions(issueKey: string): Promise<unknown[]> {
    const result = await this.client.callTool(
      buildToolName('get_issue_transitions', MCP_TOOL_PREFIX),
      { issueKey, fields: ['id', 'to'] }
    );

    if (result.isError) {
      throw new Error(`Failed to get transitions: ${getTextContent(result)}`);
    }

    const response = JSON.parse(getTextContent(result));
    return response.data.transitions;
  }
}
