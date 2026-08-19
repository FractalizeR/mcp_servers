import type {
  ToolResult,
  ToolResultContentBlock,
  ToolTextContentBlock,
} from '@fractalizer/mcp-infrastructure';

/**
 * `ToolResultContentBlock` — union текстового блока и `resource_link`; у второго
 * поля `text` нет, а индексная сигнатура превращает `block.text` в `unknown`.
 * Без этого сужения проверка молча читает отсутствующее поле и всё равно проходит.
 */
function isTextContentBlock(
  block: ToolResultContentBlock | undefined
): block is ToolTextContentBlock {
  return block !== undefined && block.type === 'text';
}

/** Текст блока `content[index]`; бросает, если блока нет или он не текстовый. */
export function getTextContent(result: ToolResult, index = 0): string {
  const block = result.content[index];
  if (!isTextContentBlock(block)) {
    throw new Error(
      `content[${String(index)}] не является текстовым блоком: ${JSON.stringify(block)}`
    );
  }
  return block.text;
}

/** Разобранный JSON из текстового блока `content[index]`. */
export function parseTextContent<T>(result: ToolResult, index = 0): T {
  return JSON.parse(getTextContent(result, index)) as T;
}
