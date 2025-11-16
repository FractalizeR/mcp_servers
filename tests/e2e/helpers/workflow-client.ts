// tests/e2e/helpers/workflow-client.ts
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';

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
    const result = await this.client.callTool(
      'fractalizer_mcp_yandex_tracker_create_issue',
      params
    );

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
    const result = await this.client.callTool('fractalizer_mcp_yandex_tracker_get_issues', {
      issueKeys: [issueKey],
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
    const result = await this.client.callTool('fractalizer_mcp_yandex_tracker_update_issue', {
      issueKey,
      ...updates,
    });

    if (result.isError) {
      throw new Error(`Failed to update issue: ${result.content[0]?.text}`);
    }
  }

  /**
   * Перевести задачу в новый статус
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const result = await this.client.callTool('fractalizer_mcp_yandex_tracker_transition_issue', {
      issueKey,
      transitionId,
    });

    if (result.isError) {
      throw new Error(`Failed to transition issue: ${result.content[0]?.text}`);
    }
  }

  /**
   * Найти задачи по query
   */
  async findIssues(query: string): Promise<unknown[]> {
    const result = await this.client.callTool('fractalizer_mcp_yandex_tracker_find_issues', {
      query,
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
      'fractalizer_mcp_yandex_tracker_get_issue_changelog',
      { issueKey }
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
      'fractalizer_mcp_yandex_tracker_get_issue_transitions',
      { issueKey }
    );

    if (result.isError) {
      throw new Error(`Failed to get transitions: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.data.transitions;
  }
}
