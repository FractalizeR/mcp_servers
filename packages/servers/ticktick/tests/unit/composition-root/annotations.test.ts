// tests/unit/composition-root/annotations.test.ts
/**
 * Регрессионный тест пакета 1.3 плана dev-интерфейса (`.agentic-planning/plan_mcp_dev_interface`).
 *
 * Защита записи `mcp-dev` (см. `packages/framework/dev-client/src/write-policy/classify.ts`)
 * опирается на `annotations.readOnlyHint`/`destructiveHint` из METADATA каждого инструмента.
 * `BaseTool.getDefinition()` (`packages/framework/core/src/tools/base/base-tool.ts`) не
 * подставляет дефолт: если `METADATA.annotations` не задан, поле `annotations` в definition
 * просто отсутствует. Тест ловит именно факт «инструмент существует, но хинты не заданы явно».
 *
 * Заводится безусловно: проходит по ВСЕМ инструментам из `TOOL_CLASSES`, а не по списку
 * заранее известных имён — список имён устарел бы при первом же новом инструменте.
 *
 * ticktick на этой машине не подключён в MCP-клиенте (нет реального `tools/list`) — этот тест
 * статический, работает по коду независимо от подключения.
 */
import { describe, it, expect } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';

describe('METADATA.annotations: явные readOnlyHint/destructiveHint у каждого инструмента', () => {
  it.each(TOOL_CLASSES.map((ToolClass) => [ToolClass.METADATA.name, ToolClass] as const))(
    '%s объявляет annotations.readOnlyHint и annotations.destructiveHint явно (boolean)',
    (toolName, ToolClass) => {
      const { annotations } = ToolClass.METADATA;

      expect(annotations, `${toolName}: METADATA.annotations не задан`).toBeDefined();
      expect(
        typeof annotations?.readOnlyHint,
        `${toolName}: annotations.readOnlyHint должен быть явным boolean, а не undefined`
      ).toBe('boolean');
      expect(
        typeof annotations?.destructiveHint,
        `${toolName}: annotations.destructiveHint должен быть явным boolean, а не undefined`
      ).toBe('boolean');
    }
  );

  it('в TOOL_CLASSES есть хотя бы один инструмент (тест не должен молча проходить на пустом списке)', () => {
    expect(TOOL_CLASSES.length).toBeGreaterThan(0);
  });
});
