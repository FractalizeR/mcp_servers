/**
 * ItemBudget — общий бюджет записей на весь batch-ответ инструмента.
 *
 * Ответственность (SRP):
 * - хранить остаток разрешённых записей и атомарно его расходовать.
 *
 * Используется batch-GET операциями: один экземпляр на вызов `executeMany`
 * прокидывается во все цепочки пагинации (`TrackerPaginator.fetchAllPages`).
 * Когда бюджет исчерпан, оставшиеся задачи отдают только то, что успели
 * собрать (`truncated=true`).
 *
 * Потокобезопасность: Node.js однопоточен, `consume` синхронен и не содержит
 * `await` между чтением `remaining` и вычитанием, поэтому параллельные цепочки
 * (через `ParallelExecutor`) не могут суммарно превысить лимит.
 */
export class ItemBudget {
  private remainingItems: number;

  /**
   * @param total - общий лимит записей на весь batch-ответ (≥ 0).
   */
  constructor(total: number) {
    this.remainingItems = Math.max(0, total);
  }

  /**
   * Остаток разрешённых записей.
   */
  public get remaining(): number {
    return this.remainingItems;
  }

  /**
   * Списать `count` записей из бюджета (не уходя ниже нуля).
   */
  public consume(count: number): void {
    this.remainingItems = Math.max(0, this.remainingItems - count);
  }
}

/**
 * Дефолтный общий потолок записей на batch-ответ (если не задан `maxTotalItems`).
 */
export const DEFAULT_MAX_TOTAL_ITEMS = 1000;
