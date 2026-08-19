/**
 * Блок `content` результата инструмента. Union текстового блока и
 * `resource_link`: у второго поля `text` нет, а индексная сигнатура
 * превращает `block.text` в `unknown`. Без этой проверки тест молча читает
 * отсутствующее поле и всё равно проходит.
 */
function isTextContentBlock(block: unknown): block is { type: 'text'; text: string } {
  return (
    typeof block === 'object' &&
    block !== null &&
    'type' in block &&
    block.type === 'text' &&
    'text' in block &&
    typeof block.text === 'string'
  );
}

/** Носитель `content` — и `ToolResult`, и результат интеграционного клиента. */
interface WithContent {
  readonly content: ReadonlyArray<unknown>;
}

/** Текст блока `content[index]`; бросает, если блока нет или он не текстовый. */
export function getTextContent(result: WithContent, index = 0): string {
  const block = result.content[index];
  if (!isTextContentBlock(block)) {
    throw new Error(
      `content[${String(index)}] не является текстовым блоком: ${JSON.stringify(block)}`
    );
  }
  return block.text;
}

/** Разобранный JSON из текстового блока `content[index]`. */
export function parseTextContent<T>(result: WithContent, index = 0): T {
  return JSON.parse(getTextContent(result, index)) as T;
}

/**
 * Элемент массива по индексу. `noUncheckedIndexedAccess` делает `items[i]`
 * возможно-`undefined`; молчаливое чтение поля у отсутствующего элемента даёт
 * проверку, которая проходит при пустом ответе. Здесь отсутствие — провал.
 */
export function at<T>(items: readonly T[], index = 0): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(
      `элемент [${String(index)}] отсутствует: длина массива ${String(items.length)}`
    );
  }
  return item;
}
