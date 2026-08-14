/**
 * Ответ об ошибке для tools/call при необработанном исключении внутри
 * ToolRegistry.execute() (например, программная ошибка в самом adapter'е —
 * ToolRegistry.execute() уже перехватывает ошибки исполнения tool и
 * возвращает их как isError:true, эта ветка — защита на случай, если
 * исключение всё же вырвалось выше). Перенесено из server/handlers.ts трёх
 * серверов (пакет 4.1.B), поведение не изменено.
 */

export interface ToolCallErrorResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
}

export function createToolCallErrorResponse(
  error: unknown,
  name: string,
  originalName: string
): ToolCallErrorResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            message: `Необработанная ошибка при выполнении инструмента: ${
              error instanceof Error ? error.message : 'Неизвестная ошибка'
            }`,
            tool: name,
            originalName,
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}
