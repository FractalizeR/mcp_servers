/**
 * Чтение потоков дочернего процесса без порчи многобайтного UTF-8.
 *
 * Причина существования модуля — коммит d5de3d88: шесть тестовых харнессов
 * читали stdout как `buffer += data.toString()`, многобайтный символ на
 * границе чанка декодировался половинами и превращался в два U+FFFD. Ассерта
 * «два последовательных tools/list побайтово одинаковы» падала, хотя сервер
 * отдавал один и тот же список, и это роняло semantic-release.
 */

import type { Readable } from 'node:stream';

/** Окно контекста вокруг места расхождения/порчи в диагностике (символы). */
export const MISMATCH_CONTEXT_CHARS = 120;

/**
 * Единственный разрешённый способ превратить чанк потока в строку.
 *
 * Наивный `chunk.toString()` декодирует каждый чанк независимо и рвёт
 * многобайтный UTF-8 на границе чанка. Поэтому потоки переводятся в
 * `setEncoding('utf8')` — один разделяемый декодер на поток, корректно
 * склеивающий последовательность через границу чанка, — а эта проверка не
 * даёт молча вернуться к побайтовому декодированию.
 */
export function assertUtf8Chunk(chunk: unknown): string {
  if (typeof chunk !== 'string') {
    throw new Error(
      'Поток дочернего процесса не переведён в setEncoding("utf8") — пришёл Buffer. ' +
        'Декодирование чанка по отдельности рвёт многобайтный UTF-8 на границе чанка.'
    );
  }
  return chunk;
}

/**
 * U+FFFD в ответе сервера означает не баг сервера, а испорченное чтение на
 * стороне теста. Проверка стоит на зелёном пути специально: порча,
 * случившаяся одинаково в обоих ответах, расхождения не даёт и иначе прошла
 * бы молча.
 */
export function assertNoDecodingDamage(label: string, json: string): void {
  const at = json.indexOf('\uFFFD');
  if (at < 0) {
    return;
  }
  const window = json.slice(Math.max(0, at - MISMATCH_CONTEXT_CHARS), at + MISMATCH_CONTEXT_CHARS);
  throw new Error(
    `${label}: в ответе найден U+FFFD на индексе ${at}. Это ДЕФЕКТ ЧТЕНИЯ на стороне ` +
      'теста, а не сервера: многобайтный UTF-8 порвался на границе чанка. Проверь, что ' +
      `поток переведён в setEncoding("utf8") и чанки не декодируются поштучно.\n  ${JSON.stringify(window)}`
  );
}

/**
 * Подписывает накопитель на поток, разом закрывая обе ловушки: переводит поток
 * в `setEncoding('utf8')` (один декодер на поток) и пропускает каждый чанк
 * через {@link assertUtf8Chunk}. Возвращает геттер накопленного текста.
 *
 * Node сам флашит декодер на EOF — ручной `StringDecoder` без `.end()` терял
 * бы хвост, поэтому используется именно `setEncoding`.
 */
export function collectUtf8(stream: Readable | null | undefined): () => string {
  let text = '';
  if (!stream) {
    return () => text;
  }
  stream.setEncoding('utf8');
  stream.on('data', (chunk: unknown) => {
    text += assertUtf8Chunk(chunk);
  });
  return () => text;
}
