import { BaseOperation } from '../base-operation.js';

export interface DeletePageResult {
  recovery_token: string;
}

export interface DeletePageParams {
  idx: number;
  /** Удалить страницу вместе с дочерними (query-параметр Wiki API) */
  allow_recursive?: boolean;
  /** Рекурсивное удаление (query-параметр Wiki API) */
  recursive?: boolean;
}

export class DeletePageOperation extends BaseOperation {
  async execute(params: DeletePageParams): Promise<DeletePageResult> {
    const queryParts: string[] = [];

    // ВАЖНО (баг найден и исправлен пакетом 7.2.D): сериализуем ФАКТИЧЕСКОЕ
    // значение, а не факт присутствия ключа. `undefined` → параметр не
    // передаётся вовсе (используется дефолт API — `false`); явные `true`/
    // `false` форвардятся как есть. Раньше любое присутствие ключа (в т.ч.
    // `allow_recursive: false`) сериализовалось как `allow_recursive=true` —
    // агент, явно просивший удалить БЕЗ рекурсии, получал удаление ВСЕГО
    // раздела с дочерними страницами. Тот же приём — в
    // `page-access/update-page-access.operation.ts` (`prevent_selflock`).
    if (params.allow_recursive !== undefined)
      queryParts.push(`allow_recursive=${params.allow_recursive}`);
    if (params.recursive !== undefined) queryParts.push(`recursive=${params.recursive}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    this.logger.info(`Deleting page: ${params.idx}`);

    return this.deleteRequest<DeletePageResult>(`/v1/pages/${params.idx}${queryString}`);
  }
}
