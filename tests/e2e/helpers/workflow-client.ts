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
    return response.key;
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
    return response.data.results[0];
  }

  // NOTE: Остальные методы будут добавлены в Фазе 2
  // updateIssue(), transitionIssue(), findIssues()
}
