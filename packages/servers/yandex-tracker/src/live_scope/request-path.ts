/**
 * Приведение пути запроса к виду, о котором правила могут рассуждать.
 *
 * Правила сопоставляют путь регулярками, а axios канонизирует его уже ПОСЛЕ
 * интерцептора: `/v3/components/{id}/../../projects/1` доходит до правил как путь
 * к компоненту, а до сети — как путь к проекту. Поймано ревью: разрешающее
 * правило пропускало запрос, адресующий совсем другую сущность.
 *
 * Поэтому путь, который нельзя сопоставить однозначно, не нормализуется «как
 * лучше», а отвергается: догадка о намерении здесь дороже отказа.
 */

export interface PathVerdict {
  readonly path?: string;
  /** Заполнена, если путь непригоден для сопоставления. */
  readonly rejection?: string;
}

/** Кодированные разделители: после декодирования сервером они меняют адресата. */
const ENCODED_SEPARATOR = /%2f|%5c/i;

export function canonicalRequestPath(url: string): PathVerdict {
  const queryStart = url.indexOf('?');
  const raw = queryStart === -1 ? url : url.slice(0, queryStart);

  if (ENCODED_SEPARATOR.test(raw)) {
    return { rejection: 'путь содержит кодированный разделитель (%2F/%5C)' };
  }
  if (raw.includes('\\')) {
    return { rejection: 'путь содержит обратный слэш' };
  }

  const segments = raw.split('/');
  // Первый сегмент пуст у абсолютного пути (`/v3/...`) — это норма, остальные пустые
  // означают `//`, которое разные слои схлопывают по-разному.
  for (const [index, segment] of segments.entries()) {
    if (segment === '..' || segment === '.') {
      return { rejection: `путь содержит сегмент «${segment}» и адресует не то, что показывает` };
    }
    if (segment === '' && index !== 0 && index !== segments.length - 1) {
      return { rejection: 'путь содержит пустой сегмент (//)' };
    }
  }

  return { path: raw };
}
