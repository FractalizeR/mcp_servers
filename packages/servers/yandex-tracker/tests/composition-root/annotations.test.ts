// tests/composition-root/annotations.test.ts
/**
 * Регрессионный тест пакета 1.3 плана dev-интерфейса (`.agentic-planning/plan_mcp_dev_interface`).
 *
 * Защита записи `mcp-dev` (см. `packages/framework/dev-client/src/write-policy/classify.ts`)
 * опирается на `annotations.readOnlyHint`/`destructiveHint` из METADATA каждого инструмента.
 * `BaseTool.getDefinition()` (`packages/framework/core/src/tools/base/base-tool.ts`) не
 * подставляет дефолт: если `METADATA.annotations` не задан, поле `annotations` в definition
 * просто отсутствует — а `classify()` трактует отсутствующий `readOnlyHint` как «write»
 * (безопасный дефолт, не «read»). Значит, новый инструмент без явных хинтов не сломает
 * dev-client молча, но и не даст себя явно проверить в списке ниже — эта регрессия ловит
 * именно факт «инструмент существует, но хинты не заданы явно», а не последствие в classify().
 *
 * Тест заводится безусловно (не «если найдены расхождения»): проходит по ВСЕМ инструментам
 * из `TOOL_CLASSES`, а не по списку заранее известных имён — список имён устарел бы при первом
 * же новом инструменте.
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
