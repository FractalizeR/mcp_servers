/**
 * MCP Tool «анализ description задачи» — пилот №1 MCP Apps (пакет 6.1 плана
 * модернизации MCP 2026-07-28, `_meta.ui.resourceUri` → SEP-1865).
 *
 * Механика (по плану): 1) инструмент возвращает текущее/предложенное
 * description; 2) хост, поддерживающий MCP Apps, подгружает виджен
 * `ui://tracker/issue-description-editor` и рендерит его в песочном iframe;
 * 3) продакт правит текст в поле, жмёт «применить»; 4) виджет сам вызывает
 * `update_issue` через postMessage-канал к хосту (см. `issue-description-
 * editor.widget.ts`). Без Apps (Codex/ChatGPT) — тот же результат читается
 * как обычный JSON/текст, и агент правит description сам вызовом update_issue
 * (fallback, DoD пилота).
 *
 * `getDefinition()` ниже добавляет `_meta.ui.resourceUri` на СВОЙ
 * `ToolDefinition`, и это поле доезжает до клиента в ответе `tools/list` —
 * `projectToolDefinitionForList()`
 * (`packages/framework/core/src/tool-registry/tools-list-projection.ts`)
 * пропускает `_meta` через явный whitelist полей проекции (наравне с
 * title/outputSchema/annotations). Реальный хост (Claude Desktop и т.п.)
 * узнаёт о `_meta.ui.resourceUri` именно из `tools/list` (SEP-1865: «hosts
 * can prefetch templates before tool execution»), поэтому префетч виджета до
 * вызова инструмента работает — подтверждено wire-тестом
 * `tests/tools/api/issues/analyze/analyze-issue-description-tools-list.wire.test.ts`.
 * ⚠️ Whitelist в `projectToolDefinitionForList()` — единственное место,
 * решающее, какие поля `ToolDefinition` попадают на wire: если его снова
 * сузят и уберут `_meta`, префетч виджета молча перестанет работать (тот же
 * wire-тест это поймает).
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ResultLogger } from '@fractalizer/mcp-core';
import { ISSUE_DESCRIPTION_EDITOR_URI } from '#resources/apps-ui-uri.js';
import { AnalyzeIssueDescriptionParamsSchema } from './analyze-issue-description.schema.js';
import { ANALYZE_ISSUE_DESCRIPTION_TOOL_METADATA } from './analyze-issue-description.metadata.js';
import { sanitizeTrackerText } from './sanitize-tracker-text.js';
import { suggestDescriptionRewrite } from './suggest-description-rewrite.js';

/** Форма `_meta.ui` на `ToolDefinition` по SEP-1865 (`resourceUri`/`visibility`). */
interface ToolUiMeta {
  readonly ui: {
    readonly resourceUri: string;
    readonly visibility: readonly ('model' | 'app')[];
  };
}

export class AnalyzeIssueDescriptionTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = ANALYZE_ISSUE_DESCRIPTION_TOOL_METADATA;

  protected override getParamsSchema(): typeof AnalyzeIssueDescriptionParamsSchema {
    return AnalyzeIssueDescriptionParamsSchema;
  }

  /**
   * Добавляет `_meta.ui.resourceUri` поверх автогенерированного определения
   * — см. заголовок файла про то, как это поле доезжает до `tools/list`.
   */
  override getDefinition(): ToolDefinition {
    const base = super.getDefinition();
    const withUi: ToolDefinition & { _meta: ToolUiMeta } = {
      ...base,
      _meta: {
        ui: {
          resourceUri: ISSUE_DESCRIPTION_EDITOR_URI,
          visibility: ['model', 'app'],
        },
      },
    };
    return withUi;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, AnalyzeIssueDescriptionParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueKey } = validation.data;

    try {
      const [result] = await this.facade.getIssues([issueKey]);
      if (result === undefined) {
        return this.formatError(
          `Задача ${issueKey} не найдена для анализа`,
          new Error('Пустой ответ API')
        );
      }
      if (result.status === 'rejected') {
        return this.formatError(
          `Не удалось получить задачу ${issueKey} для анализа`,
          result.reason
        );
      }

      const issue = result.value;
      const rawDescription = typeof issue.description === 'string' ? issue.description : '';
      const currentDescription = sanitizeTrackerText(rawDescription);
      const { suggested: suggestedDescription, notes } =
        suggestDescriptionRewrite(currentDescription);
      const rawVersion = issue['version'];
      const version = typeof rawVersion === 'number' ? rawVersion : undefined;

      ResultLogger.logOperationStart(this.logger, `Анализ description задачи ${issueKey}`, 1, [
        'description',
      ]);

      this.logger.info(`Анализ задачи ${issueKey} завершён`, { notesCount: notes.length });

      return this.formatSuccess({
        issueKey,
        currentDescription,
        suggestedDescription,
        notes,
        ...(version !== undefined && { version }),
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка анализа задачи ${issueKey}`, error);
    }
  }
}
