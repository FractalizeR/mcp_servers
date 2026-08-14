/**
 * URI ресурса MCP Apps (`ui://`) пилота №1 плана модернизации MCP 2026-07-28
 * (`.agentic-planning/plan_mcp_2026_modernization/6.1_apps_pilot_sequential.md`)
 * — «анализ задачи и правка description».
 *
 * Схема `ui://` — отдельная от `tracker://` (см. `tracker-resource-uri.ts`):
 * та схема адресует данные Трекера (issue/queue/project), эта — статический
 * UI-бандл (SEP-1865, https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp).
 * Виджет один и без параметров — URI фиксированная строка, не шаблон.
 */
export const ISSUE_DESCRIPTION_EDITOR_URI = 'ui://tracker/issue-description-editor';
