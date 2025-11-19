// tests/e2e/helpers/workflow-client.ts
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';

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
      throw new Error(`Failed to create issue: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.data.issueKey;
  }

  /**
   * Получить задачу по ключу
   */
  async getIssue(issueKey: string): Promise<unknown> {
    const result = await this.client.callTool(buildToolName('get_issues', MCP_TOOL_PREFIX), {
      issueKeys: [issueKey],
      fields: ['key', 'summary', 'status', 'description'],
    });

    if (result.isError) {
      throw new Error(`Failed to get issue: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
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
      throw new Error(`Failed to update issue: ${result.content[0]?.text}`);
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
      throw new Error(`Failed to transition issue: ${result.content[0]?.text}`);
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
      throw new Error(`Failed to find issues: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.data.issues;
  }

  /**
   * Получить changelog задачи
   */
  async getChangelog(issueKey: string): Promise<unknown[]> {
    const result = await this.client.callTool(
      buildToolName('get_issue_changelog', MCP_TOOL_PREFIX),
      {
        issueKey,
        fields: ['id', 'updatedAt', 'updatedBy'],
      }
    );

    if (result.isError) {
      throw new Error(`Failed to get changelog: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.data.changelog;
  }

  /**
   * Получить доступные transitions для задачи
   */
  async getTransitions(issueKey: string): Promise<unknown[]> {
    const result = await this.client.callTool(
      buildToolName('get_issue_transitions', MCP_TOOL_PREFIX),
      { issueKey, fields: ['id', 'display'] }
    );

    if (result.isError) {
      throw new Error(`Failed to get transitions: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.data.transitions;
  }
}
